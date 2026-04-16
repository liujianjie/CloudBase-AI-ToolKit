# CloudBase-AI-ToolKit Skill System - Complete Structure Analysis

## Overview

The CloudBase-AI-ToolKit uses a sophisticated skill system designed for AI agents to understand and follow best practices across multiple development platforms (Web, Mini Programs, Cloud Functions, etc.). Skills are structured Markdown documents that combine:

1. **Metadata frontmatter** (YAML) - Triggering and discovery
2. **Behavioral content** - What agents should do after trigger
3. **Supporting references** - Progressive disclosure of details
4. **Assets/Scripts** - Templates and automation (optional)

---

## Physical Structure

### Repository Layout

```
CloudBase-AI-ToolKit/
├── config/
│   ├── source/
│   │   ├── skills/                    # 22 skill directories
│   │   │   ├── ai-model-nodejs/
│   │   │   ├── ai-model-web/
│   │   │   ├── cloud-functions/
│   │   │   ├── auth-nodejs/
│   │   │   ├── cloudbase-platform/
│   │   │   ├── no-sql-web-sdk/        # Has additional .md files
│   │   │   ├── miniprogram-development/ # Has references/ subdir
│   │   │   └── ... (18 more skills)
│   │   ├── guideline/
│   │   │   └── cloudbase/
│   │   │       └── SKILL.md           # Main platform guideline
│   │   └── editor-config/             # Editor-specific configs
│   ├── .claude/
│   │   └── skills/                    # Generated/sync'd copies
│   ├── .cursor/
│   ├── .windsurf/
│   └── ... (other IDE configs)
├── skills/
│   └── skill-authoring/               # Meta-skill for writing skills
│       ├── SKILL.md                   # Main authoring guide
│       └── references/
│           ├── frontmatter-patterns.md
│           ├── structure-patterns.md
│           ├── templates.md
│           ├── evaluation.md
│           └── examples.md
├── .mcp.json                          # MCP server config
├── .claude-plugin/
│   └── plugin.json                    # Plugin registration
├── .claude/
│   └── settings.local.json            # Local Claude settings
└── mcp/
    └── manifest.json                  # MCP manifest
```

### Key Discovery Mechanism

- **Root plugin**: `.claude-plugin/plugin.json` lists commands and agent rules
- **Agent references**: `.claude-plugin/plugin.json` points to rule files at `config/rules/*.mdc`
- **Skills location**: `config/source/skills/*/SKILL.md` (22 skills total)
- **Skill authoring meta-skill**: `skills/skill-authoring/SKILL.md` + references

---

## Skill Metadata Format (YAML Frontmatter)

Every `SKILL.md` file starts with YAML frontmatter:

```yaml
---
name: cloudbase-document-database-web-sdk
description: Use CloudBase document database Web SDK to query, create, update, and delete data. This skill should be used when users ask to...
alwaysApply: false
---
```

### Frontmatter Fields

| Field | Type | Purpose | Example |
|-------|------|---------|---------|
| `name` | string | Stable, short identifier | `ai-model-nodejs` |
| `description` | string | **Trigger criteria** (most important for discovery); includes capability + use-when conditions | "Use this skill when... AI text generation..." |
| `alwaysApply` | boolean (optional) | Whether to always load this skill regardless of context | `false` (default) |

### Description Pattern (Critical for Trigger Quality)

Best practices from `skill-authoring/references/frontmatter-patterns.md`:

```
<Brand/Product intro>. This skill should be used when users ask to <action 1>, <action 2>, or <action 3>, or when they need <scenario> in <platform>.
```

**Examples in repository:**

- **ai-model-nodejs**: "Use this skill when developing Node.js backend services or CloudBase cloud functions... that need AI capabilities."
- **cloudbase-document-database-web-sdk**: "Use CloudBase document database Web SDK to query, create, update, and delete data..."
- **cloud-functions**: "Complete guide for CloudBase cloud functions development..."

---

## Core Skill Content Structure

Recommended sections (from `skill-authoring/references/structure-patterns.md`):

```markdown
---
name: skill-name
description: ...
---

# Skill Title

Brief paragraph explaining what this skill changes.

## What this skill does
- Main responsibilities
- Core changes to agent behavior
- Scope boundaries

## When to use this skill
- Clarify boundaries
- Do NOT repeat description

## Do NOT use for
- Neighbor scenario 1
- Neighbor scenario 2

## How to use this skill (for a coding agent)

1. Identify whether request matches
2. Apply main operating rules first
3. Load references only when needed
4. Stop loading once you have enough

## Operating Rules

1. First action after trigger:
2. What to inspect before acting:
3. What must never be skipped:
4. When to load references:
5. When to stop and ask for clarification:

## Routing

| Task | Read | Why |
|------|------|-----|
| Scenario A | `references/reference-a.md` | Needed for ... |
| Scenario B | `references/reference-b.md` | Needed for ... |

## Quick workflow

1. Step 1
2. Step 2
3. Step 3

## Minimum self-check

- Did the skill change agent behavior?
- Did I avoid loading unnecessary references?
- Did I stay within the intended boundary?
```

---

## Progressive Disclosure Pattern

Skills use a **layered approach** to avoid information overload:

### Layer 1: Main SKILL.md
- **Purpose**: Entry point and behavioral rules
- **Content**: 
  - What problem it solves
  - First action after trigger
  - When to load which references
  - Non-applicable scenarios
- **Agent behavior**: Always read this

### Layer 2: references/*.md
- **Purpose**: Detailed methodology by platform/scenario
- **Content**: 
  - Long explanations and examples
  - Platform-specific differences
  - Checklists and deep reference material
- **Agent behavior**: Load only when routing indicates it's needed
- **Example files in repository**:
  - `no-sql-web-sdk/`: crud-operations.md, complex-queries.md, aggregation.md, geolocation.md, pagination.md, realtime.md, security-rules.md
  - `miniprogram-development/references/`: cloudbase-integration.md, devtools-debug-preview.md

### Layer 3: assets/*.* (optional)
- **Purpose**: Templates, skeleton files, sample materials
- **Content**: Reusable code snippets, templates
- **Agent behavior**: Load when agent needs to generate from template

### Layer 4: scripts/* (optional)
- **Purpose**: Helper scripts that reduce repeated manual work
- **Content**: Transformation, checking, batch generation
- **Agent behavior**: Execute instead of describing steps

---

## Real Examples from Repository

### Example 1: Simple Skill (ai-model-nodejs)

**Structure**: Single SKILL.md file

**Frontmatter**:
```yaml
---
name: ai-model-nodejs
description: Use this skill when developing Node.js backend services or CloudBase cloud functions (Express/Koa/NestJS, serverless, backend APIs) that need AI capabilities. Features text generation (generateText), streaming (streamText), AND image generation (generateImage) via @cloudbase/node-sdk ≥3.16.0...
alwaysApply: false
---
```

**Content sections**:
1. When to use this skill
2. Do NOT use for (clear boundaries)
3. Available Providers and Models (table)
4. Installation
5. Initialization (Cloud Functions vs Node.js Server)
6. generateText() - Non-streaming (examples)
7. streamText() - Streaming (examples)
8. generateImage() - Image Generation
9. Type Definitions

**Philosophy**: Comprehensive single file with API reference, examples, and type definitions. No need for separate references because the content is procedural and specific to one SDK.

---

### Example 2: Complex Skill with References (no-sql-web-sdk)

**Structure**: SKILL.md + 8 separate .md files (not in references/ folder, but at same level)

**Files**:
- SKILL.md (6.5 KB)
- aggregation.md
- complex-queries.md
- crud-operations.md (13.9 KB - largest)
- geolocation.md
- pagination.md
- realtime.md
- security-rules.md

**Frontmatter**:
```yaml
---
name: cloudbase-document-database-web-sdk
description: Use CloudBase document database Web SDK to query, create, update, and delete data. Supports complex queries, pagination, aggregation, and geolocation queries.
---
```

**SKILL.md structure** (sample):
- Core Concepts
- Basic Operations
- Advanced Features (with references to other .md files)

**Reference strategy**: SKILL.md acts as hub; detailed files split by topic:
- crud-operations.md → Creating, updating, deleting docs
- complex-queries.md → Query operators and composition
- pagination.md → Offset/limit patterns
- aggregation.md → Pipeline and aggregation
- geolocation.md → Spatial queries
- security-rules.md → Permission/security configuration

---

### Example 3: Skill with references/ subfolder (miniprogram-development)

**Structure**: SKILL.md + references/ subfolder

**Files**:
- SKILL.md
- references/
  - cloudbase-integration.md
  - devtools-debug-preview.md

**Frontmatter**: (not shown in provided files)

**Philosophy**: Smaller main file focused on high-level approach; references dive into platform-specific tooling.

---

### Example 4: Platform Guideline (cloudbase/SKILL.md)

**Location**: `config/source/guideline/cloudbase/SKILL.md`

**Special role**: 
- Acts as **context guideline** rather than actionable skill
- Referenced by agents to understand CloudBase as a platform
- Very long (342 lines) because it maps scenarios to skills

**Structure**:
1. MCP Installation (recommended approach)
2. CloudBase scenarios (user-oriented language mapping to skills)
3. Quick Reference (platform-specific skill paths)
4. Core Capabilities (authentication, database, deployment, UI)
5. Platform-Specific Skills (web, mini program, native app)
6. Professional Skill Reference
7. Core Behavior Rules
8. Deployment Workflow
9. CloudBase Console Entry Points

**Key insight**: This guideline helps agents **route** user requests to the correct sub-skills.

---

## Skill Authoring Meta-Skill

Located at: `skills/skill-authoring/SKILL.md` + references/

### Purpose
Teach agents how to create, improve, and evaluate other skills.

### Structure
1. **SKILL.md** (main authoring guide)
   - When to use this skill
   - How to use this skill (for a coding agent)
   - Routing table to references
   - Quick workflow
   - Minimum self-check

2. **references/** (5 reference files)
   - **frontmatter-patterns.md**: Name and description design
   - **structure-patterns.md**: How to organize SKILL.md + references
   - **templates.md**: Reusable templates for new skills and reviews
   - **evaluation.md**: How to design evaluation prompts and test skills
   - **examples.md**: Good vs. weak examples, rewrite patterns

### Key Concepts from Skill Authoring

From `structure-patterns.md`:

**Core Rule**: *The main SKILL.md should control agent behavior, not merely explain a topic.*

**Smell checks** (signs structure needs redesign):
- Main file reads like a full tutorial
- Many references but no reading order
- Agent must read everything before acting
- Rules for different scenarios conflict
- Templates, examples, methodology mixed together
- Scriptable work still described as long manual instructions

---

## 22 Skills in CloudBase-AI-ToolKit

1. **ai-model-nodejs** - Text/image generation in Node backend
2. **ai-model-web** - Text generation in browser via Web SDK
3. **ai-model-wechat** - Text generation in WeChat Mini Program
4. **auth-nodejs** - Node SDK authentication and identity
5. **auth-tool** - Configure authentication providers
6. **auth-web** - Web SDK built-in authentication
7. **auth-wechat** - Mini Program authentication (login-free)
8. **cloud-functions** - Event and HTTP cloud functions
9. **cloud-storage-web** - Cloud storage operations in web
10. **cloudbase-agent-ts** - TypeScript agent development
11. **cloudbase-platform** - Universal CloudBase knowledge
12. **cloudrun-development** - Container-based backend services
13. **data-model-creation** - Data modeling and design
14. **http-api** - HTTP API integration
15. **miniprogram-development** - WeChat Mini Program setup
16. **no-sql-web-sdk** - Document database for web
17. **no-sql-wx-mp-sdk** - Document database for mini program
18. **relational-database-tool** - MySQL operations
19. **relational-database-web** - MySQL in web apps
20. **spec-workflow** - Standard software engineering process
21. **ui-design** - UI/UX design guidelines
22. **web-development** - Web app framework integration

---

## Integration Points

### 1. Plugin Registration (.claude-plugin/plugin.json)
```json
{
  "commands": [
    "./config/.claude/commands/spec.md",
    "./config/.claude/commands/no_spec.md",
    "./config/.claude/commands/prototype.md"
  ],
  "agents": [
    "./config/rules/web-development.mdc",
    "./config/rules/miniprogram-development.mdc",
    "./config/rules/cloudrun-development.mdc",
    // ... more agent rules
  ],
  "mcpServers": "./.mcp.json"
}
```

### 2. MCP Configuration (.mcp.json)
```json
{
  "mcpServers": {
    "cloudbase": {
      "command": "npx",
      "args": ["@cloudbase/cloudbase-mcp@latest"],
      "env": { "INTEGRATION_IDE": "Claude" }
    }
  }
}
```

### 3. Skill Discovery
- **Agents** reference `.mdc` files (converted from skills)
- **Skills** in `config/source/skills/` are the canonical source
- **Generated copies** sync to `config/.claude/skills/` for IDE usage
- **Skill authoring meta-skill** at `skills/skill-authoring/` teaches creation

---

## Key Patterns & Best Practices

### 1. **Frontmatter Matters Most**
- `description` field is the **primary trigger mechanism**
- Must include realistic user phrasing, not just technical terms
- Must state "This skill should be used when..." explicitly

### 2. **Progressive Disclosure**
- Main SKILL.md: ~50-150 lines (behavior only)
- References: Deep detail moved to separate files
- Routing table: Explicit "when to read what"
- Avoid: Agents reading everything upfront

### 3. **Boundary Clarity**
- "Do NOT use for" sections prevent false positives
- Nearest neighbors explicitly mentioned
- Cross-references to related skills

### 4. **Operating Rules** (not just documentation)
- First action after trigger
- What to inspect before acting
- What must never be skipped
- When to load references
- When to ask for clarification

### 5. **Routing Philosophy**
Use a table to control context loading:
```
| Task | Read | Why |
|------|------|-----|
| Scenario A | references/a.md | Needed for X |
```

Not: "See the full documentation in references/"

### 6. **Minimal Self-Check**
Skills end with questions to evaluate themselves:
- Did the skill change agent behavior?
- Did I avoid unnecessary references?
- Did I stay within boundary?

---

## Evaluation & Testing

From `skill-authoring/references/evaluation.md`:

### Acceptance Dimensions
1. **Trigger Precision**: Stays quiet when should not trigger
2. **Trigger Recall**: Triggers in realistic core scenarios
3. **Behavioral Correctness**: Agent follows required process
4. **Context Discipline**: Only loads needed references
5. **Boundary Clarity**: Distinct from neighboring skills

### Minimal Evaluation Set
- ≥3 should-trigger prompts (core scenarios, realistic phrasing)
- ≥3 should-not-trigger prompts (neighbor scenarios, false positives)
- ≥1 closest-neighbor comparison

---

## Summary: How Agents Use Skills

1. **Discover**: Read plugin.json → agents reference rule files → rule files reference skills
2. **Match**: Agent evaluates skill `description` against user request
3. **Load**: If matched, read SKILL.md main file
4. **Route**: SKILL.md contains routing table; agent loads relevant references only
5. **Act**: Agent follows "Operating Rules" section in SKILL.md
6. **Check**: Agent verifies against "Minimum self-check" questions

**Key principle**: Skills are **behavioral contracts**, not documentation. After trigger, the agent's actions change.
