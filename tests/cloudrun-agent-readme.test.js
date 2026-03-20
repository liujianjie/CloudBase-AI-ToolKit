import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

describe('CloudRun createAgent README template', () => {
  test('uses the latest CloudBase Web SDK CDN URL', () => {
    const cloudrunSource = fs.readFileSync(
      path.resolve(process.cwd(), 'mcp/src/tools/cloudrun.ts'),
      'utf8',
    );

    expect(cloudrunSource).toContain(
      'https://static.cloudbase.net/cloudbase-js-sdk/latest/cloudbase.full.js',
    );
    expect(cloudrunSource).not.toContain(
      '//static.cloudbase.net/cloudbase-js-sdk/2.9.0/cloudbase.full.js',
    );
  });
});
