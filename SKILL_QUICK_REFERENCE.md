# CloudBase Skill System - Quick Reference Guide

## 📍 Where Are Skills?

```
config/source/skills/           ← 22 skill directories (canonical source)
├── ai-model-nodejs/
├── cloud-functions/
├── auth-web/
└── ... (19 more skills)

config/source/guideline/        ← Platform-level guideline
└── cloudbase/SKILL.md

skills/skill-authoring/         ← Meta-skill for creating skills
└── SKILL.md + references/

.claude-plugin/plugin.json      ← Plugin registration
.mcp.json                       ← MCP server config
```

---

## 🏗️ Skill Frontmatter Template

```yaml
---
name: skill-short-name
description: <Brand intro>. This skill should be used when <user actions/scenarios>. <Optional: NOT for <neighbors>>.
alwaysApply: false
---
```

**Critical**: The `description` field is the PRIMARY TRIGGER.

---

## 📝 Recommended SKILL.md Structure

```markdown
# Skill Title

One-paragraph summary of behavior change.

## What this skill does
- Main responsibilities
- What changes about agent behavior

## When to use this skill
- Clarify boundaries (don't repeat description)

## Do NOT use for
- Neighbor scenario 1 (use X instead)
- Neighbor scenario 2

## How to use this skill (for a coding agent)

1. Identify request type
2. Apply main rules first
3. Load references only if needed
4. Stop when you have enough info

## Operating Rules

1. **First action after trigger:**
2. **What to inspect before acting:**
3. **What must never be skipped:**
4. **When to load references:**
5. **When to ask for clarification:**

## Routing

| Task | Read | Why |
|------|------|-----|
| Scenario A | `references/a.md` | Needed for X |
| Scenario B | `references/b.md` | Needed for Y |

## Quick workflow

1. Step 1
2. Step 2
3. Step 3

## Minimum self-check

- Did this skill change agent behavior?
- Did I avoid unnecessary references?
- Did I stay within the intended boundary?
```

---

## 🎯 Frontmatter Quality Checklist

✅ **Precision-Focused** (high relevance):
- [ ] Name is short & intentional (2-4 words)
- [ ] Description includes "This skill should be used when..."
- [ ] Uses realistic user language (not jargon)
- [ ] Specifies platform/environment clearly
- [ ] Lists 3-5 main capabilities
- [ ] Includes explicit boundaries ("NOT for...")
- [ ] Avoids generic terms ("powerful", "comprehensive")

✅ **Recall-Focused** (high discoverability):
- [ ] Includes aliases and common names
- [ ] Uses English + Chinese variants
- [ ] Covers scenario language variations
- [ ] Mentions comparison neighbors
- [ ] Broader capability description
- [ ] Accepts higher false-positive rate

---

## 🔍 Frontmatter Examples

### ✅ GOOD (ai-model-nodejs)

```yaml
name: ai-model-nodejs
description: Use this skill when developing Node.js backend services or CloudBase cloud functions that need AI capabilities. Features text generation (generateText), streaming (streamText), AND image generation (generateImage) via @cloudbase/node-sdk ≥3.16.0. Built-in models include Hunyuan and DeepSeek. NOT for browser/Web apps (use ai-model-web) or WeChat Mini Program (use ai-model-wechat).
```

**Why?**
- ✅ Specific platform (Node.js backend, cloud functions)
- ✅ Clear capabilities (3 AI features)
- ✅ Recommended versions specified
- ✅ Explicit boundaries with cross-references

### ❌ WEAK

```yaml
name: database
description: A powerful skill for database operations.
```

**Why?**
- ❌ Vague and generic
- ❌ No trigger cues
- ❌ No platform distinction
- ❌ "Powerful" is meaningless

### ✅ IMPROVED VERSION

```yaml
name: no-sql-web-sdk
description: Use CloudBase document database Web SDK for NoSQL data operations in web applications. This skill should be used when you need CRUD operations, complex queries, pagination, aggregation, or geolocation queries using @cloudbase/js-sdk in React, Vue, or vanilla JavaScript projects.
```

---

## 📚 Progressive Disclosure - 4 Layers

| Layer | File | Size | Purpose |
|-------|------|------|---------|
| **1** | SKILL.md | 50-150 lines | Entry point, behavior, routing |
| **2** | references/*.md | Varies | Deep methodology by scenario |
| **3** | assets/*.* | Varies | Reusable templates (optional) |
| **4** | scripts/* | Varies | Automation helpers (optional) |

**Agent behavior**: Read Layer 1 always. Load Layer 2 only when routing indicates. Layer 3 & 4 on-demand.

---

## 🎨 Skill Structure Patterns

### Pattern A: Simple Single File
- **When**: Content is procedural & SDK-specific
- **Structure**: SKILL.md only
- **Example**: ai-model-nodejs (6.9 KB)
- **Philosophy**: Comprehensive reference for one scenario

### Pattern B: Hub + Separate Files
- **When**: Large domain with many distinct topics
- **Structure**: SKILL.md + 8 separate .md files (no subfolder)
- **Example**: no-sql-web-sdk (8 files total)
- **Philosophy**: SKILL.md routes to specific topic files

### Pattern C: Hub + References Subfolder
- **When**: Platform-specific deep dives
- **Structure**: SKILL.md + references/ subfolder
- **Example**: miniprogram-development
- **Philosophy**: Small main file + organized references

---

## 🔄 Routing Table Pattern

Skills direct context loading explicitly:

```markdown
## Routing

| Task | Read | Why |
|------|------|-----|
| Implementing CRUD | `references/crud-operations.md` | Full operation patterns |
| Complex query logic | `references/complex-queries.md` | Query composition |
| Pagination | `references/pagination.md` | Offset/limit patterns |
```

**NOT**: "See references/ for more details"

**BUT**: "When doing X, read Y to learn Z"

---

## ⚙️ Operating Rules - The Behavioral Contract

This section defines what agents MUST do after skill triggers:

```markdown
## Operating Rules

1. **First action after trigger:**
   Read the skill's table of contents and identify which section applies.

2. **What to inspect before acting:**
   Check if the skill boundary fits your current scenario.

3. **What must never be skipped:**
   Always follow the initialization steps before using APIs.

4. **When to load references:**
   If task involves "complex queries", load references/complex-queries.md.

5. **When to stop and ask for clarification:**
   If platform unclear (web vs. mini program), ask user which platform.
```

**Key insight**: This section transforms the skill from documentation into executable behavior.

---

## 🚨 Structure Smell Checks

| ❌ SMELL | ✅ FIX |
|---------|--------|
| Main file reads like full tutorial | Split large content to references |
| Many references, no reading order | Add explicit routing table |
| Agent must read everything first | Use routing to load only needed parts |
| Rules for scenarios conflict | Clarify "Do NOT use for" section |
| Templates mixed with theory | Move templates to assets/ |
| Repeated manual steps described | Move to scripts/ for automation |

---

## 📊 The 22 Skills Inventory

**Authentication** (4 skills):
- `auth-nodejs` - Node SDK, server-side
- `auth-tool` - Configure providers
- `auth-web` - Browser/Web SDK
- `auth-wechat` - Mini Program (login-free)

**AI Models** (3 skills):
- `ai-model-nodejs` - Node backend, text + image
- `ai-model-web` - Browser, text generation
- `ai-model-wechat` - Mini Program, text

**Database** (4 skills):
- `no-sql-web-sdk` - Web browser, document DB
- `no-sql-wx-mp-sdk` - Mini Program, document DB
- `relational-database-web` - MySQL in web
- `relational-database-tool` - MySQL management

**Backend & Functions** (3 skills):
- `cloud-functions` - Event & HTTP functions
- `cloudrun-development` - Container services
- `http-api` - HTTP API integration

**Platform & Development** (8 skills):
- `cloudbase-platform` - Universal platform
- `web-development` - Web app framework
- `miniprogram-development` - Mini program
- `cloudbase-agent-ts` - TypeScript agents
- `cloud-storage-web` - Cloud storage
- `data-model-creation` - Data modeling
- `spec-workflow` - Engineering process
- `ui-design` - UI/UX guidelines

---

## 🎓 Skill Authoring Meta-Skill

Located: `skills/skill-authoring/SKILL.md` + references/

Use when creating, improving, or evaluating skills.

**References**:
- `frontmatter-patterns.md` - Name & description design
- `structure-patterns.md` - SKILL.md + references organization
- `templates.md` - Reusable templates
- `evaluation.md` - How to test skills
- `examples.md` - Good vs. weak examples

**Core Rule**: 
> Main SKILL.md should control agent behavior, not merely explain a topic.

---

## 🔗 Agent Discovery Flow

```
1. IDE loads .claude-plugin/plugin.json
   ↓
2. Plugin references agent rules at config/rules/*.mdc
   ↓
3. Agent rules reference/include skills
   ↓
4. Agent evaluates skill.description against user request
   ↓
5. If matched: load SKILL.md
   ↓
6. SKILL.md contains routing table
   ↓
7. Agent loads specific references based on routing
   ↓
8. Agent applies "Operating Rules" section
   ↓
9. Agent executes with explicit behavior contract
```

**Key**: `description` field is PRIMARY TRIGGER MECHANISM

---

## 💡 Precision vs. Recall Trade-off

### High Precision (Strict Trigger)
**Example**: `ai-model-nodejs`
- Specific platform (Node backend)
- Specific use-case (AI)
- Explicit boundaries (NOT for web)
- **Result**: Minimal false positives, high relevance

### High Recall (Broad Trigger)
**Example**: `cloudbase` guideline
- Multiple aliases (CloudBase, TCB, 云开发)
- Broad scenarios (web, mini programs, functions)
- Comprehensive capabilities
- **Result**: High discoverability, accepts false positives

**Balance**: Repository skills aim for precision with some recall.

---

## ✍️ Writing Process

### Step 1: Product/Domain Opening
```
[Skill] is [category]. [Brief capability statement].
```

### Step 2: Add Trigger Sentence
```
This skill should be used when users ask to <action 1>, <action 2>, or <action 3>, or when they need <capability> in <platform>.
```

### Step 3: Add Boundaries (Optional but Recommended)
```
This is NOT for <other scenario 1> (use <other skill>) or <other scenario 2>.
```

### Step 4: Review Checklist
- [ ] Explains WHAT the skill covers?
- [ ] Explains WHEN to trigger?
- [ ] Uses realistic user language?
- [ ] Distinguishes from neighbors?
- [ ] Concise (1-3 sentences)?

---

## 🎯 Common Mistakes & Fixes

| ❌ MISTAKE | ✅ FIX |
|-----------|--------|
| Vague description | Add "This skill should be used when..." + specific scenarios |
| Overly long name | Keep to 2-4 words, use hyphens |
| No boundaries | Add "Do NOT use for" with cross-references |
| All technical jargon | Include user-oriented language + realistic phrasing |
| Missing platforms | Specify target environment (web, backend, mini program) |
| Generic terms ("powerful") | Replace with concrete capabilities |
| No trigger cues | Add when/where/why instead of just what |

---

## 📖 Related Documents

For deeper understanding, see:

- **SKILL_SYSTEM_ANALYSIS.md** (8,000+ words)
  - Complete physical structure
  - Real examples with analysis
  - Integration points
  - All 22 skills inventory

- **SKILL_FRONTMATTER_GUIDE.md** (6,000+ words)
  - Detailed field definitions
  - Quality examples & analysis
  - Common mistakes with fixes
  - Step-by-step writing process

---

**Last Updated**: 2026-04-15  
**Analysis Scope**: CloudBase-AI-ToolKit skill system (complete repository exploration)
