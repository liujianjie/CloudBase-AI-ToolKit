#!/usr/bin/env npx tsx
/**
 * Build All-in-One CloudBase Skill
 *
 * Usage:
 *   npx tsx scripts/build-allinone-skill.ts --dir <target-directory> [--no-sub-skill]
 *
 * Options:
 *   --dir <path>      Target directory (required)
 *   --no-sub-skill    Rename sub-skill SKILL.md to README.md for better spec compliance
 *
 * Example:
 *   npx tsx scripts/build-allinone-skill.ts --dir ~/my-project
 *   npx tsx scripts/build-allinone-skill.ts --dir ./my-app/.cursor/skills --no-sub-skill
 *
 * This will create:
 *   <target-directory>/cloudbase/
 *   ├── SKILL.md                    # Main skill entry
 *   └── references/                 # All sub-skills (copied)
 *       ├── auth-web/SKILL.md       # or README.md with --no-sub-skill
 *       ├── no-sql-web-sdk/
 *       │   ├── SKILL.md            # or README.md with --no-sub-skill
 *       │   └── *.md
 *       └── ...
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TOOLKIT_ROOT = path.resolve(__dirname, '..');

// Source of truth paths (relative to toolkit root)
const SOURCES = {
  mainRules: 'config/.cursor/rules/cloudbase-rules.mdc',
  skillsDir: 'config/.claude/skills',
};

// Skills to exclude from the bundle
const EXCLUDE_SKILLS = ['cloudbase'];

// Sub-skill entry filename based on mode
const SUB_SKILL_FILENAME = {
  default: 'SKILL.md',
  noSubSkill: 'README.md',
};

// Parse command line arguments
function parseArgs(): { targetDir: string; noSubSkill: boolean } {
  const args = process.argv.slice(2);
  const dirIndex = args.indexOf('--dir');
  const noSubSkill = args.includes('--no-sub-skill');

  if (dirIndex === -1 || !args[dirIndex + 1]) {
    console.error('❌ Error: --dir argument is required\n');
    console.error('Usage: npx tsx scripts/build-allinone-skill.ts --dir <target-directory> [--no-sub-skill]\n');
    console.error('Options:');
    console.error('  --dir <path>      Target directory (required)');
    console.error('  --no-sub-skill    Rename sub-skill SKILL.md to README.md for better spec compliance\n');
    console.error('Example:');
    console.error('  npx tsx scripts/build-allinone-skill.ts --dir ~/my-project');
    console.error('  npx tsx scripts/build-allinone-skill.ts --dir ./my-app/.cursor/skills --no-sub-skill');
    process.exit(1);
  }

  return { targetDir: path.resolve(args[dirIndex + 1]), noSubSkill };
}

// Generate SKILL.md frontmatter
const SKILL_FRONTMATTER = `---
name: cloudbase
description: CloudBase AI Development - Complete toolkit for building Web, Mini Program, and Native App projects with CloudBase. Includes authentication, database (NoSQL/MySQL), cloud functions, CloudRun, storage, AI models, and UI design guidelines.
---

`;

// Simplified reference guide to replace the "Path Resolution Strategy" section
const SIMPLIFIED_REFERENCE_GUIDE = `## 📁 Reference Files Location

All reference documentation files are located in the \`references/\` directory relative to this file.

**File Structure:**
\`\`\`
cloudbase/
├── SKILL.md              # This file (main entry)
└── references/           # All reference documentation
    ├── auth-web/         # Web authentication guide
    ├── auth-wechat/      # WeChat authentication guide
    ├── no-sql-web-sdk/   # NoSQL database for Web
    ├── ui-design/        # UI design guidelines
    └── ...               # Other reference docs
\`\`\`

**How to use:** When this document mentions reading a reference file like \`references/auth-web/README.md\`, simply read that file from the \`references/\` subdirectory.

---

`;

// Convert .mdc content to SKILL.md format
function convertMdcToSkill(mdcContent: string, noSubSkill: boolean): string {
  // Remove .mdc frontmatter
  let content = mdcContent.replace(/^---[\s\S]*?---\n/, '');

  // Determine the sub-skill entry filename
  const subSkillFile = noSubSkill ? SUB_SKILL_FILENAME.noSubSkill : SUB_SKILL_FILENAME.default;

  // Remove the "Rule File Path Resolution Strategy" section (from ## 🗂️ to the next ---)
  // This section is for multi-IDE compatibility and not needed in allinone skill
  content = content.replace(
    /# CloudBase AI Development Rules Guide\n\n## 🗂️ Rule File Path Resolution Strategy[\s\S]*?---\n\n/,
    `# CloudBase AI Development Rules Guide\n\n${SIMPLIFIED_REFERENCE_GUIDE}`
  );

  // Remove "(using path resolution strategy)" and similar phrases - no longer needed
  content = content.replace(/\s*\(using path resolution strategy\)/g, '');
  content = content.replace(/\s*using the path resolution strategy( at the top of this document)?/g, '');
  content = content.replace(/apply the path resolution strategy from the top of this file:\n1\. Try[^\n]*\n2\. Then[^\n]*\n3\. Use[^\n]*/g,
    'read the file directly from the `references/` directory');

  // Clean up the "Specific example for auth-tool" multi-IDE path examples
  content = content.replace(
    /\*\*Specific example for auth-tool:\*\*\n1\. [^\n]*\(CodeBuddy\)\n2\. [^\n]*\n3\. [^\n]*/g,
    '**Example:** To read the auth-tool reference, simply open `references/auth-tool/README.md`'
  );

  // Clean up any remaining "{rule-name}" notation explanations
  content = content.replace(
    /When you see `\{rule-name\}` notation in this document,[^\n]*/g,
    'All reference files are located in the `references/` directory.'
  );

  // Replace rules/ paths with references/ paths
  content = content.replace(/rules\/([a-z-]+)\/rule\.md/g, `references/$1/${subSkillFile}`);
  // Replace `{skill-name}` notation with references path, but skip placeholder `{rule-name}`
  content = content.replace(/`\{([a-z-]+)\}`/g, (match, name) => {
    if (name === 'rule-name') {
      return match; // Keep placeholder as-is
    }
    return `\`references/${name}/${subSkillFile}\``;
  });

  return SKILL_FRONTMATTER + content;
}

// Recursively copy directory with optional SKILL.md rename
function copyDir(src: string, dest: string, renameSkillMd: boolean): void {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    let destName = entry.name;

    // Rename SKILL.md to README.md if requested
    if (renameSkillMd && entry.name === 'SKILL.md') {
      destName = SUB_SKILL_FILENAME.noSubSkill;
    }

    const destPath = path.join(dest, destName);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath, renameSkillMd);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Main function
async function main() {
  const { targetDir, noSubSkill } = parseArgs();
  const outputDir = path.join(targetDir, 'cloudbase');
  const referencesDir = path.join(outputDir, 'references');

  console.log('🔧 Building All-in-One CloudBase Skill...\n');
  console.log(`📂 Source: ${TOOLKIT_ROOT}`);
  console.log(`📂 Target: ${outputDir}`);
  if (noSubSkill) {
    console.log(`🔄 Mode: --no-sub-skill (SKILL.md → README.md)`);
  }
  console.log('');

  // 1. Find all available skills
  const skillsSourceDir = path.join(TOOLKIT_ROOT, SOURCES.skillsDir);
  const allSkills = fs.readdirSync(skillsSourceDir)
    .filter(name => {
      const skillPath = path.join(skillsSourceDir, name);
      return fs.statSync(skillPath).isDirectory() &&
             !EXCLUDE_SKILLS.includes(name) &&
             fs.existsSync(path.join(skillPath, 'SKILL.md'));
    });

  console.log(`📦 Found ${allSkills.length} skills to bundle\n`);

  // 2. Create output directory (clean if exists)
  if (fs.existsSync(outputDir)) {
    fs.rmSync(outputDir, { recursive: true });
  }
  fs.mkdirSync(referencesDir, { recursive: true });

  // 3. Generate and write main SKILL.md
  const mdcPath = path.join(TOOLKIT_ROOT, SOURCES.mainRules);
  const mdcContent = fs.readFileSync(mdcPath, 'utf-8');
  const skillContent = convertMdcToSkill(mdcContent, noSubSkill);

  fs.writeFileSync(path.join(outputDir, 'SKILL.md'), skillContent);
  console.log('✅ Created: cloudbase/SKILL.md');

  // 4. Copy all sub-skills to references/
  const subSkillFile = noSubSkill ? SUB_SKILL_FILENAME.noSubSkill : SUB_SKILL_FILENAME.default;
  for (const skillName of allSkills) {
    const srcPath = path.join(skillsSourceDir, skillName);
    const destPath = path.join(referencesDir, skillName);
    copyDir(srcPath, destPath, noSubSkill);
    console.log(`📋 Copied: references/${skillName}/ (entry: ${subSkillFile})`);
  }

  console.log(`\n✨ Done! All-in-One skill created at: ${outputDir}`);
  console.log(`   Total: 1 main SKILL.md + ${allSkills.length} reference docs`);
  if (noSubSkill) {
    console.log(`   Note: Sub-skill SKILL.md files renamed to README.md for spec compliance`);
  }
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});

