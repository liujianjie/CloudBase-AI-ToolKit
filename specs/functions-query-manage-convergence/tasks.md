# 实施计划

- [x] 1. 完成 `functions` 域双工具收敛开发并测试
  - 在 `mcp/src/tools/functions.ts` 中实现 `queryFunctions` 和 `manageFunctions`
  - 按已确认的 design 落地更自解释的 flat action，并统一 `functionName` / `layerName` / `triggerName` 命名
  - 将函数详情、日志、层、触发器、HTTP 访问、代码下载地址等读能力收敛到 `queryFunctions`
  - 将创建函数、更新代码、更新配置、调用函数、管理触发器、管理层、创建 HTTP 访问等写能力收敛到 `manageFunctions`
  - 建立旧工具到新双工具的兼容映射，旧工具不再承载新能力
  - 统一双工具返回 envelope、错误格式和危险操作保护
  - 更新相关文档、提示词和规则文件，优先推荐新双工具
  - 补充工具注册、schema、兼容映射和关键集成路径测试，并完成构建与回归验证
  - _需求: 需求1, 需求2, 需求3, 需求4, 需求5, 需求6_

- [x] 2. 更新 review 规则 / skills，避免再次偏离双工具模式
  - 复盘本次一开始没有直接按“一个 query、一个 manage”收敛的原因，明确是 review 约束和触发提示还不够强
  - 更新 `.cursor/commands/mcp_design_review.mdc`，让其在 review 时更明确地区分“推荐方向”和“本次必须遵循的目标形态”
  - 在 review 规则中补充对“跨模块一致性”的检查，避免只从单模块局部最优出发设计 namespaced action 或特例 payload
  - 在 review 规则中补充对“是否继续新增细粒度 tool”的阻断性检查，优先要求先评估能否并入现有 query/manage 主入口
  - 为 review 规则补充更贴近本仓库的反例和修正示例，覆盖 functions 这次的收敛场景
  - 如果 review 相关 skill / 文档也承担类似职责，同步更新其触发描述、边界说明和评估样例
  - _需求: 需求1, 需求2, 需求5, 需求6_
