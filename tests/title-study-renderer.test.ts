import assert from 'node:assert/strict';
import test from 'node:test';
import { inflateRawSync } from 'node:zlib';
import {
  InvalidTitleStudyReportError,
  renderTitleStudyDocx,
} from '../src/report-types/title-study/renderer.js';
import type { TitleStudy } from '../src/report-types/title-study/schema.js';

function readDocxEntries(buffer: Buffer): Map<string, Buffer> {
  const eocdSignature = 0x06054b50;
  let eocdOffset = -1;
  for (let offset = buffer.length - 22; offset >= Math.max(0, buffer.length - 65557); offset -= 1) {
    if (buffer.readUInt32LE(offset) === eocdSignature) {
      eocdOffset = offset;
      break;
    }
  }
  assert.notEqual(eocdOffset, -1, 'DOCX ZIP EOCD not found');

  const entryCount = buffer.readUInt16LE(eocdOffset + 10);
  let centralOffset = buffer.readUInt32LE(eocdOffset + 16);
  const entries = new Map<string, Buffer>();

  for (let index = 0; index < entryCount; index += 1) {
    assert.equal(buffer.readUInt32LE(centralOffset), 0x02014b50, 'Invalid central directory entry');
    const method = buffer.readUInt16LE(centralOffset + 10);
    const compressedSize = buffer.readUInt32LE(centralOffset + 20);
    const nameLength = buffer.readUInt16LE(centralOffset + 28);
    const extraLength = buffer.readUInt16LE(centralOffset + 30);
    const commentLength = buffer.readUInt16LE(centralOffset + 32);
    const localOffset = buffer.readUInt32LE(centralOffset + 42);
    const name = buffer.subarray(centralOffset + 46, centralOffset + 46 + nameLength).toString('utf8');

    assert.equal(buffer.readUInt32LE(localOffset), 0x04034b50, 'Invalid local ZIP entry');
    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = buffer.subarray(dataStart, dataStart + compressedSize);
    const data = method === 0 ? compressed : method === 8 ? inflateRawSync(compressed) : null;
    assert.ok(data, `Unsupported ZIP method ${method} for ${name}`);
    entries.set(name, data);

    centralOffset += 46 + nameLength + extraLength + commentLength;
  }

  return entries;
}

const fullReport: TitleStudy = {
  reportType: 'TITLE_STUDY',
  sourceDocuments: [
    { id: 'doc-a', name: 'escritura.pdf', documentType: 'Escritura pública' },
    { id: 'doc-b', name: 'certificado.pdf', documentType: 'Certificado' },
  ],
  findings: [
    {
      id: 'finding-a',
      statement: 'Los documentos registran valores que deben cotejarse.',
      sourceDocumentIds: ['doc-a', 'doc-b'],
      values: [
        { documentId: 'doc-a', field: 'fojas', original: 'Fojas 123', normalized: '123' },
        { documentId: 'doc-b', field: 'fojas', original: '123' },
      ],
    },
  ],
  comparisons: [
    'CONSISTENT',
    'NORMALIZED_EQUIVALENT',
    'DIFFERENT',
    'POSSIBLE_CONTRADICTION',
    'INSUFFICIENT_INFORMATION',
  ].map((result, index) => ({
    id: `comparison-${index + 1}`,
    field: `campo-${index + 1}`,
    values: [
      { documentId: 'doc-a', field: `campo-${index + 1}`, original: 'Valor A', normalized: 'valor-a' },
      { documentId: 'doc-b', field: `campo-${index + 1}`, original: 'Valor B' },
    ],
    result: result as NonNullable<TitleStudy['comparisons']>[number]['result'],
    explanation: `Explicación ${index + 1}`,
  })),
  conclusions: [
    {
      id: 'conclusion-a',
      statement: 'La conclusión conserva la trazabilidad del resultado validado.',
      supportingFindingIds: ['finding-a'],
    },
  ],
};

test('V-026: valid TITLE_STUDY produces a non-empty DOCX with structured report content', async () => {
  const bytes = await renderTitleStudyDocx(fullReport);
  assert.ok(bytes.length > 1000);
  assert.equal(bytes.subarray(0, 2).toString('hex'), '504b');

  const entries = readDocxEntries(bytes);
  const documentXml = entries.get('word/document.xml')?.toString('utf8');
  assert.ok(documentXml);

  assert.match(documentXml, /Estudio de Títulos/);
  assert.match(documentXml, /Informe estructurado/);
  assert.match(documentXml, /Objetivo del informe/);
  assert.match(documentXml, /Documentos fuente/);
  assert.match(documentXml, /escritura\.pdf/);
  assert.match(documentXml, /Escritura pública/);
  assert.match(documentXml, /Hallazgos/);
  assert.match(documentXml, /Los documentos registran valores que deben cotejarse/);
  assert.match(documentXml, /Fojas 123/);
  assert.match(documentXml, />123</);
  assert.match(documentXml, /Diferencias y comparaciones/);
  assert.match(documentXml, /Consistente/);
  assert.match(documentXml, /Equivalente tras normalización/);
  assert.match(documentXml, /Diferente/);
  assert.match(documentXml, /Posible contradicción/);
  assert.match(documentXml, /Información insuficiente/);
  assert.match(documentXml, /Conclusiones/);
  assert.match(documentXml, /La conclusión conserva la trazabilidad/);
  assert.match(documentXml, /Hallazgo 1/);
  assert.match(documentXml, /Heading1/);
  assert.match(documentXml, /Heading2/);
  assert.match(documentXml, /<w:tbl>/);
  assert.match(documentXml, /TOC/);
  assert.match(documentXml, /w:fldChar[^>]*w:fldCharType="begin"/);
  assert.match(documentXml, /w:instrText[^>]*>TOC[^<]*\\h[^<]*\\o "1-2"/);
  assert.match(documentXml, /w:fldChar[^>]*w:fldCharType="separate"/);
  assert.match(documentXml, /w:fldChar[^>]*w:fldCharType="end"/);

  const settingsXml = entries.get('word/settings.xml')?.toString('utf8');
  assert.ok(settingsXml);
  assert.match(settingsXml, /w:updateFields[^>]*w:val="true"/);

  assert.doesNotMatch(documentXml, /doc-a|doc-b|finding-a/);
  assert.doesNotMatch(documentXml, /No informado|Sin datos|N\/A/);

  const headerXml = [...entries.entries()]
    .filter(([name]) => /^word\/header\d+\.xml$/.test(name))
    .map(([, data]) => data.toString('utf8'))
    .join('\n');
  const footerXml = [...entries.entries()]
    .filter(([name]) => /^word\/footer\d+\.xml$/.test(name))
    .map(([, data]) => data.toString('utf8'))
    .join('\n');
  assert.match(headerXml, /Estudio de Títulos/);
  assert.match(footerXml, /Página/);
  assert.match(footerXml, /PAGE/);
  assert.match(footerXml, /NUMPAGES/);
});

test('minimal valid report omits optional sections instead of generating absence text', async () => {
  const minimal: TitleStudy = {
    reportType: 'TITLE_STUDY',
    sourceDocuments: [{ id: 'doc-only', name: 'titulo.pdf', documentType: 'Documento' }],
  };
  const bytes = await renderTitleStudyDocx(minimal);
  const documentXml = readDocxEntries(bytes).get('word/document.xml')?.toString('utf8');
  assert.ok(documentXml);
  assert.match(documentXml, /titulo\.pdf/);
  assert.doesNotMatch(documentXml, />Hallazgos</);
  assert.doesNotMatch(documentXml, /Diferencias y comparaciones/);
  assert.doesNotMatch(documentXml, />Conclusiones</);
  assert.doesNotMatch(documentXml, /No informado|Sin datos|N\/A/);
  assert.doesNotMatch(documentXml, /\d{4}-\d{2}-\d{2}/);
});

test('V-027: invalid input is rejected before DOCX bytes are produced', async () => {
  await assert.rejects(
    () => renderTitleStudyDocx({ reportType: 'TITLE_STUDY', sourceDocuments: [] }),
    InvalidTitleStudyReportError,
  );
  await assert.rejects(
    () => renderTitleStudyDocx({ reportType: 'TITLE_STUDY', sourceDocuments: [{ id: 'a', name: 'a', documentType: 'x' }], findings: [{ id: 'f', statement: 'x', sourceDocumentIds: ['missing'] }] }),
    InvalidTitleStudyReportError,
  );
});

test('conclusion numbering OOXML uses an explicit space suffix after the number', async () => {
  const entries = readDocxEntries(await renderTitleStudyDocx(fullReport));
  const numberingXml = entries.get('word/numbering.xml')?.toString('utf8');
  assert.ok(numberingXml);

  const conclusionLevel = numberingXml.match(
    /<w:lvl[^>]*w:ilvl="0"[^>]*>[\s\S]*?<w:numFmt[^>]*w:val="decimal"[^>]*\/>[\s\S]*?<w:suff[^>]*w:val="space"[^>]*\/>[\s\S]*?<w:lvlText[^>]*w:val="%1\."[^>]*\/>[\s\S]*?<\/w:lvl>/,
  );
  assert.ok(conclusionLevel, 'conclusion numbering must encode w:suff w:val="space" after %1.');
});

