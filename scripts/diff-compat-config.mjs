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
const SOURCE_CONFIG_DIR = path.join(ROOT_DIR, "config");
const SOURCE_DIR = path.join(SOURCE_CONFIG_DIR, "source");
const EDITOR_CONFIG_DIR = path.join(SOURCE_DIR, "editor-config");
const BASELINE_FILE = path.join(EDITOR_CONFIG_DIR, "compat-baseline.json");

const LIVE_SOURCE_ROOTS = ["codebuddy-plugin"];
const EXTRA_EXPECTED_GENERATED = [
  "IFLOW.md",
  ".iflow/settings.json",
  "mcp.json",
  ".comate/rules/cloudbaase-rules.mdr",
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

function compareCompatSurface() {
  if (!fs.existsSync(BASELINE_FILE)) {
    throw new Error(`Compat baseline not found: ${BASELINE_FILE}`);
  }

  const baseline = JSON.parse(fs.readFileSync(BASELINE_FILE, "utf8"));
  const baselineFiles = Object.keys(baseline.files).sort();
  const liveSourceFiles = collectFiles(SOURCE_CONFIG_DIR, LIVE_SOURCE_ROOTS);
  const expectedFiles = [...baselineFiles, ...liveSourceFiles, ...EXTRA_EXPECTED_GENERATED].sort();
  const expectedHashes = {
    ...baseline.files,
    ...Object.fromEntries(
      liveSourceFiles.map((file) => [
        file,
        sha256(path.join(SOURCE_CONFIG_DIR, file)),
      ]),
    ),
    "IFLOW.md": sha256(path.join(EDITOR_CONFIG_DIR, "guides", "cloudbase-rules.mdc")),
    ".iflow/settings.json": sha256(path.join(EDITOR_CONFIG_DIR, "files", "iflow.settings.json")),
    "mcp.json": sha256(path.join(EDITOR_CONFIG_DIR, "files", "aider.mcp.json")),
    ".comate/rules/cloudbaase-rules.mdr": sha256(
      path.join(EDITOR_CONFIG_DIR, "guides", "cloudbase-rules.mdc"),
    ),
  };

  const generatedFiles = collectFiles(
    GENERATED_CONFIG_DIR,
    [...baseline.roots, ...LIVE_SOURCE_ROOTS, "IFLOW.md", ".iflow", "mcp.json"],
  );

  const expectedSet = new Set(expectedFiles);
  const generatedSet = new Set(generatedFiles);

  const missingInGenerated = expectedFiles.filter((file) => !generatedSet.has(file));
  const extraInGenerated = generatedFiles.filter((file) => !expectedSet.has(file));
  const changedFiles = expectedFiles.filter((file) => {
    if (!generatedSet.has(file)) {
      return false;
    }
    return expectedHashes[file] !== sha256(path.join(GENERATED_CONFIG_DIR, file));
  });

  return {
    baselineRootCount: baseline.roots.length,
    missingInGenerated,
    extraInGenerated,
    changedFiles,
    hasDiff:
      missingInGenerated.length > 0 ||
      extraInGenerated.length > 0 ||
      changedFiles.length > 0,
  };
}

function printSection(title, items) {
  console.log(`\n${title}: ${items.length}`);
  for (const item of items.slice(0, 200)) {
    console.log(`- ${item}`);
  }
  if (items.length > 200) {
    console.log(`- ... and ${items.length - 200} more`);
  }
}

function main() {
  const shouldBuild = !process.argv.includes("--skip-build");

  if (shouldBuild) {
    buildCompatConfig();
  }

  const result = compareCompatSurface();

  console.log("Compatibility surface diff");
  console.log("==========================");
  console.log(`Baseline roots: ${result.baselineRootCount}`);
  console.log(`Live source roots: ${LIVE_SOURCE_ROOTS.length}`);
  console.log(`Has diff: ${result.hasDiff ? "YES" : "NO"}`);

  if (result.hasDiff) {
    printSection("Missing in generated", result.missingInGenerated);
    printSection("Extra in generated", result.extraInGenerated);
    printSection("Changed files", result.changedFiles);
    process.exit(1);
  }

  console.log("\nNo compatibility diffs found.");
}

main();
