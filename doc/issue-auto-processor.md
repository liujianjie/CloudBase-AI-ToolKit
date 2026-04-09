# Issue Auto Processor

基于 CodeBuddy CLI headless 模式的 GitHub Issue 自动处理 workflow。

## 功能概述

这个 workflow 做 5 件事：

- **延迟处理**：自动任务只处理创建满 4 小时的 issue
- **简单分类**：命中 bug 标签或 bug 关键词的 issue 走自动修复；其他 issue 走分析回复
- **评论命令**：maintainer 可通过 `/cloudbase fix|skip|continue` 控制单个 issue
- **自动修复**：对 bug issue 调用 CodeBuddy CLI 修改代码，再由 workflow 统一创建分支、提交和 PR
- **自动评论**：对非 bug issue 自动发表评论；对失败的 bug 修复尝试也会留痕

## 为什么改成这个版本

相比早期多脚本 / 多 prompt 版本，这个版本保留一个主 workflow，并只增加一个很小的 helper 脚本：

- `.github/workflows/issue-auto-processor-simple.yml`
- `scripts/issue-auto-processor.cjs`

这样做的原因是：

- 主要逻辑仍集中在 workflow，review 成本可控
- 把最容易出错的输出解析和 prompt 拼装抽出来，便于做回归测试
- 避免再出现空评论这类“workflow 成功、结果无效”的问题

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

### 评论命令触发

支持在 issue 评论中使用这些命令：

- `/cloudbase fix`
- `/cloudbase skip`
- `/cloudbase continue`

权限边界：

- 只有 `OWNER` / `MEMBER` / `COLLABORATOR` 可以触发
- PR 评论不会触发这套逻辑

命令语义：

- `/cloudbase fix`：立即按修复路径处理当前 issue
- `/cloudbase skip`：为当前 issue 打上 `no-ai`，停止自动处理
- `/cloudbase continue`：重新读取完整 issue 线程后继续分析 / 处理

## 处理逻辑

```text
schedule / workflow_dispatch / issue_comment
                 ↓
         collect target issue(s)
                 ↓
        load issue body + all comments
                 ↓
  /cloudbase skip ?
      ├─ yes → label no-ai + ack comment
      └─ no
          ↓
  bug label / bug keyword / forced fix ?
      ├─ yes → CodeBuddy 尝试修复 → workflow 提交 PR
      └─ no  → CodeBuddy 生成分析评论
```

## 线程上下文策略

这个版本**不依赖隐藏 session 持久化**。

每次执行都会重新收集并传给 AI：

- issue title
- issue body
- 当前 labels
- issue 下全部 comments（按时间顺序）

这样 `/cloudbase continue` 的语义是：

> 基于当前 issue 线程中的全部上下文继续处理，而不是恢复某个脆弱的 CI 内部会话。

这比依赖 CI 流水线里的隐藏状态更稳。

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

## 空结果与失败处理

这是这次修订专门补上的兜底：

- `codebuddy --output-format json` 的返回现在兼容 `object / array / plain text`
- 如果 AI 输出为空，或者解析后拿不到可用正文，workflow 会直接走失败分支
- 不会再发“有标题没正文”的空评论
- 只有拿到有效文本后，才会打 `ai-processed`

## 风险边界

当前版本保持“简单但有边界”：

- 自动任务不会处理 4 小时内的新 issue
- 自动任务不会重复处理已标记 `ai-processed` 的 issue
- `no-ai` 可以直接阻止自动处理
- `/cloudbase skip` 会显式关闭当前 issue 的自动处理
- `/cloudbase fix` 和 `/cloudbase continue` 会读取完整线程上下文再执行
- 对 bug issue，只有在仓库里确实出现代码 diff 时才会创建 PR
- git commit / push / PR 创建由 workflow 控制，不交给 CodeBuddy 自己决定

## 当前限制

这个版本刻意没有做的事情：

- 不依赖 session_id 跨 CI run 持久化上下文
- 不把整套 issue 生命周期做成长期运行的独立 agent service
- 不保证第一次修复就一定成功，maintainer 仍需 review 自动 PR

## 后续可选增强

如果后面要继续增强，建议按优先级做：

1. 增加更细的命令反馈，例如 `/cloudbase status`
2. 加入 dry-run 模式
3. 把 bug / non-bug 分类改成更稳定的结构化判定
4. 为自动 PR 增加更严格的验证命令
