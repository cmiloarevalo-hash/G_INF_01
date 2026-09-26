import test from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createServerApp } from '../server.js';

const file = (id: string, name: string, content: string, size = Buffer.byteLength(content)) => ({ id, name, mimeType: 'text/plain', size, data: Buffer.from(content).toString('base64') });
const sample = file('doc-1', 'nota.txt', 'texto');
const report = { reportType: 'TITLE_STUDY', sourceDocuments: [{ id: 'doc-1', name: 'nota.txt', documentType: 'texto' }], findings: [], comparisons: [] };
const reply = (value: unknown) => Response.json({ status: 'completed', steps: [{ type: 'model_output', content: [{ type: 'text', text: JSON.stringify(value) }] }] });
async function withServer(fetchImpl: typeof fetch, run: (root: string) => Promise<void>) {
  const server: Server = createServerApp({ fetchImpl }).listen(0);
  try { await run(`http://127.0.0.1:${(server.address() as AddressInfo).port}`); }
  finally { await new Promise<void>((resolve, reject) => server.close((err) => err ? reject(err) : resolve())); }
}
const send = (root: string, files: unknown[]) => fetch(root + '/api/guest/analyze', { method: 'POST', headers: { 'content-type': 'application/json', 'x-gemini-api-key': 'mock-key' }, body: JSON.stringify({ files }) });

test('single route sends supported source once and returns validated report without exposing key', async () => {
  let calls = 0;
  await withServer(async (_url, init) => {
    calls++;
    assert.equal(new Headers(init?.headers).get('x-goog-api-key'), 'mock-key');
    assert.equal(String(init?.body).includes('mock-key'), false);
    return reply(report);
  }, async (root) => {
    const response = await send(root, [sample]);
    assert.equal(response.status, 200);
    const body = await response.json() as { report: typeof report; statuses: Array<{ status: string; submissionAttempted: boolean; sourceIdentified: boolean; contentVerified: boolean; reason: string }> };
    assert.equal(body.report.reportType, 'TITLE_STUDY');
    assert.equal(body.statuses[0]?.status, 'Fuente identificada');
    assert.deepEqual([body.statuses[0]?.submissionAttempted, body.statuses[0]?.sourceIdentified, body.statuses[0]?.contentVerified], [true, true, false]);
    assert.match(body.statuses[0]?.reason ?? '', /no le atribuye hallazgos/);
    assert.equal(JSON.stringify(body).includes('mock-key'), false);
    assert.equal((await fetch(root + '/api/guest/extract', { method: 'POST' })).status, 404);
    assert.equal((await fetch(root + '/api/guest/synthesize', { method: 'POST' })).status, 404);
  });
  assert.equal(calls, 1);
});

test('server rejects count and size overages before provider call, preserving causes', async () => {
  let calls = 0;
  await withServer(async () => { calls++; return reply(report); }, async (root) => {
    const many = await send(root, Array.from({ length: 21 }, (_, index) => file(`doc-${index}`, 'x.txt', 'x')));
    assert.equal(many.status, 413);
    assert.match((await many.json() as { error: string }).error, /20 archivos/);
    const tooBig = await send(root, [file('big', 'x.txt', 'x', 50_000_001)]);
    assert.equal(tooBig.status, 413);
    assert.match((await tooBig.json() as { error: string }).error, /50000000 bytes/);
    const unsupported = await send(root, [file('sheet', 'sheet.xlsx', 'x')]);
    assert.equal(unsupported.status, 422);
    assert.match((await unsupported.json() as { statuses: Array<{ reason: string }> }).statuses[0]?.reason ?? '', /Formato aún no procesado/);
    assert.equal(calls, 0);
  });
});

test('the allowed boundary of 20 selected compatible files reaches one provider call', async () => {
  const files = Array.from({ length: 20 }, (_, index) => file(`doc-${index + 1}`, `doc-${index + 1}.txt`, 'x'));
  let calls = 0;
  await withServer(async () => {
    calls++;
    return reply({ reportType: 'TITLE_STUDY', sourceDocuments: files.map(({ id, name }) => ({ id, name, documentType: 'texto' })), findings: [], comparisons: [] });
  }, async (root) => {
    const response = await send(root, files);
    assert.equal(response.status, 200);
    const body = await response.json() as { statuses: Array<{ status: string; contentVerified: boolean; reason: string }> };
    assert.equal(body.statuses.length, 20);
    assert.ok(body.statuses.every(({ status, contentVerified, reason }) => status === 'Fuente identificada' && !contentVerified && /no le atribuye hallazgos/.test(reason)));
  });
  assert.equal(calls, 1);
});

test('provider failure and invalid output cause 502 with no successful file states', async () => {
  for (const upstream of [async () => Response.json({ error: { message: 'Unavailable' } }, { status: 503 }), async () => reply({ reportType: 'TITLE_STUDY', sourceDocuments: [] })] as Array<typeof fetch>) {
    await withServer(upstream, async (root) => {
      const response = await send(root, [sample]);
      assert.equal(response.status, 502);
      const body = await response.json() as { report?: unknown; error: string; statuses: Array<{ status: string; sourceIdentified: boolean; contentVerified: boolean }> };
      assert.equal(body.report, undefined);
      assert.equal(body.statuses[0]?.status, 'No analizado');
      assert.equal(body.statuses[0]?.sourceIdentified, false);
      assert.equal(body.statuses[0]?.contentVerified, false);
    });
  }
});

test('compiled production module loads prompt and validates a one-call result', async () => {
  const distGemini = await import(new URL('../dist/src/services/ai/gemini.js', import.meta.url).href) as typeof import('../src/services/ai/gemini.js');
  const result = await distGemini.analyzeGuestDocuments('mock-key', [sample], async () => reply(report));
  assert.equal(result.report?.reportType, 'TITLE_STUDY');
  assert.equal(result.statuses[0]?.status, 'Fuente identificada');
  assert.equal(result.statuses[0]?.contentVerified, false);
});
