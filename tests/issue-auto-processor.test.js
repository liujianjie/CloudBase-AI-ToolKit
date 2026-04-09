import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { expect, test } from 'vitest';
import issueAutoProcessorHelpers from '../scripts/issue-auto-processor.cjs';

const { extractResultText, parseIssueCommentCommand, buildAnalysisPrompt } = issueAutoProcessorHelpers;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const WORKFLOW_FILE = path.join(
  ROOT_DIR,
  '.github',
  'workflows',
  'issue-auto-processor-simple.yml',
);

test('extractResultText returns result from top-level object payload', () => {
  const raw = JSON.stringify({ result: 'Structured response' });

  expect(extractResultText(raw)).toBe('Structured response');
});

test('extractResultText returns latest assistant text from array payload', () => {
  const raw = JSON.stringify([
    { type: 'system', message: { role: 'system', content: [{ type: 'text', text: 'ignore me' }] } },
    { type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text: 'First reply' }] } },
    { type: 'result', result: 'Final reply' },
  ]);

  expect(extractResultText(raw)).toBe('Final reply');
});

test('extractResultText falls back to plain text output', () => {
  expect(extractResultText('plain text output')).toBe('plain text output');
});

test('parseIssueCommentCommand only accepts maintainer slash commands', () => {
  expect(
    parseIssueCommentCommand({
      body: '/cloudbase continue',
      authorAssociation: 'MEMBER',
      hasPullRequest: false,
    }),
  ).toEqual({ action: 'continue', command: '/cloudbase continue' });

  expect(
    parseIssueCommentCommand({
      body: '/cloudbase fix',
      authorAssociation: 'CONTRIBUTOR',
      hasPullRequest: false,
    }),
  ).toBeNull();

  expect(
    parseIssueCommentCommand({
      body: '/cloudbase skip',
      authorAssociation: 'OWNER',
      hasPullRequest: true,
    }),
  ).toBeNull();
});

test('buildAnalysisPrompt includes issue comments for continue runs', () => {
  const prompt = buildAnalysisPrompt({
    number: 488,
    title: 'MCP工具错误: writeNoSqlDatabaseStructure',
    url: 'https://github.com/TencentCloudBase/CloudBase-MCP/issues/488',
    body: '工具执行时报错。',
    labels: ['bug'],
    requestedAction: 'continue',
    command: '/cloudbase continue',
    comments: [
      {
        author: 'github-actions[bot]',
        authorAssociation: 'NONE',
        createdAt: '2026-04-09T06:59:49Z',
        body: '## 🤖 AI Analysis\n\n---\nGenerated automatically by CodeBuddy CLI headless mode.',
      },
      {
        author: 'booker',
        authorAssociation: 'MEMBER',
        createdAt: '2026-04-09T07:10:00Z',
        body: '/cloudbase continue',
      },
    ],
  });

  expect(prompt).toContain('Requested action: continue');
  expect(prompt).toContain('Issue comments:');
  expect(prompt).toContain('/cloudbase continue');
  expect(prompt).toContain('Generated automatically by CodeBuddy CLI headless mode.');
});

test('workflow listens for issue comments and keeps label state in sync during reruns', () => {
  const raw = fs.readFileSync(WORKFLOW_FILE, 'utf8');

  expect(raw).toContain('issue_comment:');
  expect(raw).toContain('parseIssueCommentCommand');
  expect(raw).toContain('requestedAction');
  expect(raw).toContain('sync_issue_json_label');
});
