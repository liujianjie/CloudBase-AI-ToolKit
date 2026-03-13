# 技术方案设计

## 架构概述

本次设计继续坚持 `functions` 域只保留两个主工具：

1. `queryFunctions`
2. `manageFunctions`

但在 schema 设计上，不再采用“含糊 flat action + 历史字段混用”的方案，而是改为：

1. **更自解释的 flat action**：保持与仓库现有模块更一致的 action 风格，但避免 `detail` / `logs` 这类过短、易重叠的命名；
2. **统一目标字段**：函数统一使用 `functionName`，层统一使用 `layerName`，不混用 `name`；
3. **action 级判别**：仍然用顶层字段，避免引入其他模块没有采用的 payload 分组模式，但通过判别式 schema 明确每个 action 可填哪些字段；
4. **消除重叠入口**：不同时保留“detail + include”与专门 action 两套等价读路径。

目标不是让 action 数量最少，而是让 AI 能在第一次阅读 schema 时明确：

- 应该选哪个 action
- 该填哪个目标字段
- 该把参数放在哪个子对象里

## 设计原则

1. **双工具不变**：函数域仍然只有一个 query 和一个 manage。
2. **可调用性优先**：优先降低 AI 误调用率，而不是追求表面上的“一个 action 兼容更多场景”。
3. **单一入口单一语义**：一个场景只保留一个推荐 action，不保留并行等价入口。
4. **兼容层只做映射**：旧工具存在仅为迁移，不再承载新设计语义。

## Schema 重设计

### 一、`queryFunctions`

`queryFunctions` 保持只读，但 action 不采用 namespaced 形式，而采用“长一些但更直接”的 flat action。

建议 action：

```ts
type QueryFunctionsAction =
  | "listFunctions"
  | "getFunctionDetail"
  | "listFunctionLogs"
  | "getFunctionLogDetail"
  | "listFunctionLayers"
  | "listLayers"
  | "listLayerVersions"
  | "getLayerVersionDetail"
  | "listFunctionTriggers"
  | "getFunctionAccess"
  | "getFunctionDownloadUrl";
```

这样做的原因：

1. 保持与仓库其他模块更接近的 action 命名习惯；
2. 比 `detail` / `logs` / `layers` 更自解释；
3. 不引入只有 `functions` 域才使用的 namespaced 特例。

建议输入结构：

```ts
type QueryFunctionsInput =
  | {
      action: "listFunctions";
      limit?: number;
      offset?: number;
      view?: "summary" | "detail";
    }
  | {
      action: "getFunctionDetail";
      functionName: string;
      codeSecret?: string;
    }
  | {
      action: "listFunctionLogs";
      functionName: string;
      offset?: number;
      limit?: number;
      startTime?: string;
      endTime?: string;
      requestId?: string;
      qualifier?: string;
    }
  | {
      action: "getFunctionLogDetail";
      requestId: string;
      startTime?: string;
      endTime?: string;
    }
  | {
      action: "listFunctionLayers";
      functionName: string;
    }
  | {
      action: "listLayers";
      runtime?: string;
      searchKey?: string;
      offset?: number;
      limit?: number;
    }
  | {
      action: "listLayerVersions";
      layerName: string;
    }
  | {
      action: "getLayerVersionDetail";
      layerName: string;
      version: number;
    }
  | {
      action: "listFunctionTriggers";
      functionName: string;
    }
  | {
      action: "getFunctionAccess";
      functionName: string;
    }
  | {
      action: "getFunctionDownloadUrl";
      functionName: string;
      codeSecret?: string;
    };
```

### 为什么移除 `detail + include`

上一版 `function.detail` 里还想通过 `include` 拿 `layers` / `triggers` / `httpAccess` / `downloadUrl`。这个方案不利于 AI：

1. AI 需要先决定“是走 detail，还是走专门 action”；
2. `include` 容易膨胀成另一个 action 分发器；
3. 同一信息会出现多个推荐入口。

因此本版明确：

1. `getFunctionDetail` 只返回函数详情；
2. `listFunctionTriggers` 只查触发器；
3. `getFunctionAccess` 只查 HTTP 访问；
4. `getFunctionDownloadUrl` 只查代码下载地址；
5. 层查询拆成 `listFunctionLayers` / `listLayers` / `listLayerVersions` / `getLayerVersionDetail`。

这样牺牲了一点“少发一次请求”的便利，但换来了更稳定的 action 选择。

### 二、`manageFunctions`

`manageFunctions` 同样不采用 namespaced action，也不强制使用 payload 分组，而是沿用仓库更熟悉的 flat action 风格，但统一字段命名和 action 级约束。

建议 action：

```ts
type ManageFunctionsAction =
  | "createFunction"
  | "updateFunctionCode"
  | "updateFunctionConfig"
  | "invokeFunction"
  | "createFunctionTrigger"
  | "deleteFunctionTrigger"
  | "createLayerVersion"
  | "deleteLayerVersion"
  | "attachLayer"
  | "detachLayer"
  | "updateFunctionLayers"
  | "createFunctionAccess";
```

建议输入结构：

```ts
type ManageFunctionsInput =
  | {
      action: "createFunction";
      func: CreateFunctionInput;
      functionRootPath?: string;
      force: boolean;
    }
  | {
      action: "updateFunctionCode";
      functionName: string;
      functionRootPath: string;
      zipFile?: string;
      handler?: string;
    }
  | {
      action: "updateFunctionConfig";
      funcParam: UpdateFunctionConfigInput;
    }
  | {
      action: "invokeFunction";
      functionName: string;
      params?: Record<string, unknown>;
    }
  | {
      action: "createFunctionTrigger";
      functionName: string;
      triggers: TriggerInput[];
    }
  | {
      action: "deleteFunctionTrigger";
      functionName: string;
      triggerName: string;
      confirm?: boolean;
    }
  | {
      action: "createLayerVersion";
      layerName: string;
      runtimes: string[];
      contentPath?: string;
      base64Content?: string;
      description?: string;
      licenseInfo?: string;
    }
  | {
      action: "deleteLayerVersion";
      layerName: string;
      version: number;
      confirm?: boolean;
    }
  | {
      action: "attachLayer";
      functionName: string;
      layerName: string;
      version: number;
    }
  | {
      action: "detachLayer";
      functionName: string;
      layerName: string;
      version: number;
      confirm?: boolean;
    }
  | {
      action: "updateFunctionLayers";
      functionName: string;
      layers: Array<{ layerName: string; version: number }>;
    }
  | {
      action: "createFunctionAccess";
      functionName: string;
      path?: string;
      type?: "Event" | "HTTP";
      auth?: boolean;
    };
```

### 为什么放弃 payload 分组

虽然 payload 分组对单模块内的判别性更强，但这里最终放弃，原因是：

1. 仓库其他模块当前并未普遍采用这种模式；
2. 对 AI 来说，跨模块的一致性通常比单模块的局部最优更重要；
3. 通过更自解释的 action 名和更统一的字段命名，已经能显著降低误调用率；
4. 继续保留顶层字段，也更容易兼容现有旧工具映射。

## 命名与目标字段规范

本版强制统一命名：

1. 函数一律使用 `functionName`
2. 层一律使用 `layerName`
3. 触发器一律使用 `triggerName`
4. 层版本一律使用 `version`
5. 新双工具尽量不出现语义不明的通用字段 `name`

这样做是为了避免 AI 在不同 action 间复制参数时，把 `name` 错用到函数、层或触发器上。

## 返回结构

双工具统一返回：

```json
{
  "success": true,
  "data": {
    "action": "getFunctionDetail"
  },
  "message": "Fetched function detail",
  "nextActions": [
    {
      "tool": "queryFunctions",
      "action": "listFunctionLogs",
      "reason": "Inspect recent logs for this function"
    }
  ]
}
```

要求：

1. `data.action` 必须回显最终执行的 action；
2. `data.target` 可选，用于放 `functionName` / `layerName` 等关键目标；
3. 大体积底层返回放入 `data.raw`；
4. 写操作优先返回“结果摘要 + 推荐下一步”，不要求 AI 再猜。

## AI 友好性约束

为了保证双工具依然容易调用，新增以下设计约束：

### 1. 一类信息只保留一个推荐入口

- 代码下载地址只通过 `getFunctionDownloadUrl`
- HTTP 访问查询只通过 `getFunctionAccess`
- 触发器查询只通过 `listFunctionTriggers`
- 不再通过 `getFunctionDetail` 的 `include` 兼容这些查询

### 2. action 必须自解释

禁止：

- `detail`
- `logs`
- `layers`

允许：

- `getFunctionDetail`
- `listFunctionLogs`
- `getLayerVersionDetail`

### 3. 目标字段固定命名

- 和函数相关的目标统一叫 `functionName`
- 和层相关的目标统一叫 `layerName`
- 和触发器相关的目标统一叫 `triggerName`
- 不因 action 不同切换为 `name`

### 4. 删除/解绑类 action 必须显式确认

- `trigger.delete`
- `layer.deleteVersion`
- `layer.detach`

至少要求 `confirm` 或等价保护字段，默认安全失败。

## 兼容映射

兼容期内旧工具仍可保留，但全部映射到新双工具内部实现。

| 旧工具 | 映射到 | 说明 |
| --- | --- | --- |
| `getFunctionList` | `queryFunctions` | `list -> listFunctions`，`detail -> getFunctionDetail` |
| `createFunction` | `manageFunctions` | `createFunction` |
| `updateFunctionCode` | `manageFunctions` | `updateFunctionCode` |
| `updateFunctionConfig` | `manageFunctions` | `updateFunctionConfig` |
| `invokeFunction` | `manageFunctions` | `invokeFunction` |
| `getFunctionLogs` | `queryFunctions` | `listFunctionLogs` |
| `getFunctionLogDetail` | `queryFunctions` | `getFunctionLogDetail` |
| `manageFunctionTriggers` | `manageFunctions` | `createFunctionTrigger` / `deleteFunctionTrigger` |
| `readFunctionLayers` | `queryFunctions` | `listFunctionLayers` / `listLayers` / `listLayerVersions` / `getLayerVersionDetail` |
| `writeFunctionLayers` | `manageFunctions` | `createLayerVersion` / `deleteLayerVersion` / `attachLayer` / `detachLayer` / `updateFunctionLayers` |
| `createFunctionHTTPAccess` | `manageFunctions` | `createFunctionAccess` |

兼容规则：

1. 旧工具只做归一化和转发；
2. 新能力只在双工具暴露；
3. 文档和提示词一律优先推荐双工具；
4. 兼容期结束后再移除旧工具。

## 模块实现方案

建议在 [`mcp/src/tools/functions.ts`](/Users/bookerzhao/.codex/worktrees/99da/cloudbase-turbo-delploy/mcp/src/tools/functions.ts) 内完成第一阶段收敛。

推荐结构：

```ts
registerFunctionTools(server) {
  registerQueryFunctions(server);
  registerManageFunctions(server);
  registerLegacyFunctionAliases(server);
}
```

内部建议：

1. `buildQueryFunctionsSchema()`
2. `buildManageFunctionsSchema()`
3. `handleQueryFunctionsAction(input)`
4. `handleManageFunctionsAction(input)`
5. `mapLegacyFunctionToolCall(toolName, args)`

## 分阶段落地

### 阶段 1 - 建立新双工具与新 schema

- 新增 `queryFunctions`
- 新增 `manageFunctions`
- 按更自解释的 flat action 落地 schema

### 阶段 2 - 建立旧工具映射

- 旧工具 handler 全部转发到新双工具内部 handler
- 停止在旧工具上添加新分支

### 阶段 3 - 切换文档与提示词

- README、`doc/mcp-tools.md`、提示词、规则文件改为优先推荐双工具
- 标记旧工具 deprecated

### 阶段 4 - 评估移除兼容层

- 根据实际使用情况决定移除窗口
- 清理旧 schema 和重复 handler

## 测试策略

测试重点不只是“功能可用”，还要验证“schema 是否容易被正确调用”。

### 1. 工具注册测试

- `queryFunctions` 可见
- `manageFunctions` 可见
- 旧工具仍可见

### 2. schema 测试

- action 枚举完整
- 不再出现模糊 action 名
- 关键目标字段统一为 `functionName` / `layerName` / `triggerName`
- 旧工具兼容映射后的字段归一化正确

### 3. 兼容映射测试

- `getFunctionList(detail)` 正确映射到 `getFunctionDetail`
- `readFunctionLayers(getLayerVersion)` 正确映射到 `getLayerVersionDetail`
- `createFunctionHTTPAccess` 正确映射到 `createFunctionAccess`

### 4. 行为测试

- `listFunctions`
- `getFunctionDetail`
- `listFunctionLogs` / `getFunctionLogDetail`
- `attachLayer` / `detachLayer` / `updateFunctionLayers`
- `createFunctionAccess`
- `getFunctionDownloadUrl`

## 风险与取舍

### 优点

- 双工具目标保留
- 与其他模块的 action 风格更一致
- 参数复制和迁移时更不容易填错字段

### 风险

- action 字符串会比历史工具更长
- 双工具本身仍然会带来较大的 union schema
- 兼容映射依然需要较多归一化逻辑

### 取舍结论

接受 action 更长、schema 更严格，换取更高的 AI 正确调用率。对于双工具模型，**跨模块一致性和 action 自解释性，要优先于局部形式上的“高级 schema”**。

## 安全性

1. `queryFunctions` 严格标注 `readOnlyHint: true`
2. `manageFunctions` 标注非只读
3. 删除、解绑、覆盖类 action 显式要求确认字段
4. 环境和凭证继续统一走 `cloudBaseOptions`
