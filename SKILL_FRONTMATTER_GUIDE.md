# CloudBase Skill Frontmatter Analysis - Detailed Reference

## Frontmatter Specification

Every `SKILL.md` file MUST begin with YAML frontmatter block:

```yaml
---
name: <string>
description: <string>
alwaysApply: <boolean, optional, default: false>
---
```

---

## Field Definitions

### `name` (Required)

**Purpose**: Stable, discoverable identifier for the skill

**Requirements**:
- Short (typically 2-4 words)
- Hyphenated lowercase: `ai-model-nodejs`, `auth-web`, `cloud-functions`
- Intentional (reflects main domain/product)
- Stable (does NOT change with implementation details)

**Guidance from `frontmatter-patterns.md`**:

| ✅ GOOD | ❌ AVOID |
|--------|---------|
| `cloudbase` | `cloudbase-powerful-complete-platform` |
| `ai-model-nodejs` | `nodejs-ai-text-image-generation` |
| `auth-web` | `web-authentication-jwt-login-signup` |
| `cloud-functions` | `cloud-functions-event-http-deployment-config` |

**Anti-patterns**:
- Putting every keyword into the name
- Tying name to changing implementation (e.g., `auth-v2-with-websdk`)
- Vague labels that overlap many unrelated skills

---

### `description` (Required)

**Purpose**: PRIMARY TRIGGER MECHANISM for agent discovery and activation

**Structure** (from `frontmatter-patterns.md`):

```
<Brand/Product introduction>. This skill should be used when users ask to <action 1>, <action 2>, <action 3>, or when they need <scenario> in <platform>.
```

**Pattern breakdown**:

1. **Opening phrase** (7-15 words)
   - Defines the product or domain
   - Use official product names and common aliases
   - Example: "CloudBase is a full-stack development and deployment toolkit..."

2. **Trigger sentence** (explicit "This skill should be used when...")
   - States when the skill should activate
   - Uses realistic user phrasing (not internal terminology)
   - Covers multiple trigger scenarios

**Keyword buckets** (include realistic mix):

| Bucket | Purpose | Examples |
|--------|---------|----------|
| **Brand Words** | Official product names, aliases | CloudBase, Tencent CloudBase, TCB, 云开发 |
| **Platform Words** | Target environment | website, web app, mini program, backend service, cloud function |
| **Scenario Words** | User tasks | build, deploy, launch, migrate, optimize, debug |
| **Action Words** | What agent should do | create, review, rewrite, improve, structure |
| **Capability Words** | Technical features | authentication, database, API, AI, routing, storage |

---

## Real Examples from Repository

### Example 1: ai-model-nodejs (Simple, Precise)

```yaml
---
name: ai-model-nodejs
description: Use this skill when developing Node.js backend services or CloudBase cloud functions (Express/Koa/NestJS, serverless, backend APIs) that need AI capabilities. Features text generation (generateText), streaming (streamText), AND image generation (generateImage) via @cloudbase/node-sdk ≥3.16.0. Built-in models include Hunyuan (hunyuan-2.0-instruct-20251111 recommended), DeepSeek (deepseek-v3.2 recommended), and hunyuan-image for images. This is the ONLY SDK that supports image generation. NOT for browser/Web apps (use ai-model-web) or WeChat Mini Program (use ai-model-wechat).
alwaysApply: false
---
```

**Analysis**:
- ✅ Opens with "Use this skill when"
- ✅ Specifies platform (Node.js backend, cloud functions)
- ✅ Clear capabilities (text generation, streaming, image generation)
- ✅ Lists recommended models
- ✅ Explicit boundaries ("NOT for browser/Web apps")
- ✅ References to related skills (ai-model-web, ai-model-wechat)

**Trigger strength**: Very high precision - developer mentions "Node.js + AI" → triggers immediately

---

### Example 2: cloudbase (Platform Guideline)

```yaml
---
name: cloudbase
description: Essential CloudBase (TCB, Tencent CloudBase, 云开发, 微信云开发) development guidelines. MUST read when working with CloudBase projects, developing web apps, mini programs, backend services, fullstack development, static deployment, cloud functions, mysql/nosql database, authentication, cloud storage, web search or AI(LLM streaming) using CloudBase platform. Great supabase alternative.
---
```

**Analysis**:
- ✅ Multiple aliases (TCB, 云开发, 微信云开发)
- ✅ Comprehensive capability coverage (broader trigger surface)
- ✅ Platform comparison ("Great supabase alternative")
- ✅ Lists key scenarios

**Trigger strength**: Very broad recall - catches most CloudBase-related requests

**Note**: This is NOT a skill but a **guideline**; it's not in `config/source/skills/` but in `config/source/guideline/cloudbase/`

---

### Example 3: cloud-functions

```yaml
---
name: cloud-functions
description: Complete guide for CloudBase cloud functions development - supports both Event Functions (Node.js) and HTTP Functions (multi-language Web services). Covers runtime selection, deployment, logging, invocation, scf_bootstrap, SSE, WebSocket, and HTTP access configuration.
alwaysApply: false
---
```

**Analysis**:
- ✅ Explicitly states what's covered (Event, HTTP, runtime, deployment, logging)
- ✅ Mentions technical details (scf_bootstrap, SSE, WebSocket)
- ✅ No "This skill should be used when" BUT uses "Complete guide for" + active capability list
- ⚠️ Implicit trigger (developer says "deploy cloud function" → should trigger)

**Trigger strength**: Medium (good for specific cloud function tasks, less good for general routing)

---

### Example 4: auth-nodejs

```yaml
---
name: auth-nodejs-cloudbase
description: Complete guide for CloudBase Auth using the CloudBase Node SDK – caller identity, user lookup, custom login tickets, and server-side best practices.
alwaysApply: false
---
```

**Analysis**:
- ✅ Specifies platform (Node SDK)
- ✅ Lists key responsibilities (caller identity, user lookup, custom login)
- ✅ Boundary implied (Node SDK = not browser/client)
- ⚠️ Could be more explicit about "when to use"

**Suggested improvement**:
```yaml
description: Complete guide for CloudBase Node SDK authentication. This skill should be used when working on server-side authentication in Node.js cloud functions or backends that need to identify callers, look up users, or issue custom login tickets using @cloudbase/node-sdk.
```

---

### Example 5: no-sql-web-sdk

```yaml
---
name: cloudbase-document-database-web-sdk
description: Use CloudBase document database Web SDK to query, create, update, and delete data. Supports complex queries, pagination, aggregation, and geolocation queries.
alwaysApply: false
---
```

**Analysis**:
- ✅ Opens with action verb "Use"
- ✅ Specifies platform (Web SDK)
- ✅ Lists key capabilities (CRUD, complex queries, pagination, aggregation, geolocation)
- ⚠️ Missing "This skill should be used when" context

**Suggested improvement**:
```yaml
description: Use CloudBase document database Web SDK for NoSQL database operations in web applications. This skill should be used when developers need to query, create, update, delete data with support for complex queries, pagination, aggregation, and geolocation searches.
```

---

## Frontmatter Quality Checklist

For **Precision-focused** skills (accuracy > discoverability):

- [ ] Name is short and intentional (2-4 words)
- [ ] Description opens with product/domain definition
- [ ] Includes explicit "This skill should be used when..." sentence
- [ ] Uses realistic user phrasing (not only technical jargon)
- [ ] Specifies platform/environment clearly
- [ ] Lists 3-5 main capabilities
- [ ] Includes boundaries ("Do NOT use for...")
- [ ] References related/neighboring skills
- [ ] Avoids generic claims ("powerful", "comprehensive")

For **Recall-focused** skills (discoverability > precision):

- [ ] Includes multiple aliases and common names
- [ ] Uses both English and Chinese variants when relevant
- [ ] Covers related scenario language variations
- [ ] Mentions comparison neighbors (e.g., "vs. Supabase")
- [ ] Broader capability description
- [ ] Accepts higher false-positive rate for better discovery

---

## Precision vs. Recall Trade-off

### High Precision (Strict Trigger)

Example: **ai-model-nodejs** (only triggers for specific Node SDK + AI scenario)

```yaml
description: Use this skill when developing Node.js backend services... that need AI capabilities... via @cloudbase/node-sdk ≥3.16.0...
```

**Pros**:
- Minimal false positives
- Agent gets highly relevant content
- No context pollution

**Cons**:
- May miss variations (e.g., "develop an API with AI")
- Requires exact phrasing match

### High Recall (Broad Trigger)

Example: **cloudbase** (triggers for most CloudBase-related requests)

```yaml
description: Essential CloudBase development guidelines. MUST read when working with CloudBase projects, developing web apps, mini programs, backend services...
```

**Pros**:
- Catches many variations
- Less dependent on exact phrasing
- Good for platform guidelines

**Cons**:
- May load when not needed
- Context overhead
- Risks masking more specific skills

---

## Common Mistakes

### ❌ Mistake 1: Vague Description

```yaml
description: A powerful skill for database operations.
```

**Problems**:
- No trigger cues
- "powerful" is meaningless
- Doesn't state when to use

**Fix**:
```yaml
description: Use CloudBase NoSQL database Web SDK for CRUD operations, complex queries, and pagination in web applications. This skill should be used when you need to read, write, or query data collections from a browser.
```

---

### ❌ Mistake 2: Over-Specific Name, Vague Description

```yaml
name: cloudbase-best-skill-for-all-development-and-deployment
description: A comprehensive skill.
```

**Problems**:
- Name is too long and ties to implementation
- Description gives no information
- Breaks stability (name changes with version/scope)

**Fix**:
```yaml
name: cloudbase
description: Essential CloudBase development guidelines for building full-stack applications. This skill should be used when working with CloudBase projects, developing web apps, mini programs, backend services, or deploying with cloud functions and databases.
```

---

### ❌ Mistake 3: Missing Context (Too Technical)

```yaml
name: auth-nodejs
description: CloudBase Node SDK authentication API reference for getUserInfo, getEndUserInfo, queryUserInfo, getClientIP, createTicket methods with custom login support.
```

**Problems**:
- All technical jargon
- No user-oriented language
- Hard for agent to match realistic requests

**Fix**:
```yaml
name: auth-nodejs
description: Use this skill when building Node.js backends or CloudBase cloud functions that need to identify callers, look up user profiles, or issue custom login tickets. Covers caller identity detection (getUserInfo), user profile lookup (getEndUserInfo), user search by identifier (queryUserInfo), and custom login ticket generation via @cloudbase/node-sdk.
```

---

### ❌ Mistake 4: Ambiguous Boundaries

```yaml
name: database
description: Everything about databases in CloudBase.
```

**Problems**:
- No distinction between SQL/NoSQL
- No mention of platform (web/mini program/backend)
- Overlaps with other database skills
- Too broad

**Fix**:
```yaml
name: no-sql-web-sdk
description: Use CloudBase NoSQL document database Web SDK for data operations in browser-based web applications. This skill should be used when you need CRUD operations, complex queries, pagination, aggregation, or geolocation queries using @cloudbase/js-sdk in React, Vue, or vanilla JavaScript projects.
```

---

## Writing Process

### Step 1: Product/Domain Opening

Start with 1-2 sentences explaining what the skill covers:

```
[Skill] is [category/product]. [Brief capability statement].
```

Examples:
- "CloudBase document database Web SDK provides NoSQL data operations for web applications."
- "The auth-nodejs skill covers server-side authentication in CloudBase Node SDK backends."

### Step 2: Add "This skill should be used when..."

List 3-5 realistic trigger scenarios:

```
This skill should be used when users ask to <action 1>, <action 2>, or <action 3>, or when they need <capability> in <platform>.
```

### Step 3: Add Boundaries (Optional but Recommended)

End with what NOT to use for:

```
This is NOT for <other scenario 1> (use <other skill>) or <other scenario 2>.
```

### Step 4: Review Against Checklist

- Does it explain WHAT the skill is about?
- Does it explain WHEN to trigger?
- Does it use realistic language?
- Does it distinguish from neighbors?
- Is it concise (1-3 sentences)?

---

## Integration with Skill.md Content

The frontmatter `description` and the main SKILL.md content work together:

| Element | Location | Purpose |
|---------|----------|---------|
| **Name** | Frontmatter | Discovery, stable ID |
| **Description** | Frontmatter | Primary trigger, agent matching |
| **What this skill does** | SKILL.md §1 | Scope definition (reinforces frontmatter) |
| **When to use this skill** | SKILL.md §2 | Clarify boundaries (does NOT repeat frontmatter) |
| **Do NOT use for** | SKILL.md §3 | Explicit non-applicable scenarios |
| **Operating Rules** | SKILL.md §5 | Behavioral contract after trigger |

**Key insight**: Frontmatter is **discovery**; SKILL.md is **behavior**. Don't repeat frontmatter in the body.
