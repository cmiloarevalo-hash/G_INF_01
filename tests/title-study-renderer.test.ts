import assert from 'node:assert/strict';
import test from 'node:test';
import {
  InvalidTitleStudyReportError,
  renderTitleStudyDocx,
} from '../src/report-types/title-study/renderer.js';
import type { TitleStudy } from '../src/report-types/title-study/schema.js';
import { titleStudyReviewFixture } from './fixtures/title-study-review.js';
import { readDocxDocumentXml, readDocxEntries } from './helpers/docx.js';

test('generalized TITLE_STUDY produces structured DOCX sections from present evidence only', async () => {
  const bytes = await renderTitleStudyDocx(titleStudyReviewFixture);
  assert.ok(bytes.length > 1000);
  assert.equal(bytes.subarray(0, 2).toString('hex'), '504b');

  const xml = readDocxDocumentXml(bytes);
  const expected = [
    'Estudio de Títulos',
    'Análisis documental preliminar',
    'Documentos fuente',
    'Antecedentes y hechos extraídos',
    'Dominio e inscripciones',
    'Identificación del inmueble',
    'Descripción física y superficies',
    'Antecedentes fiscales y catastrales',
    'Planificación y condiciones urbanísticas',
    'Entidades y relaciones documentadas',
    'Comparaciones y discrepancias',
    'Equivalente tras normalización',
    'Hallazgos',
    'Riesgos y alertas',
    'Cronología documental',
    'Conclusiones',
    '00012-00034',
    '12-34',
    '8,85 ha',
    '88500 m²',
    'Persona Sintética Uno',
  ];
  for (const value of expected) assert.ok(xml.includes(value), `DOCX is missing: ${value}`);

  assert.doesNotMatch(xml, /NO CONSTA EN ANTECEDENTES|No informado|Sin datos|N\/A/i);
  assert.doesNotMatch(xml, /internal-fact-|internal-doc-|internal-finding-|internal-entity-/);

  const entries = readDocxEntries(bytes);
  const settingsXml = entries.get('word/settings.xml')?.toString('utf8');
  assert.ok(settingsXml);
  assert.match(settingsXml, /<w:updateFields(?:\s+w:val="(?:true|1)")?\s*\/>/);

  const numberingXml = entries.get('word/numbering.xml')?.toString('utf8');
  assert.ok(numberingXml);
  assert.match(numberingXml, /w:suff[^>]*w:val="space"/);
});

test('minimal valid report omits every empty analytical section', async () => {
  const minimal: TitleStudy = {
    reportType: 'TITLE_STUDY',
    sourceDocuments: [{ id: 'doc-only', name: 'titulo.pdf' }],
  };
  const xml = readDocxDocumentXml(await renderTitleStudyDocx(minimal));

  assert.match(xml, /titulo\.pdf/);
  assert.equal(xml.includes('Tipo documental'), false);
  for (const absent of [
    'Antecedentes y hechos extraídos',
    'Entidades y relaciones documentadas',
    'Comparaciones y discrepancias',
    'Hallazgos',
    'Riesgos y alertas',
    'Cronología documental',
    'Conclusiones',
  ]) {
    assert.equal(xml.includes(absent), false, `empty section rendered: ${absent}`);
  }
  assert.doesNotMatch(xml, /NO CONSTA|No informado|Sin datos|N\/A/i);
});

test('invalid or orphaned generalized report is rejected before DOCX bytes', async () => {
  await assert.rejects(
    () => renderTitleStudyDocx({ reportType: 'TITLE_STUDY', sourceDocuments: [] }),
    InvalidTitleStudyReportError,
  );
  await assert.rejects(
    () => renderTitleStudyDocx({
      reportType: 'TITLE_STUDY',
      sourceDocuments: [{ id: 'doc-1', name: 'a.pdf', documentType: 'Documento' }],
      facts: [{
        id: 'fact-1',
        category: 'PROPERTY_IDENTITY',
        label: 'ROL',
        original: '1-2',
        sourceDocumentIds: ['missing'],
      }],
    }),
    InvalidTitleStudyReportError,
  );
});
