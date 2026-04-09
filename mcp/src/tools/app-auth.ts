import { z } from "zod";
import { getCloudBaseManager, getEnvId, logCloudBaseResult } from "../cloudbase-manager.js";
import type { ExtendedMcpServer } from "../server.js";
import { jsonContent } from "../utils/json-content.js";
import { isToolPayloadError } from "../utils/tool-result.js";

const QUERY_APP_AUTH_ACTIONS = [
  "getLoginConfig",
  "listProviders",
  "getProvider",
  "getClientConfig",
  "listApiKeyTokens",
  "getStaticDomain",
] as const;

const MANAGE_APP_AUTH_ACTIONS = [
  "patchLoginStrategy",
  "updateProvider",
  "updateClientConfig",
  "createApiKeyToken",
  "createCustomLoginKeys",
] as const;

type QueryAppAuthAction = (typeof QUERY_APP_AUTH_ACTIONS)[number];
type ManageAppAuthAction = (typeof MANAGE_APP_AUTH_ACTIONS)[number];

type ToolEnvelope = Record<string, unknown>;

function buildEnvelope(data: Record<string, unknown>, message: string): ToolEnvelope {
  return {
    success: true,
    data,
    message,
  };
}

function buildErrorEnvelope(error: unknown): ToolEnvelope {
  return {
    success: false,
    data: {},
    message: error instanceof Error ? error.message : String(error),
  };
}

function buildShortError(error: string) {
  return {
    success: false,
    error,
  };
}

function normalizePlainObject(
  value: unknown,
  label: string,
): Record<string, unknown> | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} 必须是对象`);
  }
  return value as Record<string, unknown>;
}

function extractLoginStrategyState(value: unknown): Record<string, unknown> {
  const source = normalizePlainObject(value, "loginStrategy") ?? {};
  const data = normalizePlainObject(source.Data, "loginStrategy.Data") ?? source;

  return {
    PhoneNumberLogin: Boolean(data.PhoneNumberLogin ?? data.PhoneLogin ?? false),
    EmailLogin: Boolean(data.EmailLogin ?? false),
    AnonymousLogin: Boolean(data.AnonymousLogin ?? false),
    UserNameLogin: Boolean(data.UserNameLogin ?? data.UsernameLogin ?? false),
    ...(data.SmsVerificationConfig ? { SmsVerificationConfig: data.SmsVerificationConfig } : {}),
    ...(typeof data.Mfa === "boolean" ? { Mfa: data.Mfa } : {}),
    ...(data.MfaConfig ? { MfaConfig: data.MfaConfig } : {}),
    ...(data.PwdUpdateStrategy ? { PwdUpdateStrategy: data.PwdUpdateStrategy } : {}),
  };
}

function normalizeLoginConfigPatch(value: Record<string, unknown>) {
  const {
    PhoneLogin,
    UsernameLogin,
    usernamePassword,
    email,
    anonymous,
    phone,
    ...rest
  } = value;

  return {
    ...rest,
    ...(typeof PhoneLogin === "boolean" ? { PhoneNumberLogin: PhoneLogin } : {}),
    ...(typeof UsernameLogin === "boolean" ? { UserNameLogin: UsernameLogin } : {}),
    ...(typeof usernamePassword === "boolean" ? { UserNameLogin: usernamePassword } : {}),
    ...(typeof email === "boolean" ? { EmailLogin: email } : {}),
    ...(typeof anonymous === "boolean" ? { AnonymousLogin: anonymous } : {}),
    ...(typeof phone === "boolean" ? { PhoneNumberLogin: phone } : {}),
  };
}

function buildLoginMethods(value: unknown) {
  const state = extractLoginStrategyState(value);
  return {
    usernamePassword: Boolean(state.UserNameLogin),
    email: Boolean(state.EmailLogin),
    anonymous: Boolean(state.AnonymousLogin),
    phone: Boolean(state.PhoneNumberLogin),
  };
}

function buildWebSdkHint(loginMethods: ReturnType<typeof buildLoginMethods>) {
  if (!loginMethods.usernamePassword) {
    return {
      blocked: true,
      reason: "plain username-style identifiers require usernamePassword auth",
      nextStep: 'manageAppAuth({ action: "patchLoginStrategy", patch: { usernamePassword: true } })',
      accountInputType: "text",
      avoidEmailHelpers: true,
    };
  }

  return {
    blocked: false,
    register: "auth.signUp({ username, password })",
    login: "auth.signInWithPassword({ username, password })",
    accountInputType: "text",
    avoidEmailHelpers: true,
  };
}

function buildLoginConfigNextStep(loginMethods: ReturnType<typeof buildLoginMethods>) {
  if (loginMethods.usernamePassword) {
    return undefined;
  }

  return {
    tool: "manageAppAuth",
    action: "patchLoginStrategy",
    patch: {
      usernamePassword: true,
    },
  };
}

async function getActiveEnvId(cloudBaseOptions?: Record<string, unknown>) {
  try {
    return await getEnvId(cloudBaseOptions as any);
  } catch (error) {
    const payload =
      isToolPayloadError(error) ? error.payload : normalizePlainObject((error as any)?.payload, "error.payload");
    if (
      (payload?.code === "ENV_REQUIRED" || payload?.code === "AUTH_REQUIRED")
    ) {
      throw new Error("no active environment selected");
    }
    throw error;
  }
}

export function registerAppAuthTools(server: ExtendedMcpServer) {
  const cloudBaseOptions = server.cloudBaseOptions;
  const getManager = () => getCloudBaseManager({ cloudBaseOptions });

  const withEnvelope = async (handler: () => Promise<ToolEnvelope>) => {
    try {
      return jsonContent(await handler());
    } catch (error) {
      if (error instanceof Error && error.message === "no active environment selected") {
        return jsonContent(buildShortError(error.message));
      }
      return jsonContent(buildErrorEnvelope(error));
    }
  };

  const callControlPlaneAction = async (
    action: string,
    params?: Record<string, unknown>,
  ) => {
    const cloudbase = await getManager();
    const service = cloudbase.commonService("tcb", "2018-06-08");
    const result = await service.call({
      Action: action,
      Param: params ?? {},
    });
    logCloudBaseResult(server.logger, result);
    return result;
  };

  server.registerTool?.(
    "queryAppAuth",
    {
      title: "查询应用认证配置",
      description:
        "应用侧认证配置只读入口。用于查询登录方式、provider、publishable key、client 配置和静态域名等认证准备状态。若业务要接受普通用户名样式标识符，先查询 action=getLoginConfig；若 usernamePassword=false，下一步应立即调用 manageAppAuth(action=patchLoginStrategy, patch={ usernamePassword: true })，不要直接写 email 登录 API。",
      inputSchema: {
        action: z.enum(QUERY_APP_AUTH_ACTIONS),
        providerId: z.string().optional().describe("provider 标识，如 email、google"),
        clientId: z
          .string()
          .optional()
          .describe(
            "OAuth client_id / DescribeClient 的 Id；省略时默认使用当前环境 ID（官方文档：默认客户端）",
          ),
      },
      annotations: {
        readOnlyHint: true,
        openWorldHint: true,
        category: "auth",
      },
    },
    async ({
      action,
      providerId,
      clientId,
    }: {
      action: QueryAppAuthAction;
      providerId?: string;
      clientId?: string;
    }) =>
      withEnvelope(async () => {
        const envId = await getActiveEnvId(cloudBaseOptions as Record<string, unknown>);
        const cloudbase = await getManager();

        switch (action) {
          case "getLoginConfig": {
            // Manager SDK v5 provides a dedicated helper for login config.
            const result = await cloudbase.env.getLoginConfigListV2();
            logCloudBaseResult(server.logger, result);
            const loginMethods = buildLoginMethods(result);
            return {
              success: true,
              envId,
              loginMethods,
              ...(buildLoginConfigNextStep(loginMethods)
                ? { next_step: buildLoginConfigNextStep(loginMethods) }
                : {}),
              ...(buildWebSdkHint(loginMethods) ? { webSdkHint: buildWebSdkHint(loginMethods) } : {}),
            } as ToolEnvelope;
          }
          case "listProviders": {
            const result = await callControlPlaneAction("GetProviders", {
              EnvId: envId,
            });
            return buildEnvelope(
              {
                action,
                envId,
                providers: result.Providers ?? result.ProviderList ?? result.Data ?? result,
                raw: result,
              },
              "应用 provider 列表查询成功",
            );
          }
          case "getProvider": {
            if (!providerId) {
              throw new Error("action=getProvider 时必须提供 providerId");
            }
            const result = await callControlPlaneAction("GetProviders", {
              EnvId: envId,
            });
            const providers = (result.Providers ??
              result.ProviderList ??
              result.Data ??
              []) as Array<Record<string, unknown>>;
            const provider =
              providers.find((item) => item.Id === providerId || item.id === providerId) ?? null;
            return buildEnvelope(
              {
                action,
                envId,
                providerId,
                provider,
                raw: result,
              },
              `应用 provider ${providerId} 查询成功`,
            );
          }
          case "getClientConfig": {
            const clientRecordId = clientId ?? envId;
            const result = await callControlPlaneAction("DescribeClient", {
              EnvId: envId,
              Id: clientRecordId,
            });
            return buildEnvelope(
              {
                action,
                envId,
                clientId: clientRecordId,
                clientConfig: result,
              },
              "应用 client 配置查询成功",
            );
          }
          case "listApiKeyTokens": {
            const result = await callControlPlaneAction("DescribeApiKeyTokens", {
              EnvId: envId,
            });
            return buildEnvelope(
              {
                action,
                envId,
                apiKeyTokens: result.ApiKeyTokens ?? result.Data ?? result,
                raw: result,
              },
              "应用 publishable key 列表查询成功",
            );
          }
          case "getStaticDomain": {
            // Official API: DescribeStaticStore (see product 876 / static hosting), not DescribeStaticDomain.
            const result = await callControlPlaneAction("DescribeStaticStore", {
              EnvId: envId,
            });
            const stores = (result.Data ?? []) as Array<Record<string, unknown>>;
            const first = stores[0];
            const primaryDomain =
              (typeof first?.CdnDomain === "string" ? first.CdnDomain : undefined) ??
              (typeof first?.StaticDomain === "string" ? first.StaticDomain : undefined) ??
              null;
            return buildEnvelope(
              {
                action,
                envId,
                cdnDomain: primaryDomain,
                staticDomain: primaryDomain,
                staticStores: stores,
                raw: result,
              },
              "应用静态托管域名查询成功",
            );
          }
        }
      }),
  );

  server.registerTool?.(
    "manageAppAuth",
    {
      title: "管理应用认证配置",
      description:
        "应用侧认证配置写入口。用于修改登录方式、provider、client 配置，创建 publishable key 和自定义登录密钥。若前端登录使用普通用户名样式标识符，先执行 action=patchLoginStrategy 并传入 patch={ usernamePassword: true }；在成功返回前，不要实现 email helper 登录。",
      inputSchema: {
        action: z.enum(MANAGE_APP_AUTH_ACTIONS),
        patch: z
          .record(z.any())
          .optional()
          .describe("patchLoginStrategy 使用的简化登录策略 patch，如 { usernamePassword: true }"),
        providerId: z.string().optional().describe("provider 标识，如 email、google"),
        config: z.record(z.any()).optional().describe("provider / client / api key 的配置对象"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
        category: "auth",
      },
    },
    async ({
        action,
        patch,
        providerId,
        config,
      }: {
        action: ManageAppAuthAction;
        patch?: Record<string, unknown>;
        providerId?: string;
        config?: Record<string, unknown>;
      }) =>
      withEnvelope(async () => {
        const envId = await getActiveEnvId(cloudBaseOptions as Record<string, unknown>);
        const cloudbase = await getManager();

        switch (action) {
          case "patchLoginStrategy":
          {
            const input = normalizePlainObject(patch, "patch");
            const normalized = input ? normalizeLoginConfigPatch(input) : undefined;
            if (!normalized) {
              throw new Error("action=patchLoginStrategy 时必须提供 patch");
            }
            const current = await cloudbase.env.getLoginConfigListV2();
            const merged = {
              EnvId: envId,
              ...extractLoginStrategyState(current),
              ...normalizeLoginConfigPatch(normalized),
            };
            // Manager SDK v5 provides a dedicated helper for login config updates.
            const result = await cloudbase.env.updateLoginConfigV2(merged as any);
            logCloudBaseResult(server.logger, result);
            const confirmed = await cloudbase.env.getLoginConfigListV2();
            logCloudBaseResult(server.logger, confirmed);
            const loginMethods = buildLoginMethods(confirmed);
            return {
              success: true,
              envId,
              loginMethods,
              ...(buildLoginConfigNextStep(loginMethods)
                ? { next_step: buildLoginConfigNextStep(loginMethods) }
                : {}),
              ...(buildWebSdkHint(loginMethods) ? { webSdkHint: buildWebSdkHint(loginMethods) } : {}),
            } as ToolEnvelope;
          }
          case "updateProvider": {
            const normalized = normalizePlainObject(config, "config");
            if (!providerId) {
              throw new Error("action=updateProvider 时必须提供 providerId");
            }
            if (!normalized) {
              throw new Error("action=updateProvider 时必须提供 config");
            }
            const result = await callControlPlaneAction("ModifyProvider", {
              EnvId: envId,
              Id: providerId,
              ...normalized,
            });
            return buildEnvelope(
              {
                action,
                envId,
                providerId,
                raw: result,
              },
              `应用 provider ${providerId} 更新成功`,
            );
          }
          case "updateClientConfig": {
            const normalized = normalizePlainObject(config, "config");
            if (!normalized) {
              throw new Error("action=updateClientConfig 时必须提供 config");
            }
            const result = await callControlPlaneAction("ModifyClient", {
              EnvId: envId,
              ...normalized,
            });
            return buildEnvelope(
              {
                action,
                envId,
                raw: result,
              },
              "应用 client 配置更新成功",
            );
          }
          case "createApiKeyToken": {
            const normalized = normalizePlainObject(config, "config");
            const result = await callControlPlaneAction("CreateApiKeyToken", {
              EnvId: envId,
              ...(normalized ?? {}),
            });
            return buildEnvelope(
              {
                action,
                envId,
                raw: result,
              },
              "应用 publishable key 创建成功",
            );
          }
          case "createCustomLoginKeys": {
            const result = await cloudbase.env.createCustomLoginKeys();
            logCloudBaseResult(server.logger, result);
            return buildEnvelope(
              {
                action,
                envId,
                raw: result,
              },
              "自定义登录密钥创建成功",
            );
          }
        }
      }),
  );
}
