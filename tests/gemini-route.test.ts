import test from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createServerApp } from '../server.js';

test('guest extract route forwards the session key only as provider header and returns validated mock facts', async () => {
  let upstreamKey = '';
  let upstreamBody = '';
  const fetchImpl: typeof fetch = async (_input, init) => {
    upstreamKey = new Headers(init?.headers).get('x-goog-api-key') ?? '';
    upstreamBody = String(init?.body);
    return Response.json({ status: 'completed', output_text: JSON.stringify({ documentType: 'texto', findings: [] }) });
  };
  const app = createServerApp({ fetchImpl });
  const server: Server = app.listen(0);
  const port = (server.address() as AddressInfo).port;
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/guest/extract`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-gemini-api-key': 'mock-only-key' },
      body: JSON.stringify({ id: 'doc-1', name: 'nota.txt', mimeType: 'text/plain', size: 5, data: Buffer.from('texto').toString('base64') }),
    });
    assert.equal(response.status, 200);
    assert.equal(upstreamKey, 'mock-only-key');
    assert.equal(upstreamBody.includes('mock-only-key'), false);
    assert.deepEqual(await response.json(), { documentId: 'doc-1', name: 'nota.txt', extraction: { documentType: 'texto', findings: [] } });
  } finally {
    await new Promise<void>((resolve, reject) => server.close((err) => err ? reject(err) : resolve()));
  }
});

test('guest extract route reports unsupported files without calling Gemini', async () => {
  let called = false;
  const fetchImpl: typeof fetch = async () => { called = true; return Response.json({}); };
  const server = createServerApp({ fetchImpl }).listen(0);
  const port = (server.address() as AddressInfo).port;
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/guest/extract`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-gemini-api-key': 'mock-only-key' },
      body: JSON.stringify({ id: 'doc-1', name: 'modelo.xlsx', mimeType: 'application/xlsx', size: 5, data: Buffer.from('sheet').toString('base64') }),
    });
    assert.equal(response.status, 422);
    assert.equal((await response.json() as { code: string }).code, 'FILE_NOT_ANALYZABLE');
    assert.equal(called, false);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((err) => err ? reject(err) : resolve()));
  }
});
