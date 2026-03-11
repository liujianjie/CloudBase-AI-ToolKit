#!/usr/bin/env npx tsx
/**
 * Sync config/allinone/cloudbase to config/codebuddy-plugin/skills/cloudbase
 *
 * Usage:
 *   npx tsx scripts/sync-codebuddy-plugin.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'config', 'allinone', 'cloudbase');
const DEST = path.join(ROOT, 'config', 'codebuddy-plugin', 'skills', 'cloudbase');

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

function countFiles(dir: string): number {
  let count = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    count += entry.isDirectory() ? countFiles(path.join(dir, entry.name)) : 1;
  }
  return count;
}

function main(): void {
  console.log(`SRC : ${SRC}`);
  console.log(`DEST: ${DEST}`);

  if (!fs.existsSync(SRC)) {
    console.error(`Error: source directory not found → ${SRC}`);
    process.exit(1);
  }

  if (fs.existsSync(DEST)) {
    fs.rmSync(DEST, { recursive: true, force: true });
  }

  copyDir(SRC, DEST);
  console.log(`Done: ${countFiles(DEST)} files copied`);
}

main();
