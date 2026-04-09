# 需求文档 - Issue 自动处理系统

## 介绍

为仓库提供一个低维护成本的 GitHub Issue 自动处理能力：

- issue 创建后 **4 小时内不自动处理**
- bug 类 issue 尝试自动修复并提 PR
- 其他 issue 自动分析并回复
- 整体方案优先简单、可 review、可回滚

## 需求

### 需求 1 - 延迟触发

**用户故事：** 作为仓库维护者，我希望新建 issue 不会被 AI 立即响应，而是至少保留 4 小时的人工介入窗口。

#### 验收标准

1. When an issue is created, the system shall not automatically process it within the first 4 hours.
2. When an issue is at least 4 hours old, the scheduled workflow shall consider it eligible for automatic processing.
3. When a maintainer manually triggers the workflow for a specific issue, the system may process that issue immediately.

### 需求 2 - 分类处理

**用户故事：** 作为仓库维护者，我希望 bug 和非 bug issue 走不同路径，bug 尝试修复，其余只分析回复。

#### 验收标准

1. When an issue has a bug-like label or bug-like keywords in title/body, the system shall route it to the auto-fix path.
2. When an issue does not match bug conditions, the system shall route it to the analysis-only path.
3. When an issue is on the analysis-only path, the system shall not create a fix branch or PR.

### 需求 3 - 自动分析回复

**用户故事：** 作为 issue 提交者，我希望非 bug issue 能收到一条简洁、结构化、可执行的 AI 分析回复。

#### 验收标准

1. When the system processes a non-bug issue, it shall generate a Markdown comment with classification, likely area, suggested next step, and optional open questions.
2. The system shall post the generated analysis as an issue comment.

### 需求 4 - 自动修复与 PR

**用户故事：** 作为仓库维护者，我希望 bug issue 在 AI 产出实际 patch 时能自动生成 PR，但不空建 PR。

#### 验收标准

1. When the system processes a bug issue, it shall ask the AI to investigate and attempt the smallest credible fix.
2. When the AI produces repository changes, the workflow shall create branch `ai-fix/issue-{number}`, commit the diff, and open a PR linked to the issue.
3. When the AI does not produce a diff, the workflow shall not create a PR and shall instead leave a diagnostic comment on the issue.

### 需求 5 - 去重与状态标记

**用户故事：** 作为仓库维护者，我希望同一个 issue 不会被重复自动处理，并且处理状态可见。

#### 验收标准

1. When processing starts, the system shall add `ai-processing`.
2. When processing succeeds, the system shall remove `ai-processing` and add `ai-processed`.
3. When a fix PR is created, the system shall also add `ai-fix`.
4. When processing fails or produces no safe patch, the system shall remove `ai-processing` and add `ai-failed`.
5. When an issue already has `ai-processed`, `ai-processing`, or `no-ai`, the scheduled workflow shall skip it.

### 需求 6 - 低维护实现

**用户故事：** 作为仓库维护者，我希望这套能力尽量少依赖仓库内额外脚本，降低 review 和维护成本。

#### 验收标准

1. The system shall use a single workflow file as the main implementation entry.
2. The system shall use CodeBuddy CLI headless mode as the AI executor.
3. The system shall keep git side effects (branch, commit, push, PR) under workflow control instead of delegating them entirely to the AI.

## 非功能性需求

1. **可靠性**：应避免把复杂 JSON 通过脆弱的 shell 单引号或双重字符串化链路传递
2. **可回滚性**：禁用 workflow 后应能立即停止自动处理
3. **安全性**：仅使用完成 issue comment / branch / PR 所需的最小 GitHub 权限
4. **可配置性**：认证方式应支持 `CODEBUDDY_AUTH_TOKEN` 或 `CODEBUDDY_API_KEY`
