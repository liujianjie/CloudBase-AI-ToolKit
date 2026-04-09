import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, test } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const SOURCE_SKILLS_DIR = path.join(ROOT_DIR, 'config', 'source', 'skills');
const SKILL_AUTHORING_DIR = path.join(ROOT_DIR, 'skills', 'skill-authoring');

function readFile(...segments) {
  return fs.readFileSync(path.join(ROOT_DIR, ...segments), 'utf8');
}

function readSourceSkill(skillName) {
  return readFile('config', 'source', 'skills', skillName, 'SKILL.md');
}

describe('skill quality standards', () => {
  test('every source skill declares a normalized version field', () => {
    const skillDirs = fs
      .readdirSync(SOURCE_SKILLS_DIR, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);

    for (const skillName of skillDirs) {
      const raw = readSourceSkill(skillName);
      expect(raw).toMatch(/^version:\s+\d+\.\d+\.\d+(?:-[^\s]+)?$/m);
      expect(raw).not.toMatch(/^version:\s+v/m);
    }
  });

  test('auth-web stays web-only and fixes the known snippet issues', () => {
    const raw = readSourceSkill('auth-web');

    expect(raw).toContain('const auth = app.auth()');
    expect(raw).not.toContain('const { data, error } = const { data, error } =');
    expect(raw).not.toContain('## WeChat Mini Program');
    expect(raw).not.toContain('auth.signInWithOpenId');
    expect(raw).not.toContain('auth.signInWithPhoneAuth');
    expect(raw).toContain('auth.signUp({ username, password })');
    expect(raw).toContain('auth.signInWithPassword({ username, password })');
    expect(raw).toContain('type="text"');
    expect(raw).toContain('Do not switch to email OTP or phone OTP unless the task explicitly says');
  });

  test('cloud-storage-web documents exact-origin security-domain setup for local uploads', () => {
    const raw = readSourceSkill('cloud-storage-web');

    expect(raw).toContain('envQuery');
    expect(raw).toContain('envDomainManagement');
    expect(raw).toContain('127.0.0.1:4173');
    expect(raw).toContain('localhost:5173');
    expect(raw).toContain('app.uploadFile()');
    expect(raw).toContain('Browser origin `http://127.0.0.1:4173` -> whitelist entry `127.0.0.1:4173`');
  });

  test('cloudrun-development explains the MinNum cold-start tradeoff with a default of 1', () => {
    const raw = readSourceSkill('cloudrun-development');

    expect(raw).toContain('"MinNum": 1');
    expect(raw).toMatch(/cold start/i);
    expect(raw).toMatch(/cost/i);
  });

  test('cloudbase-agent does not force global activation by default', () => {
    const raw = readSourceSkill('cloudbase-agent');

    expect(raw).toContain('alwaysApply: false');
  });

  test('skill-authoring documents the repo-managed CloudBase skill review rules', () => {
    const mainSkill = readFile('skills', 'skill-authoring', 'SKILL.md');
    const reviewReference = readFile(
      'skills',
      'skill-authoring',
      'references',
      'cloudbase-skill-review.md',
    );

    expect(mainSkill).toContain('repo-managed CloudBase skill review');
    expect(reviewReference).toContain('frontmatter completeness');
    expect(reviewReference).toContain('examples stay in scope');
    expect(reviewReference).toContain('shared rules should have a single canonical source');
    expect(reviewReference).toContain('auth-nodejs');
  });
});
