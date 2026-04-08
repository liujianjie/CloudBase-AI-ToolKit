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

  const expectedSdkHints = {
    phoneOtp: "auth.signInWithOtp({ phone })",
    emailOtp: "auth.signInWithOtp({ email })",
    password: "auth.signInWithPassword({ username|email|phone, password })",
    signup: "auth.signUp({ phone|email, ... })",
    verifyOtp: "verifyOtp({ token })",
    anonymous: "auth.signInAnonymously()",
  };

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
      KeyID: "custom-login-key-id",
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

  it("appAuth should expose the compact action surface", () => {
    const queryActions = tools.queryAppAuth.meta.inputSchema.action.options;
    const manageActions = tools.manageAppAuth.meta.inputSchema.action.options;

    expect(queryActions).toEqual([
      "getLoginConfig",
      "listProviders",
      "getProvider",
      "getClientConfig",
      "getPublishableKey",
      "getStaticDomain",
    ]);
    expect(manageActions).toEqual([
      "patchLoginStrategy",
      "updateProvider",
      "updateClientConfig",
      "ensurePublishableKey",
      "createCustomLoginKeys",
    ]);
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
      sdkStyle: "supabase-like",
      sdkHints: expectedSdkHints,
      loginMethods: {
        usernamePassword: true,
        email: true,
        anonymous: true,
        phone: false,
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
    expect(payload).toMatchObject({
      success: true,
      envId: "env-test",
      sdkStyle: "supabase-like",
      sdkHints: expectedSdkHints,
      loginMethods: {
        usernamePassword: true,
        email: true,
        anonymous: false,
        phone: false,
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
      code: "ENV_REQUIRED",
    });
  });

  it("queryAppAuth should keep auth-required errors distinct from env-required errors", async () => {
    mockGetEnvId.mockRejectedValueOnce({
      name: "ToolPayloadError",
      payload: { code: "AUTH_REQUIRED", message: "请先登录" },
    });

    const result = await tools.queryAppAuth.handler({ action: "getLoginConfig" });
    const payload = JSON.parse(result.content[0].text);

    expect(payload).toEqual({
      success: false,
      error: "authentication required",
      code: "AUTH_REQUIRED",
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
      envId: "env-test",
      providerId: "email",
    });
  });

  it("queryAppAuth(action=getClientConfig) should call DescribeClient with EnvId and default Id", async () => {
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
      envId: "env-test",
      clientId: "env-test",
      clientConfig: {
        Id: "env-test",
        AccessTokenExpiresIn: 7200,
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

  it("manageAppAuth(action=updateClientConfig) should default clientId to envId and return confirmed config", async () => {
    mockTcbCall
      .mockResolvedValueOnce({ RequestId: "req-update-client" })
      .mockResolvedValueOnce({
        RequestId: "req-describe-client",
        Id: "env-test",
        AccessTokenExpiresIn: 3600,
        RefreshTokenExpiresIn: 2592000,
        MaxDevice: 2,
      });

    const result = await tools.manageAppAuth.handler({
      action: "updateClientConfig",
      config: {
        AccessTokenExpiresIn: 3600,
        MaxDevice: 2,
      },
    });
    const payload = JSON.parse(result.content[0].text);

    expect(mockTcbCall).toHaveBeenNthCalledWith(1, {
      Action: "ModifyClient",
      Param: {
        EnvId: "env-test",
        Id: "env-test",
        AccessTokenExpiresIn: 3600,
        MaxDevice: 2,
      },
    });
    expect(mockTcbCall).toHaveBeenNthCalledWith(2, {
      Action: "DescribeClient",
      Param: {
        EnvId: "env-test",
        Id: "env-test",
      },
    });
    expect(payload).toMatchObject({
      success: true,
      envId: "env-test",
      clientId: "env-test",
      clientConfig: {
        AccessTokenExpiresIn: 3600,
        RefreshTokenExpiresIn: 2592000,
        MaxDevice: 2,
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
      envId: "env-test",
      cdnDomain: "env-test.cdn.tcloudbaseapp.com",
      staticDomain: "env-test.cdn.tcloudbaseapp.com",
      staticStores: [
        expect.objectContaining({ CdnDomain: "env-test.cdn.tcloudbaseapp.com" }),
      ],
    });
  });

  it("queryAppAuth(action=getPublishableKey) should force publish_key lookup and return a short payload", async () => {
    mockTcbCall.mockResolvedValue({
      RequestId: "req-api-key-list",
      ApiKeyList: [
        {
          Name: "publish_key",
          KeyId: "publish-key-id",
          ApiKey: "publish-key-token",
          ExpireAt: "2099-03-16T15:48:48+08:00",
          CreateAt: "2026-03-16T15:48:48+08:00",
        },
      ],
      Total: 1,
    });

    const result = await tools.queryAppAuth.handler({ action: "getPublishableKey" });
    const payload = JSON.parse(result.content[0].text);

    expect(mockTcbCall).toHaveBeenCalledWith({
      Action: "DescribeApiKeyList",
      Param: {
        EnvId: "env-test",
        KeyType: "publish_key",
        PageNumber: 1,
        PageSize: 10,
      },
    });
    expect(payload).toMatchObject({
      success: true,
      envId: "env-test",
      sdkStyle: "supabase-like",
      sdkHints: expectedSdkHints,
      publishableKey: "publish-key-token",
      keyId: "publish-key-id",
      keyName: "publish_key",
      expireAt: "2099-03-16T15:48:48+08:00",
      createdAt: "2026-03-16T15:48:48+08:00",
    });
  });

  it("manageAppAuth(action=ensurePublishableKey) should reuse an existing publish_key", async () => {
    mockTcbCall.mockResolvedValueOnce({
      RequestId: "req-api-key-list",
      ApiKeyList: [
        {
          Name: "publish_key",
          KeyId: "publish-key-id",
          ApiKey: "publish-key-token",
        },
      ],
      Total: 1,
    });

    const result = await tools.manageAppAuth.handler({
      action: "ensurePublishableKey",
    });
    const payload = JSON.parse(result.content[0].text);

    expect(mockTcbCall).toHaveBeenCalledTimes(1);
    expect(mockTcbCall).toHaveBeenCalledWith({
      Action: "DescribeApiKeyList",
      Param: {
        EnvId: "env-test",
        KeyType: "publish_key",
        PageNumber: 1,
        PageSize: 10,
      },
    });
    expect(payload).toMatchObject({
      success: true,
      envId: "env-test",
      sdkStyle: "supabase-like",
      sdkHints: expectedSdkHints,
      publishableKey: "publish-key-token",
      keyId: "publish-key-id",
      keyName: "publish_key",
      created: false,
    });
  });

  it("manageAppAuth(action=ensurePublishableKey) should create publish_key when missing", async () => {
    mockTcbCall
      .mockResolvedValueOnce({
        RequestId: "req-api-key-list",
        ApiKeyList: [],
        Total: 0,
      })
      .mockResolvedValueOnce({
        RequestId: "req-create-api-key",
        Name: "publish_key",
        KeyId: "publish-key-id",
        ApiKey: "publish-key-token",
        ExpireAt: "2099-03-16T15:48:48+08:00",
        CreateAt: "2026-03-16T15:48:48+08:00",
      });

    const result = await tools.manageAppAuth.handler({
      action: "ensurePublishableKey",
    });
    const payload = JSON.parse(result.content[0].text);

    expect(mockTcbCall).toHaveBeenNthCalledWith(1, {
      Action: "DescribeApiKeyList",
      Param: {
        EnvId: "env-test",
        KeyType: "publish_key",
        PageNumber: 1,
        PageSize: 10,
      },
    });
    expect(mockTcbCall).toHaveBeenNthCalledWith(2, {
      Action: "CreateApiKey",
      Param: {
        EnvId: "env-test",
        KeyType: "publish_key",
      },
    });
    expect(payload).toMatchObject({
      success: true,
      envId: "env-test",
      sdkStyle: "supabase-like",
      sdkHints: expectedSdkHints,
      publishableKey: "publish-key-token",
      keyId: "publish-key-id",
      keyName: "publish_key",
      created: true,
    });
  });

  it("manageAppAuth(action=ensurePublishableKey) should re-read publish_key after ResourceInUse race", async () => {
    mockTcbCall
      .mockResolvedValueOnce({
        RequestId: "req-api-key-list-empty",
        ApiKeyList: [],
        Total: 0,
      })
      .mockRejectedValueOnce(new Error("[CreateApiKey] ResourceInUse"))
      .mockResolvedValueOnce({
        RequestId: "req-api-key-list-after-race",
        ApiKeyList: [
          {
            Name: "publish_key",
            KeyId: "publish-key-id",
            ApiKey: "publish-key-token",
          },
        ],
        Total: 1,
      });

    const result = await tools.manageAppAuth.handler({
      action: "ensurePublishableKey",
    });
    const payload = JSON.parse(result.content[0].text);

    expect(mockTcbCall).toHaveBeenNthCalledWith(1, {
      Action: "DescribeApiKeyList",
      Param: {
        EnvId: "env-test",
        KeyType: "publish_key",
        PageNumber: 1,
        PageSize: 10,
      },
    });
    expect(mockTcbCall).toHaveBeenNthCalledWith(2, {
      Action: "CreateApiKey",
      Param: {
        EnvId: "env-test",
        KeyType: "publish_key",
      },
    });
    expect(mockTcbCall).toHaveBeenNthCalledWith(3, {
      Action: "DescribeApiKeyList",
      Param: {
        EnvId: "env-test",
        KeyType: "publish_key",
        PageNumber: 1,
        PageSize: 10,
      },
    });
    expect(payload).toMatchObject({
      success: true,
      envId: "env-test",
      publishableKey: "publish-key-token",
      keyId: "publish-key-id",
      keyName: "publish_key",
      created: false,
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
      envId: "env-test",
      privateKey: "private-key",
      keyId: "custom-login-key-id",
    });
  });
});
