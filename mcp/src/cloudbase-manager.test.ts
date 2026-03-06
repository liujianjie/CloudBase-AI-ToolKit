import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToolPayloadError } from "./utils/tool-result.js";

const mockAuthGetProgressState = vi.fn();
const mockPeekLoginState = vi.fn();
const mockEnsureLogin = vi.fn();
const mockCommonServiceCall = vi.fn();
const mockListEnvs = vi.fn();

vi.mock("./auth.js", () => ({
  getAuthProgressState: mockAuthGetProgressState,
  peekLoginState: mockPeekLoginState,
  getLoginState: mockEnsureLogin,
}));

vi.mock("@cloudbase/manager-node", () => ({
  default: vi.fn().mockImplementation(() => ({
    commonService: vi.fn(() => ({
      call: mockCommonServiceCall,
    })),
    env: {
      listEnvs: mockListEnvs,
    },
  })),
}));

describe("cloudbase manager auth gate", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env.CLOUDBASE_ENV_ID;
    mockAuthGetProgressState.mockResolvedValue({
      status: "IDLE",
      updatedAt: Date.now(),
    });
    mockPeekLoginState.mockResolvedValue(null);
    mockEnsureLogin.mockResolvedValue(null);
    mockCommonServiceCall.mockResolvedValue({
      EnvList: [],
    });
    mockListEnvs.mockResolvedValue({
      EnvList: [],
    });
  });

  it("should fail fast with AUTH_REQUIRED when login is missing", async () => {
    const { getCloudBaseManager } = await import("./cloudbase-manager.js");

    await expect(getCloudBaseManager()).rejects.toMatchObject({
      name: "ToolPayloadError",
      payload: expect.objectContaining({
        code: "AUTH_REQUIRED",
        next_step: expect.objectContaining({
          tool: "login",
          action: "start_auth",
        }),
      }),
    });
  });

  it("should fail fast with AUTH_PENDING when device auth is in progress", async () => {
    mockAuthGetProgressState.mockResolvedValue({
      status: "PENDING",
      updatedAt: Date.now(),
      authChallenge: {
        user_code: "WDJB-MJHT",
        verification_uri: "https://example.com/device",
        device_code: "device-code",
        expires_in: 600,
      },
    });

    const { getCloudBaseManager } = await import("./cloudbase-manager.js");

    await expect(getCloudBaseManager()).rejects.toMatchObject({
      name: "ToolPayloadError",
      payload: expect.objectContaining({
        code: "AUTH_PENDING",
        auth_challenge: expect.objectContaining({
          user_code: "WDJB-MJHT",
        }),
        next_step: expect.objectContaining({
          tool: "login",
          action: "status",
        }),
      }),
    });
  });

  it("should fail fast with ENV_REQUIRED when login exists but env is missing", async () => {
    mockPeekLoginState.mockResolvedValue({
      secretId: "sid",
      secretKey: "skey",
      token: "token",
    });
    mockCommonServiceCall.mockResolvedValue({
      EnvList: [
        {
          EnvId: "env-1",
          Alias: "prod",
          Region: "ap-shanghai",
        },
      ],
    });

    const { getCloudBaseManager } = await import("./cloudbase-manager.js");

    await expect(getCloudBaseManager()).rejects.toMatchObject({
      name: "ToolPayloadError",
      payload: expect.objectContaining({
        code: "ENV_REQUIRED",
        env_candidates: [
          expect.objectContaining({
            envId: "env-1",
            env_id: "env-1",
          }),
        ],
        next_step: expect.objectContaining({
          tool: "login",
          action: "select_env",
        }),
      }),
    });
  });
});
