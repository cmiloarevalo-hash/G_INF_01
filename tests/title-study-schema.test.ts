import assert from 'node:assert/strict';
import test from 'node:test';
import {
  titleStudySchema,
  toTitleStudyJsonSchema,
  type TitleStudy,
} from '../src/report-types/title-study/schema.js';

const minimalReport = {
  reportType: 'TITLE_STUDY',
  sourceDocuments: [
    { id: 'doc-1', documentType: 'escritura', name: 'documento.pdf' },
  ],
} satisfies TitleStudy;

test('accepts a report without irrelevant findings, comparisons, or conclusions', () => {
  const result = titleStudySchema.parse(minimalReport);

  assert.deepEqual(result, minimalReport);
  assert.equal('findings' in result, false);
  assert.equal('comparisons' in result, false);
  assert.equal('conclusions' in result, false);
});

test('rejects an invalid report type, missing source documents, and findings without source references', () => {
  assert.equal(
    titleStudySchema.safeParse({ ...minimalReport, reportType: 'OTHER' }).success,
    false,
  );
  assert.equal(titleStudySchema.safeParse({ reportType: 'TITLE_STUDY' }).success, false);
  assert.equal(
    titleStudySchema.safeParse({
      ...minimalReport,
      findings: [{ id: 'finding-1', statement: 'Hallazgo sin referencia', sourceDocumentIds: [] }],
    }).success,
    false,
  );
  assert.equal(
    titleStudySchema.safeParse({
      ...minimalReport,
      conclusions: [{ id: 'conclusion-1', statement: 'Conclusión sin soporte' }],
    }).success,
    false,
  );
});

test('preserves original and optional normalized document values', () => {
  const report = titleStudySchema.parse({
    ...minimalReport,
    findings: [
      {
        id: 'finding-1',
        statement: 'El documento registra el rol indicado.',
        sourceDocumentIds: ['doc-1'],
        values: [
          {
            documentId: 'doc-1',
            field: 'identificador',
            original: '00524-00050',
            normalized: '524-50',
          },
          { documentId: 'doc-1', field: 'rol', original: 'vendedor' },
        ],
      },
    ],
  });

  assert.deepEqual(report.findings?.[0].values, [
    {
      documentId: 'doc-1',
      field: 'identificador',
      original: '00524-00050',
      normalized: '524-50',
    },
    { documentId: 'doc-1', field: 'rol', original: 'vendedor' },
  ]);
});

test('accepts document and finding references that resolve within the report', () => {
  const report: TitleStudy = {
    ...minimalReport,
    sourceDocuments: [
      ...minimalReport.sourceDocuments,
      { id: 'doc-2', documentType: 'anexo', name: 'anexo.pdf' },
    ],
    findings: [
      {
        id: 'finding-1',
        statement: 'Hallazgo respaldado por sus documentos fuente.',
        sourceDocumentIds: ['doc-1', 'doc-2'],
        values: [
          { documentId: 'doc-1', field: 'campo', original: 'valor A' },
          { documentId: 'doc-2', field: 'campo', original: 'valor B' },
        ],
      },
    ],
    comparisons: [
      {
        id: 'comparison-1',
        field: 'campo',
        values: [
          { documentId: 'doc-1', field: 'campo', original: 'valor A' },
          { documentId: 'doc-2', field: 'campo', original: 'valor B' },
        ],
        result: 'DIFFERENT',
      },
    ],
    conclusions: [
      {
        id: 'conclusion-1',
        statement: 'Conclusión respaldada.',
        supportingFindingIds: ['finding-1'],
      },
    ],
  };

  assert.deepEqual(titleStudySchema.parse(report), report);
});

test('rejects orphaned references and duplicate identifiers', () => {
  const valid: TitleStudy = {
    ...minimalReport,
    findings: [
      {
        id: 'finding-1',
        statement: 'Hallazgo respaldado.',
        sourceDocumentIds: ['doc-1'],
        values: [{ documentId: 'doc-1', field: 'campo', original: 'valor' }],
      },
    ],
    comparisons: [
      {
        id: 'comparison-1',
        field: 'campo',
        values: [
          { documentId: 'doc-1', field: 'campo', original: 'valor A' },
          { documentId: 'doc-1', field: 'campo', original: 'valor B' },
        ],
        result: 'DIFFERENT',
      },
    ],
    conclusions: [
      {
        id: 'conclusion-1',
        statement: 'Conclusión respaldada.',
        supportingFindingIds: ['finding-1'],
      },
    ],
  };

  const orphanedReferences: TitleStudy[] = [
    {
      ...valid,
      sourceDocuments: [
        ...minimalReport.sourceDocuments,
        { ...minimalReport.sourceDocuments[0], name: 'duplicado.pdf' },
      ],
    },
    {
      ...valid,
      findings: [{ ...valid.findings![0], sourceDocumentIds: ['missing-document'] }],
    },
    {
      ...valid,
      findings: [
        {
          ...valid.findings![0],
          values: [{ documentId: 'missing-document', field: 'campo', original: 'valor' }],
        },
      ],
    },
    {
      ...valid,
      comparisons: [
        {
          ...valid.comparisons![0],
          values: [
            { documentId: 'doc-1', field: 'campo', original: 'valor A' },
            { documentId: 'missing-document', field: 'campo', original: 'valor B' },
          ],
        },
      ],
    },
    {
      ...valid,
      conclusions: [
        { ...valid.conclusions![0], supportingFindingIds: ['missing-finding'] },
      ],
    },
    {
      ...valid,
      findings: [valid.findings![0], { ...valid.findings![0], statement: 'Mismo id' }],
    },
  ];

  for (const report of orphanedReferences) {
    assert.equal(titleStudySchema.safeParse(report).success, false);
  }
});

test('retains a documentary difference as valid data and supports every comparison result', () => {
  const comparisonResults = [
    'CONSISTENT',
    'NORMALIZED_EQUIVALENT',
    'DIFFERENT',
    'POSSIBLE_CONTRADICTION',
    'INSUFFICIENT_INFORMATION',
  ] as const;

  for (const result of comparisonResults) {
    const report = titleStudySchema.parse({
      ...minimalReport,
      sourceDocuments: [
        ...minimalReport.sourceDocuments,
        { id: 'doc-2', documentType: 'anexo', name: 'anexo.pdf' },
      ],
      comparisons: [
        {
          id: `comparison-${result}`,
          field: 'identificador',
          values: [
            {
              documentId: 'doc-1',
              field: 'identificador',
              original: 'A-1',
              normalized: 'A1',
            },
            { documentId: 'doc-2', field: 'identificador', original: 'B-2' },
          ],
          result,
        },
      ],
    });

    assert.equal(report.comparisons?.[0].result, result);
    assert.deepEqual(report.comparisons?.[0].values, [
      {
        documentId: 'doc-1',
        field: 'identificador',
        original: 'A-1',
        normalized: 'A1',
      },
      { documentId: 'doc-2', field: 'identificador', original: 'B-2' },
    ]);
  }
});

test('derives JSON Schema with structural constraints and optional properties from the Zod schema', () => {
  const jsonSchema = toTitleStudyJsonSchema();
  const properties = jsonSchema.properties as Record<string, Record<string, unknown>>;
  const comparisonItem = properties.comparisons.items as Record<string, unknown>;
  const comparisonProperties = comparisonItem.properties as Record<string, Record<string, unknown>>;

  assert.equal(jsonSchema.type, 'object');
  assert.equal(properties.reportType.const, 'TITLE_STUDY');
  assert.deepEqual(jsonSchema.required, ['reportType', 'sourceDocuments']);
  assert.equal(properties.sourceDocuments.minItems, 1);
  assert.deepEqual(comparisonProperties.result.enum, [
    'CONSISTENT',
    'NORMALIZED_EQUIVALENT',
    'DIFFERENT',
    'POSSIBLE_CONTRADICTION',
    'INSUFFICIENT_INFORMATION',
  ]);
  assert.equal(comparisonProperties.values.minItems, 2);

  const valueArray = comparisonProperties.values as Record<string, unknown>;
  const valueProperties = valueArray.items as Record<string, unknown>;
  assert.ok('normalized' in (valueProperties.properties as Record<string, unknown>));
  assert.ok(!(valueProperties.required as string[]).includes('normalized'));
  assert.equal(jsonSchema.additionalProperties, false);

  const sourceDocumentItem = properties.sourceDocuments.items as Record<string, unknown>;
  const sourceDocumentProperties = sourceDocumentItem.properties as Record<string, Record<string, unknown>>;
  assert.equal(sourceDocumentProperties.documentType.type, 'string');
  assert.equal('enum' in sourceDocumentProperties.documentType, false);

  const findingItem = properties.findings.items as Record<string, unknown>;
  const findingProperties = findingItem.properties as Record<string, Record<string, unknown>>;
  const documentReferenceArray = findingProperties.sourceDocumentIds as Record<string, unknown>;
  assert.equal((documentReferenceArray.items as Record<string, unknown>).type, 'string');

  const conclusionItem = (properties.conclusions.items ?? {}) as Record<string, unknown>;
  const conclusionProperties = conclusionItem.properties as Record<string, Record<string, unknown>>;
  assert.equal(conclusionProperties.supportingFindingIds.minItems, 1);
  const findingReferenceArray = conclusionProperties.supportingFindingIds as Record<string, unknown>;
  assert.equal((findingReferenceArray.items as Record<string, unknown>).type, 'string');
});
