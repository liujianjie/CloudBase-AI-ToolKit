## Source commands (migrated from `.cursor/commands/`)

### git_commit.md

```md
# Git Commit Workflow

## Function
Git commit and push workflow following OpenAgentKit standards

## Trigger Condition
When user inputs `/git_commit`

## Behavior
1. Commit code using conventional-changelog style
2. Execute `git push origin <branch-name>`

## Commit Message Format
Follow conventional-changelog style:
```
type(scope): description

[optional body]

[optional footer]
```

### Commit Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples
```
feat(auth): add OAuth2 authentication support
fix(ui): resolve button alignment issue in mobile view
docs(api): update authentication endpoint documentation
```

## Quality Checklist
- [ ] Commit message follows conventional-changelog format
- [ ] Changes are properly staged
- [ ] No sensitive information in commit
- [ ] Code passes linting and tests
```

### git_push.md

```md
# Git Push Workflow

## Function
Complete git workflow including branch management and PR creation

## Trigger Condition
When user inputs `/git_push`

## Behavior
1. Commit code using conventional-changelog style
2. Create or switch to feature branch (e.g., feature/xxx) instead of directly to main
3. Execute `git push origin <branch-name>`
4. Automatically create PR after push
5. Switch back to main branch after PR creation

## Branch Naming Convention
- `feature/description`: New features
- `fix/description`: Bug fixes
- `docs/description`: Documentation updates
- `refactor/description`: Code refactoring
- `chore/description`: Maintenance tasks

## PR Creation
- Use conventional-changelog style for PR title
- Include detailed description of changes
- Reference related issues if applicable
- Add appropriate labels and reviewers

## Quality Checklist
- [ ] Working on appropriate feature branch
- [ ] Commit message follows conventional-changelog format
- [ ] All changes are committed and pushed
- [ ] PR is created with proper title and description
- [ ] Switched back to main branch
```

### releasenote.md

```md
---
name: releasenote
description: Generate and publish release note using gh CLI
---

# Release Note Generator Command

## Function
Automatically generate and publish a user-friendly release note in Chinese by analyzing git commit history between versions.

**Brand Name**: Use "CloudBase MCP" (NOT "CloudBase AI Toolkit") in all release notes.

## Trigger Condition
When user inputs `/releasenote`

## Behavior

### Step 1: Version Detection
1. Get the latest tag: `git tag --sort=-v:refname | head -1`
2. Get the previous release tag: `gh release list --limit 1 --json tagName`
3. If no previous release exists, use the initial commit as baseline

### Step 2: Commit Analysis
1. Get all commits between versions: `git log <previous_tag>..<latest_tag> --oneline --no-merges`
2. Parse commit messages following conventional-changelog format:
   - `feat`: New features (新功能)
   - `fix`: Bug fixes (问题修复)
   - `docs`: Documentation changes (文档更新)
   - `perf`: Performance improvements (性能优化)
   - `refactor`: Code refactoring (代码重构)
   - `style`: Style changes (样式调整)
   - `test`: Test additions/updates (测试更新)
   - `chore`: Maintenance tasks (maintenance - 不在 release note 中显示)
   - `build`: Build system changes (构建优化)
   - `ci`: CI configuration changes (maintenance - 不在 release note 中显示)

### Step 3: Generate Release Note Content

**Format Guidelines:**
- Use Chinese language
- Focus on user-facing changes and benefits
- Group by feature categories (e.g., IDE 支持、环境管理、开发工具、文档和用户体验、数据库、云函数、AI 能力等)
- Weaken technical implementation details
- Exclude maintenance-related commits (chore, ci, internal refactoring) from the main highlights by default
- If maintenance / engineering changes are worth mentioning, place them in a dedicated section at the very end and keep the wording lightweight (optional reading)
- Highlight breaking changes if any
- Use friendly, non-technical language where possible
- Add emoji for better readability (optional but recommended for sections)

**Structure:**
```markdown
# CloudBase MCP v{VERSION}

## 🎉 新功能

### {Category 1}
- {User-friendly description of feature 1}
- {User-friendly description of feature 2}

### {Category 2}
- ...

## 🐛 问题修复

- {User-friendly description of bug fix 1}
- {User-friendly description of bug fix 2}

## 📚 文档更新

- {Documentation improvements}

## ⚡ 性能优化

- {Performance improvements}

## 🔧 其他改进

- {Other improvements}

## 🔧 维护与工程改进（可选阅读）

- {Lightweight summary of maintenance / workflows / CI / ecosystem improvements}
```

### Step 4: Interactive Confirmation
1. Display the generated release note content
2. Ask user to review and confirm:
   - "请查看以下 Release Note 内容，是否需要修改？"
   - Options: "确认发布" / "需要修改" / "取消"
3. If user chooses "需要修改", allow editing before proceeding

### Step 5: Publish Release
1. Create release using gh CLI:
   ```bash
   gh release create {tag} \
     --title "CloudBase MCP v{VERSION}" \
     --notes "{generated_content}" \
     --verify-tag
   ```
2. Display success message with release URL
3. Remind user to update related documentation if needed

## Content Translation Rules

**Commit Type to Chinese:**
- feat → 新功能
- fix → 问题修复
- docs → 文档更新
- perf → 性能优化
- refactor → 代码优化 (only if user-visible impact)
- style → 样式调整
- test → 测试改进 (usually skip)
- build → 构建优化

**Common Phrases:**
- "add" → "新增"
- "update" → "优化" / "更新"
- "fix" → "修复"
- "improve" → "改进"
- "support" → "支持"
- "remove" → "移除"
- "deprecate" → "废弃"

**Category Examples:**
- IDE Support → IDE 支持
- Environment Management → 环境管理
- Development Tools → 开发工具
- Documentation → 文档和用户体验
- Database → 数据库功能
- Cloud Functions → 云函数
- AI Capabilities → AI 能力
- Authentication → 身份认证
- Storage → 云存储
- Hosting → 静态托管

## Quality Checklist
- [ ] All user-facing changes are included
- [ ] Content is written in Chinese
- [ ] Technical jargon is minimized
- [ ] Changes are grouped by logical categories
- [ ] Maintenance commits are excluded
- [ ] Breaking changes are highlighted
- [ ] Release URL is provided after publishing
```

### version_publish_main.md

```md
---
name: version_publish_main
description: Build, bump version, and publish release on main
---

# Version Publish (main branch) Command

## Function
Publish a new version from the `main` branch with a consistent sequence:
build -> commit+push to main -> bump version in `mcp/` -> generate/publish release notes.

## Trigger Condition
When user inputs `/version_publish_main`

## Behavior

### Step 0: Preconditions (must pass)
1. Ensure current branch is `main`
2. Ensure working tree is clean: `git status --porcelain` is empty
3. Ensure local main is up to date:
   - `git fetch origin`
   - `git pull --ff-only origin main`

### Step 1: Build on main
1. Run build: `npm run build`
2. Stage build outputs (only if the repo expects build artifacts to be committed)
3. Commit build changes and push directly to `main`:
   - Commit message MUST be English and conventional-changelog style
   - Example: `chore(release): build artifacts for vX.Y.Z`
   - Push: `git push origin main`

### Step 2: Bump version in `mcp/`
1. `cd mcp`
2. Run `npx bumpp` and use the interactive prompts to select the target version
3. After bump, commit the version change on `main` and push:
   - Example: `chore(release): bump version to vX.Y.Z`
   - `git push origin main`

### Step 3: Release note
Run `/releasenote` and follow the interactive confirmation before publishing.

## Safety Notes
- This workflow has direct side effects on `main` (commit + push). Always ask for explicit user confirmation right before pushing.
- If the repository does NOT commit build artifacts, skip Step 1.2 and only ensure the build passes.
```

