import { describe, expect, it, vi, beforeEach } from "vitest";
import type { ExtendedMcpServer } from "../server.js";

const { mockGetCloudBaseManager, mockCreateCloudBaseManagerWithOptions } = vi.hoisted(() => ({
  mockGetCloudBaseManager: vi.fn(),
  mockCreateCloudBaseManagerWithOptions: vi.fn(),
}));

vi.mock("../cloudbase-manager.js", () => ({
  getCloudBaseManager: mockGetCloudBaseManager,
  createCloudBaseManagerWithOptions: mockCreateCloudBaseManagerWithOptions,
}));

import { registerRagTools } from "./rag.js";

function createMockServer() {
  const tools: Record<string, { meta: any; handler: (args: any) => Promise<any> }> = {};

  const server: ExtendedMcpServer = {
    registerTool: vi.fn(
      (name: string, meta: any, handler: (args: any) => Promise<any>) => {
        tools[name] = { meta, handler };
      },
    ),
  } as unknown as ExtendedMcpServer;

  return { server, tools };
}

describe("rag tools", () => {
  beforeEach(() => {
    mockGetCloudBaseManager.mockReset();
  });

  it("searchKnowledgeBase no longer requires id when mode=vector", async () => {
    const { server, tools } = createMockServer();

    await registerRagTools(server);

    await expect(
      tools.searchKnowledgeBase.handler({
        mode: "vector",
      }),
    ).rejects.toThrow("检索内容不能为空");
  });

  it("searchKnowledgeBase should expose docs mode and official app.docs actions", async () => {
    const { server, tools } = createMockServer();

    await registerRagTools(server);

    expect(tools.searchKnowledgeBase.meta.inputSchema.mode.options).toEqual(
      expect.arrayContaining(["vector", "skill", "openapi", "docs"]),
    );
    expect(tools.searchKnowledgeBase.meta.inputSchema.action).toBeDefined();
    expect(tools.searchKnowledgeBase.meta.inputSchema.moduleName).toBeDefined();
    expect(tools.searchKnowledgeBase.meta.inputSchema.input).toBeDefined();
    expect(tools.searchKnowledgeBase.meta.inputSchema.docPath).toBeDefined();
    expect(tools.searchKnowledgeBase.meta.inputSchema.query).toBeDefined();

    expect(
      tools.searchKnowledgeBase.meta.inputSchema.action.unwrap().options,
    ).toEqual(
      expect.arrayContaining([
        "listModules",
        "listModuleDocs",
        "findByName",
        "readDoc",
        "searchDocs",
      ]),
    );
  });

  it("searchKnowledgeBase docs mode should use public docs sdk without requiring login", async () => {
    const { server, tools } = createMockServer();
    const searchDocs = vi.fn().mockResolvedValue([
      {
        title: "云函数超时说明",
        url: "https://docs.cloudbase.net/cloud-function/timeout",
        content: "云函数默认超时时间说明",
      },
    ]);

    mockGetCloudBaseManager.mockRejectedValue(new Error("AUTH_REQUIRED"));
    mockCreateCloudBaseManagerWithOptions.mockReturnValue({
      docs: {
        searchDocs,
      },
    });

    await registerRagTools(server);

    const result = await tools.searchKnowledgeBase.handler({
      mode: "docs",
      action: "searchDocs",
      query: "云函数 超时",
    });

    expect(mockGetCloudBaseManager).not.toHaveBeenCalled();
    expect(mockCreateCloudBaseManagerWithOptions).toHaveBeenCalledWith({});
    expect(searchDocs).toHaveBeenCalledWith("云函数 超时");
    expect(JSON.parse(result.content[0].text)).toMatchObject({
      success: true,
      data: {
        action: "searchDocs",
        query: "云函数 超时",
        results: [
          {
            title: "云函数超时说明",
          },
        ],
      },
    });
  });

  it("searchKnowledgeBase docs mode should validate action specific params", async () => {
    const { server, tools } = createMockServer();

    mockCreateCloudBaseManagerWithOptions.mockReturnValue({
      docs: {
        readDoc: vi.fn(),
      },
    });

    await registerRagTools(server);

    const result = await tools.searchKnowledgeBase.handler({
      mode: "docs",
      action: "readDoc",
    });

    expect(JSON.parse(result.content[0].text)).toMatchObject({
      success: false,
      message: expect.stringContaining("docPath"),
    });
  });
});
