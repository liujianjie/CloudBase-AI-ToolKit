#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const VERSION_LINE_RE = /^version:\s*.+$/m;

function collectSkillFiles(rootDir) {
  const files = [];
  const skillsDir = path.join(rootDir, "config", "source", "skills");
  const guidelineFile = path.join(
    rootDir,
    "config",
    "source",
    "guideline",
    "cloudbase",
    "SKILL.md",
  );

  if (fs.existsSync(skillsDir)) {
    for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const skillFile = path.join(skillsDir, entry.name, "SKILL.md");
      if (fs.existsSync(skillFile)) {
        files.push(skillFile);
      }
    }
  }

  if (fs.existsSync(guidelineFile)) {
    files.push(guidelineFile);
  }

  return files;
}

function updateVersionInSkill(raw, version) {
  const nextLine = `version: ${version}`;
  if (VERSION_LINE_RE.test(raw)) {
    return raw.replace(VERSION_LINE_RE, nextLine);
  }

  if (!raw.startsWith("---\n")) {
    throw new Error("SKILL.md is missing YAML frontmatter");
  }

  const frontmatterEnd = raw.indexOf("\n---", 4);
  if (frontmatterEnd === -1) {
    throw new Error("SKILL.md has malformed YAML frontmatter");
  }

  return `${raw.slice(0, frontmatterEnd)}\n${nextLine}${raw.slice(frontmatterEnd)}`;
}

export function syncSkillVersions({ rootDir = ROOT_DIR, version } = {}) {
  const resolvedVersion =
    version || JSON.parse(fs.readFileSync(path.join(rootDir, "package.json"), "utf8")).version;

  if (!resolvedVersion) {
    throw new Error("Unable to determine release version for skill sync");
  }

  const updatedFiles = [];
  for (const file of collectSkillFiles(rootDir)) {
    const before = fs.readFileSync(file, "utf8");
    const after = updateVersionInSkill(before, resolvedVersion);
    if (after !== before) {
      fs.writeFileSync(file, after);
      updatedFiles.push(file);
    }
  }

  return { version: resolvedVersion, updatedFiles };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const argVersionIndex = process.argv.indexOf("--version");
  const cliVersion =
    argVersionIndex >= 0 && process.argv[argVersionIndex + 1]
      ? process.argv[argVersionIndex + 1]
      : undefined;

  const result = syncSkillVersions({ version: cliVersion });
  console.log(
    `Synced skill versions to ${result.version} across ${result.updatedFiles.length} files.`,
  );
}
