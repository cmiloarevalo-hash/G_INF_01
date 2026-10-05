import assert from 'node:assert/strict';
import test from 'node:test';
import {
  titleStudySchema,
  toTitleStudyJsonSchema,
  type TitleStudy,
} from '../src/report-types/title-study/schema.js';
import { titleStudyReviewFixture } from './fixtures/title-study-review.js';

const minimalReport = {
  reportType: 'TITLE_STUDY',
  sourceDocuments: [
    { id: 'doc-1', documentType: 'Documento', name: 'documento.pdf' },
  ],
} satisfies TitleStudy;

test('accepts a minimal report and omits every absent analytical category', () => {
  const result = titleStudySchema.parse(minimalReport);
  assert.deepEqual(result, minimalReport);
  for (const key of [
    'facts',
    'entities',
    'relationships',
    'comparisons',
    'findings',
    'risksOrAlerts',
    'conclusions',
    'timeline',
  ]) {
    assert.equal(key in result, false, `${key} should stay absent`);
  }
});

test('validates the generalized synthetic dossier shape with sourced facts and optional entities/timeline', () => {
  const result = titleStudySchema.parse(titleStudyReviewFixture);
  assert.equal(result.facts?.length, 8);
  assert.equal(result.entities?.length, 2);
  assert.equal(result.relationships?.length, 1);
  assert.equal(result.risksOrAlerts?.length, 1);
  assert.equal(result.timeline?.length, 1);
  assert.equal(result.facts?.[0]?.evidenceLocators?.[0]?.page, 1);
  assert.equal(result.facts?.[1]?.original, '00012-00034');
  assert.equal(result.facts?.[1]?.normalized, '12-34');
});

test('rejects invalid report type, missing sources and unsupported absence/checklist fields', () => {
  assert.equal(titleStudySchema.safeParse({ ...minimalReport, reportType: 'OTHER' }).success, false);
  assert.equal(titleStudySchema.safeParse({ reportType: 'TITLE_STUDY' }).success, false);
  assert.equal(titleStudySchema.safeParse({ ...minimalReport, relevantAbsences: [] }).success, false);
  assert.equal(titleStudySchema.safeParse({ ...minimalReport, missingInformation: [] }).success, false);
  assert.equal(titleStudySchema.safeParse({ ...minimalReport, noConstaEnAntecedentes: [] }).success, false);
});

test('rejects broken document, fact, entity and finding references fail-closed', () => {
  const cases: unknown[] = [
    {
      ...minimalReport,
      facts: [{
        id: 'fact-1',
        category: 'PROPERTY_IDENTITY',
        label: 'ROL',
        original: '1-2',
        sourceDocumentIds: ['missing-doc'],
      }],
    },
    {
      ...minimalReport,
      entities: [{ id: 'entity-1', type: 'PROPERTY', label: 'Predio', sourceDocumentIds: ['doc-1'] }],
      facts: [{
        id: 'fact-1',
        category: 'PROPERTY_IDENTITY',
        label: 'ROL',
        original: '1-2',
        sourceDocumentIds: ['doc-1'],
        entityIds: ['missing-entity'],
      }],
    },
    {
      ...minimalReport,
      facts: [{
        id: 'fact-1',
        category: 'PROPERTY_IDENTITY',
        label: 'ROL',
        original: '1-2',
        sourceDocumentIds: ['doc-1'],
      }],
      comparisons: [{
        id: 'comparison-1',
        topic: 'ROL',
        factIds: ['fact-1', 'missing-fact'],
        result: 'DIFFERENT_VALUE',
        explanation: 'Difieren.',
        sourceDocumentIds: ['doc-1'],
      }],
    },
    {
      ...minimalReport,
      facts: [{
        id: 'fact-1',
        category: 'REGISTRY_TITLE',
        label: 'Inscripción',
        original: 'Fojas 1',
        sourceDocumentIds: ['doc-1'],
      }],
      findings: [{
        id: 'finding-1',
        statement: 'Hallazgo.',
        supportingFactIds: ['missing-fact'],
        sourceDocumentIds: ['doc-1'],
      }],
    },
    {
      ...minimalReport,
      conclusions: [{
        id: 'conclusion-1',
        statement: 'Conclusión.',
        supportingFindingIds: ['missing-finding'],
        sourceDocumentIds: ['doc-1'],
      }],
    },
  ];

  for (const value of cases) {
    assert.equal(titleStudySchema.safeParse(value).success, false);
  }
});

test('rejects unreliable or inconsistent evidence locators', () => {
  const noLocation = {
    ...minimalReport,
    facts: [{
      id: 'fact-1',
      category: 'DOCUMENT_IDENTITY',
      label: 'Certificado',
      original: 'Certificado X',
      sourceDocumentIds: ['doc-1'],
      evidenceLocators: [{ documentId: 'doc-1' }],
    }],
  };
  assert.equal(titleStudySchema.safeParse(noLocation).success, false);

  const wrongSource = {
    reportType: 'TITLE_STUDY',
    sourceDocuments: [
      { id: 'doc-1', documentType: 'Documento', name: 'a.pdf' },
      { id: 'doc-2', documentType: 'Documento', name: 'b.pdf' },
    ],
    facts: [{
      id: 'fact-1',
      category: 'DOCUMENT_IDENTITY',
      label: 'Certificado',
      original: 'Certificado X',
      sourceDocumentIds: ['doc-1'],
      evidenceLocators: [{ documentId: 'doc-2', page: 1 }],
    }],
  };
  assert.equal(titleStudySchema.safeParse(wrongSource).success, false);
});

test('rejects duplicate IDs and duplicate fact references inside a comparison', () => {
  const duplicateSource = {
    ...minimalReport,
    sourceDocuments: [
      minimalReport.sourceDocuments[0],
      { ...minimalReport.sourceDocuments[0], name: 'duplicado.pdf' },
    ],
  };
  assert.equal(titleStudySchema.safeParse(duplicateSource).success, false);

  const duplicateComparisonFacts = {
    ...minimalReport,
    facts: [{
      id: 'fact-1',
      category: 'PROPERTY_IDENTITY',
      label: 'ROL',
      original: '1-2',
      sourceDocumentIds: ['doc-1'],
    }],
    comparisons: [{
      id: 'comparison-1',
      topic: 'ROL',
      factIds: ['fact-1', 'fact-1'],
      result: 'EXACT_MATCH',
      explanation: 'Mismo hecho repetido.',
      sourceDocumentIds: ['doc-1'],
    }],
  };
  assert.equal(titleStudySchema.safeParse(duplicateComparisonFacts).success, false);
});

test('supports the complete comparison vocabulary including temporal and authority-scope differences', () => {
  const results = [
    'EXACT_MATCH',
    'NORMALIZED_EQUIVALENT',
    'TEMPORAL_CHANGE',
    'DIFFERENT_VALUE',
    'POSSIBLE_CONTRADICTION',
    'AUTHORITY_SCOPE_DIFFERENCE',
    'PARTIAL_OVERLAP',
    'STATUS_TRANSITION',
  ] as const;

  for (const result of results) {
    const parsed = titleStudySchema.parse({
      reportType: 'TITLE_STUDY',
      sourceDocuments: [
        { id: 'doc-1', documentType: 'Documento A', name: 'a.pdf' },
        { id: 'doc-2', documentType: 'Documento B', name: 'b.pdf' },
      ],
      facts: [
        { id: 'fact-a', category: 'PROPERTY_IDENTITY', label: 'ROL', original: '001-002', normalized: '1-2', sourceDocumentIds: ['doc-1'] },
        { id: 'fact-b', category: 'PROPERTY_IDENTITY', label: 'ROL', original: '1-2', normalized: '1-2', sourceDocumentIds: ['doc-2'] },
      ],
      comparisons: [{
        id: `comparison-${result}`,
        topic: 'ROL',
        factIds: ['fact-a', 'fact-b'],
        result,
        explanation: 'Comparación sintética.',
        sourceDocumentIds: ['doc-1', 'doc-2'],
      }],
    });

    assert.equal(parsed.comparisons?.[0]?.result, result);
  }
});

test('derived JSON Schema exposes the generic evidence contract and no absence object', () => {
  const jsonSchema = toTitleStudyJsonSchema();
  const properties = jsonSchema.properties as Record<string, Record<string, unknown>>;

  assert.equal(jsonSchema.type, 'object');
  assert.deepEqual(jsonSchema.required, ['reportType', 'sourceDocuments']);
  assert.equal(properties.reportType.const, 'TITLE_STUDY');
  assert.equal(properties.sourceDocuments.minItems, 1);
  assert.ok('facts' in properties);
  assert.ok('entities' in properties);
  assert.ok('relationships' in properties);
  assert.ok('risksOrAlerts' in properties);
  assert.ok('timeline' in properties);
  assert.equal('relevantAbsences' in properties, false);
  assert.equal('missingInformation' in properties, false);

  const factItem = properties.facts.items as Record<string, unknown>;
  const factProperties = factItem.properties as Record<string, Record<string, unknown>>;
  assert.deepEqual(factProperties.category.enum, [
    'DOCUMENT_IDENTITY',
    'PROPERTY_IDENTITY',
    'REGISTRY_TITLE',
    'PARTY_RIGHT',
    'PHYSICAL_PROPERTY',
    'FISCAL_CADASTRAL',
    'PLANNING_URBANISM',
    'PERMIT_RECEPTION',
    'SUBDIVISION_PLAN',
    'ENCUMBRANCE_RESTRICTION',
    'SUCCESSION',
    'FINANCING_TRANSACTION',
    'REPRESENTATION_AUTHORITY',
    'TRANSACTION_PAYMENT',
    'OTHER',
  ]);
  assert.ok('normalized' in factProperties);
  assert.ok(!(factItem.required as string[]).includes('normalized'));

  const comparisonItem = properties.comparisons.items as Record<string, unknown>;
  const comparisonProperties = comparisonItem.properties as Record<string, Record<string, unknown>>;
  assert.deepEqual(comparisonProperties.result.enum, [
    'EXACT_MATCH',
    'NORMALIZED_EQUIVALENT',
    'TEMPORAL_CHANGE',
    'DIFFERENT_VALUE',
    'POSSIBLE_CONTRADICTION',
    'AUTHORITY_SCOPE_DIFFERENCE',
    'PARTIAL_OVERLAP',
    'STATUS_TRANSITION',
  ]);
  assert.equal(comparisonProperties.factIds.minItems, 2);
  assert.equal(jsonSchema.additionalProperties, false);
});
