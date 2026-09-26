import type { TitleStudy } from '../../src/report-types/title-study/schema.js';

export const titleStudyReviewFixture: TitleStudy = {
  reportType: 'TITLE_STUDY',
  sourceDocuments: [
    {
      id: 'internal-doc-alpha',
      name: 'documento-sintetico-a.pdf',
      documentType: 'Documento sintético A',
    },
    {
      id: 'internal-doc-beta',
      name: 'documento-sintetico-b.pdf',
      documentType: 'Documento sintético B',
    },
  ],
  findings: [
    {
      id: 'internal-finding-alpha',
      statement: 'Los documentos sintéticos contienen valores comparables para el campo de prueba.',
      sourceDocumentIds: ['internal-doc-alpha', 'internal-doc-beta'],
      values: [
        {
          documentId: 'internal-doc-alpha',
          field: 'campo demostrativo',
          original: 'Valor Original A-001',
          normalized: 'a-001',
        },
        {
          documentId: 'internal-doc-beta',
          field: 'campo demostrativo',
          original: 'A 001',
          normalized: 'a-001',
        },
      ],
    },
    {
      id: 'internal-finding-beta',
      statement: 'El segundo hallazgo sintético conserva una referencia legible sin valores adicionales.',
      sourceDocumentIds: ['internal-doc-beta'],
    },
  ],
  comparisons: [
    {
      id: 'internal-comparison-alpha',
      field: 'campo demostrativo',
      values: [
        {
          documentId: 'internal-doc-alpha',
          field: 'campo demostrativo',
          original: 'Valor Original A-001',
          normalized: 'a-001',
        },
        {
          documentId: 'internal-doc-beta',
          field: 'campo demostrativo',
          original: 'A 001',
          normalized: 'a-001',
        },
      ],
      result: 'NORMALIZED_EQUIVALENT',
      explanation: 'Los valores sintéticos son equivalentes después de la normalización declarada en el fixture.',
    },
    {
      id: 'internal-comparison-beta',
      field: 'campo auxiliar',
      values: [
        {
          documentId: 'internal-doc-alpha',
          field: 'campo auxiliar',
          original: 'Serie X',
        },
        {
          documentId: 'internal-doc-beta',
          field: 'campo auxiliar',
          original: 'Serie Y',
        },
      ],
      result: 'DIFFERENT',
    },
  ],
  conclusions: [
    {
      id: 'internal-conclusion-alpha',
      statement: 'El fixture sintético conserva la relación entre hallazgos, comparaciones y documentos fuente.',
      supportingFindingIds: ['internal-finding-alpha', 'internal-finding-beta'],
    },
  ],
};
