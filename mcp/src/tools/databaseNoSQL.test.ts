import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ExtendedMcpServer } from "../server.js";
import { registerDatabaseTools } from "./databaseNoSQL.js";

const {
  mockGetCloudBaseManager,
  mockLogCloudBaseResult,
  mockCheckCollectionExists,
  mockDescribeCollection,
  mockCreateCollection,
  mockCommonServiceCall,
} = vi.hoisted(() => ({
  mockGetCloudBaseManager: vi.fn(),
  mockLogCloudBaseResult: vi.fn(),
  mockCheckCollectionExists: vi.fn(),
  mockDescribeCollection: vi.fn(),
  mockCreateCollection: vi.fn(),
  mockCommonServiceCall: vi.fn(),
}));

vi.mock("../cloudbase-manager.js", () => ({
  getCloudBaseManager: mockGetCloudBaseManager,
  logCloudBaseResult: mockLogCloudBaseResult,
}));

function createMockServer() {
  const tools: Record<
    string,
    {
      meta: any;
      handler: (args: any) => Promise<any>;
    }
  > = {};

  const server: ExtendedMcpServer = {
    cloudBaseOptions: {
      envId: "env-test",
      region: "ap-guangzhou",
    },
    logger: vi.fn(),
    registerTool: vi.fn(
      (name: string, meta: any, handler: (args: any) => Promise<any>) => {
        tools[name] = { meta, handler };
      },
    ),
  } as unknown as ExtendedMcpServer;

  registerDatabaseTools(server);

  return { tools };
}

describe("NoSQL database tools", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockCheckCollectionExists.mockResolvedValue({
      RequestId: "req-check",
      Exists: false,
    });
    mockDescribeCollection.mockResolvedValue({
      RequestId: "req-describe",
      IndexNum: 2,
      Indexes: [],
    });
    mockCreateCollection.mockResolvedValue({
      RequestId: "req-create",
    });
    mockCommonServiceCall.mockImplementation(async ({ Action }) => {
      if (Action === "QueryRecords") {
        return {
          RequestId: "req-query",
          Data: [
            "{\"_id\":\"doc-1\",\"name\":\"chain_nosql_probe_001\",\"status\":\"active\"}",
          ],
          Pager: {
            Total: 1,
            Limit: 100,
            Offset: 0,
          },
        };
      }

      if (Action === "PutItem") {
        return {
          RequestId: "req-insert",
          InsertedIds: ["doc-1"],
        };
      }

      throw new Error(`Unexpected action: ${Action}`);
    });
    mockGetCloudBaseManager.mockResolvedValue({
      env: {
        getEnvInfo: vi.fn().mockResolvedValue({
          EnvInfo: {
            Databases: [
              {
                InstanceId: "instance-test",
              },
            ],
          },
        }),
      },
      database: {
        checkCollectionExists: mockCheckCollectionExists,
        describeCollection: mockDescribeCollection,
        createCollection: mockCreateCollection,
      },
      commonService: vi.fn(() => ({
        call: mockCommonServiceCall,
      })),
    });
  });

  it("readNoSqlDatabaseContent should normalize stringified query records", async () => {
    const { tools } = createMockServer();

    const result = await tools.readNoSqlDatabaseContent.handler({
      collectionName: "t_nosql_orders",
      query: { name: "chain_nosql_probe_001" },
    });

    const payload = JSON.parse(result.content[0].text);

    expect(mockCommonServiceCall).toHaveBeenCalledWith(
      expect.objectContaining({
        Action: "QueryRecords",
        Param: expect.objectContaining({
          TableName: "t_nosql_orders",
          MgoQuery: JSON.stringify({ name: "chain_nosql_probe_001" }),
        }),
      }),
    );
    expect(payload).toMatchObject({
      success: true,
      collection: "t_nosql_orders",
      collectionName: "t_nosql_orders",
      requestId: "req-query",
      total: 1,
      data: [
        {
          _id: "doc-1",
          name: "chain_nosql_probe_001",
          status: "active",
        },
      ],
      pager: {
        Total: 1,
        Limit: 100,
        Offset: 0,
      },
    });
    expect(payload).not.toHaveProperty("nextActions");
  });

  it("writeNoSqlDatabaseContent should describe partial updates using MongoDB operators", () => {
    const { tools } = createMockServer();
    const meta = tools.writeNoSqlDatabaseContent.meta;

    expect(meta.description).toContain("MongoDB updateOne/updateMany");
    expect(meta.description).toContain("$set/$inc/$push");
    expect(meta.inputSchema.update.description).toContain(
      "{ \"$set\": { \"status\": \"pending\" } }",
    );
    expect(meta.inputSchema.update.description).toContain(
      "{ \"status\": \"pending\" }",
    );
  });

  it("collection-scoped responses should echo the requested collection name", async () => {
    const { tools } = createMockServer();

    const checkResult = await tools.readNoSqlDatabaseStructure.handler({
      action: "checkCollection",
      collectionName: "t_nosql_products",
    });
    const checkPayload = JSON.parse(checkResult.content[0].text);
    expect(checkPayload.collection).toBe("t_nosql_products");
    expect(checkPayload.collectionName).toBe("t_nosql_products");

    const describeResult = await tools.readNoSqlDatabaseStructure.handler({
      action: "describeCollection",
      collectionName: "t_nosql_products",
    });
    const describePayload = JSON.parse(describeResult.content[0].text);
    expect(describePayload.collection).toBe("t_nosql_products");
    expect(describePayload.collectionName).toBe("t_nosql_products");
    expect(describePayload.message).toBe("获取云开发数据库集合信息成功");

    mockCheckCollectionExists.mockResolvedValue({
      RequestId: "req-check-ready",
      Exists: true,
    });
    const createResult = await tools.writeNoSqlDatabaseStructure.handler({
      action: "createCollection",
      collectionName: "t_nosql_products",
    });
    const createPayload = JSON.parse(createResult.content[0].text);
    expect(createPayload.collection).toBe("t_nosql_products");
    expect(createPayload.collectionName).toBe("t_nosql_products");
    expect(createPayload.action).toBe("createCollection");

    const insertResult = await tools.writeNoSqlDatabaseContent.handler({
      action: "insert",
      collectionName: "t_nosql_products",
      documents: [{ name: "chain_nosql_probe_001", status: "active" }],
    });
    const insertPayload = JSON.parse(insertResult.content[0].text);
    expect(insertPayload.collection).toBe("t_nosql_products");
    expect(insertPayload.collectionName).toBe("t_nosql_products");
    expect(insertPayload.insertedIds).toEqual(["doc-1"]);
    expect(insertPayload.insertedCount).toBe(1);
    expect(insertPayload.message).toBe("文档插入成功");
    expect(insertPayload).not.toHaveProperty("nextActions");
  });

  it("readNoSqlDatabaseContent should keep non-document strings untouched", async () => {
    mockCommonServiceCall.mockImplementationOnce(async () => ({
      RequestId: "req-query-raw",
      Data: ["raw-value"],
      Pager: {
        Total: 1,
        Limit: 100,
        Offset: 0,
      },
    }));

    const { tools } = createMockServer();
    const result = await tools.readNoSqlDatabaseContent.handler({
      collectionName: "t_nosql_products",
    });
    const payload = JSON.parse(result.content[0].text);

    expect(payload.data).toEqual(["raw-value"]);
  });
});
