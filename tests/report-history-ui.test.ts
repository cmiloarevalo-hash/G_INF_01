import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createBrowserTitleStudyReportRenderer } from '../src/services/application/browser-report.js';

const report = {
  reportType: 'TITLE_STUDY' as const,
  sourceDocuments: [{ id: 'doc-1', name: 'doc.txt', documentType: 'texto' }],
};

test('M4.4b browser DOCX renderer sends only validated report and no credentials', async () => {
  let captured: RequestInit | undefined;
  const renderer = createBrowserTitleStudyReportRenderer(async (_input, init) => {
    captured = init;
    return new Response(new Uint8Array([0x50, 0x4b, 0x03, 0x04]), {
      status: 200,
      headers: {
        'content-type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      },
    });
  });

  const bytes = await renderer(report);
  assert.equal(bytes.byteLength, 4);
  const headers = new Headers(captured?.headers);
  assert.equal(headers.has('x-gemini-api-key'), false);
  assert.deepEqual(JSON.parse(String(captured?.body)), { report });
});

test('M4.4b browser DOCX renderer rejects server failure and wrong content type', async () => {
  await assert.rejects(
    createBrowserTitleStudyReportRenderer(async () =>
      Response.json({ error: 'render failed' }, { status: 500 }),
    )(report),
    /render failed/,
  );

  await assert.rejects(
    createBrowserTitleStudyReportRenderer(async () =>
      new Response('not-docx', {
        status: 200,
        headers: { 'content-type': 'text/plain' },
      }),
    )(report),
    /no contiene un DOCX confirmado/,
  );
});

test('M4.4c workspace exposes explicit history/reopen states without fake success', () => {
  const source = readFileSync(
    new URL('../src/pages/ProjectWorkspacePage.tsx', import.meta.url),
    'utf8',
  );
  assert.match(source, /metadata, pero su archivo Drive está obsoleto/);
  assert.match(source, /Drive requiere autorización para reabrir el análisis/);
  assert.match(source, /No fue posible reabrir el análisis/);
  assert.match(source, /No fue posible abrir el informe/);
  assert.match(source, /Informe confirmado en Drive y metadata persistida/);
});
