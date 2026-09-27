import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('roadmap workflow uses least privilege and required automatic triggers', async () => {
  const workflow = await readFile('.github/workflows/roadmap-status.yml', 'utf8');

  assert.match(workflow, /push:\s*\n\s*branches:\s*\n\s*- main/);
  assert.match(workflow, /issues:\s*\n\s*types:/);
  assert.match(workflow, /- opened/);
  assert.match(workflow, /- edited/);
  assert.match(workflow, /- closed/);
  assert.match(workflow, /- reopened/);
  assert.match(workflow, /workflow_dispatch:/);

  assert.match(workflow, /permissions:\s*\n\s*contents: read\s*\n\s*issues: write/);
  assert.doesNotMatch(workflow, /contents:\s*write/);
  assert.doesNotMatch(workflow, /pull-requests:\s*write|actions:\s*write|workflows?:\s*write/);
  assert.doesNotMatch(workflow, /git\s+(commit|push)/i);
  assert.match(workflow, /roadmap-status-generator\.ts --update-issue/);
});

test('roadmap generator updates only machine Issue #43 and does not write repository contents', async () => {
  const generator = await readFile('scripts/roadmap-status-generator.ts', 'utf8');

  assert.match(generator, /\/issues\/43/);
  assert.match(generator, /method: 'PATCH'/);
  assert.doesNotMatch(generator, /git\s+(commit|push)|contents\/|create.*commit/i);
});
