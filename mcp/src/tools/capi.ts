import { z } from "zod";
import { getCloudBaseManager, logCloudBaseResult } from "../cloudbase-manager.js";
import { ExtendedMcpServer } from "../server.js";

const CATEGORY = "cloud-api";
const CLOUDBASE_API_DOC_URL = "https://cloud.tencent.com/document/product/876/34808";

const ALLOWED_SERVICES = [
    "tcb",
    "scf",
    "sts",
    "cam",
    "lowcode",
    "cdn",
    "vpc",
] as const;

type AllowedService = (typeof ALLOWED_SERVICES)[number];

function buildCapiErrorMessage(service: AllowedService, action: string, error: unknown): string {
    const baseMessage = error instanceof Error ? error.message : String(error);
    const suggestions: string[] = [];

    if (/invalid or not found|does not exist|not recognized/i.test(baseMessage)) {
        suggestions.push(
            `Action \`${action}\` 可能不存在或不对外开放，请确认 service=\`${service}\` 下该 Action 在当前 API 版本是否可用。`,
        );
    }

    if (/parameter\s+`?.+?`?\s+is not recognized/i.test(baseMessage)) {
        suggestions.push("请求参数名与 API 定义不一致，请核对参数字段（区分大小写）并移除未支持字段。");
    }

    if (/ECONNRESET|socket hang up|ETIMEDOUT|ENOTFOUND/i.test(baseMessage)) {
        suggestions.push("网络请求异常，建议稍后重试，并检查本地网络/代理设置。");
    }

    if (suggestions.length === 0) {
        suggestions.push("请检查 service/action/params 是否与云 API 文档一致后重试。");
    }

    return `[${service}/${action}] 调用失败: ${baseMessage}\n建议：${suggestions.join(" ")}\n参考文档：云开发 Cloud API（含云开发依赖资源接口）${CLOUDBASE_API_DOC_URL}`;
}

/**
 * Register Common Service based Cloud API tool.
 * The tool is intentionally generic; callers must read project rules or
 * skills to ensure correct API usage before invoking.
 */
export function registerCapiTools(server: ExtendedMcpServer) {
    const cloudBaseOptions = server.cloudBaseOptions;
    const logger = server.logger;
    const getManager = () => getCloudBaseManager({ cloudBaseOptions });

    server.registerTool?.(
        "callCloudApi",
        {
            title: "调用云API",
            description:
                "通用的云 API 调用工具，使用前请务必先阅读相关rules或skills，确认所需服务、Action 与 Param 的正确性和安全性",
            inputSchema: {
                service: z
                    .enum(ALLOWED_SERVICES)
                    .describe(
                        "选择要访问的服务，必须先查看规则/技能确认是否可用。可选：tcb、scf、sts、cam、lowcode、cdn、vpc。",
                    ),
                action: z
                    .string()
                    .min(1)
                    .describe("具体 Action 名称，需符合对应服务的 API 定义。"),
                params: z
                    .record(z.any())
                    .optional()
                    .describe(
                        "Action 对应的参数对象，键名需与官方 API 定义一致。某些 Action 需要携带 EnvId 等信息，如不清楚请在调用前查看rules/skill。",
                    ),
            },
            annotations: {
                readOnlyHint: false,
                destructiveHint: true,
                idempotentHint: false,
                openWorldHint: true,
                category: CATEGORY,
            },
        },
        async ({
            service,
            action,
            params,
        }: {
            service: AllowedService;
            action: string;
            params?: Record<string, any>;
        }) => {
            if (!ALLOWED_SERVICES.includes(service)) {
                throw new Error(
                    `Service ${service} is not allowed. Allowed services: ${ALLOWED_SERVICES.join(", ")}`,
                );
            }

            const cloudbase = await getManager();
            if (['1', 'true'].includes(process.env.CLOUDBASE_EVALUATE_MODE ?? '')) {
                if (service === 'lowcode') {
                    throw new Error(`${service}/${action} Cloud API is not exposed or does not exist. Please use another API.`);
                }
                if (service === 'tcb') {
                    const tcbCapiForbidList = [
                        // 未明确对外的云API
                        'DescribeStorageACL', 'ModifyStorageACL', 'DescribeSecurityRule',

                        // 要下线的云API
                        "ListTables",
                        "DescribeCloudBaseGWAPI",
                        "DescribeCloudBaseGWService",
                        "CreateCloudBaseGWAPI",
                        "DeleteCloudBaseGWAPI",
                        "ModifyCloudBaseGWAPI",
                        "DeleteCloudBaseGWDomain",
                        "BindCloudBaseGWDomain",
                        "BindCloudBaseAccessDomain"

                    ];

                    if (tcbCapiForbidList.includes(action)) {
                        throw new Error(`${service}/${action} Cloud API is not exposed or does not exist. Please use another API.`);
                    }
                }
            }

            let result: unknown;
            try {
                result = await cloudbase.commonService(service).call({
                    Action: action,
                    Param: params ?? {},
                });
            } catch (error) {
                throw new Error(buildCapiErrorMessage(service, action, error));
            }
            logCloudBaseResult(logger, result);

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(
                            result,
                            null,
                            2,
                        ),
                    },
                ],
            };
        },
    );
}
