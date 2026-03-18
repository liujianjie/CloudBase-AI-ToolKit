import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, expect, test } from 'vitest';
import { buildClawhubPublishArtifacts } from '../scripts/build-clawhub-publish-artifacts.mjs';

const tempDirs = [];
afterEach(() => {
  while (tempDirs.length > 0) {
    fs.rmSync(tempDirs.pop(), { recursive: true, force: true });
  }
});

test('buildClawhubPublishArtifacts builds miniprogram-development artifact', () => {
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'clawhub-publish-'));
  tempDirs.push(outputDir);

  const manifest = buildClawhubPublishArtifacts({
    targets: 'miniprogram-development',
    outputDir,
  });

  expect(manifest.targets).toHaveLength(1);
  expect(manifest.targets[0].targetKey).toBe('miniprogram-development');
  expect(
    fs.existsSync(path.join(outputDir, 'miniprogram-development', 'SKILL.md')),
  ).toBe(true);
  expect(fs.existsSync(path.join(outputDir, 'manifest.json'))).toBe(true);
});

test('buildClawhubPublishArtifacts builds all-in-one artifact', () => {
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'clawhub-allinone-'));
  tempDirs.push(outputDir);

  const manifest = buildClawhubPublishArtifacts({
    targets: 'all-in-one',
    outputDir,
  });

  expect(manifest.targets).toHaveLength(1);
  expect(manifest.targets[0].registrySlug).toBe('cloudbase');
  expect(fs.existsSync(path.join(outputDir, 'all-in-one', 'SKILL.md'))).toBe(true);
  expect(
    fs.existsSync(path.join(outputDir, 'all-in-one', 'references', 'auth-web', 'SKILL.md')),
  ).toBe(true);
});

test('buildClawhubPublishArtifacts rejects invalid targets', () => {
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'clawhub-invalid-'));
  tempDirs.push(outputDir);

  expect(() =>
    buildClawhubPublishArtifacts({
      targets: 'auth-web',
      outputDir,
    }),
  ).toThrow(/Unknown publish targets/);
});
