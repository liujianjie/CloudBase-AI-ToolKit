import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerEnvTools } from "./env.js";
import type { ExtendedMcpServer } from "../server.js";

const {
  mockSupervisorGetLoginState,
  mockSupervisorLoginByWebAuth,
  mockEnsureLogin,
  mockGetAuthProgressState,
  mockEnvManagerSetEnvId,
  mockGetCachedEnvId,
  mockListAvailableEnvCandidates,
} = vi.hoisted(() => ({
  mockSupervisorGetLoginState: vi.fn(),
  mockSupervisorLoginByWebAuth: vi.fn(),
  mockEnsureLogin: vi.fn(),
  mockGetAuthProgressState: vi.fn(),
  mockEnvManagerSetEnvId: vi.fn(),
  mockGetCachedEnvId: vi.fn(),
  mockListAvailableEnvCandidates: vi.fn(),
}));

vi.mock("@cloudbase/toolbox", () => ({
  AuthSupevisor: {
    getInstance: vi.fn(() => ({
      getLoginState: mockSupervisorGetLoginState,
      loginByWebAuth: mockSupervisorLoginByWebAuth,
    })),
  },
}));

vi.mock("../auth.js", () => ({
  ensureLogin: mockEnsureLogin,
  getAuthProgressState: mockGetAuthProgressState,
  logout: vi.fn(),
  rejectAuthProgressState: vi.fn(),
  resolveAuthProgressState: vi.fn(),
  setPendingAuthProgressState: vi.fn(),
}));

vi.mock("../cloudbase-manager.js", () => ({
  envManager: {
    setEnvId: mockEnvManagerSetEnvId,
  },
  getCachedEnvId: mockGetCachedEnvId,
  getCloudBaseManager: vi.fn(),
  listAvailableEnvCandidates: mockListAvailableEnvCandidates,
  logCloudBaseResult: vi.fn(),
  resetCloudBaseManagerCache: vi.fn(),
}));

vi.mock("./interactive.js", () => ({
  _promptAndSetEnvironmentId: vi.fn(),
}));

vi.mock("./rag.js", () => ({
  getClaudePrompt: vi.fn().mockResolvedValue(""),
}));

function createMockServer() {
  const tools: Record<
    string,
    {
      handler: (args: any) => Promise<any>;
    }
  > = {};

  const server: ExtendedMcpServer = {
    cloudBaseOptions: { envId: "env-test", region: "ap-guangzhou" },
    ide: "TestIDE",
    server: {
      sendLoggingMessage: vi.fn(),
    },
    registerTool: vi.fn(
      (name: string, _meta: any, handler: (args: any) => Promise<any>) => {
        tools[name] = { handler };
      },
    ),
  } as unknown as ExtendedMcpServer;

  registerEnvTools(server);

  return {
    server,
    tools,
  };
}

describe("env tools - login", () => {
  let tools: ReturnType<typeof createMockServer>["tools"];

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCachedEnvId.mockReturnValue(null);
    mockListAvailableEnvCandidates.mockResolvedValue([]);
    mockGetAuthProgressState.mockResolvedValue({
      status: "IDLE",
      updatedAt: Date.now(),
    });
    mockSupervisorGetLoginState.mockResolvedValue(null);
    mockEnsureLogin.mockResolvedValue({
      secretId: "sid",
      secretKey: "skey",
      envId: "env-test",
    });
    ({ tools } = createMockServer());
  });

  it("should expose login tool", () => {
    expect(typeof tools.login?.handler).toBe("function");
  });

  it("login(action=status) should return structured status payload", async () => {
    const result = await tools.login.handler({ action: "status" });
    const payload = JSON.parse(result.content[0].text);

    expect(payload).toHaveProperty("ok", true);
    expect(payload).toHaveProperty("code", "STATUS");
    expect(payload).toHaveProperty("auth_status", "REQUIRED");
    expect(payload).toHaveProperty("env_status");
    expect(payload).toHaveProperty("current_env_id");
    expect(payload.next_step).toMatchObject({
      tool: "login",
      action: "start_auth",
    });
  });

  it("login(action=status) should surface pending auth challenge", async () => {
    mockGetAuthProgressState.mockResolvedValue({
      status: "PENDING",
      updatedAt: Date.now(),
      authChallenge: {
        user_code: "WDJB-MJHT",
        verification_uri: "https://example.com/device",
        device_code: "device-code",
        expires_in: 600,
      },
    });

    const result = await tools.login.handler({ action: "status" });
    const payload = JSON.parse(result.content[0].text);

    expect(payload).toHaveProperty("auth_status", "PENDING");
    expect(payload.auth_challenge).toMatchObject({
      user_code: "WDJB-MJHT",
      verification_uri: "https://example.com/device",
      expires_in: 600,
    });
    expect(payload.next_step).toMatchObject({
      tool: "login",
      action: "status",
    });
  });

  it("login(action=start_auth, authMode=device) should return AUTH_PENDING immediately", async () => {
    mockSupervisorLoginByWebAuth.mockImplementation(
      async ({ onDeviceCode }: { onDeviceCode: (info: any) => void }) => {
        onDeviceCode({
          user_code: "WDJB-MJHT",
          verification_uri: "https://example.com/device",
          device_code: "device-code",
          expires_in: 600,
        });
        return new Promise(() => {});
      },
    );

    const result = await tools.login.handler({
      action: "start_auth",
      authMode: "device",
    });
    const payload = JSON.parse(result.content[0].text);

    expect(payload).toHaveProperty("code", "AUTH_PENDING");
    expect(payload.auth_challenge).toMatchObject({
      user_code: "WDJB-MJHT",
      verification_uri: "https://example.com/device",
      expires_in: 600,
    });
    expect(payload.next_step).toMatchObject({
      tool: "login",
      action: "status",
    });
  });

  it("login(action=select_env, envId) should accept direct env selection shape", async () => {
    mockListAvailableEnvCandidates.mockResolvedValue([
      {
        envId: "env-test",
        env_id: "env-test",
        alias: "test",
      },
    ]);

    const result = await tools.login.handler({
      action: "select_env",
      envId: "env-test",
    });
    const payload = JSON.parse(result.content[0].text);

    expect(payload).toHaveProperty("code", "ENV_READY");
    expect(payload).toHaveProperty("current_env_id", "env-test");
    expect(payload.next_step).toMatchObject({
      tool: "login",
      action: "ensure",
    });
    expect(mockEnvManagerSetEnvId).toHaveBeenCalledWith("env-test");
  });
});

