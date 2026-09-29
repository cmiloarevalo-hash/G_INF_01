import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import { createServerApp } from '../server.js';

async function withServer(
  providerFetch: typeof fetch,
  run: (root: string) => Promise<void>,
) {
  const server: Server = createServerApp({ fetchImpl: providerFetch }).listen(0);
  try {
    const address = server.address() as AddressInfo;
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => error ? reject(error) : resolve()),
    );
  }
}

test('M5.3 health remains process-only when provider is unavailable', async () => {
  await withServer(async () => {
    throw new Error('provider unavailable');
  }, async (root) => {
    const response = await fetch(`${root}/api/health`);
    assert.equal(response.status, 200);
    const body = await response.json() as { status: string };
    assert.equal(body.status, 'ok');
  });
});

test('M5.3 guest route remains compatible without authenticated options', async () => {
  const report = {
    reportType: 'TITLE_STUDY',
    sourceDocuments: [{
      id: 'doc-1',
      name: 'doc.txt',
      documentType: 'texto',
    }],
  };

  await withServer(async () => Response.json({
    status: 'completed',
    output_text: JSON.stringify(report),
  }), async (root) => {
    const response = await fetch(`${root}/api/guest/analyze`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-gemini-api-key': 'temporary-session-key',
      },
      body: JSON.stringify({
        files: [{
          id: 'doc-1',
          name: 'doc.txt',
          mimeType: 'text/plain',
          size: 5,
          data: Buffer.from('texto').toString('base64'),
        }],
      }),
    });

    assert.equal(response.status, 200);
    const body = await response.json() as { report?: { reportType?: string } };
    assert.equal(body.report?.reportType, 'TITLE_STUDY');
    assert.equal(JSON.stringify(body).includes('temporary-session-key'), false);
  });
});

test('M5.3 bounded Drive reads retain streaming/cancel guard', () => {
  const source = readFileSync(
    new URL('../src/services/drive/reference.ts', import.meta.url),
    'utf8',
  );

  assert.match(source, /body\.getReader\(\)/);
  assert.match(source, /reader\.cancel\(\)/);
  assert.match(source, /contentLength !== null && contentLength > maxBytes/);
  assert.doesNotMatch(source, /contentResponse\.arrayBuffer\(\)/);
});

test('M5.3 new authenticated product surfaces do not persist credentials', () => {
  const source = [
    '../src/pages/ApisModelsPage.tsx',
    '../src/pages/ProjectWorkspacePage.tsx',
    '../src/services/application/product-runtime.tsx',
    '../src/services/application/http-analysis.ts',
    '../src/services/firestore/firebase-ai-preferences.ts',
  ].map((path) => readFileSync(new URL(path, import.meta.url), 'utf8')).join('\n');

  assert.doesNotMatch(source, /localStorage|sessionStorage|indexedDB/i);
  assert.doesNotMatch(source, /driveFileId.*apiKey|apiKey.*driveFileId/i);
  assert.match(source, /provider: confirmed\.provider/);
  assert.match(source, /model: confirmed\.model/);
});

test('M5.3 regression suite retains duplicate, stale, authorization and partial-failure coverage', () => {
  const sources = [
    '../tests/project-analysis.test.ts',
    '../tests/authenticated-capabilities.test.ts',
    '../tests/drive-reference-browser.test.ts',
    '../tests/drive-upload.test.ts',
  ].map((path) => readFileSync(new URL(path, import.meta.url), 'utf8')).join('\n');

  assert.match(sources, /duplicate/i);
  assert.match(sources, /stale/i);
  assert.match(sources, /authorization-required/);
  assert.match(sources, /partial/i);
  assert.match(sources, /quota/i);
  assert.match(sources, /storage/i);
  assert.match(sources, /fake success/i);
});
