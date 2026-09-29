import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import { createServerApp } from '../server.js';

const inputFile = {
  id: 'doc-1',
  name: 'doc.txt',
  mimeType: 'text/plain',
  size: 5,
  data: Buffer.from('texto').toString('base64'),
};

const validReport = {
  reportType: 'TITLE_STUDY',
  sourceDocuments: [{
    id: 'doc-1',
    name: 'doc.txt',
    documentType: 'texto',
  }],
};

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

test('M4.5c analysis HTTP boundary forwards only supported provider/model/instruction', async () => {
  let providerBody: Record<string, unknown> | null = null;
  await withServer(async (_input, init) => {
    providerBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return Response.json({
      status: 'completed',
      output_text: JSON.stringify(validReport),
    });
  }, async (root) => {
    const response = await fetch(`${root}/api/guest/analyze`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-gemini-api-key': 'session-secret',
      },
      body: JSON.stringify({
        files: [inputFile],
        provider: 'gemini',
        model: 'gemini-3.6-flash',
        additionalInstruction: 'Prioriza diferencias registrales.',
      }),
    });

    assert.equal(response.status, 200);
    assert.equal(providerBody?.model, 'gemini-3.6-flash');
    const input = providerBody?.input as Array<{ text?: string }>;
    assert.equal(
      input.some((part) =>
        part.text ===
        'Instrucción adicional del usuario: Prioriza diferencias registrales.'
      ),
      true,
    );
    assert.equal(JSON.stringify(providerBody).includes('session-secret'), false);
  });
});

test('M4.5c rejects a provider/model not implemented before provider access', async () => {
  let calls = 0;
  await withServer(async () => {
    calls += 1;
    return Response.json({});
  }, async (root) => {
    const response = await fetch(`${root}/api/guest/analyze`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-gemini-api-key': 'session-secret',
      },
      body: JSON.stringify({
        files: [inputFile],
        provider: 'unimplemented-provider',
        model: 'unimplemented-model',
      }),
    });
    assert.equal(response.status, 400);
  });
  assert.equal(calls, 0);
});

test('M4.5c authenticated configuration contains no persistent credential storage', () => {
  const source = [
    '../src/pages/ApisModelsPage.tsx',
    '../src/services/application/product-runtime.tsx',
    '../src/services/application/http-analysis.ts',
  ].map((path) => readFileSync(new URL(path, import.meta.url), 'utf8')).join('\n');

  assert.doesNotMatch(source, /localStorage|sessionStorage|indexedDB/i);
  assert.doesNotMatch(source, /setDoc\([^)]*(api|key|credential)/i);
  assert.match(source, /SUPPORTED_AI_PROVIDER/);
  assert.match(source, /SUPPORTED_AI_MODEL/);
  assert.doesNotMatch(source, /openai|anthropic|openrouter/i);
});
