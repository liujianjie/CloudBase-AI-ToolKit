#!/usr/bin/env npx tsx
/**
 * Build All-in-One CloudBase Skill
 *
 * Usage:
 *   npx tsx scripts/build-allinone-skill.ts --dir <target-directory>
 *
 * Example:
 *   npx tsx scripts/build-allinone-skill.ts --dir ~/my-project
 *   npx tsx scripts/build-allinone-skill.ts --dir ./my-app/.cursor/skills
 *
 * This will create:
 *   <target-directory>/cloudbase/
 *   ├── SKILL.md                    # Main skill entry
 *   └── references/                 # All sub-skills (copied)
 *       ├── auth-web/SKILL.md
 *       ├── no-sql-web-sdk/
 *       │   ├── SKILL.md
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

// Parse command line arguments
function parseArgs(): { targetDir: string } {
  const args = process.argv.slice(2);
  const dirIndex = args.indexOf('--dir');

  if (dirIndex === -1 || !args[dirIndex + 1]) {
    console.error('❌ Error: --dir argument is required\n');
    console.error('Usage: npx tsx scripts/build-allinone-skill.ts --dir <target-directory>\n');
    console.error('Example:');
    console.error('  npx tsx scripts/build-allinone-skill.ts --dir ~/my-project');
    console.error('  npx tsx scripts/build-allinone-skill.ts --dir ./my-app/.cursor/skills');
    process.exit(1);
  }

  return { targetDir: path.resolve(args[dirIndex + 1]) };
}

// Generate SKILL.md frontmatter
const SKILL_FRONTMATTER = `---
name: cloudbase
description: CloudBase AI Development - Complete toolkit for building Web, Mini Program, and Native App projects with CloudBase. Includes authentication, database (NoSQL/MySQL), cloud functions, CloudRun, storage, AI models, and UI design guidelines.
---

`;

// Convert .mdc content to SKILL.md format
function convertMdcToSkill(mdcContent: string): string {
  // Remove .mdc frontmatter
  let content = mdcContent.replace(/^---[\s\S]*?---\n/, '');

  // Replace rules/ paths with references/ paths
  content = content.replace(/rules\/([a-z-]+)\/rule\.md/g, 'references/$1/SKILL.md');
  // Replace `{skill-name}` notation with references path, but skip placeholder `{rule-name}`
  content = content.replace(/`\{([a-z-]+)\}`/g, (match, name) => {
    if (name === 'rule-name') {
      return match; // Keep placeholder as-is
    }
    return `\`references/${name}/SKILL.md\``;
  });

  return SKILL_FRONTMATTER + content;
}

// Recursively copy directory
function copyDir(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Main function
async function main() {
  const { targetDir } = parseArgs();
  const outputDir = path.join(targetDir, 'cloudbase');
  const referencesDir = path.join(outputDir, 'references');

  console.log('🔧 Building All-in-One CloudBase Skill...\n');
  console.log(`📂 Source: ${TOOLKIT_ROOT}`);
  console.log(`📂 Target: ${outputDir}\n`);

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
  const skillContent = convertMdcToSkill(mdcContent);

  fs.writeFileSync(path.join(outputDir, 'SKILL.md'), skillContent);
  console.log('✅ Created: cloudbase/SKILL.md');

  // 4. Copy all sub-skills to references/
  for (const skillName of allSkills) {
    const srcPath = path.join(skillsSourceDir, skillName);
    const destPath = path.join(referencesDir, skillName);
    copyDir(srcPath, destPath);
    console.log(`📋 Copied: references/${skillName}/`);
  }

  console.log(`\n✨ Done! All-in-One skill created at: ${outputDir}`);
  console.log(`   Total: 1 main SKILL.md + ${allSkills.length} reference skills`);
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});

