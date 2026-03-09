import { describe, expect, it, vi } from "vitest";
import { wrapServerWithTelemetry } from "./tool-wrapper.js";
import { ToolPayloadError } from "./tool-result.js";

vi.mock("./cloud-mode.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./cloud-mode.js")>();
  return {
    ...actual,
    shouldRegisterTool: vi.fn(() => true),
  };
});

vi.mock("./telemetry.js", () => ({
  reportToolCall: vi.fn(() => Promise.resolve()),
}));

describe("wrapServerWithTelemetry", () => {
  it("should preserve ToolPayloadError for outer server wrapper", async () => {
    let wrappedHandler: ((args: any) => Promise<any>) | undefined;

    const server = {
      registerTool: vi.fn((_name: string, _meta: any, handler: (args: any) => Promise<any>) => {
        wrappedHandler = handler;
        return undefined;
      }),
      logger: vi.fn(),
      cloudBaseOptions: undefined,
      ide: "Cursor",
    } as any;

    wrapServerWithTelemetry(server);
    server.registerTool("demo", {}, async () => {
      throw new ToolPayloadError({
        ok: false,
        code: "ENV_REQUIRED",
        message: "当前已登录，但尚未绑定环境，请先调用 auth 工具选择环境。",
        next_step: {
          tool: "auth",
          action: "set_env",
          required_params: ["envId"],
        },
      });
    });

    await expect(wrappedHandler?.({})).rejects.toMatchObject({
      name: "ToolPayloadError",
      payload: expect.objectContaining({
        code: "ENV_REQUIRED",
        next_step: expect.objectContaining({
          tool: "auth",
          action: "set_env",
        }),
      }),
    });
  });
});
