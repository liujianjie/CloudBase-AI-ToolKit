# 技术方案设计 - Issue 自动处理系统

## 目标

用 **单个 GitHub Actions workflow + CodeBuddy CLI headless 模式** 实现 issue 自动处理，避免额外 helper 脚本和 prompt 目录带来的维护成本。

## 架构

```text
GitHub Actions schedule / workflow_dispatch
                ↓
        github-script 收集 issue
                ↓
        workflow 内判断 bug / non-bug
                ↓
   ┌────────────────────┬────────────────────┐
   │ bug                │ non-bug            │
   │                    │                    │
   │ CodeBuddy 改代码    │ CodeBuddy 产出分析  │
   │ workflow 提交 PR    │ workflow 发评论     │
   └────────────────────┴────────────────────┘
```

## 核心决策

### 1. 用单文件 workflow，而不是自定义扫描脚本

采用：
- `actions/github-script` 收集和过滤 issue
- workflow 内 bash + `jq` 顺序处理 issue

不采用：
- 单独的 `scan-issues.js`
- 单独的 label 管理脚本
- 多个 prompt 文件

原因：
- PR 更容易 review
- 减少 JSON 输出 / matrix / shell 传值链路
- 少文件意味着少一层状态同步成本

### 2. 用 CodeBuddy headless 做 AI 执行，用 workflow 控 git

采用：
- CodeBuddy CLI 负责分析和改代码
- workflow 自己负责创建 branch / commit / push / PR / issue comment

不采用：
- 让 CodeBuddy 自己决定 git commit / push / gh pr create

原因：
- git 外部副作用更可控
- 分支命名、PR 标题和评论格式统一
- 更容易判断“有 diff 才创建 PR”这个边界

### 3. 自动触发保守，手动触发放行

采用：
- schedule 每 4 小时运行一次
- 自动处理只看创建满 4 小时的 open issue
- `workflow_dispatch` 可指定 `issue_number` 立即处理

原因：
- 满足“issue 刚创建 4 小时内不处理”
- 需要时 maintainer 又能手动加速单个 issue

## 筛选规则

自动任务只处理满足以下条件的 issue：

1. `state=open`
2. 不是 PR
3. 创建时间 >= 4 小时
4. 不带 `ai-processed`
5. 不带 `ai-processing`
6. 不带 `no-ai`
7. 每轮最多处理 5 个

## 分类规则

### bug
命中任一条件：
- 标签包含 `bug` / `error` / `crash` / `broken`
- 标题或正文命中关键词：`bug|error|crash|broken|fail|not working`

### 非 bug
其余 issue 全部走分析回复路径。

这个分类足够粗，但实现简单，便于先跑起来。

## 安全与稳定性设计

### 1. 避免旧版 review 暴露的 JSON / shell 问题

本版明确避免：

- job output 中双重 JSON stringify
- 用 shell 单引号包 AI 输出
- 直接把复杂 JSON 通过 matrix 跨 job 传递

改法：
- issue 列表直接落盘为 `.issue-auto-processor-issues.json`
- AI 输出先走 `--output-format json`，再用 `jq` 提取 `.result`
- issue comment / PR body 统一走临时文件，而不是 shell 内联字符串

### 2. 控制自动 PR 触发条件

只有在 bug 路径下并且仓库里出现真实 diff 时才：

1. `git add -A`
2. `git commit`
3. `git push origin ai-fix/issue-{number}`
4. `gh pr create`

如果没有 diff，则只回 issue 评论并打 `ai-failed`。

### 3. 标签作为最轻状态机

| 标签 | 含义 |
|------|------|
| `ai-processing` | 当前正在跑 |
| `ai-processed` | 成功完成 |
| `ai-failed` | 失败或未产出 patch |
| `ai-fix` | 已创建修复 PR |
| `no-ai` | 永久跳过 |

## 认证方案

按照官方 IAM 文档，workflow 支持：

1. `CODEBUDDY_AUTH_TOKEN`（优先）
2. `CODEBUDDY_API_KEY`

若使用中国版 API Key，建议额外设置：

- repository variable: `CODEBUDDY_INTERNET_ENVIRONMENT=internal`

## 验证策略

最小验证聚焦 3 件事：

1. workflow YAML 可被解析
2. 内联 shell / jq / github-script 无明显语法错误
3. PR diff 只剩 issue automation 相关文件

后续如果要继续增强，再补更强的 dry-run 或 sandbox 仓库验证。

## 回滚方案

如果需要停止这套自动化：

1. 直接禁用 `.github/workflows/issue-auto-processor-simple.yml`
2. 或者批量给 issue 打 `no-ai`
3. 已经生成的 `ai-fix/*` 分支和 PR 按正常人工流程关闭即可
