# 实施计划 - Issue 自动处理系统

## 任务列表

- [x] 1. 收敛方案为单文件 workflow
  - 删除多脚本 / 多 prompt 的复杂实现方向
  - 改为 `issue-auto-processor-simple.yml` 作为唯一主入口
  - _需求: 6_

- [x] 2. 实现 issue 收集与过滤
  - 使用 `actions/github-script` 直接收集 open issue
  - 加入 4 小时延迟、标签过滤、每轮最多 5 个的规则
  - _需求: 1, 5_

- [x] 3. 实现 bug / non-bug 分流
  - 用标签 + 关键词完成粗分类
  - bug 走自动修复，其他 issue 只分析回复
  - _需求: 2_

- [x] 4. 实现 CodeBuddy headless 调用
  - 用 `codebuddy -p -y --output-format json` 执行分析 / 修复
  - 把 AI 输出通过 `jq` 提取，避免直接拼 shell 字符串
  - _需求: 3, 4, 6_

- [x] 5. 把 git 副作用收回到 workflow
  - workflow 负责 branch / commit / push / PR
  - 只有产出实际 diff 时才创建 PR
  - _需求: 4, 6_

- [x] 6. 实现标签状态管理
  - 自动补齐 `ai-processing` / `ai-processed` / `ai-failed` / `ai-fix` / `no-ai`
  - 处理成功、失败和无 patch 三种结果都可追踪
  - _需求: 5_

- [x] 7. 收敛 PR 范围与文档
  - 从 PR 中移除无关改动和旧复杂版文件
  - 更新 `doc/issue-auto-processor.md`、spec 文档和 README 入口
  - _需求: 6_

- [ ] 8. 最小验证与 PR 更新
  - 校验 workflow YAML 与 shell 语法
  - 确认 PR diff 只剩 issue automation 相关文件
  - 推送更新后的分支并观察 review / CI
  - _需求: 全部_
