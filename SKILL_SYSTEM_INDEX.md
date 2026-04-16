# CloudBase-AI-ToolKit Skill System - Complete Documentation Index

## Quick Navigation

This index provides a roadmap to the comprehensive skill system documentation created for the CloudBase-AI-ToolKit repository.

### Three Main Analysis Documents

1. **SKILL_SYSTEM_ANALYSIS.md** (486 lines, 16KB)
   - **Purpose**: Complete understanding of how the skill system is physically organized and conceptually structured
   - **Key Sections**:
     - Physical repository structure and directory layout
     - YAML frontmatter specification with all field definitions
     - Core SKILL.md content structure with recommended sections
     - 4-layer progressive disclosure pattern (SKILL.md → references/ → assets/ → scripts/)
     - Real examples from the repository showing simple, complex, and structured skills
     - Complete skill authoring meta-skill documentation
     - Inventory of all 22 skills with platform and capability categorization
     - Integration points and agent discovery mechanisms
     - Evaluation framework and best practices
   - **Best For**: Getting a complete picture of skill system architecture

2. **SKILL_FRONTMATTER_GUIDE.md** (388 lines, 13KB)
   - **Purpose**: Deep dive into YAML frontmatter design—the primary trigger mechanism for agents
   - **Key Sections**:
     - Complete YAML frontmatter specification
     - Field-by-field guidance (name, description, alwaysApply)
     - Description structure pattern with "This skill should be used when..." formula
     - 5 Keyword Buckets (Brand, Platform, Scenario, Action, Capability)
     - 4 real examples from the repository with detailed quality analysis
     - Precision vs. Recall trade-off framework
     - Frontmatter quality checklist for different skill types
     - 4 common frontmatter mistakes with corrections
     - Step-by-step writing process (4 concrete steps)
     - Integration with operating rules and behavioral content
   - **Best For**: Writing new skills or improving existing frontmatter

3. **SKILL_QUICK_REFERENCE.md** (405 lines, 11KB)
   - **Purpose**: Hands-on lookup guide for skill creation and review
   - **Key Sections**:
     - Where skills are located in the repository
     - Skill frontmatter template with all required fields
     - Recommended SKILL.md structure template with 8 standard sections
     - Frontmatter quality checklist (precision-focused and recall-focused variants)
     - Good / Weak / Improved frontmatter examples with explanations
     - 4-layer progressive disclosure explanation and examples
     - 3 valid skill structure patterns (Simple, Hub+Files, Hub+Subfolder)
     - Routing table pattern explanation with example
     - Operating Rules section for behavioral contract
     - Structure smell checks (6 warning signs)
     - Complete 22-skill inventory organized by platform and capability
     - Skill authoring meta-skill quick reference
     - Agent discovery flow diagram
     - Precision vs. Recall trade-off comparison table
     - Writing process checklist
     - Common mistakes quick reference
   - **Best For**: Quick lookup while actively creating or reviewing skills

---

## Key Concepts Covered Across All Documents

### 1. Skill Anatomy
Every skill combines:
- **Frontmatter** (YAML): Metadata for agent discovery
- **Main Content** (Markdown): Behavioral rules and guidance
- **Supporting Files** (Optional): Progressive disclosure of complexity

### 2. The 4-Layer Progressive Disclosure Pattern
```
Layer 1: SKILL.md
├── Trigger conditions (description in frontmatter)
├── Core behavioral rules (Operating Rules section)
├── Routing table (when to load other layers)
└── Quick workflow (5-step summary)

Layer 2: references/
├── Methodology and deep explanations
├── Complex scenarios and edge cases
├── Integration patterns
└── Cross-references to other skills

Layer 3: assets/
├── Reusable templates
├── Sample code
├── Configuration examples
└── Copy-paste materials

Layer 4: scripts/
├── Executable helper capabilities
├── Automation scripts
├── Build/deploy helpers
└── Testing utilities
```

### 3. Frontmatter as Primary Trigger
The description field is NOT just metadata—it's the primary mechanism for agent discovery:
- Uses realistic user phrasing
- Includes brand names, product names, and common aliases
- Specifies platform (web, mini program, backend, etc.)
- Lists action verbs (create, deploy, debug, etc.)
- Clarifies boundaries with explicit "NOT for" scenarios

### 4. Operating Rules - Behavioral Contract
After a skill triggers, it defines 5 critical behavioral aspects:
1. First action after trigger
2. What to inspect before acting
3. What must never be skipped
4. When to load references
5. When to stop and ask for clarification

### 5. Routing Table Pattern
Explicit table in SKILL.md that tells agents:
- What task requires which reference file
- Why that reference is needed
- When NOT to load optional references

### 6. The 22 Skills Ecosystem
Organized by platform and capability:

**Web Platform:**
- ai-model-web
- auth-web
- database-web
- storage-web
- cloud-functions (shared)
- hosting-web

**Mini Program Platform:**
- ai-model-miniprogram
- auth-miniprogram
- database-miniprogram
- storage-miniprogram
- cloud-functions (shared)
- hosting-miniprogram

**Backend/Node.js Platform:**
- ai-model-nodejs
- auth-nodejs
- database-nodejs
- storage-nodejs
- cloud-functions (shared)
- hosting-nodejs

**Infrastructure & Platform:**
- cloudbase-platform
- cli-commands
- cloudbase (meta-skill for general guidance)

---

## How to Use This Documentation

### If you need to...

**Understand the overall system architecture:**
→ Start with SKILL_SYSTEM_ANALYSIS.md (Section: "Physical Structure" and "Skill Metadata Format")

**Write a new skill:**
→ Use SKILL_QUICK_REFERENCE.md templates, then read SKILL_FRONTMATTER_GUIDE.md for frontmatter quality

**Improve an existing skill's frontmatter:**
→ Check SKILL_FRONTMATTER_GUIDE.md (Section: "Common Mistakes" and "Quality Checklist")

**Understand trigger precision/recall trade-offs:**
→ Read SKILL_FRONTMATTER_GUIDE.md (Section: "Precision vs. Recall") or SKILL_QUICK_REFERENCE.md

**Organize a complex skill with references:**
→ Use SKILL_QUICK_REFERENCE.md (Section: "3 Valid Skill Patterns") and SKILL_SYSTEM_ANALYSIS.md examples

**Evaluate whether a skill is ready to ship:**
→ Read SKILL_SYSTEM_ANALYSIS.md (Section: "Evaluation Framework") then test with prompts

**Learn by example:**
→ Check SKILL_SYSTEM_ANALYSIS.md (Section: "Real Examples") and SKILL_QUICK_REFERENCE.md (Section: "Examples")

---

## Key Files in the Repository

### Skill Authoring Meta-Skill
```
skills/skill-authoring/
├── SKILL.md                          # Main meta-skill guide
└── references/
    ├── frontmatter-patterns.md       # Trigger design
    ├── structure-patterns.md          # Architecture patterns
    ├── templates.md                   # Templates and examples
    ├── evaluation.md                  # Quality assurance framework
    └── examples.md                    # Good/weak examples
```

### Platform Guideline
```
config/source/guideline/cloudbase/SKILL.md    # Main platform routing guide
```

### 22 Skills (Sample Locations)
```
config/source/skills/
├── ai-model-nodejs/SKILL.md          # Simple skill (single file)
├── cloud-functions/SKILL.md          # Large comprehensive skill
├── auth-nodejs/SKILL.md              # Scenario-focused skill
├── no-sql-web-sdk/
│   ├── SKILL.md                      # Hub file
│   ├── aggregation.md                # Supporting references (7 more files)
│   ├── complex-queries.md
│   └── ... (5 more reference files)
└── miniprogram-development/
    ├── SKILL.md                      # Hub file
    └── references/
        ├── cloudbase-integration.md
        └── devtools-debug-preview.md
```

---

## Three Valid Skill Structure Patterns

### Pattern 1: Simple Skill (Single File)
- **Use When**: Domain is focused, limited cross-references
- **Example**: ai-model-nodejs, auth-nodejs
- **Structure**: Just `SKILL.md` with comprehensive content
- **Max Size**: ~400-500 lines before considering Pattern 2

### Pattern 2: Hub + Reference Files (Flat)
- **Use When**: Multiple distinct topics in one domain
- **Example**: no-sql-web-sdk (7 reference files)
- **Structure**: 
  - `SKILL.md` (routing hub)
  - `reference-a.md`, `reference-b.md`, etc. (same directory)
- **Good For**: Skills without need for folder hierarchy

### Pattern 3: Hub + References Subfolder
- **Use When**: Multiple references organized thematically
- **Example**: miniprogram-development
- **Structure**:
  - `SKILL.md` (routing hub)
  - `references/file-a.md`, `references/file-b.md`
- **Good For**: Cleaner organization when many supporting files

---

## Quality Standards

### Frontmatter Quality Checklist
- [ ] Name is short (1-2 words)
- [ ] Name is intentional and stable
- [ ] Description opens with product/domain introduction
- [ ] Description includes realistic "This skill should be used when..." sentence
- [ ] Description balances brand, platform, scenario, action, and capability terms
- [ ] Description explicitly mentions non-applicable scenarios
- [ ] Trigger vocabulary matches actual user phrasing
- [ ] Boundaries are clear vs. neighboring skills

### SKILL.md Content Checklist
- [ ] Main content explains what behavior changes after trigger
- [ ] Operating Rules section is present (5 behavioral aspects)
- [ ] Routing table explains when to load which reference
- [ ] "When to use this skill" clarifies boundaries
- [ ] "Do NOT use for" lists neighboring/conflicting scenarios
- [ ] Quick workflow provides 5-step summary
- [ ] Self-check verifies skill does what it promises
- [ ] No unnecessary context is loaded by default

### Evaluation Checklist
- [ ] 3+ should-trigger prompts designed and tested
- [ ] 3+ should-not-trigger prompts designed and tested
- [ ] 1 closest-neighbor comparison tested
- [ ] Skill consistently triggers on core scenarios
- [ ] Skill stays quiet on should-not-trigger cases
- [ ] Post-trigger behavior matches Operating Rules
- [ ] Only necessary references are loaded
- [ ] Boundaries remain distinct vs. neighbors

---

## Key Patterns & Formulas

### Description Pattern
```
<Product/Domain>. This skill should be used when users ask to <verb1>, <verb2>, <verb3>, 
or when they need <capability> in <platform/context>.
```

Example:
```
CloudBase is a full-stack development toolkit. This skill should be used when users ask 
to build, deploy, launch, or migrate CloudBase web apps and mini programs, or when they 
need help comparing CloudBase with Supabase.
```

### Operating Rules Template
```
1. First action after trigger: [What agent does immediately]
2. What to inspect before acting: [Critical checks]
3. What must never be skipped: [Non-negotiable steps]
4. When to load references: [Condition for loading each reference]
5. When to stop and ask for clarification: [Boundary conditions]
```

### Routing Table Template
```
| Task | Read | Why |
| --- | --- | --- |
| Scenario A | `references/file-a.md` | Needed for [reason] |
| Scenario B | `references/file-b.md` | Needed for [reason] |
```

---

## Frequently Needed Reference Points

### Precision vs. Recall Trade-off
- **Precision-First Skills**: Narrow trigger, fewer false positives, useful for specialized domains (e.g., "Node.js Cloud Functions")
- **Recall-First Skills**: Broader trigger, better discoverability, accept some false positives (e.g., "CloudBase General")

### 5 Keyword Buckets for Frontmatter
1. **Brand Words**: Official product names, aliases, Chinese-English variants
2. **Platform Words**: website, web app, mini program, mobile app, backend service
3. **Scenario Words**: build, deploy, launch, migrate, debug, optimize
4. **Action Words**: create, review, rewrite, improve, structure
5. **Capability Words**: authentication, database, storage, cloud functions, API

### 6 Structure Smell Checks
If your SKILL.md shows these signs, consider reorganizing:
1. Main file exceeds 500 lines
2. Multiple reference files exist but no routing table
3. Files are named vaguely (like "guide.md", "reference.md")
4. Deep methodology text appears before Operating Rules
5. Examples and templates mixed with conceptual content
6. Routing logic scattered through body text instead of in a table

---

## Next Steps for Skill Authors

1. **New Skill**: Use templates from SKILL_QUICK_REFERENCE.md
2. **Evaluate Existing Skill**: Run prompts from SKILL_SYSTEM_ANALYSIS.md (Evaluation Framework)
3. **Improve Frontmatter**: Check SKILL_FRONTMATTER_GUIDE.md (Quality Checklist)
4. **Understand Patterns**: Study real examples in SKILL_SYSTEM_ANALYSIS.md
5. **Test Boundaries**: Design should-trigger and should-not-trigger prompts

---

## Document Statistics

| Document | Lines | Size | Best For |
| --- | --- | --- | --- |
| SKILL_SYSTEM_ANALYSIS.md | 486 | 16KB | Complete system understanding |
| SKILL_FRONTMATTER_GUIDE.md | 388 | 13KB | Trigger design and frontmatter quality |
| SKILL_QUICK_REFERENCE.md | 405 | 11KB | Hands-on lookup and templates |
| SKILL_SYSTEM_INDEX.md (this file) | ~300 | 10KB | Navigation and quick reference |
| **TOTAL** | **1,579** | **~50KB** | Complete skill system documentation |

---

*Documentation created: 2026-04-15*
*Repository: CloudBase-AI-ToolKit*
*Scope: Complete skill system structure, frontmatter patterns, behavioral contracts, and quality standards*
