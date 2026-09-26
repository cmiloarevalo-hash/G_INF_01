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
const absenceText = /No informado|No consta|Sin datos|N\/A|undefined/i;
const internalIds = [
  'internal-doc-alpha',
  'internal-doc-beta',
  'internal-finding-alpha',
  'internal-finding-beta',
  'internal-comparison-alpha',
  'internal-comparison-beta',
  'internal-conclusion-alpha',
];

function assertVisibleInBoth(html: string, documentXml: string, value: string) {
  assert.ok(html.includes(value), `UI is missing: ${value}`);
  assert.ok(documentXml.includes(value), `DOCX is missing: ${value}`);
}

test('integrated UI and DOCX preserve the same synthetic TITLE_STUDY semantics', async () => {
  const parsed = titleStudySchema.safeParse(titleStudyReviewFixture);
  assert.equal(parsed.success, true, 'synthetic review fixture must validate with the current schema');
  if (!parsed.success) return;

  let networkCalls = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    networkCalls += 1;
    throw new Error('Network access is forbidden during integrated M3.4 verification');
  };

  let docxBytes: Buffer;
  try {
    docxBytes = await renderTitleStudyDocx(parsed.data);
  } finally {
    globalThis.fetch = originalFetch;
  }
  assert.equal(networkCalls, 0, 'DOCX rendering must not use network or Gemini');

  const html = renderToStaticMarkup(createElement(TitleStudyResult, { report: parsed.data, partial: false }));
  const documentXml = readDocxDocumentXml(docxBytes);

  const sharedDynamicValues = [
    'documento-sintetico-a.pdf',
    'Documento sintético A',
    'documento-sintetico-b.pdf',
    'Documento sintético B',
    'Los documentos sintéticos contienen valores comparables para el campo de prueba.',
    'El segundo hallazgo sintético conserva una referencia legible sin valores adicionales.',
    'campo demostrativo',
    'Valor Original A-001',
    'a-001',
    'A 001',
    'Equivalente tras normalización',
    'Los valores sintéticos son equivalentes después de la normalización declarada en el fixture.',
    'campo auxiliar',
    'Serie X',
    'Serie Y',
    'Diferente',
    'El fixture sintético conserva la relación entre hallazgos, comparaciones y documentos fuente.',
    'Hallazgo 1',
    'Hallazgo 2',
  ];

  for (const value of sharedDynamicValues) assertVisibleInBoth(html, documentXml, value);

  assert.match(html, /Fuentes:<\/strong>.*documento-sintetico-a\.pdf.*documento-sintetico-b\.pdf/);
  assert.match(documentXml, /Fuentes: .*documento-sintetico-a\.pdf.*documento-sintetico-b\.pdf/);
  assert.match(html, /Hallazgos de respaldo:<\/strong>.*Hallazgo 1.*Hallazgo 2/);
  assert.match(documentXml, /Hallazgos de respaldo: .*Hallazgo 1.*Hallazgo 2/);

  for (const id of internalIds) {
    assert.equal(html.includes(id), false, `internal ID leaked to UI: ${id}`);
    assert.equal(documentXml.includes(id), false, `internal ID leaked to DOCX: ${id}`);
  }

  assert.doesNotMatch(html, absenceText);
  assert.doesNotMatch(documentXml, absenceText);
});

test('DOCX content is deterministic for the same synthetic fixture', async () => {
  const first = readDocxDocumentXml(await renderTitleStudyDocx(titleStudyReviewFixture));
  const second = readDocxDocumentXml(await renderTitleStudyDocx(titleStudyReviewFixture));
  assert.equal(first, second);
  assert.doesNotMatch(first, /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
});

test('review generator command creates the ignored DOCX review file with ZIP signature', async () => {
  await rm(reviewPath, { force: true });

  const { stdout, stderr } = await execFileAsync(
    process.execPath,
    ['--import', 'tsx', 'scripts/generate-title-study-review-docx.ts'],
    { cwd: process.cwd() },
  );

  assert.equal(stderr, '');
  assert.match(stdout.trim(), /^dist\/review\/title-study-review\.docx — \d+ bytes$/);

  const bytes = await readFile(reviewPath);
  assert.ok(bytes.length > 1000);
  assert.equal(bytes.subarray(0, 2).toString('hex'), '504b');

  const entries = readDocxEntries(bytes);
  const xml = readDocxDocumentXml(bytes);
  assert.match(xml, /documento-sintetico-a\.pdf/);
  assert.match(xml, /El fixture sintético conserva la relación/);
  assert.match(xml, /w:instrText[^>]*>TOC[^<]*\\h[^<]*\\o (?:&quot;|")1-2(?:&quot;|")/);
  assert.match(xml, /w:fldChar[^>]*w:fldCharType="begin"/);
  assert.match(xml, /w:fldChar[^>]*w:fldCharType="separate"/);
  assert.match(xml, /w:fldChar[^>]*w:fldCharType="end"/);

  const settingsXml = entries.get('word/settings.xml')?.toString('utf8');
  assert.ok(settingsXml);
  assert.match(settingsXml, /w:updateFields[^>]*w:val="true"/);

  const numberingXml = entries.get('word/numbering.xml')?.toString('utf8');
  assert.ok(numberingXml);
  const conclusionLevel = [...numberingXml.matchAll(/<w:lvl\\b[\\s\\S]*?<\\/w:lvl>/g)]
    .map((match) => match[0])
    .find((level) => /w:numFmt[^>]*w:val="decimal"/.test(level) && /w:lvlText[^>]*w:val="%1\\."/.test(level));
  assert.ok(conclusionLevel);
  assert.match(conclusionLevel, /w:suff[^>]*w:val="space"/);

  const gitignore = await readFile('.gitignore', 'utf8');
  assert.match(gitignore, /^dist$/m);
});

test('review generator source has no network, Gemini or API-key dependency', async () => {
  const source = await readFile('scripts/generate-title-study-review-docx.ts', 'utf8');
  assert.doesNotMatch(source, /\bfetch\s*\(|Gemini|api[-_ ]?key|x-gemini/i);
  assert.match(source, /renderTitleStudyDocx\(titleStudyReviewFixture\)/);
});
