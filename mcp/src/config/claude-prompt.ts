// Fallback CLAUDE.md prompt content
// This is used when template download fails or CLAUDE.md is not found in the template
export const FALLBACK_CLAUDE_PROMPT = `---
description: CloudBase AI Development Rules Guide - Provides scenario-based best practices to ensure development quality
globs: *
alwaysApply: true
---

# CloudBase AI Development Rules Guide

## Quick Reference for AI

**⚠️ CRITICAL: Read this section first based on your project type**

### When Developing a Web Project:
1. **Environment Check**: Query environment info only when the task actually needs environment metadata, deployment, or an env ID. For existing applications with active TODOs or unfinished handlers, do not spend turns on hosting or domain queries unless the user explicitly asks for deployment.
1. **Execution Mode for Existing-Code Tasks**: If the task is to complete an existing application, wire TODO logic, or repair a broken flow, do **not** enter design-only, brainstorming-only, or spec-only flows first. Gather only the minimum context needed, then implement directly. Do not stop after “project exploration complete”.
1. **Existing File Focus (MANDATORY)**: For an existing Web app with active pages or TODO-bearing files, do not broad-scan the whole repo before coding. First inspect only the task-critical files: \`src/lib/backend.*\`, \`src/lib/auth.*\`, \`src/lib/cms-service.*\`, \`src/lib/storage-service.*\`, and the page/components that already consume those APIs. Then implement those TODOs before doing any wide repo exploration.
1. **Task Tool Discipline**: For targeted repair tasks, do not spend many turns in \`TaskCreate\`, \`TaskUpdate\`, or project-management loops. At most keep one short checklist. After that, write code. Do not let task-management consume the turn budget.
1. **No README / UI-Design Detour For Existing Apps**: If the repo already contains the target pages and only backend TODOs are missing, skip README-driven discovery and skip UI-design workflows unless the task explicitly asks for a visual redesign. Backend wiring is the priority.
1. **No Broad Grep / Glob Sweep**: In targeted repair tasks, do not recursively Grep / Glob the whole repo for long periods. Open the known TODO-bearing files directly and start editing.
3. **⚠️ UI Design (CRITICAL)**: **MUST read \`rules/ui-design/rule.md\` FIRST before generating any page, interface, component, or style** - This is NOT optional. You MUST explicitly read this file and output the design specification before writing any UI code.
4. **Core Capabilities**: Read Core Capabilities section below (especially UI Design and Database + Authentication for Web)
5. **Platform Rules**: Read \`rules/web-development/rule.md\` for platform-specific rules (SDK integration, static hosting, build configuration)
6. **Authentication**: Read \`rules/auth-web/rule.md\` - **MUST use Web SDK built-in authentication**
   - \`accessKey\` can only be a real Publishable Key obtained from CloudBase auth/app config. Never use \`envId\`, a username, or any placeholder string as \`accessKey\`.
   - If you do not have a real Publishable Key yet, do not fabricate one. First query or configure auth readiness, or initialize without \`accessKey\` if the login flow itself is what will establish end-user identity.
7. **Cloud Storage (when files are uploaded from browser code)**: Read \`rules/cloud-storage-web/rule.md\` before implementing upload / preview / temp URL flows. For local dev origins (for example Vite on \`127.0.0.1\` / \`localhost\`), query current security domains first and compare against the returned whitelist entry format (usually \`host:port\`, such as \`127.0.0.1:4173\` or \`localhost:5173\`). If \`envQuery(action="domains")\` reports missing local entries or returns a \`next_step\`, execute that \`envDomainManagement\` step before relying on \`app.uploadFile()\`. After upload, do not handcraft a storage URL from \`envId\`, bucket domain, or \`cloudPath\`; resolve an actual browser-usable URL through \`app.getTempFileURL()\` using the returned \`fileID\`.
7. **Database**: 
   - NoSQL: \`rules/no-sql-web-sdk/rule.md\`
   - MySQL: \`rules/relational-database-web/rule.md\` + \`rules/relational-database-mcp/rule.md\`

### When Developing a Mini Program Project:
1. **Environment Check**: Call \`envQuery\` tool first (applies to all interactions)
2. **⚠️ UI Design (CRITICAL)**: **MUST read \`rules/ui-design/rule.md\` FIRST before generating any page, interface, component, or style** - This is NOT optional. You MUST explicitly read this file and output the design specification before writing any UI code.
3. **Core Capabilities**: Read Core Capabilities section below (especially UI Design and Database + Authentication for Mini Program)
4. **Platform Rules**: Read \`rules/miniprogram-development/rule.md\` for platform-specific rules (project structure, WeChat Developer Tools, wx.cloud usage)
5. **Authentication**: Read \`rules/auth-wechat/rule.md\` - **Naturally login-free, get OPENID in cloud functions**
6. **Database**: 
   - NoSQL: \`rules/no-sql-wx-mp-sdk/rule.md\`
   - MySQL: \`rules/relational-database-mcp/rule.md\` (via MCP tools)

---

## Core Capabilities (Must Be Done Well)

As the most important part of application development, the following four core capabilities must be done well, without needing to read different rules for different platforms:

### 1. ⚠️ UI Design (CRITICAL - Highest Priority)
**⚠️ MANDATORY: Must strictly follow \`rules/ui-design/rule.md\` rules for ALL design work**

**🚨 CRITICAL ENFORCEMENT: You MUST explicitly read the file \`rules/ui-design/rule.md\` before generating ANY UI code. This is NOT a suggestion - it is a MANDATORY requirement.**

**Before generating ANY page, interface, component, or style:**
1. **MUST FIRST explicitly read \`rules/ui-design/rule.md\` file** - Use file reading tools to read this file, do NOT skip this step
2. **MUST complete design specification output** before writing any code:
   - Purpose Statement
   - Aesthetic Direction (choose from specific options, NOT generic terms)
   - Color Palette (with hex codes, avoid forbidden colors)
   - Typography (specific font names, avoid forbidden fonts)
   - Layout Strategy (asymmetric/creative approach, avoid centered templates)
3. **MUST ensure** generated interfaces have distinctive aesthetic styles and high-quality visual design
4. **MUST avoid** generic AI aesthetics (common fonts, clichéd color schemes, templated designs)

**This applies to ALL tasks involving:**
- Page generation
- Interface creation
- Component design
- Style/visual effects
- Any frontend visual elements

**⚠️ VIOLATION DETECTION: If you find yourself writing UI code without first reading \`rules/ui-design/rule.md\`, STOP immediately and read the file first.**

### 2. Database + Authentication
**Strengthen database and authentication capabilities**

**Authentication**:
- **Web Projects**: 
  - Must use CloudBase Web SDK built-in authentication, refer to \`rules/auth-web/rule.md\`
  - For username-style accounts, use \`auth.signUp({ username, password })\` and \`auth.signInWithPassword({ username, password })\`
  - Do not use email-only helpers or email-only input semantics when the account identifier is a plain username string
  - When an existing schema or fixture already provides role/profile metadata in \`users\`, \`profiles\`, or \`user_roles\`, reuse that collection instead of inventing yet another one. In role-based content-management flows, a \`user_roles\` collection keyed by \`uid\` is an acceptable and validated pattern.
  - For browser-side file upload / preview flows, read \`rules/cloud-storage-web/rule.md\`; on local dev origins, verify the required local host entries (for example \`127.0.0.1:4173\`, \`localhost:5173\`) are already in the environment security-domain whitelist before depending on \`app.uploadFile()\`. If \`envQuery(action="domains")\` returns missing local entries or a \`next_step\`, execute that \`envDomainManagement\` action first. After upload, use \`app.getTempFileURL()\` to resolve the preview/download URL instead of constructing a URL string manually.
  - Platform development rules: Refer to \`rules/web-development/rule.md\` for Web SDK integration, static hosting deployment, and build configuration
- **Mini Program Projects**: 
  - Naturally login-free, get \`wxContext.OPENID\` in cloud functions, refer to \`rules/auth-wechat/rule.md\`
  - Platform development rules: Refer to \`rules/miniprogram-development/rule.md\` for mini program project structure, WeChat Developer Tools integration, and CloudBase capabilities
- **Node.js Backend**: Refer to \`rules/auth-nodejs/rule.md\`

**Database Operations**:
- **Web Projects**:
  - NoSQL Database: Refer to \`rules/no-sql-web-sdk/rule.md\`
  - For content collections that only need owner-only writes, simple permissions such as \`READONLY\` can be a good fit. But for CMS-style collections that require **app-level admin users** to edit/delete any record while editors can only edit/delete their own records, a \`CUSTOM\` rule is expected.
  - A validated CMS article rule shape is: \`{"read":"auth.uid != null","create":"auth.uid != null","update":"auth.uid != null && (get('database.user_roles.' + auth.uid).role == 'admin' || doc.authorId == auth.uid)","delete":"auth.uid != null && (get('database.user_roles.' + auth.uid).role == 'admin' || doc.authorId == auth.uid)"}\`.
  - For that CMS pattern, frontend writes can stay on \`.doc(id).update()\` / \`.doc(id).remove()\`. Do not force a \`where(...)\` rewrite unless the task explicitly requires a different rule design.
  - MySQL Relational Database: Refer to \`rules/relational-database-web/rule.md\` (Web application development) and \`rules/relational-database-mcp/rule.md\` (Management via MCP tools)
  - Platform development rules: Refer to \`rules/web-development/rule.md\` for Web SDK database integration patterns
- **Mini Program Projects**:
  - NoSQL Database: Refer to \`rules/no-sql-wx-mp-sdk/rule.md\`
  - MySQL Relational Database: Refer to \`rules/relational-database-mcp/rule.md\` (via MCP tools)
  - Platform development rules: Refer to \`rules/miniprogram-development/rule.md\` for mini program database integration and wx.cloud usage
- **Data Model Creation** (Universal): Refer to \`rules/data-model-creation/rule.md\`

### 3. Static Hosting Deployment (Web)
**Refer to deployment process in \`rules/web-development/rule.md\`**
- Use CloudBase static hosting after build completion
- Deploy using \`uploadFiles\` tool
- \`uploadFiles\` is only for static hosting deployment; do not use it for COS / cloud storage uploads. For storage objects, use \`manageStorage(action="upload")\`
- If the task is local verification or an unfinished application repair with a dev server workflow, skip static hosting deployment unless the user explicitly asks for a deployed URL
- Remind users that CDN has a few minutes of cache after deployment
- Generate markdown format access links with random queryString

### 4. Backend Deployment (Cloud Functions or CloudRun)
**Refer to \`rules/cloudrun-development/rule.md\`**
- **Cloud Function Deployment**: Prefer \`queryFunctions\` to inspect current state, then use \`manageFunctions\` with \`action="createFunction"\` or \`action="updateFunctionCode"\`.
- In agent / non-interactive runs, treat \`manageFunctions\` as the default deployment path for both Event and HTTP functions; do not fall back to CLI login flows unless MCP tools are unavailable.
- For HTTP functions, create or update them through \`manageFunctions\` with \`func.type="HTTP"\` instead of relying on \`tcb fn deploy\` as the primary path.
- **CloudRun Deployment**: Use \`manageCloudRun\` tool for containerized deployment
- Ensure backend code supports CORS, prepare Dockerfile (for container type)

## Development Process Standards

**Important: To ensure development quality, AI must complete the following steps before starting work:**

### 0. Environment Check (First Step)
After user inputs any content, first check CloudBase environment status:
- Ensure current CloudBase environment ID is known
- If not present in conversation history and the task needs env metadata or deployment, call \`envQuery\` tool with parameter \`action=info\` to query current environment information and environment ID
- **Important**: When environment ID configuration is involved in code later, automatically use the queried environment ID, no need for manual user input

### 1. Scenario Identification
Identify current development scenario type, mainly for understanding project type, but core capabilities apply to all projects:
- **Web Projects**: React/Vue/native JS frontend projects
- **WeChat Mini Programs**: Mini program CloudBase projects
- **CloudRun Projects**: CloudBase Run backend service projects (supports any language: Java/Go/Python/Node.js/PHP/.NET, etc.)
- **Database Related**: Projects involving data operations
- **UI Design/Interface Generation**: Projects requiring interface design, page generation, prototype creation, component design, etc.

### 2. Platform-Specific Quick Guide

**Web Projects - Required Rule Files:**
- \`rules/web-development/rule.md\` - Platform development rules (SDK integration, static hosting, build configuration)
- \`rules/auth-web/rule.md\` - Authentication (MUST use Web SDK built-in authentication)
- \`rules/no-sql-web-sdk/rule.md\` - NoSQL database operations
- \`rules/relational-database-web/rule.md\` - MySQL database operations (Web)
- \`rules/relational-database-mcp/rule.md\` - MySQL database management (MCP tools)
- \`rules/cloudbase-platform/rule.md\` - Universal CloudBase platform knowledge

**Mini Program Projects - Required Rule Files:**
- \`rules/miniprogram-development/rule.md\` - Platform development rules (project structure, WeChat Developer Tools, wx.cloud)
- \`rules/auth-wechat/rule.md\` - Authentication (naturally login-free, get OPENID in cloud functions)
- \`rules/no-sql-wx-mp-sdk/rule.md\` - NoSQL database operations
- \`rules/relational-database-mcp/rule.md\` - MySQL database operations (via MCP tools)
- \`rules/cloudbase-platform/rule.md\` - Universal CloudBase platform knowledge

**Universal Rule Files (All Projects):**
- **⚠️ \`rules/ui-design/rule.md\`** - **MANDATORY - HIGHEST PRIORITY** - Must read FIRST before any UI/page/component/style generation
- \`rules/data-model-creation/rule.md\` - Data model creation and MySQL modeling
- \`rules/spec-workflow/rule.md\` - Standard software engineering process (if needed)

### 3. Development Confirmation
Before starting work, suggest confirming with user:
1. "I identify this as a [scenario type] project"
2. "I will strictly follow core capability requirements and refer to relevant rule files"
3. "Please confirm if my understanding is correct"

## Core Behavior Rules
0. **Existing-Code Completion Bias**: For existing applications with TODOs or broken flows, implementation is the goal. Do not hand off to a design-only phase, do not stop at exploration, and do not treat a summary of findings as task completion. After minimal context gathering, write code and wire the real backend flow.
0. **No Broad Exploration For TODO Apps**: When the repo already exposes TODO markers in backend integration files, do not keep globbing, summarizing, or reading unrelated files. Open the TODO-bearing files and implement them.
0. **No Task-Loop Derailment**: In targeted repair tasks, avoid repeated \`TaskCreate\` / \`TaskUpdate\` cycles. One minimal checklist is enough; the rest of the budget should go to file edits, tool calls, and verification.
0. **Do Not Delegate Or Defer**: In targeted repair tasks, do not invoke design copilots, brainstorming helpers, or delegated agent flows before the core TODO files are implemented. Finish the direct file edits first.
1. **Tool Priority**: For Tencent CloudBase operations, must prioritize using CloudBase MCP tools
2. **Project Understanding**: First read current project's README.md, follow project instructions for development. Exception: for existing applications where the missing work is clearly in known backend integration files, skip README-first and go straight to those files.
4. **Directory Standards**: Before outputting project code in current directory, first check current directory files
5. **Development Order**: When developing, prioritize frontend first, then backend, ensuring frontend interface and interaction logic are completed first, then implement backend business logic
6. **⚠️ UI Design Rules Mandatory Application**: When tasks involve generating pages, interfaces, components, styles, or any frontend visual elements, **MUST FIRST explicitly read the file \`rules/ui-design/rule.md\` using file reading tools**, then strictly follow the rule file, ensuring generated interfaces have distinctive aesthetic styles and high-quality visual design, avoiding generic AI aesthetics. **You MUST output the design specification before writing any UI code.** Exception: for existing applications where page structure is already fixed and only backend integration is missing, do not trigger the UI-design workflow.
7. **Backend Development Priority Strategy**: When developing backend, prioritize using SDK to directly call CloudBase database, rather than through cloud functions, unless specifically needed (such as complex business logic, server-side computation, calling third-party APIs, etc.)
8. **Deployment Order**: When there are backend dependencies, prioritize deploying backend before previewing frontend
9. **Interactive Confirmation**: Clarify requirements when needed, and confirm before executing high-risk operations
10. **Real-time Communication**: Use CloudBase real-time database watch capability
11. **⚠️ Authentication Rules**: When users develop projects, if user login authentication is needed, must use built-in authentication functions, must strictly distinguish authentication methods by platform
   - **Web Projects**: **MUST use CloudBase Web SDK built-in authentication** (e.g., \`auth.toDefaultLoginPage()\`), refer to \`rules/auth-web/rule.md\`
   - **Username-style Web accounts**: Use \`auth.signUp({ username, password })\` for registration and \`auth.signInWithPassword({ username, password })\` for login. Do not use \`signInWithEmailAndPassword\` / \`signUpWithEmailAndPassword\` when the identifier is not an email address.
   - **Web initialization**: Only set \`accessKey\` when you have a real Publishable Key. Never set \`accessKey: envId\` or any made-up string.
   - **Mini Program Projects**: **Naturally login-free**, get \`wxContext.OPENID\` in cloud functions, refer to \`rules/auth-wechat/rule.md\`

## Development Workflow

### Development

1. **Project Bootstrap Discipline**: 
   - Prefer the existing project structure and scripts when they already exist
   - For new projects, keep the initial structure consistent and avoid mixing unrelated frameworks in one workspace
   - If you bootstrap or copy an existing starter manually, hidden files and project config must be carried over as well

2. **⚠️ UI Design Document Reading (MANDATORY)**: 
   - **Before generating ANY page, interface, component, or style, MUST FIRST explicitly read the file \`rules/ui-design/rule.md\` using file reading tools**
   - **MUST output the design specification** (Purpose Statement, Aesthetic Direction, Color Palette, Typography, Layout Strategy) before writing any UI code
   - This is NOT optional - you MUST read the file and follow the design thinking framework and frontend aesthetics guidelines
   - Avoid generating generic AI aesthetic style interfaces

3. **Mini Program TabBar Material Download - Download Remote Material Links**: Mini program Tabbar and other material images must use **png** format, must use downloadRemoteFile tool to download files locally. Can select from Unsplash, wikimedia (generally choose 500 size), Pexels, Apple official UI and other resources

If remote links are needed in the application, can continue to call uploadFile to upload and obtain temporary access links and cloud storage cloudId

3. **Query Professional Knowledge from Knowledge Base**: If uncertain about any CloudBase knowledge, can use searchKnowledgeBase tool to intelligently search CloudBase knowledge base (supports CloudBase and cloud functions, mini program frontend knowledge, etc.), quickly obtain professional documents and answers through vector search

4. **WeChat Developer Tools Open Project Workflow**:
- When detecting current project is a mini program project, suggest user to use WeChat Developer Tools for preview, debugging, and publishing
- Before opening, confirm project.config.json has appid field configured. If not configured, must ask user to provide it
- Use WeChat Developer built-in CLI command to open project (pointing to directory containing project.config.json):
  - Windows: \`"C:\\Program Files (x86)\\Tencent\\微信web开发者工具\\cli.bat" open --project "项目根目录路径"\`
  - macOS: \`/Applications/wechatwebdevtools.app/Contents/MacOS/cli open --project "/path/to/project/root"\`
- Project root directory path is the directory containing project.config.json file

### Deployment Process

1. **Cloud Function Deployment Process**: Prefer \`queryFunctions\` to query current functions, then call \`manageFunctions\` with \`action="createFunction"\` or \`action="updateFunctionCode"\` to deploy cloud function code. In agent / non-interactive runs, keep deployment on MCP tools instead of CLI login flows. For HTTP functions, set \`func.type="HTTP"\` when creating them. Only need to point \`functionRootPath\` to the parent directory of the cloud function directory (for example, the absolute path of the \`cloudfunctions\` directory). No need for code compression or other preprocessing.

2. **CloudRun Deployment Process**: For non-cloud function backend services (Java, Go, PHP, Python, Node.js, etc.), use manageCloudRun tool for deployment. Ensure backend code supports CORS, prepare Dockerfile, then call manageCloudRun for containerized deployment. For details, refer to \`rules/cloudrun-development/rule.md\`

3. **Static Hosting Deployment Process**: Deploy using uploadFiles tool for static hosting only. If the task needs a COS object that must be queried or polled with the storage SDK, use \`manageStorage\` / \`queryStorage\` instead. For local verification or unfinished application repairs, do not deploy hosting unless the user explicitly asks for deployment. After deployment, remind users that CDN has a few minutes of cache. Can generate markdown format access links with random queryString. For details, refer to \`rules/web-development/rule.md\`

### Documentation Generation Rules

1. You will generate a README.md file after generating the project, containing basic project information, such as project name, project description. Most importantly, clearly explain the project architecture and involved CloudBase resources, so maintainers can refer to it for modification and maintenance
2. After deployment, if it's a web project, can write the official deployment access address in the documentation

### Configuration File Rules

1. To help others who don't use AI understand what resources are available, can generate a cloudbaserc.json file after generation

### MCP Interface Call Rules
When calling MCP services, you need to fully understand the data types of all interfaces to be called, as well as return value types. If you're not sure which interface to call, first check the documentation and tool descriptions, then determine which interface and parameters to call based on the documentation and tool descriptions. Do not have incorrect method parameters or parameter type errors.

For example, many interfaces require a confirm parameter, which is a boolean type. If you don't provide this parameter, or provide incorrect data type, the interface will return an error.

### Environment ID Auto-Configuration Rules
- When generating project configuration files (such as \`cloudbaserc.json\`, \`project.config.json\`, etc.), automatically use the environment ID queried by \`envQuery\`
- In code examples involving environment ID, automatically fill in current environment ID, no need for manual user replacement
- In deployment and preview related operations, prioritize using already queried environment information

## Professional Rule File Reference

**Note**: For detailed information, refer to the specific skill files. This section provides quick reference only.

### Platform Development Skills
- **Web**: \`rules/web-development/rule.md\` - SDK integration, static hosting, build configuration
- **Mini Program**: \`rules/miniprogram-development/rule.md\` - Project structure, WeChat Developer Tools, wx.cloud
- **CloudRun**: \`rules/cloudrun-development/rule.md\` - Backend deployment (functions/containers)
- **Platform (Universal)**: \`rules/cloudbase-platform/rule.md\` - Environment, authentication, services

### Authentication Skills
- **Web**: \`rules/auth-web/rule.md\` - **MUST use Web SDK built-in authentication**
- **Mini Program**: \`rules/auth-wechat/rule.md\` - **Naturally login-free, get OPENID in cloud functions**
- **Node.js**: \`rules/auth-nodejs/rule.md\`
- **HTTP API**: \`rules/auth-http-api/rule.md\`

### Database Skills
- **NoSQL (Web)**: \`rules/no-sql-web-sdk/rule.md\`
- **NoSQL (Mini Program)**: \`rules/no-sql-wx-mp-sdk/rule.md\`
- **MySQL (Web)**: \`rules/relational-database-web/rule.md\`
- **MySQL (MCP)**: \`rules/relational-database-mcp/rule.md\`
- **Data Model Creation**: \`rules/data-model-creation/rule.md\`

### 🎨 ⚠️ UI Design Skill (CRITICAL - Read FIRST)
- **\`rules/ui-design/rule.md\`** - **MANDATORY - HIGHEST PRIORITY**
  - **MUST read FIRST before generating ANY interface/page/component/style**
  - Design thinking framework, complete design process, frontend aesthetics guidelines
  - **NO EXCEPTIONS**: All UI work requires reading this file first

### Workflow Skills
- **Spec Workflow**: \`rules/spec-workflow/rule.md\` - Standard software engineering process (requirements, design, tasks)

## Development Quality Checklist

To ensure development quality, recommend completing the following checks before starting tasks:

### Recommended Steps
0. **[ ] Environment Check**: Call \`envQuery\` tool to check CloudBase environment status (applies to all interactions)
1. **[ ] Scenario Identification**: Clearly identify what type of project this is (Web/Mini Program/Database/UI)
3. **[ ] Core Capability Confirmation**: Confirm all four core capabilities have been considered
   - UI Design: Have you explicitly read the file \`rules/ui-design/rule.md\` using file reading tools?
   - Database + Authentication: Have you referred to corresponding authentication and database skills?
   - Static Hosting Deployment: Have you understood the deployment process?
   - Backend Deployment: Have you understood cloud function or CloudRun deployment process?
4. **[ ] UI Design Rules Check (MANDATORY)**: If task involves generating pages, interfaces, components, or styles:
   - Have you explicitly read the file \`rules/ui-design/rule.md\` using file reading tools? (Required: YES)
   - Have you output the design specification before writing code? (Required: YES)
   - Have you understood and will follow the design thinking framework? (Required: YES)
5. **[ ] User Confirmation**: Confirm with user whether scenario identification and core capability understanding are correct
6. **[ ] Rule Execution**: Strictly follow core capability requirements and relevant rule files for development

### ⚠️ Common Issues to Avoid
- **❌ DO NOT skip reading UI design document** - Must explicitly read \`rules/ui-design/rule.md\` file before generating any UI code
- Avoid skipping core capabilities and starting development directly
- Avoid mixing APIs and authentication methods from different platforms
- Avoid ignoring UI design rules: All tasks involving interfaces, pages, components, styles must explicitly read and strictly follow \`rules/ui-design/rule.md\`
- Avoid ignoring database and authentication standards: Must use correct authentication methods and database operation methods
- Important technical solutions should be confirmed with users

### Quality Assurance
If development is found to not comply with standards, can:
- Point out specific issues
- Require re-execution of rule check process
- Clearly specify rule files that need to be followed`;
