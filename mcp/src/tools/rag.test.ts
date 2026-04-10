import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import { describe, expect, it, vi } from "vitest";
import type { ExtendedMcpServer } from "../server.js";
import { registerRagTools, resolveSkillSearchRoots } from "./rag.js";

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
  it("resolveSkillSearchRoots should prefer local generated and source skill roots before cache", async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "rag-skill-roots-"));
    const repoRoot = path.join(tempRoot, "cloudbase-turbo-delploy.feature-test");
    const cliEntryPath = path.join(repoRoot, "mcp", "dist", "cli.cjs");
    const generatedSkills = path.join(
      repoRoot,
      ".generated",
      "compat-config",
      ".codebuddy",
      "skills",
    );
    const sourceSkills = path.join(repoRoot, "config", "source", "skills");
    const cacheSkills = path.join(
      tempRoot,
      ".cloudbase-mcp",
      "web-template",
      ".claude",
      "skills",
    );

    await fs.mkdir(path.dirname(cliEntryPath), { recursive: true });
    await fs.writeFile(cliEntryPath, "");
    await fs.mkdir(generatedSkills, { recursive: true });
    await fs.mkdir(sourceSkills, { recursive: true });
    await fs.mkdir(cacheSkills, { recursive: true });

    const roots = await resolveSkillSearchRoots({
      cliEntryPath,
      homeDir: tempRoot,
    });

    expect(roots).toEqual([generatedSkills, sourceSkills, cacheSkills]);
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

  it("searchKnowledgeBase should expose skill mode and skillName", async () => {
    const { server, tools } = createMockServer();

    await registerRagTools(server);

    expect(tools.searchKnowledgeBase.meta.inputSchema.mode.options).toEqual(
      expect.arrayContaining(["vector", "skill", "openapi"]),
    );
    expect(tools.searchKnowledgeBase.meta.inputSchema.mode.options).not.toContain(
      "doc",
    );
    expect(tools.searchKnowledgeBase.meta.inputSchema.skillName).toBeDefined();
    expect(tools.searchKnowledgeBase.meta.inputSchema.docName).toBeUndefined();
  });
});
