import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import type { TitleStudy } from '../src/report-types/title-study/schema.js';
import { TitleStudyResult, comparisonLabel, resolveDocumentName } from '../src/components/TitleStudyResult.js';

const fullReport: TitleStudy = {
  reportType: 'TITLE_STUDY',
  sourceDocuments: [
    { id: 'doc-a', name: 'escritura.pdf', documentType: 'Escritura pública' },
    { id: 'doc-b', name: 'certificado.pdf', documentType: 'Certificado' },
  ],
  findings: [
    {
      id: 'finding-1',
      statement: 'Los documentos identifican valores que deben cotejarse.',
      sourceDocumentIds: ['doc-a', 'doc-b'],
      values: [
        { documentId: 'doc-a', field: 'fojas', original: 'Fojas 123', normalized: '123' },
        { documentId: 'doc-b', field: 'fojas', original: '123' },
      ],
    },
  ],
  comparisons: [
    {
      id: 'comparison-1',
      field: 'fojas',
      values: [
        { documentId: 'doc-a', field: 'fojas', original: 'Fojas 123', normalized: '123' },
        { documentId: 'doc-b', field: 'fojas', original: '125' },
      ],
      result: 'DIFFERENT',
      explanation: 'Los valores documentales no coinciden.',
    },
  ],
  conclusions: [
    {
      id: 'conclusion-1',
      statement: 'La diferencia queda registrada en el resultado validado.',
      supportingFindingIds: ['finding-1'],
    },
  ],
};

test('renders the validated result with readable references, original and normalized values', () => {
  const html = renderToStaticMarkup(<TitleStudyResult report={fullReport} partial={true} />);

  assert.match(html, /Resultado preliminar \(parcial\)/);
  assert.match(html, /requiere revisión humana/i);
  assert.match(html, /Documentos fuente/);
  assert.match(html, /escritura\.pdf/);
  assert.match(html, /Escritura pública/);
  assert.match(html, /Hallazgos/);
  assert.match(html, /Fuentes:<\/strong>.*escritura\.pdf.*certificado\.pdf/);
  assert.match(html, /Valor original/);
  assert.match(html, /Fojas 123/);
  assert.match(html, /Valor normalizado/);
  assert.match(html, />123</);
  assert.match(html, /Comparaciones y diferencias/);
  assert.match(html, /Diferente/);
  assert.match(html, /Los valores documentales no coinciden/);
  assert.match(html, /Conclusiones/);
  assert.match(html, /La diferencia queda registrada/);
  assert.match(html, /Hallazgos de respaldo:<\/strong>.*Hallazgo 1/);
  assert.equal(html.includes('doc-a'), false);
  assert.equal(html.includes('finding-1'), false);
});

test('omits optional sections and normalized column when the validated collections are absent', () => {
  const minimal: TitleStudy = {
    reportType: 'TITLE_STUDY',
    sourceDocuments: [{ id: 'doc-only', name: 'titulo.pdf', documentType: 'Documento' }],
  };
  const html = renderToStaticMarkup(<TitleStudyResult report={minimal} partial={false} />);

  assert.match(html, /Documentos fuente/);
  assert.match(html, /titulo\.pdf/);
  assert.doesNotMatch(html, />Hallazgos</);
  assert.doesNotMatch(html, /Comparaciones y diferencias/);
  assert.doesNotMatch(html, />Conclusiones</);
  assert.doesNotMatch(html, /Valor normalizado/);
  assert.doesNotMatch(html, /No informado|No consta|Sin datos|N\/A/);
});

test('uses the exact readable labels for every structured comparison result', () => {
  assert.equal(comparisonLabel('CONSISTENT'), 'Consistente');
  assert.equal(comparisonLabel('NORMALIZED_EQUIVALENT'), 'Equivalente tras normalización');
  assert.equal(comparisonLabel('DIFFERENT'), 'Diferente');
  assert.equal(comparisonLabel('POSSIBLE_CONTRADICTION'), 'Posible contradicción');
  assert.equal(comparisonLabel('INSUFFICIENT_INFORMATION'), 'Información insuficiente');
});

test('resolves document references to readable names and only falls back when no label exists', () => {
  assert.equal(resolveDocumentName(fullReport, 'doc-a'), 'escritura.pdf');
  assert.equal(resolveDocumentName(fullReport, 'unknown-id'), 'unknown-id');
});
