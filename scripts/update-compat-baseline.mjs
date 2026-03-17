#!/usr/bin/env node

import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { buildCompatConfig } from "./build-compat-config.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

const GENERATED_CONFIG_DIR = path.join(ROOT_DIR, ".generated", "compat-config");
const BASELINE_FILE = path.join(
  ROOT_DIR,
  "config",
  "source",
  "editor-config",
  "compat-baseline.json",
);

const BASELINE_ROOTS = [
  ".agent",
  ".augment-guidelines",
  ".claude/commands",
  ".claude/settings.local.json",
  ".clinerules",
  ".codebuddy",
  ".codex",
  ".comate",
  ".cursor",
  ".gemini",
  ".github",
  ".kiro",
  ".lingma",
  ".mcp.json",
  ".opencode.json",
  ".qoder",
  ".qwen",
  ".roo",
  ".rules",
  ".trae",
  ".vscode",
  ".windsurf",
  "AGENTS.md",
  "CLAUDE.md",
  "CODEBUDDY.md",
  "rules",
];

function shouldSkip(name) {
  return name === ".DS_Store";
}

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function collectFiles(rootDir, roots) {
  const files = new Set();

  const walk = (relativePath) => {
    const fullPath = path.join(rootDir, relativePath);
    if (!fs.existsSync(fullPath)) {
      return;
    }

    const stats = fs.statSync(fullPath);
    if (stats.isFile()) {
      files.add(relativePath);
      return;
    }

    for (const entry of fs.readdirSync(fullPath, { withFileTypes: true })) {
      if (shouldSkip(entry.name)) {
        continue;
      }
      const nextRelative = path.join(relativePath, entry.name);
      if (entry.isDirectory()) {
        walk(nextRelative);
      } else if (entry.isFile()) {
        files.add(nextRelative);
      }
    }
  };

  for (const relativeRoot of roots) {
    walk(relativeRoot);
  }

  return [...files].sort();
}

function main() {
  buildCompatConfig({ outputDir: GENERATED_CONFIG_DIR });

  const files = collectFiles(GENERATED_CONFIG_DIR, BASELINE_ROOTS);
  const manifest = {
    generatedAt: new Date().toISOString(),
    roots: BASELINE_ROOTS,
    files: Object.fromEntries(
      files.map((relativePath) => [
        relativePath,
        sha256(path.join(GENERATED_CONFIG_DIR, relativePath)),
      ]),
    ),
  };

  fs.writeFileSync(BASELINE_FILE, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  console.log(`✅ Updated compat baseline: ${BASELINE_FILE}`);
  console.log(`📦 Files tracked: ${files.length}`);
}

main();
