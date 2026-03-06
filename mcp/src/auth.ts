import { AuthSupevisor } from "@cloudbase/toolbox";
import { debug } from "./utils/logger.js";
import { isInternationalRegion } from "./utils/tencet-cloud.js";

const auth = AuthSupevisor.getInstance({});

export type AuthFlowMode = "web" | "device";

export interface DeviceFlowAuthInfo {
  user_code: string;
  verification_uri?: string;
  device_code: string;
  expires_in: number;
}

export type AuthProgressStatus =
  | "IDLE"
  | "PENDING"
  | "READY"
  | "DENIED"
  | "EXPIRED"
  | "ERROR";

export interface AuthProgressState {
  status: AuthProgressStatus;
  authMode?: AuthFlowMode;
  authChallenge?: DeviceFlowAuthInfo;
  lastError?: string;
  updatedAt: number;
}

const authProgressState: AuthProgressState = {
  status: "IDLE",
  updatedAt: Date.now(),
};

function updateAuthProgressState(
  partial: Partial<AuthProgressState>,
): AuthProgressState {
  Object.assign(authProgressState, partial, {
    updatedAt: Date.now(),
  });
  return getAuthProgressStateSync();
}

function normalizeLoginStateFromEnvVars(options?: {
  ignoreEnvVars?: boolean;
}) {
  const {
    TENCENTCLOUD_SECRETID,
    TENCENTCLOUD_SECRETKEY,
    TENCENTCLOUD_SESSIONTOKEN,
  } = process.env;

  if (!options?.ignoreEnvVars && TENCENTCLOUD_SECRETID && TENCENTCLOUD_SECRETKEY) {
    return {
      secretId: TENCENTCLOUD_SECRETID,
      secretKey: TENCENTCLOUD_SECRETKEY,
      token: TENCENTCLOUD_SESSIONTOKEN,
      envId: process.env.CLOUDBASE_ENV_ID,
    };
  }

  return null;
}

function mapAuthErrorStatus(error: unknown): Extract<AuthProgressStatus, "DENIED" | "EXPIRED" | "ERROR"> {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (message.includes("拒绝") || message.includes("denied")) {
    return "DENIED";
  }
  if (message.includes("过期") || message.includes("expired")) {
    return "EXPIRED";
  }
  return "ERROR";
}

export function getAuthProgressStateSync(): AuthProgressState {
  return {
    ...authProgressState,
    authChallenge: authProgressState.authChallenge
      ? { ...authProgressState.authChallenge }
      : undefined,
  };
}

export async function getAuthProgressState(): Promise<AuthProgressState> {
  const loginState = await peekLoginState();
  if (loginState && authProgressState.status === "PENDING") {
    updateAuthProgressState({
      status: "READY",
      lastError: undefined,
    });
  }

  if (
    authProgressState.status === "PENDING" &&
    authProgressState.authChallenge?.expires_in
  ) {
    const issuedAt = authProgressState.updatedAt;
    const expiresAt = issuedAt + authProgressState.authChallenge.expires_in * 1000;
    if (Date.now() > expiresAt) {
      updateAuthProgressState({
        status: "EXPIRED",
        lastError: "设备码已过期，请重新发起授权",
      });
    }
  }

  return getAuthProgressStateSync();
}

export function setPendingAuthProgressState(
  challenge: DeviceFlowAuthInfo,
  authMode: AuthFlowMode = "device",
) {
  return updateAuthProgressState({
    status: "PENDING",
    authMode,
    authChallenge: challenge,
    lastError: undefined,
  });
}

export function resolveAuthProgressState() {
  return updateAuthProgressState({
    status: "READY",
    lastError: undefined,
  });
}

export function rejectAuthProgressState(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "unknown error");
  return updateAuthProgressState({
    status: mapAuthErrorStatus(error),
    lastError: message,
  });
}

export function resetAuthProgressState() {
  return updateAuthProgressState({
    status: "IDLE",
    authMode: undefined,
    authChallenge: undefined,
    lastError: undefined,
  });
}

export async function peekLoginState(options?: {
  ignoreEnvVars?: boolean;
}) {
  const envVarLoginState = normalizeLoginStateFromEnvVars(options);
  if (envVarLoginState) {
    debug("loginByApiSecret");
    return envVarLoginState;
  }

  return auth.getLoginState();
}

export async function ensureLogin(options?: {
  fromCloudBaseLoginPage?: boolean;
  ignoreEnvVars?: boolean;
  region?: string;
  authMode?: AuthFlowMode;
  clientId?: string;
  onDeviceCode?: (info: DeviceFlowAuthInfo) => void;
}) {
  debug("TENCENTCLOUD_SECRETID", { secretId: process.env.TENCENTCLOUD_SECRETID });

  const loginState = await peekLoginState({
    ignoreEnvVars: options?.ignoreEnvVars,
  });
  if (!loginState) {
    const envMode = process.env.TCB_AUTH_MODE;
    const normalizedEnvMode =
      envMode === "web" || envMode === "device" ? envMode : undefined;
    const mode: AuthFlowMode = options?.authMode || normalizedEnvMode || "device";
    const loginOptions: Record<string, unknown> = { mode };

    if (mode === "web") {
      loginOptions.getAuthUrl =
        options?.fromCloudBaseLoginPage && !isInternationalRegion(options?.region)
          ? (url: string) => {
            const separator = url.includes("?") ? "&" : "?";
            const urlWithParam = `${url}${separator}allowNoEnv=true`;
            return `https://tcb.cloud.tencent.com/login?_redirect_uri=${encodeURIComponent(urlWithParam)}`;
          }
          : (url: string) => {
            if (isInternationalRegion(options?.region)) {
              url = url.replace("cloud.tencent.com", "tencentcloud.com");
            }
            const separator = url.includes("?") ? "&" : "?";
            return `${url}${separator}allowNoEnv=true`;
          };
    } else {
      if (options?.clientId) {
        loginOptions.client_id = options.clientId;
      }
      if (options?.onDeviceCode) {
        loginOptions.onDeviceCode = (info: DeviceFlowAuthInfo) => {
          setPendingAuthProgressState(info, mode);
          options.onDeviceCode?.(info);
        };
      }
    }
    debug("beforeloginByWebAuth", { loginOptions });
    try {
      await (auth as any).loginByWebAuth(loginOptions);
      resolveAuthProgressState();
    } catch (error) {
      rejectAuthProgressState(error);
      throw error;
    }
    const loginState = await peekLoginState({
      ignoreEnvVars: options?.ignoreEnvVars,
    });
    debug("loginByWebAuth", { mode, hasLoginState: !!loginState });
    return loginState;
  } else {
    resolveAuthProgressState();
    return loginState;
  }
}

export async function getLoginState(options?: Parameters<typeof ensureLogin>[0]) {
  return ensureLogin(options);
}

export async function logout() {
  const result = await auth.logout();
  resetAuthProgressState();
  return result;
}
