import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerEnvTools } from "./env.js";
import type { ExtendedMcpServer } from "../server.js";

const {
  mockSupervisorLoginByWebAuth,
  mockEnsureLogin,
  mockPeekLoginState,
  mockGetAuthProgressState,
  mockLogout,
  mockEnvManagerSetEnvId,
  mockGetCachedEnvId,
  mockListAvailableEnvCandidates,
  mockGetCloudBaseManager,
  mockResetCloudBaseManagerCache,
} = vi.hoisted(() => ({
  mockSupervisorLoginByWebAuth: vi.fn(),
  mockEnsureLogin: vi.fn(),
  mockPeekLoginState: vi.fn(),
  mockGetAuthProgressState: vi.fn(),
  mockLogout: vi.fn(),
  mockEnvManagerSetEnvId: vi.fn(),
  mockGetCachedEnvId: vi.fn(),
  mockListAvailableEnvCandidates: vi.fn(),
  mockGetCloudBaseManager: vi.fn(),
  mockResetCloudBaseManagerCache: vi.fn(),
}));

vi.mock("@cloudbase/toolbox", () => ({
  AuthSupervisor: {
    getInstance: vi.fn(() => ({
      loginByWebAuth: mockSupervisorLoginByWebAuth,
    })),
  },
}));

vi.mock("../auth.js", () => ({
  ensureLogin: mockEnsureLogin,
  peekLoginState: mockPeekLoginState,
  getAuthProgressState: mockGetAuthProgressState,
  logout: mockLogout,
  rejectAuthProgressState: vi.fn(),
  resolveAuthProgressState: vi.fn(),
  setPendingAuthProgressState: vi.fn(),
}));

vi.mock("../cloudbase-manager.js", () => ({
  envManager: {
    setEnvId: mockEnvManagerSetEnvId,
  },
  getCachedEnvId: mockGetCachedEnvId,
  getCloudBaseManager: mockGetCloudBaseManager,
  listAvailableEnvCandidates: mockListAvailableEnvCandidates,
  logCloudBaseResult: vi.fn(),
  resetCloudBaseManagerCache: mockResetCloudBaseManagerCache,
}));

vi.mock("./rag.js", () => ({
  getClaudePrompt: vi.fn().mockResolvedValue(""),
}));

function createMockServer(ide = "TestIDE") {
  const tools: Record<
    string,
    {
      meta: any;
      handler: (args: any) => Promise<any>;
    }
  > = {};

  const server: ExtendedMcpServer = {
    cloudBaseOptions: { envId: "env-test", region: "ap-guangzhou" },
    ide,
    server: {
      sendLoggingMessage: vi.fn(),
    },
    registerTool: vi.fn(
      (name: string, meta: any, handler: (args: any) => Promise<any>) => {
        tools[name] = { meta, handler };
      },
    ),
  } as unknown as ExtendedMcpServer;

  registerEnvTools(server);

  return {
    server,
    tools,
  };
}

describe("env tools - auth", () => {
  let tools: ReturnType<typeof createMockServer>["tools"];

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCachedEnvId.mockReturnValue(null);
    mockListAvailableEnvCandidates.mockResolvedValue([]);
    mockGetAuthProgressState.mockResolvedValue({
      status: "IDLE",
      updatedAt: Date.now(),
    });
    mockPeekLoginState.mockResolvedValue(null);
    mockEnsureLogin.mockResolvedValue({
      secretId: "sid",
      secretKey: "skey",
      envId: "env-test",
    });
    ({ tools } = createMockServer());
  });

  it("should expose auth tool and remove standalone logout tool", () => {
    expect(typeof tools.auth?.handler).toBe("function");
    expect(tools.logout).toBeUndefined();
  });

  it("auth(action=status) should return structured status payload", async () => {
    const result = await tools.auth.handler({ action: "status" });
    const payload = JSON.parse(result.content[0].text);

    expect(payload).toHaveProperty("ok", true);
    expect(payload).toHaveProperty("code", "STATUS");
    expect(payload).toHaveProperty("auth_status", "REQUIRED");
    expect(payload).toHaveProperty("env_status");
    expect(payload).toHaveProperty("current_env_id");
    expect(payload.next_step).toMatchObject({
      tool: "auth",
      action: "start_auth",
    });
  });

  it("auth(action=status) should surface pending auth challenge", async () => {
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

    const result = await tools.auth.handler({ action: "status" });
    const payload = JSON.parse(result.content[0].text);

    expect(payload).toHaveProperty("auth_status", "PENDING");
    expect(payload.auth_challenge).toMatchObject({
      user_code: "WDJB-MJHT",
      verification_uri: "https://example.com/device",
      expires_in: 600,
    });
    expect(payload.next_step).toMatchObject({
      tool: "auth",
      action: "status",
    });
  });

  it("auth(action=start_auth, authMode=device) should return AUTH_PENDING immediately", async () => {
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

    const result = await tools.auth.handler({
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
      tool: "auth",
      action: "status",
    });
  });

  it("auth(action=set_env, envId) should accept direct env binding", async () => {
    mockPeekLoginState.mockResolvedValue({
      secretId: "sid",
      secretKey: "skey",
    });
    mockListAvailableEnvCandidates.mockResolvedValue([
      {
        envId: "env-test",
        alias: "test",
      },
    ]);

    const result = await tools.auth.handler({
      action: "set_env",
      envId: "env-test",
    });
    const payload = JSON.parse(result.content[0].text);

    expect(payload).toHaveProperty("code", "ENV_READY");
    expect(payload).toHaveProperty("current_env_id", "env-test");
    expect(payload.next_step).toBeUndefined();
    expect(payload.env_candidates).toBeUndefined();
    expect(mockEnvManagerSetEnvId).toHaveBeenCalledWith("env-test");
  });

  it("auth(action=logout) should clear session state", async () => {
    const result = await tools.auth.handler({
      action: "logout",
      confirm: "yes",
    });
    const payload = JSON.parse(result.content[0].text);

    expect(payload).toHaveProperty("code", "LOGGED_OUT");
    expect(payload.next_step).toBeUndefined();
    expect(mockLogout).toHaveBeenCalled();
    expect(mockResetCloudBaseManagerCache).toHaveBeenCalled();
  });

  it("CodeBuddy should only expose status and set_env actions", () => {
    const { tools: codeBuddyTools } = createMockServer("CodeBuddy");
    expect(codeBuddyTools.auth.meta.inputSchema.action.unwrap().options).toEqual([
      "status",
      "set_env",
    ]);
    expect(codeBuddyTools.auth.meta.inputSchema.authMode).toBeUndefined();
    expect(codeBuddyTools.auth.meta.inputSchema.forceUpdate).toBeUndefined();
    expect(codeBuddyTools.auth.meta.inputSchema.confirm).toBeUndefined();
  });

  it("CodeBuddy status should not recommend start_auth", async () => {
    const { tools: codeBuddyTools } = createMockServer("CodeBuddy");
    const result = await codeBuddyTools.auth.handler({ action: "status" });
    const payload = JSON.parse(result.content[0].text);

    expect(payload.next_step).toMatchObject({
      tool: "auth",
      action: "status",
    });
  });

  it("auth(action=status) should truncate env candidates and expose summary", async () => {
    mockListAvailableEnvCandidates.mockResolvedValue(
      Array.from({ length: 25 }, (_, index) => ({
        envId: `env-${index + 1}`,
        alias: `alias-${index + 1}`,
      })),
    );

    const result = await tools.auth.handler({ action: "status" });
    const payload = JSON.parse(result.content[0].text);

    expect(payload.env_candidates).toHaveLength(20);
    expect(payload.env_candidates_summary).toMatchObject({
      total: 25,
      returned: 20,
      truncated: true,
    });
  });
});

describe("env tools - envQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCachedEnvId.mockReturnValue(null);
    mockListAvailableEnvCandidates.mockResolvedValue([]);
    mockGetAuthProgressState.mockResolvedValue({
      status: "IDLE",
      updatedAt: Date.now(),
    });
    mockPeekLoginState.mockResolvedValue(null);
    mockEnsureLogin.mockResolvedValue({
      secretId: "sid",
      secretKey: "skey",
      envId: "env-test",
    });
  });

  it("envQuery(list) should support alias filters, pagination and field selection", async () => {
    mockGetCloudBaseManager.mockResolvedValue({
      commonService: vi.fn(() => ({
        call: vi.fn().mockResolvedValue({
          EnvList: [
            {
              EnvId: "env-test",
              Alias: "alpha",
              Status: "NORMAL",
              EnvType: "baas",
              Region: "ap-guangzhou",
              PackageName: "pkg-a",
              IsDefault: true,
            },
            {
              EnvId: "env-extra",
              Alias: "alpha-beta",
              Status: "NORMAL",
              EnvType: "baas",
              Region: "ap-shanghai",
              PackageName: "pkg-b",
              IsDefault: false,
            },
            {
              EnvId: "env-other",
              Alias: "gamma",
              Status: "SUSPENDED",
              EnvType: "weda",
              Region: "ap-beijing",
            },
          ],
        }),
      })),
      env: {
        listEnvs: vi.fn(),
      },
    });

    const { tools } = createMockServer();
    const result = await tools.envQuery.handler({
      action: "list",
      alias: "alpha",
      offset: 1,
      limit: 1,
      fields: ["EnvId", "Alias"],
    });
    const payload = JSON.parse(result.content[0].text);

    expect(payload.EnvList).toEqual([
      {
        EnvId: "env-extra",
        Alias: "alpha-beta",
      },
    ]);
    expect(payload.TotalCount).toBe(2);
    expect(payload.Offset).toBe(1);
    expect(payload.Limit).toBe(1);
    expect(payload.HasMore).toBe(false);
    expect(payload.AppliedFilters).toMatchObject({
      alias: "alpha",
      envId: null,
      fields: ["EnvId", "Alias"],
      currentEnvOnly: false,
    });
  });

  it("envQuery(list) should keep current-env restriction only when no explicit filter is provided", async () => {
    mockGetCloudBaseManager.mockResolvedValue({
      commonService: vi.fn(() => ({
        call: vi.fn().mockResolvedValue({
          EnvList: [
            { EnvId: "env-test", Alias: "bound" },
            { EnvId: "env-other", Alias: "other" },
          ],
        }),
      })),
      env: {
        listEnvs: vi.fn(),
      },
    });

    const { tools } = createMockServer();
    const unfiltered = JSON.parse((await tools.envQuery.handler({ action: "list" })).content[0].text);
    const filtered = JSON.parse(
      (await tools.envQuery.handler({ action: "list", envId: "env-other" })).content[0].text,
    );

    expect(unfiltered.EnvList).toEqual([{ EnvId: "env-test", Alias: "bound" }]);
    expect(unfiltered.AppliedFilters.currentEnvOnly).toBe(true);
    expect(filtered.EnvList).toEqual([{ EnvId: "env-other", Alias: "other" }]);
    expect(filtered.AppliedFilters.currentEnvOnly).toBe(false);
  });
});
