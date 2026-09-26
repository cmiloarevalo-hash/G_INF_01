import test from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createServerApp } from '../server.js';
import {
  TITLE_STUDY_DOCX_FILENAME,
  TITLE_STUDY_DOCX_MIME,
} from '../src/report-types/title-study/renderer.js';
import type { TitleStudy } from '../src/report-types/title-study/schema.js';

const report: TitleStudy = {
  reportType: 'TITLE_STUDY',
  sourceDocuments: [{ id: 'doc-1', name: 'titulo.pdf', documentType: 'Documento' }],
  findings: [{
    id: 'finding-1',
    statement: 'Hallazgo validado.',
    sourceDocumentIds: ['doc-1'],
  }],
  conclusions: [{
    id: 'conclusion-1',
    statement: 'Conclusión validada.',
    supportingFindingIds: ['finding-1'],
  }],
};

async function withServer(run: (root: string) => Promise<void>) {
  let providerCalls = 0;
  const fetchImpl: typeof fetch = async () => {
    providerCalls += 1;
    throw new Error('Gemini must not be called while rendering DOCX');
  };
  const server: Server = createServerApp({ fetchImpl }).listen(0);
  try {
    await run(`http://127.0.0.1:${(server.address() as AddressInfo).port}`);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
  assert.equal(providerCalls, 0);
}

test('POST /api/guest/report-docx returns attachment bytes without Gemini credentials or provider call', async () => {
  await withServer(async (root) => {
    const response = await fetch(root + '/api/guest/report-docx', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ report }),
    });
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type') ?? '', new RegExp(TITLE_STUDY_DOCX_MIME));
    assert.equal(response.headers.get('content-disposition'), `attachment; filename="${TITLE_STUDY_DOCX_FILENAME}"`);
    assert.equal(response.headers.get('cache-control'), 'no-store');

    const bytes = Buffer.from(await response.arrayBuffer());
    assert.ok(bytes.length > 1000);
    assert.equal(bytes.subarray(0, 2).toString('hex'), '504b');
  });
});

test('invalid report payload returns 400 and no DOCX bytes', async () => {
  await withServer(async (root) => {
    const response = await fetch(root + '/api/guest/report-docx', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ report: { reportType: 'TITLE_STUDY', sourceDocuments: [] } }),
    });
    assert.equal(response.status, 400);
    assert.match(response.headers.get('content-type') ?? '', /application\/json/);
    const bytes = Buffer.from(await response.arrayBuffer());
    assert.notEqual(bytes.subarray(0, 2).toString('hex'), '504b');
    assert.match(bytes.toString('utf8'), /contrato TITLE_STUDY/);
  });
});

test('DOCX route does not accept a missing report as a successful download', async () => {
  await withServer(async (root) => {
    const response = await fetch(root + '/api/guest/report-docx', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(response.status, 400);
    assert.equal(response.headers.get('cache-control'), 'no-store');
  });
});
