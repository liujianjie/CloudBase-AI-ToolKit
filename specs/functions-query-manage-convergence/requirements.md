# 需求文档

## 介绍

当前 `functions` 域仍保留了较多历史工具：`getFunctionList`、`createFunction`、`updateFunctionCode`、`updateFunctionConfig`、`invokeFunction`、`getFunctionLogs`、`getFunctionLogDetail`、`manageFunctionTriggers`、`readFunctionLayers`、`writeFunctionLayers`，再加上 `gateway` 域里的 `createFunctionHTTPAccess`，整体已经偏离“少量工具、稳定入口、AI 易推理”的目标。

本次需求的目标不是继续在现有函数工具上做局部补丁，而是将 `functions` 域更极致地收敛到两个主入口：

1. `queryFunctions`：只读查询入口，统一承载函数、层、触发器、HTTP 访问、日志摘要/详情、代码下载地址等查询能力；
2. `manageFunctions`：写操作入口，统一承载创建、更新代码、更新配置、管理触发器、管理层、创建 HTTP 访问、调用函数等生命周期动作。

本次需求优先级高于“保留现有工具名继续增强”的渐进方案。设计时应以“一个 query、一个 manage”为首要目标，再评估兼容层、迁移路径和分阶段落地方式。

## 需求

### 需求 1 - 函数域只保留两个主工具入口

**用户故事：** 作为维护者，我希望 `functions` 域最终只存在一个查询工具和一个管理工具，以便压缩工具心智模型并减少 AI 在多个函数工具之间摇摆。

#### 验收标准

1. When 设计 `functions` 域工具模型时, the 系统 shall 将函数域主入口收敛为 `queryFunctions` 和 `manageFunctions` 两个工具。
2. While 定义函数域能力边界时, the 系统 shall 将函数详情、函数层、触发器、HTTP 访问、日志、代码下载地址等只读能力统一纳入 `queryFunctions`。
3. While 定义函数域写能力时, the 系统 shall 将创建函数、更新代码、更新配置、调用函数、管理触发器、管理函数层、创建 HTTP 访问等动作统一纳入 `manageFunctions`。
4. When 新增函数相关能力时, the 规范 shall 优先通过 `queryFunctions` 或 `manageFunctions` 的 action 扩展，而不是继续新增细粒度函数工具。

### 需求 2 - action 语义必须清晰且可判别

**用户故事：** 作为 AI Agent，我希望两个主工具的 action 和参数结构能够直接表达能力边界和必填条件，以便减少试错调用。

#### 验收标准

1. When 定义 `queryFunctions` 时, the 系统 shall 使用清晰的只读 action 枚举，例如 `list`、`detail`、`logs`、`logDetail`、`layers`、`layerVersions`、`triggers`、`downloadUrl`、`httpAccess`。
2. When 定义 `manageFunctions` 时, the 系统 shall 使用清晰的写动作枚举，例如 `create`、`updateCode`、`updateConfig`、`invoke`、`createTrigger`、`deleteTrigger`、`attachLayer`、`detachLayer`、`updateLayers`、`createHttpAccess`。
3. While 不同 action 对参数要求不同, the schema shall 通过判别式结构、明确字段说明或 action 分组，使 AI 能理解每个 action 的必填项和可选项。
4. When 调用方传入缺失或未知 action 时, the 系统 shall 失败并返回可修复的错误提示，而不是静默兜底或执行默认写操作。

### 需求 3 - 返回格式统一为结构化 envelope

**用户故事：** 作为维护者和 AI Agent，我希望两个主工具都返回稳定的结构化 envelope，而不是混用 SDK 原始 JSON 和自定义结果。

#### 验收标准

1. When `queryFunctions` 返回结果时, the 系统 shall 返回包含 `success`、`data`、`message` 的统一结构。
2. When `manageFunctions` 返回结果时, the 系统 shall 返回包含 `success`、`data`、`message` 的统一结构，并在适合时附带 `nextActions`。
3. While 某个 action 的结果会触发自然下一步时, the 系统 shall 提供建议性的 `nextActions`，帮助 AI 串联调用。
4. When 返回底层 SDK 原始字段时, the 系统 shall 将其放入稳定的 `data` 子结构中，而不是直接把整段原始输出暴露为顶层文本。

### 需求 4 - 日志与下载信息也必须服从双工具模型

**用户故事：** 作为维护者，我希望即使是日志、代码下载地址这类辅助能力，也不要成为破坏收敛目标的例外。

#### 验收标准

1. When 需要查询函数日志列表或详情时, the 系统 shall 通过 `queryFunctions` 的 action 提供该能力，而不是继续保留独立日志工具作为长期主入口。
2. When 需要查询线上代码下载地址时, the 系统 shall 通过 `queryFunctions` 的 action 提供该能力，而不是新增独立下载工具。
3. While HTTP 访问配置仍与函数生命周期强绑定, the 系统 shall 将其查询能力放入 `queryFunctions`，其创建或变更能力放入 `manageFunctions`。
4. When 设计函数层能力时, the 系统 shall 以函数域子资源视角将其纳入双工具模型，而不是长期保留独立的 read/write layer 工具。

### 需求 5 - 兼容策略必须显式定义

**用户故事：** 作为维护者，我希望收敛过程中不会立即打断现有用户和规则文件，但也不希望兼容层无限期存在。

#### 验收标准

1. When 定义收敛方案时, the 需求文档 shall 明确现有函数工具是被立即替换、保留兼容别名，还是分阶段废弃。
2. While 保留兼容入口时, the 系统 shall 明确兼容入口最终映射到 `queryFunctions` 或 `manageFunctions`，而不是继续维护并行实现。
3. When 设计迁移路径时, the 需求文档 shall 明确 README、工具文档、提示词、测试和规则文件的同步更新范围。
4. When 兼容期结束时, the 需求文档 shall 明确旧工具的下线条件或废弃标识策略。

### 需求 6 - 实施顺序应以最小风险推进

**用户故事：** 作为维护者，我希望在目标足够激进的同时，落地顺序仍然可控，避免一次性重构造成大面积回归。

#### 验收标准

1. When 进入技术方案设计时, the 系统 shall 明确哪些旧工具先通过内部复用收敛到新主入口，哪些能力可以后续再删除旧入口。
2. While 设计分阶段落地方案时, the 系统 shall 优先保证查询路径先收敛，再处理写路径和兼容层清理。
3. When 设计测试策略时, the 系统 shall 覆盖工具注册、schema、兼容映射和关键 action 行为。
4. While 推进实现时, the 系统 shall 避免继续对旧细粒度工具做功能增强，除非该增强直接服务于双工具收敛。

### 需求 7 - 本阶段先确认需求，再进入设计

**用户故事：** 作为维护者，我希望先把“一个 query、一个 manage”的目标定稿，再进入设计和实现，避免团队对目标形态理解不一致。

#### 验收标准

1. When 本文档完成后, the 系统 shall 将其作为后续技术方案设计的唯一目标基线。
2. While 用户尚未确认该需求文档时, the 系统 shall 不直接继续实现新的函数工具收敛代码。
3. When 用户确认该需求文档后, the 系统 shall 再产出 `specs/functions-query-manage-convergence/design.md`。
