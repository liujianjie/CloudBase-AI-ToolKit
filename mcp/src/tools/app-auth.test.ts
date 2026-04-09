import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ExtendedMcpServer } from "../server.js";
import { registerAppAuthTools } from "./app-auth.js";

const {
  mockGetCloudBaseManager,
  mockGetEnvId,
  mockLogCloudBaseResult,
  mockTcbCall,
  mockCreateCustomLoginKeys,
  mockGetLoginConfigListV2,
  mockUpdateLoginConfigV2,
} = vi.hoisted(() => ({
  mockGetCloudBaseManager: vi.fn(),
  mockGetEnvId: vi.fn(),
  mockLogCloudBaseResult: vi.fn(),
  mockTcbCall: vi.fn(),
  mockCreateCustomLoginKeys: vi.fn(),
  mockGetLoginConfigListV2: vi.fn(),
  mockUpdateLoginConfigV2: vi.fn(),
}));

vi.mock("../cloudbase-manager.js", () => ({
  getCloudBaseManager: mockGetCloudBaseManager,
  getEnvId: mockGetEnvId,
  logCloudBaseResult: mockLogCloudBaseResult,
}));

function createMockServer() {
  const tools: Record<string, { meta: any; handler: (args: any) => Promise<any> }> = {};

  const server: ExtendedMcpServer = {
    cloudBaseOptions: { envId: "env-test", region: "ap-guangzhou" },
    logger: vi.fn(),
    registerTool: vi.fn((name, meta, handler) => {
      tools[name] = { meta, handler };
    }),
  } as unknown as ExtendedMcpServer;

  registerAppAuthTools(server);

  return { tools };
}

describe("app auth tools", () => {
  let tools: ReturnType<typeof createMockServer>["tools"];

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetEnvId.mockResolvedValue("env-test");
    mockGetLoginConfigListV2.mockResolvedValue({
      AnonymousLogin: true,
      UserNameLogin: true,
      PhoneNumberLogin: false,
      EmailLogin: true,
      SmsVerificationConfig: { Type: "default" },
      MfaConfig: null,
      PwdUpdateStrategy: null,
    });
    mockUpdateLoginConfigV2.mockResolvedValue(true);
    mockTcbCall.mockResolvedValue({
      AnonymousLogin: true,
      UserNameLogin: true,
      PhoneNumberLogin: false,
      EmailLogin: true,
      SmsVerificationConfig: { Type: "default" },
      MfaConfig: null,
      PwdUpdateStrategy: null,
    });
    mockCreateCustomLoginKeys.mockResolvedValue({
      PrivateKey: "private-key",
      PublicKey: "public-key",
      RequestId: "req-auth-keys",
    });
    mockGetCloudBaseManager.mockResolvedValue({
      commonService: vi.fn(() => ({
        call: mockTcbCall,
      })),
      env: {
        getLoginConfigListV2: mockGetLoginConfigListV2,
        updateLoginConfigV2: mockUpdateLoginConfigV2,
        createCustomLoginKeys: mockCreateCustomLoginKeys,
      },
    });
    ({ tools } = createMockServer());
  });

  it("manageAppAuth should expose patchLoginStrategy and remove updateLoginConfig", () => {
    const actions = tools.manageAppAuth.meta.inputSchema.action.options;

    expect(actions).toContain("patchLoginStrategy");
    expect(actions).not.toContain("updateLoginConfig");
    expect(tools.manageAppAuth.meta.inputSchema.loginConfig).toBeUndefined();
  });

  it("queryAppAuth(action=getLoginConfig) should use manager sdk helper", async () => {
    const result = await tools.queryAppAuth.handler({ action: "getLoginConfig" });
    const payload = JSON.parse(result.content[0].text);

    expect(mockGetLoginConfigListV2).toHaveBeenCalled();
    expect(mockTcbCall).not.toHaveBeenCalledWith({
      Action: "DescribeLoginConfig",
      Param: { EnvId: "env-test" },
    });
    expect(payload).toMatchObject({
      success: true,
      envId: "env-test",
      loginMethods: {
        usernamePassword: true,
        email: true,
        anonymous: true,
        phone: false,
      },
      webSdkHint: {
        blocked: false,
        register: "auth.signUp({ username, password })",
        login: "auth.signInWithPassword({ username, password })",
        accountInputType: "text",
        avoidEmailHelpers: true,
      },
    });
  });

  it("manageAppAuth(action=patchLoginStrategy) should use manager sdk helper", async () => {
    mockGetLoginConfigListV2
      .mockResolvedValueOnce({
        AnonymousLogin: true,
        UserNameLogin: true,
        PhoneNumberLogin: false,
        EmailLogin: true,
        SmsVerificationConfig: { Type: "default" },
      })
      .mockResolvedValueOnce({
        AnonymousLogin: false,
        UserNameLogin: true,
        PhoneNumberLogin: false,
        EmailLogin: true,
        SmsVerificationConfig: { Type: "default" },
      });

    const result = await tools.manageAppAuth.handler({
      action: "patchLoginStrategy",
      patch: {
        usernamePassword: true,
        anonymous: false,
      },
    });
    const payload = JSON.parse(result.content[0].text);

    expect(mockGetLoginConfigListV2).toHaveBeenCalledTimes(2);
    expect(mockUpdateLoginConfigV2).toHaveBeenCalledWith({
      EnvId: "env-test",
      PhoneNumberLogin: false,
      EmailLogin: true,
      AnonymousLogin: false,
      UserNameLogin: true,
      SmsVerificationConfig: { Type: "default" },
    });
    expect(mockTcbCall).not.toHaveBeenCalledWith({
      Action: "ModifyLoginConfig",
      Param: {
        EnvId: "env-test",
        AnonymousLogin: false,
        UserNameLogin: true,
      },
    });
    expect(payload).toMatchObject({
      success: true,
      envId: "env-test",
      loginMethods: {
        usernamePassword: true,
        email: true,
        anonymous: false,
        phone: false,
      },
      webSdkHint: {
        blocked: false,
        register: "auth.signUp({ username, password })",
        login: "auth.signInWithPassword({ username, password })",
        accountInputType: "text",
        avoidEmailHelpers: true,
      },
    });
  });

  it("queryAppAuth should return a short error when no active environment is selected", async () => {
    mockGetEnvId.mockRejectedValueOnce({
      name: "ToolPayloadError",
      payload: { code: "ENV_REQUIRED", message: "请选择环境" },
    });

    const result = await tools.queryAppAuth.handler({ action: "getLoginConfig" });
    const payload = JSON.parse(result.content[0].text);

    expect(payload).toEqual({
      success: false,
      error: "no active environment selected",
    });
  });

  it("queryAppAuth(action=getLoginConfig) should return next_step when username login is disabled", async () => {
    mockGetLoginConfigListV2.mockResolvedValueOnce({
      AnonymousLogin: true,
      UserNameLogin: false,
      PhoneNumberLogin: false,
      EmailLogin: true,
    });

    const result = await tools.queryAppAuth.handler({ action: "getLoginConfig" });
    const payload = JSON.parse(result.content[0].text);

    expect(payload).toMatchObject({
      success: true,
      envId: "env-test",
      loginMethods: {
        usernamePassword: false,
        email: true,
        anonymous: true,
        phone: false,
      },
      next_step: {
        tool: "manageAppAuth",
        action: "patchLoginStrategy",
        patch: {
          usernamePassword: true,
        },
      },
      webSdkHint: {
        blocked: true,
        reason: "plain username-style identifiers require usernamePassword auth",
        nextStep:
          'manageAppAuth({ action: "patchLoginStrategy", patch: { usernamePassword: true } })',
        accountInputType: "text",
        avoidEmailHelpers: true,
      },
    });
  });

  it("manageAppAuth(action=updateProvider) should call ModifyProvider", async () => {
    mockTcbCall.mockResolvedValue({
      RequestId: "req-provider-update",
    });

    const result = await tools.manageAppAuth.handler({
      action: "updateProvider",
      providerId: "email",
      config: {
        On: "TRUE",
      },
    });
    const payload = JSON.parse(result.content[0].text);

    expect(mockTcbCall).toHaveBeenCalledWith({
      Action: "ModifyProvider",
      Param: {
        EnvId: "env-test",
        Id: "email",
        On: "TRUE",
      },
    });
    expect(payload).toMatchObject({
      success: true,
      data: {
        action: "updateProvider",
        envId: "env-test",
        providerId: "email",
      },
    });
  });

  it("queryAppAuth(action=getClientConfig) should call DescribeClient with EnvId and Id", async () => {
    mockTcbCall.mockResolvedValue({
      RequestId: "req-client",
      Id: "env-test",
      AccessTokenExpiresIn: 7200,
    });

    const result = await tools.queryAppAuth.handler({ action: "getClientConfig" });
    const payload = JSON.parse(result.content[0].text);

    expect(mockTcbCall).toHaveBeenCalledWith({
      Action: "DescribeClient",
      Param: {
        EnvId: "env-test",
        Id: "env-test",
      },
    });
    expect(payload).toMatchObject({
      success: true,
      data: {
        action: "getClientConfig",
        envId: "env-test",
        clientId: "env-test",
        clientConfig: {
          Id: "env-test",
          AccessTokenExpiresIn: 7200,
        },
      },
    });
  });

  it("queryAppAuth(action=getClientConfig) should pass clientId as DescribeClient Id", async () => {
    mockTcbCall.mockResolvedValue({ RequestId: "req-client-2" });

    await tools.queryAppAuth.handler({
      action: "getClientConfig",
      clientId: "custom-client-id",
    });

    expect(mockTcbCall).toHaveBeenCalledWith({
      Action: "DescribeClient",
      Param: {
        EnvId: "env-test",
        Id: "custom-client-id",
      },
    });
  });

  it("queryAppAuth(action=getStaticDomain) should call DescribeStaticStore", async () => {
    mockTcbCall.mockResolvedValue({
      RequestId: "req-static",
      Data: [
        {
          EnvId: "env-test",
          CdnDomain: "env-test.cdn.tcloudbaseapp.com",
          Status: "online",
        },
      ],
    });

    const result = await tools.queryAppAuth.handler({ action: "getStaticDomain" });
    const payload = JSON.parse(result.content[0].text);

    expect(mockTcbCall).toHaveBeenCalledWith({
      Action: "DescribeStaticStore",
      Param: { EnvId: "env-test" },
    });
    expect(payload).toMatchObject({
      success: true,
      data: {
        action: "getStaticDomain",
        envId: "env-test",
        cdnDomain: "env-test.cdn.tcloudbaseapp.com",
        staticDomain: "env-test.cdn.tcloudbaseapp.com",
        staticStores: [
          expect.objectContaining({ CdnDomain: "env-test.cdn.tcloudbaseapp.com" }),
        ],
      },
    });
  });

  it("manageAppAuth(action=createCustomLoginKeys) should use manager sdk helper", async () => {
    const result = await tools.manageAppAuth.handler({
      action: "createCustomLoginKeys",
    });
    const payload = JSON.parse(result.content[0].text);

    expect(mockCreateCustomLoginKeys).toHaveBeenCalled();
    expect(payload).toMatchObject({
      success: true,
      data: {
        action: "createCustomLoginKeys",
        envId: "env-test",
      },
    });
  });
});
