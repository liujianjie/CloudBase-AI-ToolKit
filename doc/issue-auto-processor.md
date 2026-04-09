# Issue Auto Processor

基于 CodeBuddy CLI headless 模式的 GitHub Issue 自动处理 workflow。

## 功能概述

这个 workflow 做 4 件事：

- **延迟处理**：自动任务只处理创建满 4 小时的 issue
- **简单分类**：命中 bug 标签或 bug 关键词的 issue 走自动修复；其他 issue 走分析回复
- **自动修复**：对 bug issue 调用 CodeBuddy CLI 修改代码，再由 workflow 统一创建分支、提交和 PR
- **自动评论**：对非 bug issue 自动发表评论；对失败的 bug 修复尝试也会留痕

## 为什么改成这个版本

相比自定义扫描脚本 + 额外 prompt / helper 文件，这个版本只有一个 workflow 文件：

- `.github/workflows/issue-auto-processor-simple.yml`

这样更容易维护，也更容易让 reviewer 看清楚实际行为。

## 触发方式

### 自动触发

- 每 4 小时运行一次
- 自动任务只会处理：
  - open issue
  - 创建时间 >= 4 小时
  - 不带 `ai-processed`
  - 不带 `ai-processing`
  - 不带 `no-ai`

### 手动触发

支持在 Actions 页面手动运行，并传入 `issue_number`：

- 如果传了 `issue_number`，会立即处理这个 issue
- 适合 maintainer 手动重试或加速处理单个 issue

## 处理逻辑

```text
schedule / workflow_dispatch
        ↓
collect eligible issues
        ↓
for each issue
  ├─ bug label / bug keyword → CodeBuddy 尝试修复 → workflow 提交 PR
  └─ other issue             → CodeBuddy 生成分析评论
```

## 标签约定

| 标签 | 作用 |
|------|------|
| `ai-processing` | 当前正在处理 |
| `ai-processed` | 已处理完成 |
| `ai-failed` | 处理失败 |
| `ai-fix` | 已创建修复 PR |
| `no-ai` | 跳过自动处理 |

workflow 会自动补齐这些标签，不需要手动预创建。

## CodeBuddy 认证

workflow 支持两种认证方式，优先顺序与官方文档一致：

1. `CODEBUDDY_AUTH_TOKEN`
2. `CODEBUDDY_API_KEY`

建议：

- GitHub Actions / CI：优先用 `CODEBUDDY_AUTH_TOKEN`
- 如果使用 `CODEBUDDY_API_KEY` 且是中国版环境，请额外配置 repository variable：
  - `CODEBUDDY_INTERNET_ENVIRONMENT=internal`

## 需要配置的仓库 Secret / Variable

### Secrets

- `CODEBUDDY_AUTH_TOKEN` 或 `CODEBUDDY_API_KEY`
- `GITHUB_TOKEN` 由 Actions 自动提供

### Variables（可选）

- `CODEBUDDY_INTERNET_ENVIRONMENT`
  - 海外版可不填
  - 中国版建议设为 `internal`

## PR 创建规则

当 bug issue 产出实际代码改动时，workflow 会：

1. 创建分支 `ai-fix/issue-{number}`
2. 提交自动修复结果
3. 创建指向该 issue 的 PR
4. 在 issue 下回贴 PR 链接

如果 CodeBuddy 没能给出可信 patch，workflow 不会空建 PR，而是直接在 issue 中说明失败结果。

## 风险边界

当前版本保持“简单但有边界”：

- 自动任务不会处理 4 小时内的新 issue
- 自动任务不会重复处理已标记 `ai-processed` 的 issue
- `no-ai` 可以直接阻止自动处理
- 对 bug issue，只有在仓库里确实出现代码 diff 时才会创建 PR
- git commit / push / PR 创建由 workflow 控制，不交给 CodeBuddy 自己决定

## 当前限制

这个版本刻意没有做的事情：

- 不监听 `@ai skip` / `@ai fix` 评论命令
- 不做复杂的多阶段 prompt 编排
- 不做单独的扫描脚本与状态机脚本
- 不保证第一次修复就一定成功，maintainer 仍需 review 自动 PR

## 后续可选增强

如果后面要继续增强，建议按优先级做：

1. 支持 comment command（如 `@ai fix`）
2. 加入 dry-run 模式
3. 把 bug / non-bug 分类改成更稳定的结构化判定
4. 为自动 PR 增加更严格的验证命令
