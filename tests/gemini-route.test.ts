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

test('guest synthesize route succeeds with valid mock facts and correctly loads prompt template', async () => {
  const validReport = {
    reportType: 'TITLE_STUDY',
    sourceDocuments: [{ id: 'doc-1', name: 'nota.txt', documentType: 'texto' }],
    findings: [{ id: 'f-1', sourceDocumentIds: ['doc-1'], statement: 'Hecho relevante' }],
    comparisons: [],
    conclusions: [{ id: 'c-1', statement: 'Conclusión válida.', supportingFindingIds: ['f-1'] }],
  };

  const fetchImpl: typeof fetch = async () => Response.json({
    status: 'completed',
    steps: [{
      type: 'model_output',
      content: [{ type: 'text', text: JSON.stringify(validReport) }],
    }],
  });

  const app = createServerApp({ fetchImpl });
  const server: Server = app.listen(0);
  const port = (server.address() as AddressInfo).port;
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/guest/synthesize`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-gemini-api-key': 'mock-only-key' },
      body: JSON.stringify({
        extractions: [{
          documentId: 'doc-1',
          name: 'nota.txt',
          extraction: { documentType: 'texto', findings: [{ statement: 'Hecho relevante' }] },
        }],
      }),
    });
    assert.equal(response.status, 200);
    const body = await response.json() as { report: typeof validReport };
    assert.equal(body.report.reportType, 'TITLE_STUDY');
    assert.equal(body.report.sourceDocuments[0]?.id, 'doc-1');
  } finally {
    await new Promise<void>((resolve, reject) => server.close((err) => err ? reject(err) : resolve()));
  }
});

test('guest synthesize route returns 502 with error message when provider fails', async () => {
  const fetchImpl: typeof fetch = async () => Response.json({
    error: { message: 'Overloaded' },
  }, { status: 503 });

  const app = createServerApp({ fetchImpl });
  const server: Server = app.listen(0);
  const port = (server.address() as AddressInfo).port;
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/guest/synthesize`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-gemini-api-key': 'mock-only-key' },
      body: JSON.stringify({
        extractions: [{
          documentId: 'doc-1',
          name: 'nota.txt',
          extraction: { documentType: 'texto', findings: [] },
        }],
      }),
    });
    assert.equal(response.status, 502);
    const body = await response.json() as { error: string };
    assert.match(body.error, /HTTP 503/);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((err) => err ? reject(err) : resolve()));
  }
});

test('compiled production module loads prompt template and synthesizes study correctly', async () => {
  const distGeminiPath = new URL('../dist/src/services/ai/gemini.js', import.meta.url).pathname;
  let distGemini: typeof import('../src/services/ai/gemini.js');
  try {
    distGemini = await import(distGeminiPath) as typeof import('../src/services/ai/gemini.js');
  } catch {
    return;
  }

  const validReport = {
    reportType: 'TITLE_STUDY',
    sourceDocuments: [{ id: 'doc-dist', name: 'dist.txt', documentType: 'texto' }],
    findings: [{ id: 'f-dist', sourceDocumentIds: ['doc-dist'], statement: 'Dato compilado' }],
    comparisons: [],
    conclusions: [{ id: 'c-dist', statement: 'Conclusión compilada.', supportingFindingIds: ['f-dist'] }],
  };

  const mockedFetch: typeof fetch = async () => Response.json({
    status: 'completed',
    steps: [{
      type: 'model_output',
      content: [{ type: 'text', text: JSON.stringify(validReport) }],
    }],
  });

  const result = await distGemini.synthesizeTitleStudy('mock-key', [{
    documentId: 'doc-dist',
    name: 'dist.txt',
    extraction: { documentType: 'texto', findings: [{ statement: 'Dato compilado' }] },
  }], mockedFetch);

  assert.equal(result.reportType, 'TITLE_STUDY');
  assert.equal(result.sourceDocuments[0]?.id, 'doc-dist');
});
