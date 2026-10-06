import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readFile, rm } from 'node:fs/promises';
import { promisify } from 'node:util';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TitleStudyResult } from '../src/components/TitleStudyResult.js';
import { renderTitleStudyDocx } from '../src/report-types/title-study/renderer.js';
import { titleStudySchema } from '../src/report-types/title-study/schema.js';
import { titleStudyReviewFixture } from './fixtures/title-study-review.js';
import { readDocxDocumentXml, readDocxEntries } from './helpers/docx.js';

const execFileAsync = promisify(execFile);
const reviewPath = 'dist/review/title-study-review.docx';
const absenceText = /NO CONSTA EN ANTECEDENTES|No informado|No consta|Sin datos|N\/A|undefined/i;

function assertVisibleInBoth(html: string, documentXml: string, value: string) {
  assert.ok(html.includes(value), `UI is missing: ${value}`);
  assert.ok(documentXml.includes(value), `DOCX is missing: ${value}`);
}

test('integrated UI and DOCX preserve the same generalized synthetic semantics', async () => {
  const parsed = titleStudySchema.safeParse(titleStudyReviewFixture);
  assert.equal(parsed.success, true, 'synthetic review fixture must validate');
  if (!parsed.success) return;

  let networkCalls = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    networkCalls += 1;
    throw new Error('Network access is forbidden during deterministic verification');
  };

  let docxBytes: Buffer;
  try {
    docxBytes = await renderTitleStudyDocx(parsed.data);
  } finally {
    globalThis.fetch = originalFetch;
  }
  assert.equal(networkCalls, 0);

  const html = renderToStaticMarkup(createElement(TitleStudyResult, { report: parsed.data, partial: false }));
  const documentXml = readDocxDocumentXml(docxBytes);

  const sharedValues = [
    'inscripcion-sintetica.pdf',
    'avaluo-sintetico.pdf',
    'cip-sintetico.pdf',
    'Antecedentes y hechos extraídos',
    'Inscripción de dominio',
    '00012-00034',
    '12-34',
    '8,85 ha',
    '88500 m²',
    'Equivalente tras normalización',
    'Riesgos y alertas',
    'Cronología documental',
    'El fixture sintético conserva trazabilidad entre fuentes, hechos, comparaciones y síntesis.',
  ];

  for (const value of sharedValues) assertVisibleInBoth(html, documentXml, value);

  assert.doesNotMatch(html, absenceText);
  assert.doesNotMatch(documentXml, absenceText);
  for (const idPrefix of ['internal-doc-', 'internal-fact-', 'internal-finding-', 'internal-entity-']) {
    assert.equal(html.includes(idPrefix), false, `internal ID leaked to UI: ${idPrefix}`);
    assert.equal(documentXml.includes(idPrefix), false, `internal ID leaked to DOCX: ${idPrefix}`);
  }
});

test('DOCX content is deterministic for the same synthetic fixture', async () => {
  const first = readDocxDocumentXml(await renderTitleStudyDocx(titleStudyReviewFixture));
  const second = readDocxDocumentXml(await renderTitleStudyDocx(titleStudyReviewFixture));
  assert.equal(first, second);
  assert.doesNotMatch(first, /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
});

test('review generator creates ignored DOCX review file with ZIP signature', async () => {
  await rm(reviewPath, { force: true });

  const { stdout, stderr } = await execFileAsync(
    process.execPath,
    ['--import', 'tsx', 'scripts/generate-title-study-review-docx.ts'],
    { cwd: process.cwd() },
  );

  assert.equal(stderr, '');
  assert.match(stdout.trim(), /^dist[\\\\/]review[\\\\/]title-study-review\.docx — \d+ bytes$/);

  const bytes = await readFile(reviewPath);
  assert.ok(bytes.length > 1000);
  assert.equal(bytes.subarray(0, 2).toString('hex'), '504b');

  const entries = readDocxEntries(bytes);
  const xml = readDocxDocumentXml(bytes);
  assert.match(xml, /inscripcion-sintetica\.pdf/);
  assert.match(xml, /Riesgos y alertas/);
  assert.match(xml, /Cronología documental/);
  assert.match(xml, /w:instrText[^>]*>TOC[^<]*\\h[^<]*\\o (?:&quot;|")1-2(?:&quot;|")/);

  const settingsXml = entries.get('word/settings.xml')?.toString('utf8');
  assert.ok(settingsXml);
  assert.match(settingsXml, /<w:updateFields(?:\s+w:val="(?:true|1)")?\s*\/>/);

  const gitignore = await readFile('.gitignore', 'utf8');
  assert.match(gitignore, /^dist$/m);
});

test('review generator source has no network, Gemini or API-key dependency', async () => {
  const source = await readFile('scripts/generate-title-study-review-docx.ts', 'utf8');
  assert.doesNotMatch(source, /\bfetch\s*\(|Gemini|api[-_ ]?key|x-gemini/i);
  assert.match(source, /renderTitleStudyDocx\(titleStudyReviewFixture\)/);
});
