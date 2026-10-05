import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { TitleStudy } from '../src/report-types/title-study/schema.js';
import { TitleStudyResult, comparisonLabel, resolveDocumentName } from '../src/components/TitleStudyResult.js';
import { titleStudyReviewFixture } from './fixtures/title-study-review.js';

test('renders present evidence categories, traceability, risks and timeline without absence boilerplate', () => {
  const html = renderToStaticMarkup(createElement(TitleStudyResult, { report: titleStudyReviewFixture, partial: true }));

  for (const value of [
    'Resultado preliminar (parcial)',
    'Documentos fuente',
    'Antecedentes y hechos extraídos',
    'Dominio e inscripciones',
    'Identificación del inmueble',
    'Comparaciones y discrepancias',
    'Riesgos y alertas',
    'Cronología documental',
    'Conclusiones',
    '00012-00034',
    '12-34',
    '8,85 ha',
    '88500 m²',
    'Persona Sintética Uno',
  ]) {
    assert.ok(html.includes(value), `UI is missing: ${value}`);
  }

  assert.match(html, /requiere revisión humana/i);
  assert.doesNotMatch(html, /NO CONSTA EN ANTECEDENTES|No informado|Sin datos|N\/A/i);
  assert.equal(html.includes('internal-fact-'), false);
  assert.equal(html.includes('internal-doc-'), false);
  assert.equal(html.includes('internal-finding-'), false);
});

test('omits all analytical sections when collections are absent', () => {
  const minimal: TitleStudy = {
    reportType: 'TITLE_STUDY',
    sourceDocuments: [{ id: 'doc-only', name: 'titulo.pdf', documentType: 'Documento' }],
  };
  const html = renderToStaticMarkup(createElement(TitleStudyResult, { report: minimal, partial: false }));

  assert.match(html, /Documentos fuente/);
  assert.match(html, /titulo\.pdf/);
  for (const absent of [
    'Antecedentes y hechos extraídos',
    'Entidades y relaciones documentadas',
    'Comparaciones y discrepancias',
    '>Hallazgos<',
    'Riesgos y alertas',
    'Cronología documental',
    '>Conclusiones<',
  ]) {
    assert.equal(html.includes(absent), false, `empty section rendered: ${absent}`);
  }
});

test('uses readable labels for all generalized comparison results', () => {
  assert.equal(comparisonLabel('EXACT_MATCH'), 'Coincidencia exacta');
  assert.equal(comparisonLabel('NORMALIZED_EQUIVALENT'), 'Equivalente tras normalización');
  assert.equal(comparisonLabel('TEMPORAL_CHANGE'), 'Cambio temporal');
  assert.equal(comparisonLabel('DIFFERENT_VALUE'), 'Valor diferente');
  assert.equal(comparisonLabel('POSSIBLE_CONTRADICTION'), 'Posible contradicción');
  assert.equal(comparisonLabel('AUTHORITY_SCOPE_DIFFERENCE'), 'Diferencia de autoridad o alcance');
  assert.equal(comparisonLabel('PARTIAL_OVERLAP'), 'Coincidencia parcial');
  assert.equal(comparisonLabel('STATUS_TRANSITION'), 'Cambio de estado documentado');
});

test('resolves document references to readable names', () => {
  assert.equal(resolveDocumentName(titleStudyReviewFixture, 'internal-doc-title'), 'inscripcion-sintetica.pdf');
  assert.equal(resolveDocumentName(titleStudyReviewFixture, 'unknown-id'), 'unknown-id');
});
