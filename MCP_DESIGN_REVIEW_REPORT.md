# CloudBase MCP 设计审查报告

**审查日期**: 2026-03-11  
**审查范围**: 所有 MCP 工具及相关设计规范  
**审查依据**: `.cursor/commands/mcp_design_review.mdc` 中定义的统一 MCP 设计指南

---

## 📋 执行摘要 (Executive Summary)

### 总体评估

**状态**: ⚠️ **部分符合** - 需要改进

CloudBase MCP 项目在工具设计上展现了**渐进式演进**的特征：
- ✅ **新工具**（storage, layers）已采用 `query/manage` + `action` 模式，符合现代设计规范
- ⚠️ **旧工具**（functions, database）仍使用混合模式，存在规范不一致问题
- ❌ **全局规范缺失**，导致不同模块采用不同的设计哲学

### 关键发现

| 维度 | 评分 | 说明 |
|------|------|------|
| **全局规范一致性** | 🔴 40% | 缺少统一的工具分类规则，不同模块混用多套命名哲学 |
| **Query/Manage 模式** | 🟡 60% | 新工具已采用，但旧工具未收敛 |
| **返回契约统一性** | 🟡 55% | 新工具返回 `{success, data, message}`，旧工具返回原始 SDK JSON |
| **AI 友好度** | 🟡 65% | Schema 表达能力不足，缺少 `nextActions` 引导 |
| **安全性注解** | 🟢 80% | 大部分工具已标注 `readOnlyHint`、`destructiveHint` |
| **批量操作支持** | 🔴 35% | 批量能力不均衡，多数场景需多次往返 |

### 优先级建议

1. **P0 - 立即处理**: 补全全局工具规范文档
2. **P1 - 优先处理**: 统一返回契约，收敛旧工具到 `query/manage` 模式
3. **P2 - 计划处理**: 增强 AI 友好度（`nextActions`、摘要优先）
4. **P3 - 后续处理**: 批量操作优化

---

## 🎯 全局规范评估

### 1. 工具分类规则缺失 ❌

**问题**: 项目缺少统一的资源分类判定规则

**当前状态**:
- `storage`: 使用 `queryStorage` / `manageStorage` ✅
- `functions`: 混用 `getFunctionList` / `createFunction` / `manageFunctionTriggers` ⚠️
- `database`: 使用 `readNoSqlDatabaseStructure` / `writeNoSqlDatabaseStructure` ⚠️
- `env`: 使用 `auth` 工具（单一工具多 action） ⚠️

**建议**: 参考 `specs/function-tool-ai-ergonomics/design.md` 中的全局规范基线：

```markdown
### 全局工具分类规则

1. **声明式资源** (Declarative Resources)
   - 适用: NoSQL 数据内容、NoSQL 结构、安全规则
   - 模式: `read/write` + `action`
   - 示例: `readNoSqlDatabaseContent`, `writeNoSqlDatabaseContent`

2. **生命周期资源** (Lifecycle Resources)
   - 适用: functions, cloudrun, storage, 域名、环境控制
   - 模式: `query/manage` + `action`
   - 示例: `queryStorage`, `manageStorage`

3. **执行动作** (Execution Actions)
   - 适用: invoke, execute 等一次性运行操作
   - 模式: 独立工具或纳入 `manage(action=...)`
   - 示例: `invokeFunction` (可保留) 或 `manageFunctions(action="invoke")`

4. **观测能力** (Observability)
   - 适用: logs, metrics, traces
   - 模式: 独立域，摘要优先
   - 示例: `getFunctionLogs`, `getFunctionLogDetail`
```

**行动项**:
- [ ] 创建 `docs/mcp-tool-design-guidelines.md` 文档
- [ ] 明确每个资源域应采用的模式
- [ ] 在 `specs/` 中补充全局规范 spec

---

## 🔍 按模块详细评估

### 模块 1: Functions (云函数)

#### 工具清单
1. `getFunctionList` - 查询函数列表/详情
2. `createFunction` - 创建函数
3. `updateFunctionCode` - 更新函数代码
4. `updateFunctionConfig` - 更新函数配置
5. `invokeFunction` - 调用函数
6. `getFunctionLogs` - 获取函数日志
7. `getFunctionLogDetail` - 获取日志详情
8. `manageFunctionTriggers` - 管理触发器 ✅
9. `readFunctionLayers` - 查询函数层 ✅
10. `writeFunctionLayers` - 管理函数层 ✅

#### 规范一致性评估

| 检查项 | 状态 | 说明 |
|--------|------|------|
| **工具命名统一** | ⚠️ 部分符合 | 混用 `get/create/update` 和 `manage/read/write` |
| **Query/Manage 模式** | ⚠️ 部分符合 | 新工具(layers, triggers)已采用，旧工具未收敛 |
| **Action 字段必填** | ⚠️ 部分符合 | `manageFunctionTriggers` 有 action，但 `createFunction` 无 |
| **返回契约统一** | ❌ 不符合 | 旧工具返回原始 SDK JSON，新工具返回 `{success, data, message}` |
| **安全性注解** | ✅ 符合 | 所有工具已标注 `readOnlyHint`、`destructiveHint` |
| **Confirm 参数** | ⚠️ 部分符合 | `createFunction` 有 `force`，但 `deleteFunction` 不存在 |

#### AI 友好度评估

| 检查项 | 状态 | 说明 |
|--------|------|------|
| **Schema 表达能力** | ⚠️ 中等 | `createFunction` 的 `func` 对象过于复杂，条件必填不清晰 |
| **NextActions 引导** | ❌ 缺失 | 旧工具无 `nextActions`，新工具(layers)已添加 ✅ |
| **摘要优先策略** | ❌ 缺失 | `getFunctionList` 默认返回完整对象，无 `view` 参数 |
| **批量操作支持** | ⚠️ 部分支持 | `manageFunctionTriggers` 支持批量创建，但删除仅支持单个 |

#### 具体问题与建议

**问题 1: 工具职责重叠**
- `getFunctionList(action="detail")` 可查看层信息
- `readFunctionLayers(action="getFunctionLayers")` 也可查看层信息
- **建议**: 明确主入口与专题入口，在描述中说明使用场景

**问题 2: 返回结构不一致**
```typescript
// 旧工具 (getFunctionList)
return { content: [{ type: "text", text: JSON.stringify(sdkResult) }] }

// 新工具 (readFunctionLayers)
return { content: [{ type: "text", text: JSON.stringify({
  success: true,
  data: { action, layers, ... },
  message: "...",
  nextActions: [...]
}) }] }
```
**建议**: 逐步收敛旧工具到新格式

**问题 3: 缺少下一步引导**
- `createFunction` 完成后，AI 不知道下一步应该 `invokeFunction` 还是 `getFunctionLogs`
- **建议**: 添加 `nextActions` 字段

**问题 4: 批量操作不对称**
- `manageFunctionTriggers(action="create")` 支持 `triggers[]` 数组
- `manageFunctionTriggers(action="delete")` 仅支持单个 `triggerName`
- **建议**: 添加 `triggerNames[]` 支持批量删除

#### 推荐改进方案

参考 `specs/function-tool-ai-ergonomics/design.md` 中的设计：

1. **短期（非破坏性增强）**:
   - 保留工具名，添加可选参数 `view`、`include`、`returnView`
   - 写工具开始回显结构化结果
   - 添加 `nextActions` 字段

2. **中期（规范收敛）**:
   - 更新工具描述，明确主入口 vs 专题入口
   - 统一返回格式到 `{success, data, message, nextActions}`

3. **长期（可选）**:
   - 评估是否将 `invokeFunction` 纳入 `manageFunctions(action="invoke")`
   - 评估是否将日志工具独立为观测域

---

### 模块 2: Storage (云存储)

#### 工具清单
1. `queryStorage` - 查询存储信息 ✅
2. `manageStorage` - 管理存储文件 ✅

#### 规范一致性评估

| 检查项 | 状态 | 说明 |
|--------|------|------|
| **工具命名统一** | ✅ 符合 | 使用 `query/manage` 模式 |
| **Query/Manage 模式** | ✅ 符合 | 严格按读写分离 |
| **Action 字段必填** | ✅ 符合 | 两个工具都有必填 `action` |
| **返回契约统一** | ✅ 符合 | 返回 `{success, data, message}` |
| **安全性注解** | ✅ 符合 | `queryStorage` 标注 `readOnlyHint: true` |
| **Confirm 参数** | ✅ 符合 | `delete` 操作需要 `force: true` |

#### AI 友好度评估

| 检查项 | 状态 | 说明 |
|--------|------|------|
| **Schema 表达能力** | ✅ 优秀 | Action 枚举清晰，参数说明详细 |
| **NextActions 引导** | ⚠️ 缺失 | 无 `nextActions` 字段 |
| **摘要优先策略** | ✅ 符合 | `list` 操作返回摘要信息 |
| **批量操作支持** | ⚠️ 部分支持 | 支持目录操作，但无批量文件操作 |

#### 评价

**✅ 最佳实践示例** - Storage 模块是项目中设计最规范的模块：
- 清晰的 `query/manage` 分离
- 统一的返回格式
- 完善的安全性注解
- 良好的 Schema 表达

**建议改进**:
- 添加 `nextActions` 字段引导后续操作
- 考虑支持批量文件操作（如批量删除）

---

### 模块 3: Database NoSQL (文档数据库)

#### 工具清单
1. `readNoSqlDatabaseStructure` - 读取数据库结构 ✅
2. `writeNoSqlDatabaseStructure` - 修改数据库结构 ✅
3. `readNoSqlDatabaseContent` - 读取数据库内容 ✅
4. `writeNoSqlDatabaseContent` - 修改数据库内容 ✅

#### 规范一致性评估

| 检查项 | 状态 | 说明 |
|--------|------|------|
| **工具命名统一** | ✅ 符合 | 使用 `read/write` 模式（声明式资源） |
| **Query/Manage 模式** | ✅ 符合 | 按结构/内容分离，符合声明式资源设计 |
| **Action 字段必填** | ✅ 符合 | 所有工具都有必填 `action` |
| **返回契约统一** | ✅ 符合 | 返回 `{success, requestId, data, message}` |
| **安全性注解** | ✅ 符合 | 读工具标注 `readOnlyHint: true` |
| **Confirm 参数** | ⚠️ 部分符合 | `deleteCollection` 无确认参数 |

#### AI 友好度评估

| 检查项 | 状态 | 说明 |
|--------|------|------|
| **Schema 表达能力** | ⚠️ 中等 | `updateCollection` 的 `updateOptions` 结构复杂 |
| **NextActions 引导** | ❌ 缺失 | 无 `nextActions` 字段 |
| **摘要优先策略** | ⚠️ 部分符合 | `listCollections` 返回完整信息，无摘要选项 |
| **批量操作支持** | ⚠️ 部分支持 | `readNoSqlDatabaseContent` 支持批量查询，但写操作不支持批量 |

#### 具体问题与建议

**问题 1: 命名哲学不一致**
- Database 使用 `read/write`（声明式资源）
- Storage 使用 `query/manage`（生命周期资源）
- Functions 混用多种模式

**分析**: 这是**合理的差异**，因为：
- NoSQL 数据库是声明式资源（CRUD 为主）→ `read/write` 合适
- Storage 是生命周期资源（上传/下载/删除）→ `query/manage` 合适

**建议**: 在全局规范文档中明确说明这种差异的合理性

**问题 2: 缺少危险操作确认**
```typescript
// writeNoSqlDatabaseStructure
action: "deleteCollection"  // ❌ 无 confirm 参数
```
**建议**: 添加 `confirm` 或 `force` 参数

**问题 3: Token 经济性问题**
- `readNoSqlDatabaseContent` 默认返回完整文档，可能包含大量数据
- **建议**: 添加 `fields` 参数支持字段投影，或添加 `limit` 默认值

---

### 模块 4: Database SQL (关系数据库)

#### 工具清单
1. `executeReadOnlySQL` - 执行只读 SQL ✅
2. `executeWriteSQL` - 执行写入 SQL ✅

#### 规范一致性评估

| 检查项 | 状态 | 说明 |
|--------|------|------|
| **工具命名统一** | ✅ 符合 | 使用 `executeReadOnly/executeWrite` 模式 |
| **Query/Manage 模式** | ✅ 符合 | 严格按读写分离 |
| **Action 字段必填** | N/A | SQL 工具无需 action（直接执行 SQL） |
| **返回契约统一** | ✅ 符合 | 返回 `{success, data, message}` |
| **安全性注解** | ✅ 符合 | `executeReadOnlySQL` 标注 `readOnlyHint: true` |
| **Confirm 参数** | ⚠️ 缺失 | `executeWriteSQL` 无确认参数（但 SQL 本身有风险） |

#### AI 友好度评估

| 检查项 | 状态 | 说明 |
|--------|------|------|
| **Schema 表达能力** | ✅ 优秀 | 简单直接，只需 `sql` 参数 |
| **NextActions 引导** | ❌ 缺失 | 无 `nextActions` 字段 |
| **摘要优先策略** | N/A | SQL 结果由查询决定 |
| **批量操作支持** | ✅ 原生支持 | SQL 本身支持批量操作 |

#### 评价

**✅ 设计合理** - SQL 工具采用最简设计，符合 SQL 的特性：
- 不需要复杂的 action 枚举
- 读写分离清晰
- 安全性注解完善

**建议改进**:
- 考虑添加 `dryRun` 参数用于 `executeWriteSQL`
- 添加 `nextActions` 引导（如建议查看表结构、查询数据等）

---

### 模块 5: Environment (环境管理)

#### 工具清单
1. `auth` - 统一认证工具 ✅

#### 规范一致性评估

| 检查项 | 状态 | 说明 |
|--------|------|------|
| **工具命名统一** | ⚠️ 特殊 | 使用单一工具 `auth`，通过 `action` 区分 |
| **Query/Manage 模式** | ⚠️ 特殊 | 混合读写操作在一个工具中 |
| **Action 字段必填** | ✅ 符合 | 有必填 `action` 字段 |
| **返回契约统一** | ✅ 符合 | 返回 `{success, data, message, nextStep}` |
| **安全性注解** | ⚠️ 部分符合 | 未明确标注 `readOnlyHint`（因为混合读写） |
| **Confirm 参数** | ✅ 符合 | `logout` 操作有确认机制 |

#### AI 友好度评估

| 检查项 | 状态 | 说明 |
|--------|------|------|
| **Schema 表达能力** | ✅ 优秀 | Action 枚举清晰，参数说明详细 |
| **NextActions 引导** | ✅ 优秀 | 使用 `nextStep` 字段引导（类似 `nextActions`） |
| **摘要优先策略** | ✅ 符合 | `status` 操作返回摘要，`list` 操作已简化 |
| **批量操作支持** | N/A | 环境管理不需要批量操作 |

#### 评价

**✅ 特殊但合理** - `auth` 工具采用单一工具多 action 模式：
- 环境管理是高度关联的操作流程（登录→选择环境→登出）
- 使用单一工具可以更好地管理状态
- `nextStep` 字段提供了优秀的引导

**建议改进**:
- 考虑拆分为 `queryEnv` 和 `manageEnv`（可选，当前设计也合理）
- 添加 `readOnlyHint` 注解（可以根据 action 动态判断）

---

## 📊 横向对比分析

### 工具命名模式对比

| 模块 | 模式 | 评价 | 建议 |
|------|------|------|------|
| **Storage** | `query/manage` | ✅ 最佳实践 | 保持 |
| **Functions (新)** | `read/write` (layers) | ✅ 符合规范 | 保持 |
| **Functions (旧)** | `get/create/update` | ⚠️ 需收敛 | 逐步迁移到 `query/manage` |
| **Database NoSQL** | `read/write` | ✅ 符合规范（声明式资源） | 保持 |
| **Database SQL** | `executeReadOnly/executeWrite` | ✅ 符合规范 | 保持 |
| **Environment** | `auth` (单一工具) | ✅ 特殊但合理 | 保持或拆分 |

### 返回格式对比

| 模块 | 返回格式 | 评价 |
|------|----------|------|
| **Storage** | `{success, data, message}` | ✅ 标准格式 |
| **Functions (新)** | `{success, data, message, nextActions}` | ✅ 增强格式 |
| **Functions (旧)** | 原始 SDK JSON | ❌ 需统一 |
| **Database NoSQL** | `{success, requestId, data, message}` | ✅ 标准格式 + requestId |
| **Database SQL** | `{success, data, message}` | ✅ 标准格式 |
| **Environment** | `{success, data, message, nextStep}` | ✅ 增强格式 |

**建议**: 统一为 `{success, data, message, nextActions?, requestId?}`

---

## 🎯 可操作的改进建议

### P0 - 立即处理（Critical）

#### 1. 创建全局工具设计规范文档

**文件**: `docs/mcp-tool-design-guidelines.md`

**内容大纲**:
```markdown
# CloudBase MCP 工具设计指南

## 1. 资源分类规则
- 声明式资源 (Declarative) → `read/write`
- 生命周期资源 (Lifecycle) → `query/manage`
- 执行动作 (Execution) → 独立工具或 `manage(action=...)`
- 观测能力 (Observability) → 独立域，摘要优先

## 2. 工具命名规范
- 读工具: `query*/read*/executeReadOnly*`
- 写工具: `manage*/write*/executeWrite*`
- Action 字段: 必填，使用 enum

## 3. 返回契约
{
  success: boolean,
  data: {...},
  message: string,
  nextActions?: [...],
  requestId?: string
}

## 4. 安全性注解
- readOnlyHint: true/false
- destructiveHint: true/false (删除、覆盖操作)
- idempotentHint: true/false
- Confirm 参数: 危险操作必须有 confirm/force 参数

## 5. AI 友好度
- Schema: 使用 discriminated union 表达条件必填
- NextActions: 提供后续操作建议
- 摘要优先: 默认返回摘要，通过 view/include 展开详情
```

**行动项**:
- [ ] 创建文档
- [ ] 在 `specs/` 中创建对应 spec
- [ ] 更新 `README.md` 添加设计指南链接

#### 2. 补充 Functions 模块的危险操作确认

**问题**: `createFunction` 有 `force` 参数，但缺少 `deleteFunction` 工具

**建议**:
- 添加 `manageFunctions` 工具，包含 `delete` action
- 或在 `updateFunctionConfig` 中添加 `delete` action

**示例**:
```typescript
server.registerTool("manageFunctions", {
  inputSchema: {
    action: z.enum(["delete", "enable", "disable"]),
    name: z.string(),
    confirm: z.boolean().optional().default(false)
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: true
  }
})
```

---

### P1 - 优先处理（High Priority）

#### 3. 统一返回契约

**目标**: 所有工具返回统一格式

**实施步骤**:
1. 创建 `utils/response-builder.ts`:
```typescript
export function buildToolResponse(options: {
  success: boolean;
  data: any;
  message: string;
  nextActions?: ToolNextStep[];
  requestId?: string;
}) {
  return {
    content: [{
      type: "text" as const,
      text: JSON.stringify({
        success: options.success,
        data: options.data,
        message: options.message,
        ...(options.nextActions && { nextActions: options.nextActions }),
        ...(options.requestId && { requestId: options.requestId })
      }, null, 2)
    }]
  };
}
```

2. 逐步迁移旧工具使用新格式:
   - `getFunctionList` ✅
   - `createFunction` ✅
   - `updateFunctionCode` ✅
   - `updateFunctionConfig` ✅
   - `invokeFunction` ✅
   - `getFunctionLogs` ✅

**优先级**: 高频工具优先（`getFunctionList`, `createFunction`）

#### 4. 添加 NextActions 引导

**目标**: 所有写工具和高频读工具添加 `nextActions`

**示例**:
```typescript
// createFunction 完成后
nextActions: [
  {
    tool: "getFunctionList",
    action: "detail",
    required_params: ["name"],
    suggested_args: { action: "detail", name: functionName }
  },
  {
    tool: "invokeFunction",
    action: "invoke",
    required_params: ["name"],
    suggested_args: { name: functionName, params: {} }
  },
  {
    tool: "getFunctionLogs",
    action: "list",
    required_params: ["name"],
    suggested_args: { name: functionName, limit: 10 }
  }
]
```

**行动项**:
- [ ] 更新 `utils/tool-result.ts` 添加 `buildNextActions` 辅助函数
- [ ] 为每个工具定义 `nextActions` 规则
- [ ] 逐步添加到工具返回中

#### 5. 增强 Schema 表达能力

**问题**: `createFunction` 的 `func` 对象条件必填不清晰

**建议**: 使用 discriminated union

**示例**:
```typescript
// 当前设计
func: z.object({
  type: z.enum(["Event", "HTTP", "WebSocket"]),
  protocolType: z.string().optional(),  // ❌ 不清楚何时必填
  ...
})

// 改进设计
func: z.discriminatedUnion("type", [
  z.object({
    type: z.literal("Event"),
    // Event 特有字段
  }),
  z.object({
    type: z.literal("HTTP"),
    protocolType: z.enum(["HTTP", "HTTPS"]),  // ✅ 明确必填
    // HTTP 特有字段
  }),
  z.object({
    type: z.literal("WebSocket"),
    // WebSocket 特有字段
  })
])
```

---

### P2 - 计划处理（Medium Priority）

#### 6. 实现摘要优先策略

**目标**: 高频读工具默认返回摘要，支持详情展开

**实施步骤**:

1. 为 `getFunctionList` 添加 `view` 参数:
```typescript
inputSchema: {
  action: z.enum(["list", "detail"]),
  view: z.enum(["summary", "detail"]).optional().default("summary"),
  include: z.array(z.enum(["layers", "triggers", "envVariables", "all"])).optional()
}
```

2. 简化默认返回:
```typescript
// view="summary" (默认)
{
  name: "hello",
  type: "Event",
  runtime: "Nodejs18.15",
  status: "Active",
  lastModifiedTime: "2024-01-01T00:00:00Z"
}

// view="detail" 或 include=["all"]
{
  name: "hello",
  type: "Event",
  runtime: "Nodejs18.15",
  status: "Active",
  lastModifiedTime: "2024-01-01T00:00:00Z",
  layers: [...],
  triggers: [...],
  envVariables: {...},
  ...
}
```

3. 为 `getFunctionLogs` 添加摘要模式:
```typescript
// view="summary" (默认)
{
  requestId: "xxx",
  invokeTime: "2024-01-01T00:00:00Z",
  status: "Success",
  duration: 100,
  memUsage: 50
}

// view="detail"
{
  requestId: "xxx",
  invokeTime: "2024-01-01T00:00:00Z",
  status: "Success",
  duration: 100,
  memUsage: 50,
  logs: "...",  // 完整日志内容
  returnValue: {...}
}
```

#### 7. 优化批量操作支持

**目标**: 提升高频批量场景效率

**优先场景**:
1. 批量删除触发器
2. 批量查询函数层绑定
3. 批量追加/解绑层

**实施步骤**:

1. `manageFunctionTriggers` 支持批量删除:
```typescript
inputSchema: {
  action: z.enum(["create", "delete"]),
  name: z.string(),
  triggers: z.array(...).optional(),  // create 时使用
  triggerName: z.string().optional(),  // delete 单个时使用
  triggerNames: z.array(z.string()).optional()  // delete 批量时使用
}
```

2. `readFunctionLayers` 支持批量查询:
```typescript
inputSchema: {
  action: z.enum([...]),
  functionName: z.string().optional(),  // 单个查询
  functionNames: z.array(z.string()).optional()  // 批量查询
}

// 返回
{
  success: true,
  data: {
    functions: [
      { name: "func1", layers: [...] },
      { name: "func2", layers: [...] }
    ]
  }
}
```

3. `writeFunctionLayers` 支持批量操作:
```typescript
// attachLayer 批量追加
{
  action: "attachLayer",
  functionName: "hello",
  layers: [  // 批量追加多个层
    { layerName: "layer1", layerVersion: 1 },
    { layerName: "layer2", layerVersion: 2 }
  ]
}
```

---

### P3 - 后续处理（Low Priority）

#### 8. 评估长期收敛方向

**目标**: 评估是否需要进一步统一工具命名

**可选方案**:

**方案 A: 保持现状**
- 优点: 不破坏现有 API，兼容性好
- 缺点: 命名不完全统一

**方案 B: 逐步收敛到 query/manage**
```typescript
// 当前
getFunctionList → queryFunctions
createFunction → manageFunctions(action="create")
updateFunctionCode → manageFunctions(action="updateCode")
updateFunctionConfig → manageFunctions(action="updateConfig")
invokeFunction → manageFunctions(action="invoke") 或保留独立

// 优点: 完全统一
// 缺点: 需要兼容性别名，迁移成本高
```

**建议**:
- 短期保持现状，通过文档明确设计理由
- 中期评估用户反馈
- 长期根据实际使用情况决定是否收敛

#### 9. 日志工具独立为观测域

**目标**: 将日志相关工具从 functions 域抽离

**可选方案**:
```typescript
// 当前
getFunctionLogs
getFunctionLogDetail

// 未来
queryLogs(resource="function", name="hello")
queryLogDetail(requestId="xxx")

// 或
queryObservability(type="logs", resource="function", name="hello")
queryObservability(type="metrics", resource="function", name="hello")
```

**建议**:
- 当前保持现状
- 未来如果需要支持更多观测能力（metrics, traces），再考虑独立域

---

## 📈 成功指标

### 短期目标（1-2 个月）

- [ ] 全局工具设计规范文档完成
- [ ] 80% 的工具返回统一格式
- [ ] 50% 的工具添加 `nextActions`
- [ ] 所有危险操作添加确认参数

### 中期目标（3-6 个月）

- [ ] 100% 的工具返回统一格式
- [ ] 100% 的工具添加 `nextActions`
- [ ] 高频工具实现摘要优先策略
- [ ] 批量操作支持覆盖主要场景

### 长期目标（6-12 个月）

- [ ] 评估并决定是否进一步统一工具命名
- [ ] 评估是否独立观测域
- [ ] 完善 AI 友好度（Schema 优化、引导优化）

---

## 🔗 参考文档

1. **设计规范**:
   - `specs/function-tool-ai-ergonomics/design.md` - 函数工具 AI 友好度设计
   - `specs/interactive-tools/design.md` - 交互式工具设计（Query/Manage 模式参考）
   - `specs/code-quality-analysis/REFACTORING_CHECKLIST.md` - 代码重构清单

2. **实现参考**:
   - `mcp/src/tools/storage.ts` - 最佳实践示例
   - `mcp/src/tools/functions.ts` - 需要改进的示例
   - `mcp/src/utils/tool-result.ts` - 工具返回辅助函数

3. **测试参考**:
   - `tests/storage-tools.test.js` - Storage 工具测试
   - `tests/function-layer-tools.test.js` - Layer 工具测试

---

## 📝 附录

### A. 工具清单汇总

| 模块 | 工具名 | 模式 | 状态 |
|------|--------|------|------|
| **Functions** | `getFunctionList` | get | ⚠️ 需改进 |
| | `createFunction` | create | ⚠️ 需改进 |
| | `updateFunctionCode` | update | ⚠️ 需改进 |
| | `updateFunctionConfig` | update | ⚠️ 需改进 |
| | `invokeFunction` | invoke | ⚠️ 需改进 |
| | `getFunctionLogs` | get | ⚠️ 需改进 |
| | `getFunctionLogDetail` | get | ⚠️ 需改进 |
| | `manageFunctionTriggers` | manage | ✅ 符合规范 |
| | `readFunctionLayers` | read | ✅ 符合规范 |
| | `writeFunctionLayers` | write | ✅ 符合规范 |
| **Storage** | `queryStorage` | query | ✅ 最佳实践 |
| | `manageStorage` | manage | ✅ 最佳实践 |
| **Database NoSQL** | `readNoSqlDatabaseStructure` | read | ✅ 符合规范 |
| | `writeNoSqlDatabaseStructure` | write | ✅ 符合规范 |
| | `readNoSqlDatabaseContent` | read | ✅ 符合规范 |
| | `writeNoSqlDatabaseContent` | write | ✅ 符合规范 |
| **Database SQL** | `executeReadOnlySQL` | execute | ✅ 符合规范 |
| | `executeWriteSQL` | execute | ✅ 符合规范 |
| **Environment** | `auth` | 单一工具 | ✅ 特殊但合理 |

### B. 设计模式决策树

```
资源类型判断
├─ 主要是 CRUD 和声明式修改？
│  └─ 是 → 使用 read/write 模式
│     └─ 示例: Database NoSQL
├─ 包含部署、绑定、上传等生命周期动作？
│  └─ 是 → 使用 query/manage 模式
│     └─ 示例: Storage, Functions (建议)
├─ 核心是执行一次性动作？
│  └─ 是 → 独立工具或 manage(action=...)
│     └─ 示例: invokeFunction, executeSQL
└─ 主要是查看日志、指标、追踪？
   └─ 是 → 独立观测域，摘要优先
      └─ 示例: getFunctionLogs (未来可独立)
```

---

**报告生成时间**: 2026-03-11
**审查人**: Augment Agent
**下次审查建议**: 3 个月后（2026-06-11）


