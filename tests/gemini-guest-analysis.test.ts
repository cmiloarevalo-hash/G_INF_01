import test from 'node:test';
import assert from 'node:assert/strict';
import { extractGuestDocument, extractInteractionOutputText, GEMINI_INTERACTIONS_URL, GEMINI_MODEL, synthesizeTitleStudy, toGeminiJsonSchema } from '../src/services/ai/gemini.js';

const b64 = (text: string) => Buffer.from(text, 'utf8').toString('base64');
const report = {
  reportType: 'TITLE_STUDY',
  sourceDocuments: [
    { id: 'doc-a', documentType: 'escritura', name: 'a.txt' },
    { id: 'doc-b', documentType: 'certificado', name: 'b.txt' },
  ],
  findings: [
    { id: 'finding-a', statement: 'El precio indicado es 100.', sourceDocumentIds: ['doc-a'], values: [{ documentId: 'doc-a', field: 'precio', original: '100' }] },
    { id: 'finding-b', statement: 'El precio indicado es 120.', sourceDocumentIds: ['doc-b'], values: [{ documentId: 'doc-b', field: 'precio', original: '120' }] },
  ],
  comparisons: [{ id: 'comparison-a', field: 'precio', result: 'DIFFERENT', values: [
    { documentId: 'doc-a', field: 'precio', original: '100' },
    { documentId: 'doc-b', field: 'precio', original: '120' },
  ], explanation: 'Los documentos indican valores distintos.' }],
};

test('extracts one actual PDF payload with Gemini and keeps the key out of the body', async () => {
  let requestBody = '';
  let requestKey = '';
  const mockedFetch: typeof fetch = async (input, init) => {
    assert.equal(input, GEMINI_INTERACTIONS_URL);
    requestBody = String(init?.body);
    requestKey = new Headers(init?.headers).get('x-goog-api-key') ?? '';
    return Response.json({ status: 'completed', output_text: JSON.stringify({ documentType: 'escritura', findings: [] }) });
  };
  const result = await extractGuestDocument('mock-session-key', {
    id: 'doc-pdf', name: 'titulo.pdf', mimeType: 'application/pdf', size: Buffer.byteLength('%PDF-1.7 texto'), data: b64('%PDF-1.7 texto'),
  }, mockedFetch);
  assert.equal(result.documentId, 'doc-pdf');
  assert.equal(result.extraction.documentType, 'escritura');
  assert.equal(requestKey, 'mock-session-key');
  assert.equal(requestBody.includes('mock-session-key'), false);
  const payload = JSON.parse(requestBody) as { model: string; input: Array<{ type: string; mime_type?: string; data?: string }>; store: boolean };
  assert.equal(payload.model, GEMINI_MODEL);
  assert.equal(payload.store, false);
  assert.equal(payload.input[1]?.type, 'document');
  assert.equal(payload.input[1]?.mime_type, 'application/pdf');
  assert.equal(payload.input[1]?.data, b64('%PDF-1.7 texto'));
  const responseSchema = (JSON.parse(requestBody) as { response_format: { schema: { $schema?: string; properties: Record<string, unknown> } } }).response_format.schema;
  assert.equal(responseSchema.$schema, undefined);
  assert.ok(responseSchema.properties.documentType);
});

test('preserves a document difference in a validated multi-document TITLE_STUDY', async () => {
  let finalPayload = '';
  const mockedFetch: typeof fetch = async (_input, init) => {
    finalPayload = String(init?.body);
    return Response.json({ status: 'completed', output_text: JSON.stringify(report) });
  };
  const result = await synthesizeTitleStudy('session-only-key', [
    { documentId: 'doc-a', name: 'a.txt', extraction: { documentType: 'escritura', findings: [{ statement: 'Precio 100', values: [{ field: 'precio', original: '100' }] }] } },
    { documentId: 'doc-b', name: 'b.txt', extraction: { documentType: 'certificado', findings: [{ statement: 'Precio 120', values: [{ field: 'precio', original: '120' }] }] } },
  ], mockedFetch);
  assert.equal(result.comparisons?.[0]?.result, 'DIFFERENT');
  assert.equal(result.comparisons?.[0]?.values[0]?.original, '100');
  assert.equal(result.comparisons?.[0]?.values[1]?.original, '120');
  assert.match(finalPayload, /sin ocultar discrepancias/i);
});

test('uses the real image MIME and decoded UTF-8 text input for supported files', async () => {
  const inputs: Array<Array<{ type: string; mime_type?: string; data?: string; text?: string }>> = [];
  const mockedFetch: typeof fetch = async (_input, init) => {
    inputs.push((JSON.parse(String(init?.body)) as { input: Array<{ type: string; mime_type?: string; data?: string; text?: string }> }).input);
    return Response.json({ status: 'completed', output_text: JSON.stringify({ documentType: 'antecedente', findings: [] }) });
  };
  const png = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);
  await extractGuestDocument('mock-key', { id: 'image', name: 'plano.png', mimeType: 'image/png', size: png.length, data: Buffer.from(png).toString('base64') }, mockedFetch);
  const text = 'Rol: 123-45';
  await extractGuestDocument('mock-key', { id: 'text', name: 'datos.md', mimeType: 'text/markdown', size: Buffer.byteLength(text), data: b64(text) }, mockedFetch);
  assert.deepEqual(inputs[0]?.[1], { type: 'image', data: Buffer.from(png).toString('base64'), mime_type: 'image/png' });
  assert.match(inputs[1]?.[1]?.text ?? '', /Rol: 123-45/);
});

test('rejects a syntactically valid report that omits one successfully extracted document', async () => {
  const incompleteReport = { ...report, sourceDocuments: report.sourceDocuments.slice(0, 1), findings: [], comparisons: [] };
  const mockedFetch: typeof fetch = async () => Response.json({ status: 'completed', output_text: JSON.stringify(incompleteReport) });
  await assert.rejects(synthesizeTitleStudy('mock-key', [
    { documentId: 'doc-a', name: 'a.txt', extraction: { documentType: 'escritura', findings: [] } },
    { documentId: 'doc-b', name: 'b.txt', extraction: { documentType: 'certificado', findings: [] } },
  ], mockedFetch), /omitió o agregó documentos fuente/);
});

test('rejects an unsupported XLSX as not analyzable without sending it to Gemini', async () => {
  let called = false;
  const mockedFetch: typeof fetch = async () => { called = true; return Response.json({}); };
  await assert.rejects(extractGuestDocument('mock-key', {
    id: 'sheet-1', name: 'planilla.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', size: 4, data: b64('xlsx'),
  }, mockedFetch), /Formato aún no procesado/);
  assert.equal(called, false);
});

test('rejects malformed structured output and surfaces provider quota failures without a fake report', async () => {
  const malformed: typeof fetch = async () => Response.json({ status: 'completed', output_text: '{"reportType":"TITLE_STUDY"' });
  await assert.rejects(synthesizeTitleStudy('mock-key', [
    { documentId: 'doc-a', name: 'a.txt', extraction: { documentType: 'texto', findings: [] } },
  ], malformed), /JSON inválido o truncado/);
  const quota: typeof fetch = async () => Response.json({ error: { message: 'quota exceeded for mock-key' } }, { status: 429 });
  await assert.rejects(extractGuestDocument('mock-key', {
    id: 'doc-a', name: 'a.txt', mimeType: 'text/plain', size: 5, data: b64('texto'),
  }, quota), (error: unknown) => error instanceof Error && /cuota o límite de solicitudes/.test(error.message) && !error.message.includes('mock-key'));
  const timedOut: typeof fetch = async () => { throw new DOMException('timeout', 'TimeoutError'); };
  await assert.rejects(extractGuestDocument('mock-key', {
    id: 'doc-a', name: 'a.txt', mimeType: 'text/plain', size: 5, data: b64('texto'),
  }, timedOut), /tiempo máximo de 120 segundos/);
});

test('converts JSON Schema constants to Gemini enum and removes the draft declaration', () => {
  assert.deepEqual(toGeminiJsonSchema({ $schema: 'draft', properties: { state: { const: 'ok' } } }), { properties: { state: { enum: ['ok'] } } });
});

test('consumes representative REST Interactions response extracting final model_output and ignoring thoughts', async () => {
  const representativeRestResponse = {
    status: 'completed',
    steps: [
      {
        type: 'thought',
        signature: 'mock-thought-signature-xyz',
      },
      {
        type: 'model_output',
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              documentType: 'Escritura Pública',
              findings: [{ statement: 'Compraventa celebrada en 2021.' }],
            }),
          },
        ],
      },
    ],
  };

  const mockedFetch: typeof fetch = async () => Response.json(representativeRestResponse);
  const result = await extractGuestDocument('mock-key', {
    id: 'doc-rest',
    name: 'escritura.txt',
    mimeType: 'text/plain',
    size: 5,
    data: b64('texto'),
  }, mockedFetch);

  assert.equal(result.extraction.documentType, 'Escritura Pública');
  assert.equal(result.extraction.findings[0]?.statement, 'Compraventa celebrada en 2021.');
});

test('rejects incomplete, missing, or invalid REST step structures without fake success', () => {
  assert.throws(
    () => extractInteractionOutputText({ status: 'incomplete', steps: [] }),
    /Gemini no entregó una respuesta completa/
  );

  assert.throws(
    () => extractInteractionOutputText({
      status: 'completed',
      steps: [{ type: 'thought', signature: 'some-thought' }],
    }),
    /Gemini no devolvió texto estructurado completo/
  );

  assert.throws(
    () => extractInteractionOutputText({
      status: 'completed',
      steps: [{ type: 'model_output', content: [] }],
    }),
    /Gemini no devolvió texto estructurado completo/
  );

  assert.throws(
    () => extractInteractionOutputText({
      status: 'completed',
      steps: [{ type: 'model_output', content: [{ type: 'text', text: '   \n  ' }] }],
    }),
    /Gemini no devolvió texto estructurado completo/
  );

  assert.throws(
    () => extractInteractionOutputText({ status: 'completed', steps: [] }),
    /Gemini no devolvió texto estructurado completo/
  );
});
