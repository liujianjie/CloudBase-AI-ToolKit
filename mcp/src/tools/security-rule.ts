import { z } from "zod";
import { getCloudBaseManager, getEnvId, logCloudBaseResult } from "../cloudbase-manager.js";
import { ExtendedMcpServer } from "../server.js";

/**
 * 权限类别（AclTag）
 * - READONLY：所有用户可读，仅创建者和管理员可写
 * - PRIVATE：仅创建者及管理员可读写
 * - ADMINWRITE：所有用户可读，仅管理员可写
 * - ADMINONLY：仅管理员可读写
 * - CUSTOM：自定义安全规则（需传 rule 字段）
 */
export type AclTag =
  | "READONLY"
  | "PRIVATE"
  | "ADMINWRITE"
  | "ADMINONLY"
  | "CUSTOM";

/**
 * 资源类型（resourceType）
 * - noSqlDatabase：数据库集合
 * - sqlDatabase：SQL 数据库表
 * - function：云函数
 * - storage：存储桶
 */
export type ResourceType =
  | "noSqlDatabase"
  | "sqlDatabase"
  | "function"
  | "storage";

/**
 * 读取安全规则参数
 */
export interface ReadSecurityRuleParams {
  resourceType: ResourceType;
  resourceId: string;
}

/**
 * 写入安全规则参数
 */
export interface WriteSecurityRuleParams {
  resourceType: ResourceType;
  resourceId: string;
  aclTag: AclTag;
  rule?: string | Record<string, unknown>;
}

export const READ_SECURITY_RULE = "readSecurityRule";
export const WRITE_SECURITY_RULE = "writeSecurityRule";

const FUNCTION_CUSTOM_RULE_EXAMPLE = JSON.stringify(
  {
    "*": {
      invoke: true,
    },
  },
  null,
  2,
);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function formatSecurityRuleInputHint(resourceType: ResourceType): string {
  if (resourceType === "function") {
    return `函数自定义安全规则应传 JSON 对象或 JSON 字符串，例如 ${FUNCTION_CUSTOM_RULE_EXAMPLE}。`;
  }
  if (resourceType === "noSqlDatabase") {
    return "NoSQL 自定义安全规则应传 JSON 对象或 JSON 字符串，例如 {\"read\":\"true\",\"write\":\"true\"}。";
  }
  return "自定义安全规则应传 JSON 对象或 JSON 字符串，并与 readSecurityRule 返回的规则结构保持一致。";
}

export function normalizeCustomSecurityRule(
  resourceType: ResourceType,
  rule: string | Record<string, unknown> | undefined,
): string {
  if (rule === undefined) {
    throw new Error(`resourceType=${resourceType} 且 aclTag=CUSTOM 时必须提供 rule 字段`);
  }

  if (typeof rule === "string") {
    try {
      const parsed = JSON.parse(rule);
      if (!isPlainObject(parsed)) {
        throw new Error(
          `rule 必须是 JSON 对象，不支持 ${Array.isArray(parsed) ? "数组" : typeof parsed}。`,
        );
      }
      return JSON.stringify(parsed);
    } catch (error) {
      const baseMessage =
        error instanceof Error ? error.message : "rule 不是合法的 JSON 字符串";
      throw new Error(`${baseMessage} ${formatSecurityRuleInputHint(resourceType)}`);
    }
  }

  if (!isPlainObject(rule)) {
    throw new Error(
      `rule 必须是 JSON 对象或 JSON 字符串。${formatSecurityRuleInputHint(resourceType)}`,
    );
  }

  return JSON.stringify(rule);
}

export function buildSecurityRuleErrorMessage(
  operation: "readSecurityRule" | "writeSecurityRule",
  resourceType: ResourceType,
  aclTag: AclTag,
  error: unknown,
): string {
  const baseMessage = error instanceof Error ? error.message : String(error);
  const suggestions: string[] = [];

  if (operation === "writeSecurityRule" && aclTag === "CUSTOM") {
    suggestions.push(formatSecurityRuleInputHint(resourceType));
  }

  if (/INVALID_VALUE|ModifySecurityRule|错误的值|JSON/i.test(baseMessage)) {
    suggestions.push("请先把 CUSTOM 规则整理成 JSON 对象，再传给 writeSecurityRule。");
  }

  if (suggestions.length === 0) {
    suggestions.push("请检查 resourceType、aclTag 和 rule 是否与官方安全规则格式一致后重试。");
  }

  return `[${operation}] 调用失败: ${baseMessage}\n建议：${suggestions.join(" ")}`;
}

/**
 * 注册安全规则相关 Tool
 * @param server MCP Server 实例
 */
export function registerSecurityRuleTools(server: ExtendedMcpServer) {
  const cloudBaseOptions = server.cloudBaseOptions;
  const getManager = () => getCloudBaseManager({ cloudBaseOptions });

  // 读取安全规则 Tool
  server.registerTool?.(
    READ_SECURITY_RULE,
    {
      title: "读取安全规则",
      description: `读取指定资源（noSQL 数据库、SQL 数据库、云函数、存储桶）的安全规则和权限类别。\n\n安全规则文档：\n- 云函数安全规则：https://docs.cloudbase.net/cloud-function/security-rules\n- 存储安全规则：https://docs.cloudbase.net/storage/security-rules\n- 文档型数据库安全规则：https://docs.cloudbase.net/database/security-rules`,
      inputSchema: {
        resourceType: z
          .enum(["noSqlDatabase", "sqlDatabase", "function", "storage"])
          .describe(
            "资源类型：noSqlDatabase=noSQL 数据库，sqlDatabase=SQL 数据库，function=云函数，storage=存储桶",
          ),
        resourceId: z
          .string()
          .describe(
            "资源唯一标识。noSQL 数据库为集合名，SQL 数据库为表名，云函数为函数名，存储为桶名（完整格式如 '6169-xxx-1257473911'，可通过 envQuery action=info 获取 EnvInfo.Storages[].Bucket）。",
          ),
      },
      annotations: {
        readOnlyHint: true,
        openWorldHint: true,
        category: "security-rule",
      },
    },
    async ({ resourceType, resourceId }) => {
      const envId = await getEnvId(cloudBaseOptions);
      const cloudbase = await getManager();
      let result;
      if (resourceType === "noSqlDatabase") {
        result = await cloudbase.commonService().call({
          Action: "DescribeSafeRule",
          Param: {
            CollectionName: resourceId,
            EnvId: envId,
          },
        });
        logCloudBaseResult(server.logger, result);
      } else if (resourceType === "function") {
        result = await cloudbase.commonService().call({
          Action: "DescribeSecurityRule",
          Param: {
            ResourceType: "FUNCTION",
            EnvId: envId,
          },
        });
        logCloudBaseResult(server.logger, result);
      } else if (resourceType === "storage") {
        result = await cloudbase.commonService().call({
          Action: "DescribeStorageSafeRule",
          Param: {
            Bucket: resourceId,
            EnvId: envId,
          },
        });
        logCloudBaseResult(server.logger, result);
      } else if (resourceType === "sqlDatabase") {
        const instanceId = "default";
        const schema = envId;
        const tableName = resourceId;

        result = await cloudbase.commonService("lowcode").call({
          Action: "DescribeDataSourceBasicPolicy",
          Param: {
            EnvId: envId,
            ResourceType: "table",
            ResourceId: `${instanceId}#${schema}#${tableName}`,
            RoleIdentityList: ["allUser"],
          },
        });
        logCloudBaseResult(server.logger, result);
      } else {
        throw new Error(`不支持的资源类型: ${resourceType}`);
      }
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                resourceType,
                resourceId,
                aclTag: result.AclTag,
                rule: result.Rule ?? null,
                raw: result,
                message: "安全规则读取成功",
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  // 写入安全规则 Tool
  server.registerTool?.(
    WRITE_SECURITY_RULE,
    {
      title: "写入安全规则",
      description: `设置指定资源（数据库集合、云函数、存储桶）的安全规则。\n\n安全规则文档：\n- 云函数安全规则：https://docs.cloudbase.net/cloud-function/security-rules\n- 存储安全规则：https://docs.cloudbase.net/storage/security-rules\n- 数据库安全规则：https://docs.cloudbase.net/database/security-rules\n\n云函数安全规则仅支持 aclTag="CUSTOM"，rule 字段为 JSON 字符串。例如放开所有访问可设置 rule="true"。`,
      inputSchema: {
        resourceType: z
          .enum(["sqlDatabase", "noSqlDatabase", "function", "storage"])
          .describe(
            "资源类型：sqlDatabase=SQL 数据库，noSqlDatabase=noSQL 数据库，function=云函数，storage=存储桶",
          ),
        resourceId: z
          .string()
          .describe(
            "资源唯一标识。sqlDatabase=表名，noSqlDatabase=集合名，云函数为函数名，存储为桶名（完整格式如 '6169-xxx-1257473911'，可通过 envQuery action=info 获取 EnvInfo.Storages[].Bucket）。",
          ),
        aclTag: z
          .enum(["READONLY", "PRIVATE", "ADMINWRITE", "ADMINONLY", "CUSTOM"])
          .describe("权限类别"),
        rule: z
          .union([z.string(), z.record(z.any())])
          .optional()
          .describe(
            `自定义安全规则内容，仅当 aclTag 为 CUSTOM 时必填。可以直接传 JSON 对象，或者传可解析为 JSON 对象的字符串。函数示例：${FUNCTION_CUSTOM_RULE_EXAMPLE}`,
          ),
      },
      annotations: {
        readOnlyHint: false,
        openWorldHint: true,
        category: "security-rule",
      },
    },
    async ({ resourceType, resourceId, aclTag, rule }) => {
      try {
        const cloudbase = await getManager();
        const envId = await getEnvId(cloudBaseOptions);
        let result;
        if (resourceType === "noSqlDatabase") {
          if (aclTag === "CUSTOM") {
            const normalizedRule = normalizeCustomSecurityRule(resourceType, rule);
            result = await cloudbase.commonService().call({
              Action: "ModifySafeRule",
              Param: {
                CollectionName: resourceId,
                EnvId: envId,
                AclTag: aclTag,
                Rule: normalizedRule,
              },
            });
            logCloudBaseResult(server.logger, result);
          } else {
            result = await cloudbase.commonService().call({
              Action: "ModifyDatabaseACL",
              Param: {
                CollectionName: resourceId,
                EnvId: envId,
                AclTag: aclTag,
              },
            });
            logCloudBaseResult(server.logger, result);
          }
        } else if (resourceType === "function") {
          if (aclTag !== "CUSTOM")
            throw new Error("云函数安全规则仅支持 CUSTOM 权限类别");
          const normalizedRule = normalizeCustomSecurityRule(resourceType, rule);
          result = await cloudbase.commonService().call({
            Action: "ModifySecurityRule",
            Param: {
              AclTag: aclTag,
              EnvId: envId,
              ResourceType: "FUNCTION",
              Rule: normalizedRule,
            },
          });
          logCloudBaseResult(server.logger, result);
        } else if (resourceType === "storage") {
          if (aclTag === "CUSTOM") {
            const normalizedRule = normalizeCustomSecurityRule(resourceType, rule);
            result = await cloudbase.commonService().call({
              Action: "ModifyStorageSafeRule",
              Param: {
                Bucket: resourceId,
                EnvId: envId,
                AclTag: aclTag,
                Rule: normalizedRule,
              },
            });
            logCloudBaseResult(server.logger, result);
          } else {
            result = await cloudbase.commonService().call({
              Action: "ModifyStorageSafeRule",
              Param: {
                Bucket: resourceId,
                EnvId: envId,
                AclTag: aclTag,
              },
            });
            logCloudBaseResult(server.logger, result);
          }
        } else if (resourceType === "sqlDatabase") {
          if (aclTag === "CUSTOM") {
            throw new Error("SQL 数据库不支持自定义安全规则（CUSTOM）");
          }

          const schema = envId;
          const tableName = resourceId;
          const instanceId = "default";
          const resource = `${instanceId}#${schema}#${tableName}`;
          const resourceType = "table";
          const effect = "allow";

          const policyList = [
            "allUser",
            "anonymousUser",
            "externalUser",
            "internalUser",
          ].map((roleIdentity) => ({
            RoleIdentity: roleIdentity,
            ResourceType: resourceType,
            ResourceId: resource,
            RowPermission: [] as ReturnType<typeof getRowPermission>,
            Effect: effect,
          }));

          policyList[0].RowPermission = getRowPermission(aclTag);

          result = await cloudbase.commonService("lowcode").call({
            Action: "BatchCreateResourcePolicy",
            Param: {
              EnvId: envId,
              PolicyList: policyList,
            },
          });
          logCloudBaseResult(server.logger, result);

          function getRowPermission(
            policy: "READONLY" | "PRIVATE" | "ADMINWRITE" | "ADMINONLY",
          ) {
            return {
              READONLY: [
                { Key: "all", Value: "r" },
                { Key: "me", Value: "rw" },
              ],
              PRIVATE: [{ Key: "me", Value: "rw" }],
              ADMINWRITE: [{ Key: "all", Value: "r" }],
              ADMINONLY: [],
            }[policy];
          }
        } else {
          throw new Error(`不支持的资源类型: ${resourceType}`);
        }
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  requestId: result.RequestId,
                  raw: result,
                  message: "安全规则写入成功",
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        throw new Error(
          buildSecurityRuleErrorMessage(
            "writeSecurityRule",
            resourceType,
            aclTag,
            error,
          ),
        );
      }
    },
  );
}
