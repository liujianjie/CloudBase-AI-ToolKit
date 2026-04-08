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
  "getPublishableKey",
  "getStaticDomain",
] as const;

const MANAGE_APP_AUTH_ACTIONS = [
  "patchLoginStrategy",
  "updateProvider",
  "updateClientConfig",
  "ensurePublishableKey",
  "createCustomLoginKeys",
] as const;

type QueryAppAuthAction = (typeof QUERY_APP_AUTH_ACTIONS)[number];
type ManageAppAuthAction = (typeof MANAGE_APP_AUTH_ACTIONS)[number];

const SUPABASE_LIKE_SDK_HINTS = {
  phoneOtp: "auth.signInWithOtp({ phone })",
  emailOtp: "auth.signInWithOtp({ email })",
  password: "auth.signInWithPassword({ username|email|phone, password })",
  signup: "auth.signUp({ phone|email, ... })",
  verifyOtp: "verifyOtp({ token })",
  anonymous: "auth.signInAnonymously()",
} as const;

function buildErrorEnvelope(error: unknown) {
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

function buildShortErrorWithCode(error: string, code: string) {
  return {
    success: false,
    error,
    code,
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

function omitKeys(
  value: Record<string, unknown> | undefined,
  keys: string[],
): Record<string, unknown> | undefined {
  if (!value) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(value).filter(([key]) => !keys.includes(key)),
  );
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

function extractProviders(value: unknown): Array<Record<string, unknown>> {
  const payload = normalizePlainObject(value, "providersResult");
  const providers = payload?.Providers ?? payload?.ProviderList ?? payload?.Data ?? [];
  return Array.isArray(providers) ? (providers as Array<Record<string, unknown>>) : [];
}

function extractStaticStores(value: unknown): Array<Record<string, unknown>> {
  const payload = normalizePlainObject(value, "staticStoreResult");
  const stores = payload?.Data ?? [];
  return Array.isArray(stores) ? (stores as Array<Record<string, unknown>>) : [];
}

function extractApiKeyList(value: unknown): Array<Record<string, unknown>> {
  const payload = normalizePlainObject(value, "apiKeyResult");
  const items = payload?.ApiKeyList ?? payload?.Data ?? [];
  return Array.isArray(items) ? (items as Array<Record<string, unknown>>) : [];
}

function findPublishableKey(value: unknown): Record<string, unknown> | null {
  const apiKeys = extractApiKeyList(value);
  return (
    apiKeys.find(
      (item) =>
        item.Name === "publish_key" ||
        item.KeyName === "publish_key" ||
        item.KeyType === "publish_key",
    ) ?? null
  );
}

function buildPublishableKeyResponse(
  envId: string,
  record: Record<string, unknown> | null,
  options?: { created?: boolean },
) {
  return {
    success: true,
    envId,
    sdkStyle: "supabase-like",
    sdkHints: SUPABASE_LIKE_SDK_HINTS,
    publishableKey:
      typeof record?.ApiKey === "string" ? record.ApiKey : null,
    keyId: typeof record?.KeyId === "string" ? record.KeyId : null,
    keyName:
      typeof record?.Name === "string"
        ? record.Name
        : typeof record?.KeyName === "string"
          ? record.KeyName
          : record
            ? "publish_key"
            : null,
    expireAt: typeof record?.ExpireAt === "string" ? record.ExpireAt : null,
    createdAt: typeof record?.CreateAt === "string" ? record.CreateAt : null,
    ...(typeof options?.created === "boolean" ? { created: options.created } : {}),
  };
}

function buildSupabaseLikeAuthResponse(payload: Record<string, unknown>) {
  return {
    ...payload,
    sdkStyle: "supabase-like",
    sdkHints: SUPABASE_LIKE_SDK_HINTS,
  };
}

function buildClientConfigResponse(
  envId: string,
  clientId: string,
  clientConfig: unknown,
) {
  return {
    success: true,
    envId,
    clientId,
    clientConfig,
  };
}

async function getActiveEnvId(cloudBaseOptions?: Record<string, unknown>) {
  try {
    return await getEnvId(cloudBaseOptions as any);
  } catch (error) {
    const payload =
      isToolPayloadError(error)
        ? error.payload
        : normalizePlainObject((error as any)?.payload, "error.payload");
    if (payload?.code === "ENV_REQUIRED") {
      const nextError = new Error("no active environment selected");
      (nextError as Error & { code?: string }).code = "ENV_REQUIRED";
      throw nextError;
    }
    if (payload?.code === "AUTH_REQUIRED") {
      const nextError = new Error("authentication required");
      (nextError as Error & { code?: string }).code = "AUTH_REQUIRED";
      throw nextError;
    }
    throw error;
  }
}

function isResourceInUseError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as { code?: unknown; message?: unknown; name?: unknown };
  const code = typeof candidate.code === "string" ? candidate.code : "";
  const name = typeof candidate.name === "string" ? candidate.name : "";
  const message = typeof candidate.message === "string" ? candidate.message : "";
  const haystack = `${code} ${name} ${message}`;

  return /ResourceInUse/i.test(haystack);
}

export function registerAppAuthTools(server: ExtendedMcpServer) {
  const cloudBaseOptions = server.cloudBaseOptions;
  const getManager = () => getCloudBaseManager({ cloudBaseOptions });

  const withEnvelope = async (handler: () => Promise<Record<string, unknown>>) => {
    try {
      return jsonContent(await handler());
    } catch (error) {
      if (error instanceof Error && (error.message === "no active environment selected" || error.message === "authentication required")) {
        const code = (error as Error & { code?: string }).code;
        if (code) {
          return jsonContent(buildShortErrorWithCode(error.message, code));
        }
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

  const describePublishableKey = async (envId: string) => {
    const result = await callControlPlaneAction("DescribeApiKeyList", {
      EnvId: envId,
      KeyType: "publish_key",
      PageNumber: 1,
      PageSize: 10,
    });

    return {
      result,
      record: findPublishableKey(result),
    };
  };

  server.registerTool?.(
    "queryAppAuth",
    {
      title: "查询应用认证配置",
      description:
        "应用侧认证配置只读入口。用于查询登录方式、provider、publishable key、client 配置和静态域名等认证准备状态。",
      inputSchema: {
        action: z.enum(QUERY_APP_AUTH_ACTIONS),
        providerId: z.string().optional().describe("provider 标识，如 email、google"),
        clientId: z
          .string()
          .optional()
          .describe("DescribeClient 的 Id；省略时默认使用当前环境 ID（默认客户端）"),
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
            const result = await cloudbase.env.getLoginConfigListV2();
            logCloudBaseResult(server.logger, result);
            return buildSupabaseLikeAuthResponse({
              success: true,
              envId,
              loginMethods: buildLoginMethods(result),
            });
          }
          case "listProviders": {
            const result = await callControlPlaneAction("GetProviders", {
              EnvId: envId,
            });
            return {
              success: true,
              envId,
              providers: extractProviders(result),
            };
          }
          case "getProvider": {
            if (!providerId) {
              throw new Error("action=getProvider 时必须提供 providerId");
            }

            const result = await callControlPlaneAction("GetProviders", {
              EnvId: envId,
            });
            const provider =
              extractProviders(result).find(
                (item) => item.Id === providerId || item.id === providerId,
              ) ?? null;

            return {
              success: true,
              envId,
              providerId,
              provider,
            };
          }
          case "getClientConfig": {
            const clientRecordId = clientId ?? envId;
            const result = await callControlPlaneAction("DescribeClient", {
              EnvId: envId,
              Id: clientRecordId,
            });
            return buildClientConfigResponse(envId, clientRecordId, result);
          }
          case "getPublishableKey": {
            const { record } = await describePublishableKey(envId);
            return buildPublishableKeyResponse(envId, record);
          }
          case "getStaticDomain": {
            const result = await callControlPlaneAction("DescribeStaticStore", {
              EnvId: envId,
            });
            const stores = extractStaticStores(result);
            const first = stores[0];
            const primaryDomain =
              (typeof first?.CdnDomain === "string" ? first.CdnDomain : undefined) ??
              (typeof first?.StaticDomain === "string" ? first.StaticDomain : undefined) ??
              null;

            return {
              success: true,
              envId,
              cdnDomain: primaryDomain,
              staticDomain: primaryDomain,
              staticStores: stores,
            };
          }
        }
      }),
  );

  server.registerTool?.(
    "manageAppAuth",
    {
      title: "管理应用认证配置",
      description:
        "应用侧认证配置写入口。用于修改登录方式、provider、client 配置，确保 publishable key 和创建自定义登录密钥。",
      inputSchema: {
        action: z.enum(MANAGE_APP_AUTH_ACTIONS),
        patch: z
          .record(z.any())
          .optional()
          .describe("patchLoginStrategy 使用的简化登录策略 patch，如 { usernamePassword: true }"),
        providerId: z.string().optional().describe("provider 标识，如 email、google"),
        clientId: z
          .string()
          .optional()
          .describe("updateClientConfig 时的客户端 Id；省略时默认使用当前环境 ID"),
        config: z.record(z.any()).optional().describe("provider / client 的配置对象"),
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
      clientId,
      config,
    }: {
      action: ManageAppAuthAction;
      patch?: Record<string, unknown>;
      providerId?: string;
      clientId?: string;
      config?: Record<string, unknown>;
    }) =>
      withEnvelope(async () => {
        const envId = await getActiveEnvId(cloudBaseOptions as Record<string, unknown>);
        const cloudbase = await getManager();

        switch (action) {
          case "patchLoginStrategy": {
            const input = normalizePlainObject(patch, "patch");
            const normalized = input ? normalizeLoginConfigPatch(input) : undefined;
            if (!normalized) {
              throw new Error("action=patchLoginStrategy 时必须提供 patch");
            }

            const current = await cloudbase.env.getLoginConfigListV2();
            const merged = {
              EnvId: envId,
              ...extractLoginStrategyState(current),
              ...normalized,
            };
            const result = await cloudbase.env.updateLoginConfigV2(merged as any);
            logCloudBaseResult(server.logger, result);

            const confirmed = await cloudbase.env.getLoginConfigListV2();
            logCloudBaseResult(server.logger, confirmed);

            return buildSupabaseLikeAuthResponse({
              success: true,
              envId,
              loginMethods: buildLoginMethods(confirmed),
            });
          }
          case "updateProvider": {
            const normalized = omitKeys(normalizePlainObject(config, "config"), ["EnvId", "Id"]);
            if (!providerId) {
              throw new Error("action=updateProvider 时必须提供 providerId");
            }
            if (!normalized) {
              throw new Error("action=updateProvider 时必须提供 config");
            }

            await callControlPlaneAction("ModifyProvider", {
              EnvId: envId,
              Id: providerId,
              ...normalized,
            });

            return {
              success: true,
              envId,
              providerId,
            };
          }
          case "updateClientConfig": {
            const normalized = omitKeys(normalizePlainObject(config, "config"), ["EnvId", "Id"]);
            if (!normalized) {
              throw new Error("action=updateClientConfig 时必须提供 config");
            }

            const clientRecordId = clientId ?? envId;
            await callControlPlaneAction("ModifyClient", {
              EnvId: envId,
              Id: clientRecordId,
              ...normalized,
            });
            const confirmed = await callControlPlaneAction("DescribeClient", {
              EnvId: envId,
              Id: clientRecordId,
            });

            return buildClientConfigResponse(envId, clientRecordId, confirmed);
          }
          case "ensurePublishableKey": {
            const existing = await describePublishableKey(envId);
            if (existing.record) {
              return buildPublishableKeyResponse(envId, existing.record, { created: false });
            }

            let created: unknown;
            try {
              created = await callControlPlaneAction("CreateApiKey", {
                EnvId: envId,
                KeyType: "publish_key",
              });
            } catch (error) {
              if (!isResourceInUseError(error)) {
                throw error;
              }

              const reread = await describePublishableKey(envId);
              if (!reread.record) {
                throw error;
              }
              return buildPublishableKeyResponse(envId, reread.record, { created: false });
            }

            return buildPublishableKeyResponse(envId, normalizePlainObject(created, "createdApiKey") ?? null, {
              created: true,
            });
          }
          case "createCustomLoginKeys": {
            const result = await cloudbase.env.createCustomLoginKeys();
            logCloudBaseResult(server.logger, result);
            return {
              success: true,
              envId,
              privateKey: result.PrivateKey,
              keyId: result.KeyID,
            };
          }
        }
      }),
  );
}
