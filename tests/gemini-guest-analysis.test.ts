import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeGuestDocuments, extractInteractionOutputText, GEMINI_INTERACTIONS_URL, GEMINI_MODEL, toGeminiJsonSchema, type GuestDocumentInput } from '../src/services/ai/gemini.js';
import { MAX_GUEST_FILES, MAX_GUEST_TOTAL_BYTES, selectionLimitError } from '../src/shared/guest-limits.js';

const file = (id: string, name: string, text: string): GuestDocumentInput => ({ id, name, mimeType: 'text/plain', size: Buffer.byteLength(text), data: Buffer.from(text).toString('base64') });
const two = [file('doc-a', 'a.txt', 'Precio 100'), file('doc-b', 'b.md', 'Precio 120')];
const report = {
  reportType: 'TITLE_STUDY', sourceDocuments: [
    { id: 'doc-a', documentType: 'escritura', name: 'a.txt' },
    { id: 'doc-b', documentType: 'certificado', name: 'b.md' },
  ],
  findings: [
    { id: 'f-a', statement: 'Precio 100', sourceDocumentIds: ['doc-a'], values: [{ documentId: 'doc-a', field: 'precio', original: '100' }] },
    { id: 'f-b', statement: 'Precio 120', sourceDocumentIds: ['doc-b'], values: [{ documentId: 'doc-b', field: 'precio', original: '120' }] },
  ],
  comparisons: [{ id: 'c-1', field: 'precio', result: 'DIFFERENT', values: [
    { documentId: 'doc-a', field: 'precio', original: '100' }, { documentId: 'doc-b', field: 'precio', original: '120' },
  ], explanation: 'Valores distintos' }],
};
const completed = (value: unknown) => Response.json({ status: 'completed', steps: [{ type: 'thought', signature: 'ignore' }, { type: 'model_output', content: [{ type: 'text', text: JSON.stringify(value) }] }] });

test('two compatible files use exactly one provider request and retain a validated discrepancy', async () => {
  let calls = 0;
  const fetchImpl: typeof fetch = async (url, init) => {
    calls++;
    assert.equal(url, GEMINI_INTERACTIONS_URL);
    assert.equal(new Headers(init?.headers).get('x-goog-api-key'), 'mock-session-key');
    const body = String(init?.body);
    assert.equal(body.includes('mock-session-key'), false);
    const payload = JSON.parse(body) as { model: string; store: boolean; input: Array<{ text?: string }>; response_format: { schema: { $schema?: string } } };
    assert.equal(payload.model, GEMINI_MODEL);
    assert.equal(payload.store, false);
    assert.equal(payload.input.length, 5);
    assert.match(JSON.stringify(payload.input), /Precio 100/);
    assert.match(JSON.stringify(payload.input), /Precio 120/);
    assert.equal(payload.response_format.schema.$schema, undefined);
    return completed(report);
  };
  const result = await analyzeGuestDocuments('mock-session-key', two, fetchImpl);
  assert.equal(calls, 1);
  assert.equal(result.error, undefined);
  assert.equal(result.report?.comparisons?.[0]?.result, 'DIFFERENT');
  assert.deepEqual(result.statuses.map((s) => s.status), ['Fuente identificada', 'Fuente identificada']);
  assert.ok(result.statuses.every((s) => s.submissionAttempted && s.sourceIdentified && !s.contentVerified));
  assert.equal(result.partial, false);
});

test('only unsupported files cause zero provider requests; a mixed selection causes exactly one', async () => {
  let calls = 0;
  const fetchImpl: typeof fetch = async () => { calls++; return completed({ ...report, sourceDocuments: report.sourceDocuments.slice(0, 1), findings: [], comparisons: [] }); };
  const unsupported = file('doc-x', 'book.xlsx', 'sheet');
  const none = await analyzeGuestDocuments('mock', [unsupported], fetchImpl);
  assert.equal(calls, 0);
  assert.equal(none.report, undefined);
  assert.match(none.statuses[0]?.reason ?? '', /Formato aún no procesado/);
  const mixed = await analyzeGuestDocuments('mock', [two[0]!, unsupported], fetchImpl);
  assert.equal(calls, 1);
  assert.equal(mixed.statuses[0]?.status, 'Fuente identificada');
  assert.equal(mixed.statuses[0]?.contentVerified, false);
  assert.equal(mixed.statuses[1]?.status, 'No analizado');
  assert.equal(mixed.statuses[1]?.submissionAttempted, false);
  assert.equal(mixed.partial, true);
});

test('source identity without findings is not evidence of content analysis', async () => {
  let calls = 0;
  const result = await analyzeGuestDocuments('mock', [two[0]!], async () => {
    calls++;
    return completed({ reportType: 'TITLE_STUDY', sourceDocuments: [{ id: 'doc-a', name: 'a.txt', documentType: 'texto' }], findings: [], comparisons: [] });
  });
  assert.equal(calls, 1);
  assert.equal(result.report?.findings.length, 0);
  assert.equal(result.statuses[0]?.status, 'Fuente identificada');
  assert.deepEqual([result.statuses[0]?.submissionAttempted, result.statuses[0]?.sourceIdentified, result.statuses[0]?.contentVerified], [true, true, false]);
  assert.match(result.statuses[0]?.reason ?? '', /no demuestra lectura ni verificación/);
});

test('empty file, renamed PDF, images and Markdown retain MIME and honest causes', async () => {
  const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const image = { id: 'doc-png', name: 'plano.png', size: png.length, mimeType: 'image/png', data: png.toString('base64') };
  const inputs: unknown[] = [];
  const result = await analyzeGuestDocuments('mock', [image, file('doc-md', 'notas.markdown', 'Texto'), file('empty', 'zero.pdf', ''), file('fake', 'fake.pdf', 'no PDF')], async (_url, init) => {
    inputs.push((JSON.parse(String(init?.body)) as { input: unknown }).input);
    return completed({ ...report, sourceDocuments: [{ id: 'doc-png', name: 'plano.png', documentType: 'plano' }, { id: 'doc-md', name: 'notas.markdown', documentType: 'texto' }], findings: [], comparisons: [] });
  });
  assert.equal(inputs.length, 1);
  assert.match(JSON.stringify(inputs[0]), /image\/png/);
  assert.match(JSON.stringify(inputs[0]), /Texto/);
  assert.match(result.statuses[2]?.reason ?? '', /vacío \(0 B\)/);
  assert.match(result.statuses[3]?.reason ?? '', /firma PDF/);
  assert.equal(result.partial, true);
});

test('provider error, invalid JSON and missing source never mark a sent file analyzed', async () => {
  for (const fetchImpl of [
    async () => Response.json({ error: { message: 'quota mock-key' } }, { status: 429 }),
    async () => Response.json({ status: 'completed', output_text: '{' }),
    async () => completed({ ...report, sourceDocuments: report.sourceDocuments.slice(0, 1), findings: [], comparisons: [] }),
  ] as Array<typeof fetch>) {
    const result = await analyzeGuestDocuments('mock-key', two, fetchImpl);
    assert.equal(result.report, undefined);
    assert.ok(result.error);
    assert.deepEqual(result.statuses.map((s) => s.status), ['No analizado', 'No analizado']);
    assert.ok(result.statuses.every((s) => s.submissionAttempted && !s.sourceIdentified && !s.contentVerified));
    assert.ok(result.statuses.every((s) => /Se intentó enviar a Gemini; sin resultado validado/.test(s.reason ?? '')));
    assert.equal(JSON.stringify(result).includes('mock-key'), false);
  }
});

test('product boundary allows exactly 20 files and 50,000,000 original bytes; overages block', async () => {
  const atBoundary = Array.from({ length: MAX_GUEST_FILES }, () => ({ size: MAX_GUEST_TOTAL_BYTES / MAX_GUEST_FILES }));
  assert.equal(selectionLimitError(atBoundary), undefined);
  assert.match(selectionLimitError([...atBoundary, { size: 0 }]) ?? '', /20 archivos/);
  assert.match(selectionLimitError([{ size: MAX_GUEST_TOTAL_BYTES + 1 }]) ?? '', /50000000 bytes/);
  let calls = 0;
  const fetchImpl: typeof fetch = async () => { calls++; return completed(report); };
  const overCount = await analyzeGuestDocuments('mock', Array.from({ length: 21 }, (_, index) => file(`doc-${index}`, 'a.txt', 'x')), fetchImpl);
  const overSize = await analyzeGuestDocuments('mock', [{ ...two[0]!, size: MAX_GUEST_TOTAL_BYTES + 1 }], fetchImpl);
  assert.equal(calls, 0);
  assert.match(overCount.error ?? '', /20 archivos/);
  assert.match(overSize.error ?? '', /50000000 bytes/);
});

test('converts response schema and rejects incomplete REST output', () => {
  assert.deepEqual(toGeminiJsonSchema({ $schema: 'draft', properties: { state: { const: 'ok' } } }), { properties: { state: { enum: ['ok'] } } });
  assert.throws(() => extractInteractionOutputText({ status: 'completed', steps: [{ type: 'thought' }] }), /no devolvió texto/);
  assert.throws(() => extractInteractionOutputText({ status: 'incomplete', steps: [] }), /respuesta completa/);
});
