import { z } from "zod";
import {
  getCloudBaseManager,
  getEnvId,
  logCloudBaseResult,
} from "../cloudbase-manager.js";
import { ExtendedMcpServer } from "../server.js";
import { debug } from "../utils/logger.js";

import { IEnvVariable } from "@cloudbase/manager-node/types/function/types.js";
import path from "path";

export const SUPPORTED_RUNTIMES = {
  nodejs: [
    "Nodejs20.19",
    "Nodejs18.15",
    "Nodejs16.13",
    "Nodejs14.18",
    "Nodejs12.16",
    "Nodejs10.15",
    "Nodejs8.9",
  ],
  python: [
    "Python3.10",
    "Python3.9",
    "Python3.7",
    "Python3.6",
    "Python2.7",
  ],
  php: [
    "Php8.0",
    "Php7.4",
    "Php7.2",
  ],
  java: [
    "Java8",
    "Java11",
  ],
  golang: [
    "Golang1",
  ],
} as const;

export const ALL_SUPPORTED_RUNTIMES = Object.values(SUPPORTED_RUNTIMES).flat();
export const DEFAULT_RUNTIME = "Nodejs18.15";

export const RECOMMENDED_RUNTIMES = {
  nodejs: "Nodejs18.15",
  python: "Python3.9",
  php: "Php7.4",
  java: "Java11",
  golang: "Golang1",
} as const;

export const SUPPORTED_NODEJS_RUNTIMES = SUPPORTED_RUNTIMES.nodejs;
export const DEFAULT_NODEJS_RUNTIME = DEFAULT_RUNTIME;

export function formatRuntimeList(): string {
  return Object.entries(SUPPORTED_RUNTIMES)
    .map(([lang, runtimes]) => {
      const capitalizedLang = lang.charAt(0).toUpperCase() + lang.slice(1);
      return `  ${capitalizedLang}: ${runtimes.join(", ")}`;
    })
    .join("\n");
}

export const SUPPORTED_TRIGGER_TYPES = [
  "timer",
] as const;

export type TriggerType = (typeof SUPPORTED_TRIGGER_TYPES)[number];

export const TRIGGER_CONFIG_EXAMPLES = {
  timer: {
    description:
      "Timer trigger configuration using cron expression format: second minute hour day month week year",
    examples: [
      "0 0 2 1 * * *",
      "0 30 9 * * * *",
      "0 0 12 * * * *",
      "0 0 0 1 1 * *",
    ],
  },
};

export const READ_FUNCTION_LAYER_ACTIONS = [
  "listLayers",
  "listLayerVersions",
  "getLayerVersion",
  "getFunctionLayers",
] as const;

export const WRITE_FUNCTION_LAYER_ACTIONS = [
  "createLayerVersion",
  "deleteLayerVersion",
  "attachLayer",
  "detachLayer",
  "updateFunctionLayers",
] as const;

export const QUERY_FUNCTION_ACTIONS = [
  "listFunctions",
  "getFunctionDetail",
  "listFunctionLogs",
  "getFunctionLogDetail",
  "listFunctionLayers",
  "listLayers",
  "listLayerVersions",
  "getLayerVersionDetail",
  "listFunctionTriggers",
  "getFunctionAccess",
  "getFunctionDownloadUrl",
] as const;

export const MANAGE_FUNCTION_ACTIONS = [
  "createFunction",
  "updateFunctionCode",
  "updateFunctionConfig",
  "invokeFunction",
  "createFunctionTrigger",
  "deleteFunctionTrigger",
  "createLayerVersion",
  "deleteLayerVersion",
  "attachLayer",
  "detachLayer",
  "updateFunctionLayers",
  "createFunctionAccess",
] as const;

type ReadFunctionLayerAction = (typeof READ_FUNCTION_LAYER_ACTIONS)[number];
type WriteFunctionLayerAction = (typeof WRITE_FUNCTION_LAYER_ACTIONS)[number];
type QueryFunctionsAction = (typeof QUERY_FUNCTION_ACTIONS)[number];
type ManageFunctionsAction = (typeof MANAGE_FUNCTION_ACTIONS)[number];

type FunctionLayerInput = {
  LayerName: string;
  LayerVersion: number;
};

type FunctionToolEnvelope = {
  success: boolean;
  data: Record<string, unknown>;
  message: string;
  nextActions?: Array<{
    tool: string;
    action: string;
    reason: string;
  }>;
};

type QueryFunctionsInput = {
  action: QueryFunctionsAction;
  functionName?: string;
  limit?: number;
  offset?: number;
  codeSecret?: string;
  startTime?: string;
  endTime?: string;
  requestId?: string;
  qualifier?: string;
  runtime?: string;
  searchKey?: string;
  layerName?: string;
  layerVersion?: number;
};

type ManageFunctionsInput = {
  action: ManageFunctionsAction;
  func?: Record<string, unknown>;
  functionRootPath?: string;
  force?: boolean;
  functionName?: string;
  zipFile?: string;
  handler?: string;
  timeout?: number;
  envVariables?: Record<string, string>;
  vpc?: {
    vpcId: string;
    subnetId: string;
  };
  params?: Record<string, unknown>;
  triggers?: Array<{
    name: string;
    type: TriggerType;
    config: string;
  }>;
  triggerName?: string;
  layerName?: string;
  layerVersion?: number;
  contentPath?: string;
  base64Content?: string;
  runtimes?: string[];
  description?: string;
  licenseInfo?: string;
  layers?: Array<{
    layerName?: string;
    layerVersion?: number;
    LayerName?: string;
    LayerVersion?: number;
  }>;
  codeSecret?: string;
  confirm?: boolean;
  path?: string;
  type?: "Event" | "HTTP";
  auth?: boolean;
};

const VPC_SCHEMA = z.object({
  vpcId: z.string(),
  subnetId: z.string(),
});

const TRIGGER_SCHEMA = z.object({
  name: z.string().describe("触发器名称"),
  type: z.enum(SUPPORTED_TRIGGER_TYPES).describe("触发器类型"),
  config: z
    .string()
    .describe(
      "触发器配置，timer 使用 7 段 cron：second minute hour day month week year",
    ),
});

const CREATE_FUNCTION_SCHEMA = z.object({
  name: z.string().describe("函数名称"),
  type: z.enum(["Event", "HTTP"]).optional().describe("函数类型"),
  protocolType: z.enum(["HTTP", "WS"]).optional().describe("HTTP 云函数协议类型"),
  protocolParams: z
    .object({
      wsParams: z
        .object({
          idleTimeOut: z.number().optional().describe("WebSocket 空闲超时时间（秒）"),
        })
        .optional(),
    })
    .optional(),
  instanceConcurrencyConfig: z
    .object({
      dynamicEnabled: z.boolean().optional(),
      maxConcurrency: z.number().optional(),
    })
    .optional(),
  timeout: z.number().optional().describe("函数超时时间"),
  envVariables: z.record(z.string()).optional().describe("环境变量"),
  vpc: VPC_SCHEMA.optional().describe("私有网络配置"),
  runtime: z
    .string()
    .optional()
    .describe(
      "运行时环境。Event 函数支持多种运行时:\n" +
        formatRuntimeList() +
        "\n\n推荐运行时:\n" +
        `  Node.js: ${RECOMMENDED_RUNTIMES.nodejs}\n` +
        `  Python: ${RECOMMENDED_RUNTIMES.python}\n` +
        `  PHP: ${RECOMMENDED_RUNTIMES.php}\n` +
        `  Java: ${RECOMMENDED_RUNTIMES.java}\n` +
        `  Go: ${RECOMMENDED_RUNTIMES.golang}`,
    ),
  triggers: z.array(TRIGGER_SCHEMA).optional().describe("触发器配置数组"),
  handler: z.string().optional().describe("函数入口"),
  ignore: z.union([z.string(), z.array(z.string())]).optional().describe("忽略文件"),
  isWaitInstall: z.boolean().optional().describe("是否等待依赖安装"),
  layers: z
    .array(
      z.object({
        name: z.string(),
        version: z.number(),
      }),
    )
    .optional()
    .describe("Layer 配置"),
});

const LEGACY_LAYER_SCHEMA = z.object({
  LayerName: z.string().describe("层名称"),
  LayerVersion: z.number().describe("层版本号"),
});

const MANAGE_LAYER_SCHEMA = z.object({
  layerName: z.string().describe("层名称"),
  layerVersion: z.number().describe("层版本号"),
});

function jsonContent(body: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(body, null, 2),
      },
    ],
  };
}

function normalizeFunctionLayers(layers: unknown): FunctionLayerInput[] {
  if (!Array.isArray(layers)) {
    return [];
  }

  return layers
    .filter((layer): layer is Record<string, unknown> => Boolean(layer))
    .map((layer) => ({
      LayerName: String(layer.LayerName ?? ""),
      LayerVersion: Number(layer.LayerVersion ?? 0),
    }))
    .filter((layer) => Boolean(layer.LayerName) && Number.isFinite(layer.LayerVersion));
}

function processFunctionRootPath(
  functionRootPath: string | undefined,
  functionName: string,
): string | undefined {
  if (!functionRootPath) return functionRootPath;

  const normalizedPath = path.normalize(functionRootPath);
  const lastDir = path.basename(normalizedPath);
  if (lastDir === functionName) {
    const parentPath = path.dirname(normalizedPath);
    console.warn(
      `检测到 functionRootPath 包含函数名 "${functionName}"，已自动调整为父目录: ${parentPath}`,
    );
    return parentPath;
  }

  return functionRootPath;
}

function getExpectedFunctionPath(
  functionRootPath: string | undefined,
  functionName: string,
): string | undefined {
  if (!functionRootPath) return undefined;
  return path.join(path.normalize(functionRootPath), functionName);
}

function buildFunctionOperationErrorMessage(
  operation: "createFunction" | "updateFunctionCode",
  functionName: string,
  functionRootPath: string | undefined,
  error: unknown,
): string {
  const baseMessage = error instanceof Error ? error.message : String(error);
  const suggestions: string[] = [];
  const expectedFunctionPath = getExpectedFunctionPath(functionRootPath, functionName);

  if (/GetFunction.*未找到指定的Function|未找到指定的Function/i.test(baseMessage)) {
    suggestions.push(
      `请先确认环境中已存在函数 \`${functionName}\`；如果还未创建，请先执行 \`createFunction\`。`,
    );
  }

  if (/路径不存在/i.test(baseMessage) && expectedFunctionPath) {
    suggestions.push(
      `当前工具会从 \`functionRootPath + 函数名\` 查找代码目录，期望目录是 \`${expectedFunctionPath}\`。`,
    );
    suggestions.push("如果你传入的已经是函数目录本身，请改为传它的父目录。");
  }

  if (suggestions.length === 0) {
    suggestions.push("请检查函数名、目录结构和环境中的函数状态后重试。");
  }

  return `[${operation}] ${baseMessage}\n建议：${suggestions.join(" ")}`;
}

function wrapFunctionOperationError(
  operation: "createFunction" | "updateFunctionCode",
  functionName: string,
  functionRootPath: string | undefined,
  error: unknown,
): Error {
  const wrappedError = new Error(
    buildFunctionOperationErrorMessage(
      operation,
      functionName,
      functionRootPath,
      error,
    ),
  );

  if (error && typeof error === "object") {
    Object.assign(wrappedError, error);
  }

  if (error instanceof Error) {
    wrappedError.name = error.name;
    wrappedError.stack = error.stack;
    (wrappedError as Error & { cause?: unknown }).cause = error;
  }

  return wrappedError;
}

export function registerFunctionTools(server: ExtendedMcpServer) {
  const cloudBaseOptions = server.cloudBaseOptions;
  const getManager = () => getCloudBaseManager({ cloudBaseOptions });

  const buildEnvelope = (
    data: Record<string, unknown>,
    message: string,
    nextActions?: FunctionToolEnvelope["nextActions"],
  ): FunctionToolEnvelope => ({
    success: true,
    data,
    message,
    ...(nextActions?.length ? { nextActions } : {}),
  });

  const buildErrorEnvelope = (
    error: unknown,
    errorCode?: string,
  ): Record<string, unknown> => ({
    success: false,
    data: {},
    message: error instanceof Error ? error.message : String(error),
    ...(errorCode ? { errorCode } : {}),
  });

  const withEnvelope = async (handler: () => Promise<FunctionToolEnvelope>) => {
    try {
      return jsonContent(await handler());
    } catch (error) {
      return jsonContent(buildErrorEnvelope(error));
    }
  };

  const withLegacyRaw = async (handler: () => Promise<FunctionToolEnvelope>) => {
    const envelope = await handler();
    return jsonContent(envelope.data.raw ?? envelope.data);
  };

  const withLegacyEnvelope = async (
    handler: () => Promise<FunctionToolEnvelope>,
    action: string,
  ) => {
    const envelope = await handler();
    return jsonContent({
      ...envelope,
      data: {
        ...envelope.data,
        action,
      },
    });
  };

  const requireConfirm = (action: string, confirm?: boolean) => {
    if (!confirm) {
      throw new Error(`${action} 是危险操作，请显式传入 confirm=true 后再执行`);
    }
  };

  const validateLogRange = (
    startTime?: string,
    endTime?: string,
    offset?: number,
    limit?: number,
  ) => {
    if ((offset || 0) + (limit || 0) > 10000) {
      throw new Error("offset+limit 不能大于 10000");
    }

    if (startTime && endTime) {
      const start = new Date(startTime).getTime();
      const end = new Date(endTime).getTime();
      if (!Number.isFinite(start) || !Number.isFinite(end)) {
        throw new Error("startTime 和 endTime 必须是有效的日期时间字符串");
      }
      if (end - start > 24 * 60 * 60 * 1000) {
        throw new Error("startTime 和 endTime 间隔不能超过一天");
      }
    }
  };

  const normalizeManageLayers = (
    layers: ManageFunctionsInput["layers"],
  ): FunctionLayerInput[] =>
    normalizeFunctionLayers(
      (layers ?? []).map((layer) => ({
        LayerName: layer.layerName ?? layer.LayerName,
        LayerVersion: layer.layerVersion ?? layer.LayerVersion,
      })),
    );

  const getFunctionAccessSummary = async (functionName: string) => {
    const cloudbase = await getManager();
    const [accessList, domainList] = await Promise.all([
      cloudbase.access.getAccessList({ name: functionName }),
      cloudbase.access.getDomainList(),
    ]);

    logCloudBaseResult(server.logger, accessList);
    logCloudBaseResult(server.logger, domainList);

    const domains = [
      domainList.DefaultDomain,
      ...(domainList.ServiceSet || []).map((item) => item.Domain),
    ].filter(Boolean) as string[];

    const urls = Array.from(
      new Set(
        (accessList.APISet || []).flatMap((api) =>
          domains.map((domain) => {
            const normalizedPath = api.Path?.startsWith("/")
              ? api.Path
              : `/${api.Path ?? ""}`;
            return `https://${domain}${normalizedPath}`;
          }),
        ),
      ),
    );

    return {
      apis: accessList.APISet || [],
      total: accessList.Total || 0,
      domains,
      urls,
      enableService: accessList.EnableService ?? domainList.EnableService,
      raw: {
        accessList,
        domainList,
      },
    };
  };

  const handleQueryFunctions = async (
    input: QueryFunctionsInput,
  ): Promise<FunctionToolEnvelope> => {
    switch (input.action) {
    case "listFunctions": {
      const cloudbase = await getManager();
      const result = await cloudbase.functions.getFunctionList(
        input.limit,
        input.offset,
      );
      logCloudBaseResult(server.logger, result);
      return buildEnvelope(
        {
          action: input.action,
          functions: result.Functions || [],
          totalCount: result.TotalCount || 0,
          requestId: result.RequestId,
          raw: result,
        },
        `已获取 ${result.Functions?.length || 0} 个云函数`,
        [
          {
            tool: "queryFunctions",
            action: "getFunctionDetail",
            reason: "查看单个函数详情",
          },
          {
            tool: "manageFunctions",
            action: "createFunction",
            reason: "创建新的云函数",
          },
        ],
      );
    }
    case "getFunctionDetail": {
      if (!input.functionName) {
        throw new Error("getFunctionDetail 操作时，functionName 参数是必需的");
      }
      const cloudbase = await getManager();
      const result = await cloudbase.functions.getFunctionDetail(
        input.functionName,
        input.codeSecret,
      );
      logCloudBaseResult(server.logger, result);
      return buildEnvelope(
        {
          action: input.action,
          functionName: input.functionName,
          functionDetail: result,
          layers: normalizeFunctionLayers(result.Layers),
          triggers: result.Triggers || [],
          requestId: result.RequestId,
          raw: result,
        },
        `已获取函数 ${input.functionName} 的详情`,
        [
          {
            tool: "queryFunctions",
            action: "listFunctionLogs",
            reason: "查看该函数的执行日志",
          },
          {
            tool: "manageFunctions",
            action: "updateFunctionConfig",
            reason: "更新该函数配置",
          },
        ],
      );
    }
    case "listFunctionLogs": {
      if (!input.functionName) {
        throw new Error("listFunctionLogs 操作时，functionName 参数是必需的");
      }
      validateLogRange(
        input.startTime,
        input.endTime,
        input.offset,
        input.limit,
      );
      const cloudbase = await getManager();
      const result = await cloudbase.functions.getFunctionLogsV2({
        name: input.functionName,
        offset: input.offset,
        limit: input.limit,
        startTime: input.startTime,
        endTime: input.endTime,
        requestId: input.requestId,
        qualifier: input.qualifier,
      });
      logCloudBaseResult(server.logger, result);
      return buildEnvelope(
        {
          action: input.action,
          functionName: input.functionName,
          logs: result.LogList || [],
          requestId: result.RequestId,
          raw: result,
        },
        `已获取函数 ${input.functionName} 的日志列表`,
        [
          {
            tool: "queryFunctions",
            action: "getFunctionLogDetail",
            reason: "按 requestId 查看单条日志详情",
          },
        ],
      );
    }
    case "getFunctionLogDetail": {
      if (!input.requestId) {
        throw new Error("getFunctionLogDetail 操作时，requestId 参数是必需的");
      }
      validateLogRange(input.startTime, input.endTime);
      const cloudbase = await getManager();
      const result = await cloudbase.functions.getFunctionLogDetail({
        startTime: input.startTime,
        endTime: input.endTime,
        logRequestId: input.requestId,
      });
      logCloudBaseResult(server.logger, result);
      return buildEnvelope(
        {
          action: input.action,
          requestId: input.requestId,
          logDetail: result,
          raw: result,
        },
        `已获取 requestId=${input.requestId} 的日志详情`,
      );
    }
    case "listFunctionLayers": {
      if (!input.functionName) {
        throw new Error("listFunctionLayers 操作时，functionName 参数是必需的");
      }
      const cloudbase = await getManager();
      const result = await cloudbase.functions.getFunctionDetail(
        input.functionName,
        input.codeSecret,
      );
      logCloudBaseResult(server.logger, result);
      const layers = normalizeFunctionLayers(result.Layers);
      return buildEnvelope(
        {
          action: input.action,
          functionName: input.functionName,
          layers,
          count: layers.length,
          requestId: result.RequestId,
          raw: result,
        },
        `已获取函数 ${input.functionName} 当前绑定的层`,
        [
          {
            tool: "manageFunctions",
            action: "attachLayer",
            reason: "为该函数追加绑定层",
          },
          {
            tool: "manageFunctions",
            action: "updateFunctionLayers",
            reason: "整体调整层顺序或绑定列表",
          },
        ],
      );
    }
    case "listLayers": {
      const cloudbase = await getManager();
      const result = await cloudbase.functions.listLayers({
        offset: input.offset,
        limit: input.limit,
        runtime: input.runtime,
        searchKey: input.searchKey,
      });
      logCloudBaseResult(server.logger, result);
      return buildEnvelope(
        {
          action: input.action,
          layers: result.Layers || [],
          totalCount: result.TotalCount || 0,
          requestId: result.RequestId,
          raw: result,
        },
        `已获取 ${result.Layers?.length || 0} 条层记录`,
        [
          {
            tool: "queryFunctions",
            action: "listLayerVersions",
            reason: "查看某个层的版本列表",
          },
          {
            tool: "manageFunctions",
            action: "createLayerVersion",
            reason: "发布新的层版本",
          },
        ],
      );
    }
    case "listLayerVersions": {
      if (!input.layerName) {
        throw new Error("listLayerVersions 操作时，layerName 参数是必需的");
      }
      const cloudbase = await getManager();
      const result = await cloudbase.functions.listLayerVersions({
        name: input.layerName,
      });
      logCloudBaseResult(server.logger, result);
      return buildEnvelope(
        {
          action: input.action,
          layerName: input.layerName,
          layerVersions: result.LayerVersions || [],
          requestId: result.RequestId,
          raw: result,
        },
        `已获取层 ${input.layerName} 的版本列表`,
        [
          {
            tool: "queryFunctions",
            action: "getLayerVersionDetail",
            reason: "查看某个层版本详情",
          },
          {
            tool: "manageFunctions",
            action: "attachLayer",
            reason: "将某个层版本绑定到函数",
          },
        ],
      );
    }
    case "getLayerVersionDetail": {
      if (!input.layerName) {
        throw new Error("getLayerVersionDetail 操作时，layerName 参数是必需的");
      }
      if (typeof input.layerVersion !== "number") {
        throw new Error("getLayerVersionDetail 操作时，layerVersion 参数是必需的");
      }
      const cloudbase = await getManager();
      const result = await cloudbase.functions.getLayerVersion({
        name: input.layerName,
        version: input.layerVersion,
      });
      logCloudBaseResult(server.logger, result);
      return buildEnvelope(
        {
          action: input.action,
          layerName: input.layerName,
          layerVersion: input.layerVersion,
          layerVersionDetail: result,
          requestId: result.RequestId,
          raw: result,
        },
        `已获取层 ${input.layerName} 版本 ${input.layerVersion} 的详情`,
        [
          {
            tool: "manageFunctions",
            action: "attachLayer",
            reason: "绑定该层版本到函数",
          },
          {
            tool: "manageFunctions",
            action: "deleteLayerVersion",
            reason: "删除该层版本",
          },
        ],
      );
    }
    case "listFunctionTriggers": {
      if (!input.functionName) {
        throw new Error("listFunctionTriggers 操作时，functionName 参数是必需的");
      }
      const cloudbase = await getManager();
      const result = await cloudbase.functions.getFunctionDetail(
        input.functionName,
        input.codeSecret,
      );
      logCloudBaseResult(server.logger, result);
      return buildEnvelope(
        {
          action: input.action,
          functionName: input.functionName,
          triggers: result.Triggers || [],
          requestId: result.RequestId,
          raw: result,
        },
        `已获取函数 ${input.functionName} 的触发器列表`,
        [
          {
            tool: "manageFunctions",
            action: "createFunctionTrigger",
            reason: "创建新的触发器",
          },
          {
            tool: "manageFunctions",
            action: "deleteFunctionTrigger",
            reason: "删除指定触发器",
          },
        ],
      );
    }
    case "getFunctionAccess": {
      if (!input.functionName) {
        throw new Error("getFunctionAccess 操作时，functionName 参数是必需的");
      }
      const result = await getFunctionAccessSummary(input.functionName);
      return buildEnvelope(
        {
          action: input.action,
          functionName: input.functionName,
          apis: result.apis,
          total: result.total,
          domains: result.domains,
          urls: result.urls,
          enableService: result.enableService,
          raw: result.raw,
        },
        `已获取函数 ${input.functionName} 的 HTTP 访问配置`,
        [
          {
            tool: "manageFunctions",
            action: "createFunctionAccess",
            reason: "创建新的 HTTP 访问路径",
          },
        ],
      );
    }
    case "getFunctionDownloadUrl": {
      if (!input.functionName) {
        throw new Error("getFunctionDownloadUrl 操作时，functionName 参数是必需的");
      }
      const cloudbase = await getManager();
      const result = await cloudbase.functions.getFunctionDownloadUrl(
        input.functionName,
        input.codeSecret,
      );
      logCloudBaseResult(server.logger, result);
      return buildEnvelope(
        {
          action: input.action,
          functionName: input.functionName,
          downloadUrl: result.Url,
          codeSha256: result.CodeSha256,
          requestId: result.RequestId,
          raw: result,
        },
        `已获取函数 ${input.functionName} 的代码下载链接`,
      );
    }
    default:
      throw new Error(`不支持的操作类型: ${input.action}`);
    }
  };

  const handleManageFunctions = async (
    input: ManageFunctionsInput,
  ): Promise<FunctionToolEnvelope> => {
    switch (input.action) {
    case "createFunction": {
      if (!input.func?.name || typeof input.func.name !== "string") {
        throw new Error("createFunction 操作时，func.name 参数是必需的");
      }
      const cloudbase = await getManager();

      const func = { ...input.func };
      const functionName = String(func.name);
      debug(
        `[createFunction] name=${functionName}, type=${String(func.type || "Event")}`,
      );

      if (func.type !== "HTTP") {
        if (!func.runtime || typeof func.runtime !== "string") {
          func.runtime = DEFAULT_RUNTIME;
        } else {
          const normalizedRuntime = func.runtime.replace(/\s+/g, "");
          if ((ALL_SUPPORTED_RUNTIMES as readonly string[]).includes(normalizedRuntime)) {
            func.runtime = normalizedRuntime;
          } else if (func.runtime.includes(" ")) {
            console.warn(
              `检测到 runtime 参数包含空格: "${func.runtime}"，已自动移除空格`,
            );
            func.runtime = normalizedRuntime;
          }
        }

        if (
          typeof func.runtime !== "string" ||
          !(ALL_SUPPORTED_RUNTIMES as readonly string[]).includes(func.runtime)
        ) {
          throw new Error(
            `不支持的运行时环境: "${String(func.runtime)}"\n\n支持的运行时:\n${formatRuntimeList()}`,
          );
        }
      }

      func.installDependency = true;
      const processedRootPath = processFunctionRootPath(
        input.functionRootPath,
        functionName,
      );

      let result: unknown;
      try {
        result = await cloudbase.functions.createFunction({
          func,
          functionRootPath: processedRootPath,
          force: Boolean(input.force),
        } as any);
      } catch (error) {
        throw wrapFunctionOperationError(
          "createFunction",
          functionName,
          processedRootPath,
          error,
        );
      }

      logCloudBaseResult(server.logger, result);
      return buildEnvelope(
        {
          action: input.action,
          functionName,
          raw: result as Record<string, unknown>,
        },
        `已创建函数 ${functionName}`,
        [
          {
            tool: "queryFunctions",
            action: "getFunctionDetail",
            reason: "确认函数配置",
          },
          {
            tool: "queryFunctions",
            action: "listFunctionTriggers",
            reason: "检查函数触发器",
          },
        ],
      );
    }
    case "updateFunctionCode": {
      if (!input.functionName) {
        throw new Error("updateFunctionCode 操作时，functionName 参数是必需的");
      }
      const cloudbase = await getManager();

      const processedRootPath = processFunctionRootPath(
        input.functionRootPath,
        input.functionName,
      );
      const updateParams: Record<string, unknown> = {
        func: {
          name: input.functionName,
          installDependency: true,
          ...(input.handler ? { handler: input.handler } : {}),
        },
        functionRootPath: processedRootPath,
      };

      if (input.zipFile) {
        updateParams.zipFile = input.zipFile;
      }

      let result: unknown;
      try {
        result = await cloudbase.functions.updateFunctionCode(updateParams as any);
      } catch (error) {
        throw wrapFunctionOperationError(
          "updateFunctionCode",
          input.functionName,
          processedRootPath,
          error,
        );
      }

      logCloudBaseResult(server.logger, result);
      return buildEnvelope(
        {
          action: input.action,
          functionName: input.functionName,
          raw: result as Record<string, unknown>,
        },
        `已更新函数 ${input.functionName} 的代码`,
        [
          {
            tool: "queryFunctions",
            action: "getFunctionDetail",
            reason: "确认最新函数配置",
          },
        ],
      );
    }
    case "updateFunctionConfig": {
      if (!input.functionName) {
        throw new Error("updateFunctionConfig 操作时，functionName 参数是必需的");
      }
      const cloudbase = await getManager();

      const functionDetail = await cloudbase.functions.getFunctionDetail(
        input.functionName,
      );
      const currentVpc =
        typeof functionDetail.VpcConfig === "object" &&
        functionDetail.VpcConfig !== null &&
        functionDetail.VpcConfig.SubnetId &&
        functionDetail.VpcConfig.VpcId
          ? {
              subnetId: functionDetail.VpcConfig.SubnetId,
              vpcId: functionDetail.VpcConfig.VpcId,
            }
          : undefined;

      const result = await cloudbase.functions.updateFunctionConfig({
        name: input.functionName,
        envVariables: Object.assign(
          {},
          (functionDetail.Environment?.Variables || []).reduce(
            (
              acc: Record<string, string | number | boolean>,
              curr: IEnvVariable,
            ) => {
              acc[curr.Key] = curr.Value;
              return acc;
            },
            {},
          ),
          input.envVariables ?? {},
        ),
        timeout: input.timeout ?? functionDetail.Timeout,
        vpc: Object.assign({}, currentVpc, input.vpc ?? {}),
      });

      logCloudBaseResult(server.logger, result);
      return buildEnvelope(
        {
          action: input.action,
          functionName: input.functionName,
          raw: result,
        },
        `已更新函数 ${input.functionName} 的配置`,
        [
          {
            tool: "queryFunctions",
            action: "getFunctionDetail",
            reason: "确认配置变更结果",
          },
        ],
      );
    }
    case "invokeFunction": {
      if (!input.functionName) {
        throw new Error("invokeFunction 操作时，functionName 参数是必需的");
      }
      const cloudbase = await getManager();
      try {
        const result = await cloudbase.functions.invokeFunction(
          input.functionName,
          input.params,
        );
        logCloudBaseResult(server.logger, result);
        return buildEnvelope(
          {
            action: input.action,
            functionName: input.functionName,
            invokeResult: result,
            raw: result,
          },
          `已调用函数 ${input.functionName}`,
          [
            {
              tool: "queryFunctions",
              action: "listFunctionLogs",
              reason: "查看本次调用日志",
            },
          ],
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        if (
          errorMessage.includes("Function not found") ||
          errorMessage.includes("函数不存在")
        ) {
          throw new Error(
            `${errorMessage}\n\nTip: "invokeFunction" 只能调用已部署的云函数。数据库操作请使用对应的数据工具。`,
          );
        }
        throw error;
      }
    }
    case "createFunctionTrigger": {
      if (!input.functionName) {
        throw new Error("createFunctionTrigger 操作时，functionName 参数是必需的");
      }
      if (!input.triggers?.length) {
        throw new Error("createFunctionTrigger 操作时，triggers 参数是必需的");
      }
      const cloudbase = await getManager();
      const result = await cloudbase.functions.createFunctionTriggers(
        input.functionName,
        input.triggers,
      );
      logCloudBaseResult(server.logger, result);
      return buildEnvelope(
        {
          action: input.action,
          functionName: input.functionName,
          raw: result,
        },
        `已为函数 ${input.functionName} 创建触发器`,
        [
          {
            tool: "queryFunctions",
            action: "listFunctionTriggers",
            reason: "确认触发器已生效",
          },
        ],
      );
    }
    case "deleteFunctionTrigger": {
      if (!input.functionName) {
        throw new Error("deleteFunctionTrigger 操作时，functionName 参数是必需的");
      }
      if (!input.triggerName) {
        throw new Error("deleteFunctionTrigger 操作时，triggerName 参数是必需的");
      }
      requireConfirm(input.action, input.confirm);
      const cloudbase = await getManager();
      await cloudbase.functions.deleteFunctionTrigger(
        input.functionName,
        input.triggerName,
      );
      return buildEnvelope(
        {
          action: input.action,
          functionName: input.functionName,
          triggerName: input.triggerName,
          raw: {},
        },
        `已删除函数 ${input.functionName} 的触发器 ${input.triggerName}`,
        [
          {
            tool: "queryFunctions",
            action: "listFunctionTriggers",
            reason: "确认剩余触发器列表",
          },
        ],
      );
    }
    case "createLayerVersion": {
      if (!input.layerName) {
        throw new Error("createLayerVersion 操作时，layerName 参数是必需的");
      }
      if (!input.runtimes?.length) {
        throw new Error("createLayerVersion 操作时，runtimes 参数是必需的");
      }
      if (!input.contentPath && !input.base64Content) {
        throw new Error(
          "createLayerVersion 操作时，contentPath 和 base64Content 至少需要提供一个",
        );
      }
      const cloudbase = await getManager();
      const result = await cloudbase.functions.createLayer({
        name: input.layerName,
        contentPath: input.contentPath,
        base64Content: input.base64Content,
        runtimes: input.runtimes,
        description: input.description,
        licenseInfo: input.licenseInfo,
      });
      logCloudBaseResult(server.logger, result);
      return buildEnvelope(
        {
          action: input.action,
          layerName: input.layerName,
          layerVersion: result.LayerVersion,
          requestId: result.RequestId,
          raw: result,
        },
        `已创建层 ${input.layerName} 的新版本`,
        [
          {
            tool: "queryFunctions",
            action: "listLayerVersions",
            reason: "查看该层的全部版本",
          },
        ],
      );
    }
    case "deleteLayerVersion": {
      if (!input.layerName) {
        throw new Error("deleteLayerVersion 操作时，layerName 参数是必需的");
      }
      if (typeof input.layerVersion !== "number") {
        throw new Error("deleteLayerVersion 操作时，layerVersion 参数是必需的");
      }
      requireConfirm(input.action, input.confirm);
      const cloudbase = await getManager();
      const result = await cloudbase.functions.deleteLayerVersion({
        name: input.layerName,
        version: input.layerVersion,
      });
      logCloudBaseResult(server.logger, result);
      return buildEnvelope(
        {
          action: input.action,
          layerName: input.layerName,
          layerVersion: input.layerVersion,
          raw: result,
        },
        `已删除层 ${input.layerName} 的版本 ${input.layerVersion}`,
        [
          {
            tool: "queryFunctions",
            action: "listLayerVersions",
            reason: "确认剩余层版本",
          },
        ],
      );
    }
    case "attachLayer":
    case "detachLayer":
    case "updateFunctionLayers": {
      if (!input.functionName) {
        throw new Error(`${input.action} 操作时，functionName 参数是必需的`);
      }
      const cloudbase = await getManager();
      const envId = await getEnvId(cloudBaseOptions);

      if (input.action === "attachLayer") {
        if (!input.layerName) {
          throw new Error("attachLayer 操作时，layerName 参数是必需的");
        }
        if (typeof input.layerVersion !== "number") {
          throw new Error("attachLayer 操作时，layerVersion 参数是必需的");
        }
        const result = await cloudbase.functions.attachLayer({
          envId,
          functionName: input.functionName,
          layerName: input.layerName,
          layerVersion: input.layerVersion,
          codeSecret: input.codeSecret,
        });
        logCloudBaseResult(server.logger, result);
        const detail = await cloudbase.functions.getFunctionDetail(
          input.functionName,
          input.codeSecret,
        );
        return buildEnvelope(
          {
            action: input.action,
            functionName: input.functionName,
            layers: normalizeFunctionLayers(detail.Layers),
            requestId: result.RequestId,
            raw: result,
          },
          `已将层 ${input.layerName}:${input.layerVersion} 绑定到函数 ${input.functionName}`,
          [
            {
              tool: "queryFunctions",
              action: "listFunctionLayers",
              reason: "确认函数当前绑定层列表",
            },
          ],
        );
      }

      if (input.action === "detachLayer") {
        if (!input.layerName) {
          throw new Error("detachLayer 操作时，layerName 参数是必需的");
        }
        if (typeof input.layerVersion !== "number") {
          throw new Error("detachLayer 操作时，layerVersion 参数是必需的");
        }
        requireConfirm(input.action, input.confirm);
        const result = await cloudbase.functions.unAttachLayer({
          envId,
          functionName: input.functionName,
          layerName: input.layerName,
          layerVersion: input.layerVersion,
          codeSecret: input.codeSecret,
        });
        logCloudBaseResult(server.logger, result);
        const detail = await cloudbase.functions.getFunctionDetail(
          input.functionName,
          input.codeSecret,
        );
        return buildEnvelope(
          {
            action: input.action,
            functionName: input.functionName,
            layers: normalizeFunctionLayers(detail.Layers),
            requestId: result.RequestId,
            raw: result,
          },
          `已从函数 ${input.functionName} 解绑层 ${input.layerName}:${input.layerVersion}`,
          [
            {
              tool: "queryFunctions",
              action: "listFunctionLayers",
              reason: "确认解绑后的层列表",
            },
          ],
        );
      }

      const normalizedLayers = normalizeManageLayers(input.layers);
      if (!normalizedLayers.length) {
        throw new Error(
          "updateFunctionLayers 操作时，layers 参数必须包含有效的 layerName 和 layerVersion",
        );
      }
      const result = await cloudbase.functions.updateFunctionLayer({
        envId,
        functionName: input.functionName,
        layers: normalizedLayers,
      });
      logCloudBaseResult(server.logger, result);
      const detail = await cloudbase.functions.getFunctionDetail(
        input.functionName,
      );
      return buildEnvelope(
        {
          action: input.action,
          functionName: input.functionName,
          layers: normalizeFunctionLayers(detail.Layers),
          requestId: result.RequestId,
          raw: result,
        },
        `已更新函数 ${input.functionName} 的层绑定列表`,
        [
          {
            tool: "queryFunctions",
            action: "listFunctionLayers",
            reason: "确认最新层顺序和绑定结果",
          },
        ],
      );
    }
    case "createFunctionAccess": {
      if (!input.functionName) {
        throw new Error("createFunctionAccess 操作时，functionName 参数是必需的");
      }
      const cloudbase = await getManager();
      const result = await cloudbase.access.createAccess({
        name: input.functionName,
        path: input.path || `/${input.functionName}`,
        type: ((input.type || "Event") === "HTTP" ? 6 : 1) as 1 | 2,
        auth: input.auth,
      });
      logCloudBaseResult(server.logger, result);
      return buildEnvelope(
        {
          action: input.action,
          functionName: input.functionName,
          path: input.path || `/${input.functionName}`,
          raw: result,
        },
        `已为函数 ${input.functionName} 创建 HTTP 访问路径`,
        [
          {
            tool: "queryFunctions",
            action: "getFunctionAccess",
            reason: "查看当前 HTTP 访问配置",
          },
        ],
      );
    }
    default:
      throw new Error(`不支持的操作类型: ${input.action}`);
    }
  };

  server.registerTool?.(
    "queryFunctions",
    {
      title: "查询云函数域资源",
      description:
        "函数域统一只读入口。通过更自解释的 action 查询函数列表、函数详情、日志、层、触发器、HTTP 访问和代码下载地址。",
      inputSchema: {
        action: z
          .enum(QUERY_FUNCTION_ACTIONS)
          .describe("只读操作类型，例如 listFunctions、getFunctionDetail、getFunctionAccess"),
        functionName: z.string().optional().describe("函数名称。函数相关 action 必填"),
        limit: z.number().optional().describe("分页数量。列表类 action 可选"),
        offset: z.number().optional().describe("分页偏移。列表类 action 可选"),
        codeSecret: z.string().optional().describe("代码保护密钥"),
        startTime: z.string().optional().describe("日志查询开始时间"),
        endTime: z.string().optional().describe("日志查询结束时间"),
        requestId: z.string().optional().describe("日志 requestId。获取日志详情时必填"),
        qualifier: z.string().optional().describe("函数版本，日志查询时可选"),
        runtime: z.string().optional().describe("层查询的运行时筛选"),
        searchKey: z.string().optional().describe("层名称搜索关键字"),
        layerName: z.string().optional().describe("层名称。层相关 action 必填"),
        layerVersion: z.number().optional().describe("层版本号。获取层版本详情时必填"),
      },
      annotations: {
        readOnlyHint: true,
        openWorldHint: true,
        category: "functions",
      },
    },
    async (input: QueryFunctionsInput) => withEnvelope(() => handleQueryFunctions(input)),
  );

  server.registerTool?.(
    "manageFunctions",
    {
      title: "管理云函数域资源",
      description:
        "函数域统一写入口。通过 action 管理函数创建、代码更新、配置更新、触发器、层绑定和 HTTP 访问。危险操作需要显式 confirm=true。",
      inputSchema: {
        action: z
          .enum(MANAGE_FUNCTION_ACTIONS)
          .describe("写操作类型，例如 createFunction、updateFunctionCode、attachLayer"),
        func: CREATE_FUNCTION_SCHEMA.optional().describe("createFunction 操作的函数配置"),
        functionRootPath: z.string().optional().describe("函数根目录（父目录绝对路径）"),
        force: z.boolean().optional().describe("createFunction 时是否覆盖"),
        functionName: z.string().optional().describe("函数名称。大多数 action 使用该字段作为统一目标"),
        zipFile: z.string().optional().describe("代码包的 base64 编码"),
        handler: z.string().optional().describe("函数入口"),
        timeout: z.number().optional().describe("配置更新时的超时时间"),
        envVariables: z.record(z.string()).optional().describe("配置更新时要合并的环境变量"),
        vpc: VPC_SCHEMA.optional().describe("配置更新时的 VPC 信息"),
        params: z.record(z.any()).optional().describe("invokeFunction 的调用参数"),
        triggers: z.array(TRIGGER_SCHEMA).optional().describe("createFunctionTrigger 的触发器列表"),
        triggerName: z.string().optional().describe("deleteFunctionTrigger 的目标触发器名称"),
        layerName: z.string().optional().describe("层名称"),
        layerVersion: z.number().optional().describe("层版本号"),
        contentPath: z.string().optional().describe("层内容路径，可为目录或 ZIP 文件"),
        base64Content: z.string().optional().describe("层内容的 base64 编码"),
        runtimes: z.array(z.string()).optional().describe("层适用的运行时列表"),
        description: z.string().optional().describe("层版本描述"),
        licenseInfo: z.string().optional().describe("层许可证信息"),
        layers: z
          .array(MANAGE_LAYER_SCHEMA)
          .optional()
          .describe("updateFunctionLayers 的目标层列表，顺序即最终顺序"),
        codeSecret: z.string().optional().describe("层绑定时的代码保护密钥"),
        confirm: z.boolean().optional().describe("危险操作确认开关"),
        path: z.string().optional().describe("createFunctionAccess 的访问路径，默认 /{functionName}"),
        type: z.enum(["Event", "HTTP"]).optional().describe("createFunctionAccess 的函数类型"),
        auth: z.boolean().optional().describe("createFunctionAccess 是否开启鉴权"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
        category: "functions",
      },
    },
    async (input: ManageFunctionsInput) => withEnvelope(() => handleManageFunctions(input)),
  );

  server.registerTool?.(
    "getFunctionList",
    {
      title: "查询云函数列表或详情",
      description:
        "兼容入口。推荐优先使用 queryFunctions。action=list 返回函数列表，action=detail 返回函数详情，并兼容 include=downloadUrl。",
      inputSchema: {
        action: z.enum(["list", "detail"]).optional().describe("list=获取函数列表，detail=获取函数详情"),
        limit: z.number().optional().describe("列表分页数量"),
        offset: z.number().optional().describe("列表分页偏移"),
        name: z.string().optional().describe("函数名称。detail 时必填"),
        include: z.array(z.enum(["layers", "downloadUrl", "all"])).optional().describe("detail 的兼容扩展字段"),
        codeSecret: z.string().optional().describe("代码保护密钥"),
      },
      annotations: {
        readOnlyHint: true,
        openWorldHint: true,
        category: "functions",
      },
    },
    async ({
      action = "list",
      limit,
      offset,
      name,
      include,
      codeSecret,
    }: {
      action?: "list" | "detail";
      limit?: number;
      offset?: number;
      name?: string;
      include?: Array<"layers" | "downloadUrl" | "all">;
      codeSecret?: string;
    }) => {
      if (action === "list") {
        return withLegacyRaw(() =>
          handleQueryFunctions({
            action: "listFunctions",
            limit,
            offset,
          }),
        );
      }

      if (!name) {
        throw new Error("获取函数详情时，name 参数是必需的");
      }

      const detailEnvelope = await handleQueryFunctions({
        action: "getFunctionDetail",
        functionName: name,
        codeSecret,
      });
      const detail = {
        ...(detailEnvelope.data.raw as Record<string, unknown>),
      };
      const includeSet = new Set(include ?? []);
      if (includeSet.has("downloadUrl") || includeSet.has("all")) {
        const downloadEnvelope = await handleQueryFunctions({
          action: "getFunctionDownloadUrl",
          functionName: name,
          codeSecret,
        });
        detail.DownloadUrl = downloadEnvelope.data.downloadUrl;
      }

      return jsonContent(detail);
    },
  );

  server.registerTool(
    "createFunction",
    {
      title: "创建云函数",
      description: "兼容入口。推荐优先使用 manageFunctions action=createFunction。",
      inputSchema: {
        func: CREATE_FUNCTION_SCHEMA.describe("函数配置"),
        functionRootPath: z.string().optional().describe("函数根目录父目录"),
        force: z.boolean().describe("是否覆盖"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
        category: "functions",
      },
    },
    async ({
      func,
      functionRootPath,
      force,
    }: {
      func: Record<string, unknown>;
      functionRootPath?: string;
      force: boolean;
    }) =>
      withLegacyRaw(() =>
        handleManageFunctions({
          action: "createFunction",
          func,
          functionRootPath,
          force,
        }),
      ),
  );

  server.registerTool(
    "updateFunctionCode",
    {
      title: "更新云函数代码",
      description: "兼容入口。推荐优先使用 manageFunctions action=updateFunctionCode。",
      inputSchema: {
        name: z.string().describe("函数名称"),
        functionRootPath: z.string().describe("函数根目录（父目录绝对路径）"),
        zipFile: z.string().optional().describe("代码包的 base64 编码"),
        handler: z.string().optional().describe("函数入口"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
        category: "functions",
      },
    },
    async ({
      name,
      functionRootPath,
      zipFile,
      handler,
    }: {
      name: string;
      functionRootPath?: string;
      zipFile?: string;
      handler?: string;
    }) =>
      withLegacyRaw(() =>
        handleManageFunctions({
          action: "updateFunctionCode",
          functionName: name,
          functionRootPath,
          zipFile,
          handler,
        }),
      ),
  );

  server.registerTool?.(
    "updateFunctionConfig",
    {
      title: "更新云函数配置",
      description: "兼容入口。推荐优先使用 manageFunctions action=updateFunctionConfig。",
      inputSchema: {
        funcParam: z.object({
          name: z.string().describe("函数名称"),
          timeout: z.number().optional().describe("超时时间"),
          envVariables: z.record(z.string()).optional().describe("环境变量"),
          vpc: VPC_SCHEMA.optional().describe("VPC 配置"),
        }),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
        category: "functions",
      },
    },
    async ({
      funcParam,
    }: {
      funcParam: {
        name: string;
        timeout?: number;
        envVariables?: Record<string, string>;
        vpc?: {
          vpcId: string;
          subnetId: string;
        };
      };
    }) =>
      withLegacyRaw(() =>
        handleManageFunctions({
          action: "updateFunctionConfig",
          functionName: funcParam.name,
          timeout: funcParam.timeout,
          envVariables: funcParam.envVariables,
          vpc: funcParam.vpc,
        }),
      ),
  );

  server.registerTool?.(
    "invokeFunction",
    {
      title: "调用云函数",
      description: "兼容入口。推荐优先使用 manageFunctions action=invokeFunction。",
      inputSchema: {
        name: z.string().describe("函数名称"),
        params: z.record(z.any()).optional().describe("调用参数"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
        category: "functions",
      },
    },
    async ({
      name,
      params,
    }: {
      name: string;
      params?: Record<string, unknown>;
    }) =>
      withLegacyRaw(() =>
        handleManageFunctions({
          action: "invokeFunction",
          functionName: name,
          params,
        }),
      ),
  );

  server.registerTool?.(
    "getFunctionLogs",
    {
      title: "获取云函数日志",
      description: "兼容入口。推荐优先使用 queryFunctions action=listFunctionLogs。",
      inputSchema: {
        name: z.string().describe("函数名称"),
        offset: z.number().optional().describe("分页偏移"),
        limit: z.number().optional().describe("分页数量"),
        startTime: z.string().optional().describe("日志查询开始时间"),
        endTime: z.string().optional().describe("日志查询结束时间"),
        requestId: z.string().optional().describe("函数执行 requestId"),
        qualifier: z.string().optional().describe("函数版本"),
      },
      annotations: {
        readOnlyHint: true,
        openWorldHint: true,
        category: "functions",
      },
    },
    async ({
      name,
      offset,
      limit,
      startTime,
      endTime,
      requestId,
      qualifier,
    }: {
      name: string;
      offset?: number;
      limit?: number;
      startTime?: string;
      endTime?: string;
      requestId?: string;
      qualifier?: string;
    }) =>
      withLegacyRaw(() =>
        handleQueryFunctions({
          action: "listFunctionLogs",
          functionName: name,
          offset,
          limit,
          startTime,
          endTime,
          requestId,
          qualifier,
        }),
      ),
  );

  server.registerTool?.(
    "getFunctionLogDetail",
    {
      title: "获取云函数日志详情",
      description: "兼容入口。推荐优先使用 queryFunctions action=getFunctionLogDetail。",
      inputSchema: {
        startTime: z.string().optional().describe("日志查询开始时间"),
        endTime: z.string().optional().describe("日志查询结束时间"),
        requestId: z.string().describe("函数执行 requestId"),
      },
      annotations: {
        readOnlyHint: true,
        openWorldHint: true,
        category: "functions",
      },
    },
    async ({
      startTime,
      endTime,
      requestId,
    }: {
      startTime?: string;
      endTime?: string;
      requestId: string;
    }) =>
      withLegacyRaw(() =>
        handleQueryFunctions({
          action: "getFunctionLogDetail",
          startTime,
          endTime,
          requestId,
        }),
      ),
  );

  server.registerTool?.(
    "manageFunctionTriggers",
    {
      title: "管理云函数触发器",
      description:
        "兼容入口。推荐优先使用 manageFunctions action=createFunctionTrigger 或 deleteFunctionTrigger。",
      inputSchema: {
        action: z.enum(["create", "delete"]).describe("create=创建触发器，delete=删除触发器"),
        name: z.string().describe("函数名称"),
        triggers: z.array(TRIGGER_SCHEMA).optional().describe("创建触发器时的配置数组"),
        triggerName: z.string().optional().describe("删除触发器时必填"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
        category: "functions",
      },
    },
    async ({
      action,
      name,
      triggers,
      triggerName,
    }: {
      action: "create" | "delete";
      name: string;
      triggers?: Array<{
        name: string;
        type: TriggerType;
        config: string;
      }>;
      triggerName?: string;
    }) =>
      withLegacyRaw(() =>
        handleManageFunctions(
          action === "create"
            ? {
                action: "createFunctionTrigger",
                functionName: name,
                triggers,
              }
            : {
                action: "deleteFunctionTrigger",
                functionName: name,
                triggerName,
                confirm: true,
              },
        ),
      ),
  );

  server.registerTool?.(
    "readFunctionLayers",
    {
      title: "查询云函数层信息",
      description:
        "兼容入口。推荐优先使用 queryFunctions。支持 listLayers、listLayerVersions、getLayerVersion、getFunctionLayers。",
      inputSchema: {
        action: z.enum(READ_FUNCTION_LAYER_ACTIONS).describe("查询层或函数绑定层的兼容 action"),
        name: z.string().optional().describe("层名称。listLayerVersions/getLayerVersion 时必填"),
        version: z.number().optional().describe("层版本号。getLayerVersion 时必填"),
        runtime: z.string().optional().describe("运行时筛选"),
        searchKey: z.string().optional().describe("层名称搜索关键字"),
        offset: z.number().optional().describe("分页偏移"),
        limit: z.number().optional().describe("分页数量"),
        functionName: z.string().optional().describe("函数名称。getFunctionLayers 时必填"),
        codeSecret: z.string().optional().describe("代码保护密钥"),
      },
      annotations: {
        readOnlyHint: true,
        openWorldHint: true,
        category: "functions",
      },
    },
    async ({
      action,
      name,
      version,
      runtime,
      searchKey,
      offset,
      limit,
      functionName,
      codeSecret,
    }: {
      action: ReadFunctionLayerAction;
      name?: string;
      version?: number;
      runtime?: string;
      searchKey?: string;
      offset?: number;
      limit?: number;
      functionName?: string;
      codeSecret?: string;
    }) => {
      if (action === "listLayers") {
        return withLegacyEnvelope(
          () =>
            handleQueryFunctions({
              action: "listLayers",
              runtime,
              searchKey,
              offset,
              limit,
            }),
          action,
        );
      }

      if (action === "listLayerVersions") {
        if (!name) {
          throw new Error("查询层版本列表时，name 参数是必需的");
        }
        return withLegacyEnvelope(
          () =>
            handleQueryFunctions({
              action: "listLayerVersions",
              layerName: name,
            }),
          action,
        );
      }

      if (action === "getLayerVersion") {
        if (!name) {
          throw new Error("查询层版本详情时，name 参数是必需的");
        }
        return withLegacyEnvelope(
          () =>
            handleQueryFunctions({
              action: "getLayerVersionDetail",
              layerName: name,
              layerVersion: version,
            }),
          action,
        );
      }

      if (!functionName) {
        throw new Error("查询函数层配置时，functionName 参数是必需的");
      }
      return withLegacyEnvelope(
        () =>
          handleQueryFunctions({
            action: "listFunctionLayers",
            functionName,
            codeSecret,
          }),
        action,
      );
    },
  );

  server.registerTool?.(
    "writeFunctionLayers",
    {
      title: "管理云函数层",
      description:
        "兼容入口。推荐优先使用 manageFunctions。支持 createLayerVersion、deleteLayerVersion、attachLayer、detachLayer、updateFunctionLayers。",
      inputSchema: {
        action: z.enum(WRITE_FUNCTION_LAYER_ACTIONS).describe("云函数层写操作的兼容 action"),
        name: z.string().optional().describe("层名称。createLayerVersion/deleteLayerVersion 时必填"),
        version: z.number().optional().describe("层版本号。deleteLayerVersion 时必填"),
        contentPath: z.string().optional().describe("层内容路径"),
        base64Content: z.string().optional().describe("层内容的 base64 编码"),
        runtimes: z.array(z.string()).optional().describe("层适用的运行时列表"),
        description: z.string().optional().describe("层版本描述"),
        licenseInfo: z.string().optional().describe("许可证信息"),
        functionName: z.string().optional().describe("函数名称"),
        layerName: z.string().optional().describe("要绑定或解绑的层名称"),
        layerVersion: z.number().optional().describe("要绑定或解绑的层版本号"),
        layers: z.array(LEGACY_LAYER_SCHEMA).optional().describe("目标函数层数组"),
        codeSecret: z.string().optional().describe("代码保护密钥"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
        category: "functions",
      },
    },
    async ({
      action,
      name,
      version,
      contentPath,
      base64Content,
      runtimes,
      description,
      licenseInfo,
      functionName,
      layerName,
      layerVersion,
      layers,
      codeSecret,
    }: {
      action: WriteFunctionLayerAction;
      name?: string;
      version?: number;
      contentPath?: string;
      base64Content?: string;
      runtimes?: string[];
      description?: string;
      licenseInfo?: string;
      functionName?: string;
      layerName?: string;
      layerVersion?: number;
      layers?: FunctionLayerInput[];
      codeSecret?: string;
    }) => {
      const mappedInput: ManageFunctionsInput =
        action === "createLayerVersion"
          ? {
              action,
              layerName: name,
              contentPath,
              base64Content,
              runtimes,
              description,
              licenseInfo,
            }
          : action === "deleteLayerVersion"
            ? {
                action,
                layerName: name,
                layerVersion: version,
                confirm: true,
              }
            : action === "attachLayer"
              ? {
                  action,
                  functionName,
                  layerName,
                  layerVersion,
                  codeSecret,
                }
              : action === "detachLayer"
                ? {
                    action,
                    functionName,
                    layerName,
                    layerVersion,
                    codeSecret,
                    confirm: true,
                  }
                : {
                    action,
                    functionName,
                    layers: (layers || []).map((layer) => ({
                      layerName: layer.LayerName,
                      layerVersion: layer.LayerVersion,
                    })),
                  };

      return withLegacyEnvelope(
        () => handleManageFunctions(mappedInput),
        action,
      );
    },
  );
}
