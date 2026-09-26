import assert from 'node:assert/strict';
import test from 'node:test';
import { fileIdentity, mergeSelectedFiles, removeSelectedFile, requestTitleStudyDocx, serializeSelectionUpdate } from '../src/pages/GuestDocumentsPage.js';

function makeFile(name: string, contents: string, type = 'application/octet-stream', lastModified = 1): File {
  return new File([contents], name, { type, lastModified });
}

test('retains multiple files regardless of extension or PDF signature and reports duplicates', () => {
  const pdf = makeFile('titulo.pdf', '%PDF-1.7 titulo', 'application/pdf');
  const falsePdf = makeFile('falso.pdf', 'texto sin cabecera', 'application/pdf');
  const sheet = makeFile('planilla.xlsx', 'not a real workbook');
  const result = mergeSelectedFiles([], [pdf, falsePdf, sheet]);
  assert.deepEqual(result.files, [pdf, falsePdf, sheet]);
  assert.deepEqual(result.duplicates, []);
  const merged = mergeSelectedFiles(result.files, [makeFile('falso.pdf', 'texto sin cabecera', 'application/pdf')]);
  assert.deepEqual(merged.files, result.files);
  assert.deepEqual(merged.duplicates, ['falso.pdf']);
});

test('removing one or all selections permits selecting the same file again', () => {
  const first = makeFile('titulo.pdf', '%PDF-1.7', 'application/pdf');
  const second = makeFile('notas.txt', 'texto', 'text/plain');
  const selected = mergeSelectedFiles([], [first, second]).files;
  assert.deepEqual(removeSelectedFile(selected, fileIdentity(first)), [second]);
  assert.deepEqual(mergeSelectedFiles([], [first]).files, [first]);
  assert.deepEqual(removeSelectedFile(selected, fileIdentity(first)), [second]);
  assert.deepEqual(removeSelectedFile([second], fileIdentity(second)), []);
});

test('a removal queued during async selection update runs after it and does not restore the removed file', async () => {
  const existing = makeFile('existente.pdf', '%PDF-1.7');
  const incoming = makeFile('nuevo.pdf', '%PDF-1.7');
  let selected = [existing];
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const errors: unknown[] = [];
  let pending = Promise.resolve();
  pending = serializeSelectionUpdate(pending, async () => { const current = selected; await gate; selected = mergeSelectedFiles(current, [incoming]).files; }, (e) => errors.push(e));
  pending = serializeSelectionUpdate(pending, async () => { selected = removeSelectedFile(selected, fileIdentity(existing)); }, (e) => errors.push(e));
  release();
  await pending;
  assert.deepEqual(errors, []);
  assert.deepEqual(selected, [incoming]);
});


test('DOCX download helper sends only the validated report and no Gemini credentials', async () => {
  const report = {
    reportType: 'TITLE_STUDY' as const,
    sourceDocuments: [{ id: 'doc-1', name: 'titulo.pdf', documentType: 'Documento' }],
  };
  let capturedUrl = '';
  let capturedInit: RequestInit | undefined;
  const fetchImpl: typeof fetch = async (input, init) => {
    capturedUrl = String(input);
    capturedInit = init;
    return new Response(new Uint8Array([0x50, 0x4b, 0x03, 0x04]), {
      status: 200,
      headers: { 'content-type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
    });
  };

  const blob = await requestTitleStudyDocx(report, fetchImpl);
  assert.equal(capturedUrl, '/api/guest/report-docx');
  assert.equal(capturedInit?.method, 'POST');
  const headers = new Headers(capturedInit?.headers);
  assert.equal(headers.get('content-type'), 'application/json');
  assert.equal(headers.has('x-gemini-api-key'), false);
  assert.equal(headers.has('x-gemini-key-alias'), false);
  assert.equal(headers.has('x-gemini-alias-access-token'), false);
  assert.deepEqual(JSON.parse(String(capturedInit?.body)), { report });
  assert.equal(blob.type, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
});

test('DOCX download helper reports server failure instead of simulating a file', async () => {
  const report = {
    reportType: 'TITLE_STUDY' as const,
    sourceDocuments: [{ id: 'doc-1', name: 'titulo.pdf', documentType: 'Documento' }],
  };
  const fetchImpl: typeof fetch = async () => Response.json({ error: 'No fue posible generar el informe DOCX.' }, { status: 500 });
  await assert.rejects(() => requestTitleStudyDocx(report, fetchImpl), /No fue posible generar el informe DOCX/);
});
