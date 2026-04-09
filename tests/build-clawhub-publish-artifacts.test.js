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
    fs.existsSync(
      path.join(
        outputDir,
        'miniprogram-development',
        'skills',
        'miniprogram-development',
        'SKILL.md',
      ),
    ),
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
  expect(
    fs.existsSync(path.join(outputDir, 'all-in-one', 'skills', 'cloudbase', 'SKILL.md')),
  ).toBe(true);
  expect(
    fs.existsSync(
      path.join(
        outputDir,
        'all-in-one',
        'skills',
        'cloudbase',
        'references',
        'auth-web',
        'SKILL.md',
      ),
    ),
  ).toBe(true);
});

test.each([
  'ui-design',
  'web-development',
  'spec-workflow',
])('buildClawhubPublishArtifacts builds %s local skill artifact', (targetKey) => {
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), `clawhub-${targetKey}-`));
  tempDirs.push(outputDir);

  const manifest = buildClawhubPublishArtifacts({
    targets: targetKey,
    outputDir,
  });

  expect(manifest.targets).toHaveLength(1);
  expect(manifest.targets[0].targetKey).toBe(targetKey);
  expect(manifest.targets[0].registrySlug).toBe(targetKey);
  if (targetKey === 'ui-design') {
    expect(manifest.targets[0].metadata.name).toBe('ui-design-guide');
  }
  if (targetKey === 'spec-workflow') {
    expect(manifest.targets[0].metadata.name).toBe('spec-workflow-guide');
  }
  expect(
    fs.existsSync(path.join(outputDir, targetKey, 'skills', targetKey, 'SKILL.md')),
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
