import * as z from 'zod';

const identifierSchema = z.string().min(1);
const nonEmptyString = z.string().min(1);

export const titleStudyFactCategorySchema = z.enum([
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

export const titleStudySourceDocumentSchema = z.strictObject({
  id: identifierSchema,
  documentType: identifierSchema.optional(),
  name: identifierSchema,
  issuer: nonEmptyString.optional(),
  issueDate: nonEmptyString.optional(),
});

export const titleStudyEvidenceLocatorSchema = z.strictObject({
  documentId: identifierSchema,
  page: z.number().int().positive().optional(),
  section: nonEmptyString.optional(),
}).refine(
  (locator) => locator.page !== undefined || locator.section !== undefined,
  { message: 'An evidence locator requires page or section.' },
);

export const titleStudyFactSchema = z.strictObject({
  id: identifierSchema,
  category: titleStudyFactCategorySchema,
  label: nonEmptyString,
  original: nonEmptyString,
  normalized: nonEmptyString.optional(),
  sourceDocumentIds: z.array(identifierSchema).min(1),
  evidenceLocators: z.array(titleStudyEvidenceLocatorSchema).min(1).optional(),
  entityIds: z.array(identifierSchema).min(1).optional(),
});

export const titleStudyEntitySchema = z.strictObject({
  id: identifierSchema,
  type: z.enum([
    'PERSON',
    'LEGAL_ENTITY',
    'PROPERTY',
    'RIGHT',
    'REGISTRATION',
    'AUTHORITY',
    'OTHER',
  ]),
  label: nonEmptyString,
  sourceDocumentIds: z.array(identifierSchema).min(1),
});

export const titleStudyRelationshipSchema = z.strictObject({
  id: identifierSchema,
  type: nonEmptyString,
  fromEntityId: identifierSchema,
  toEntityId: identifierSchema,
  statement: nonEmptyString,
  sourceDocumentIds: z.array(identifierSchema).min(1),
});

export const titleStudyComparisonSchema = z.strictObject({
  id: identifierSchema,
  topic: nonEmptyString,
  factIds: z.array(identifierSchema).min(2),
  result: z.enum([
    'EXACT_MATCH',
    'NORMALIZED_EQUIVALENT',
    'TEMPORAL_CHANGE',
    'DIFFERENT_VALUE',
    'POSSIBLE_CONTRADICTION',
    'AUTHORITY_SCOPE_DIFFERENCE',
    'PARTIAL_OVERLAP',
    'STATUS_TRANSITION',
  ]),
  explanation: nonEmptyString,
});

export const titleStudyFindingSchema = z.strictObject({
  id: identifierSchema,
  statement: nonEmptyString,
  supportingFactIds: z.array(identifierSchema).min(1),
});

export const titleStudyRiskOrAlertSchema = z.strictObject({
  id: identifierSchema,
  statement: nonEmptyString,
  supportingFactIds: z.array(identifierSchema).min(1),
});

export const titleStudyConclusionSchema = z.strictObject({
  id: identifierSchema,
  statement: nonEmptyString,
  supportingFindingIds: z.array(identifierSchema).min(1),
});

export const titleStudyTimelineEventSchema = z.strictObject({
  id: identifierSchema,
  dateOriginal: nonEmptyString,
  dateNormalized: nonEmptyString.optional(),
  event: nonEmptyString,
  supportingFactIds: z.array(identifierSchema).min(1),
});

const titleStudyStructureSchema = z.strictObject({
  reportType: z.literal('TITLE_STUDY'),
  sourceDocuments: z.array(titleStudySourceDocumentSchema).min(1),
  facts: z.array(titleStudyFactSchema).optional(),
  entities: z.array(titleStudyEntitySchema).optional(),
  relationships: z.array(titleStudyRelationshipSchema).optional(),
  comparisons: z.array(titleStudyComparisonSchema).optional(),
  findings: z.array(titleStudyFindingSchema).optional(),
  risksOrAlerts: z.array(titleStudyRiskOrAlertSchema).optional(),
  conclusions: z.array(titleStudyConclusionSchema).optional(),
  timeline: z.array(titleStudyTimelineEventSchema).optional(),
});

function addDuplicateIssues(
  values: Array<{ id: string }> | undefined,
  path: string,
  context: z.RefinementCtx,
): Set<string> {
  const ids = new Set<string>();
  values?.forEach((value, index) => {
    if (ids.has(value.id)) {
      context.addIssue({
        code: 'custom',
        path: [path, index, 'id'],
        message: `Duplicate ${path} id: ${value.id}`,
      });
    }
    ids.add(value.id);
  });
  return ids;
}

function requireReferences(
  references: string[],
  validIds: Set<string>,
  path: Array<string | number>,
  context: z.RefinementCtx,
  label: string,
) {
  references.forEach((id, index) => {
    if (!validIds.has(id)) {
      context.addIssue({
        code: 'custom',
        path: [...path, index],
        message: `Unknown ${label} id: ${id}`,
      });
    }
  });
}

export const titleStudySchema = titleStudyStructureSchema.superRefine((report, context) => {
  const sourceDocumentIds = addDuplicateIssues(report.sourceDocuments, 'sourceDocuments', context);
  const factIds = addDuplicateIssues(report.facts, 'facts', context);
  const entityIds = addDuplicateIssues(report.entities, 'entities', context);
  const findingIds = addDuplicateIssues(report.findings, 'findings', context);

  addDuplicateIssues(report.relationships, 'relationships', context);
  addDuplicateIssues(report.comparisons, 'comparisons', context);
  addDuplicateIssues(report.risksOrAlerts, 'risksOrAlerts', context);
  addDuplicateIssues(report.conclusions, 'conclusions', context);
  addDuplicateIssues(report.timeline, 'timeline', context);

  report.facts?.forEach((fact, index) => {
    requireReferences(
      fact.sourceDocumentIds,
      sourceDocumentIds,
      ['facts', index, 'sourceDocumentIds'],
      context,
      'source document',
    );
    if (fact.entityIds) {
      requireReferences(fact.entityIds, entityIds, ['facts', index, 'entityIds'], context, 'entity');
    }
    fact.evidenceLocators?.forEach((locator, locatorIndex) => {
      if (!sourceDocumentIds.has(locator.documentId)) {
        context.addIssue({
          code: 'custom',
          path: ['facts', index, 'evidenceLocators', locatorIndex, 'documentId'],
          message: `Unknown source document id: ${locator.documentId}`,
        });
      } else if (!fact.sourceDocumentIds.includes(locator.documentId)) {
        context.addIssue({
          code: 'custom',
          path: ['facts', index, 'evidenceLocators', locatorIndex, 'documentId'],
          message: `Evidence locator document is not listed in fact sourceDocumentIds: ${locator.documentId}`,
        });
      }
    });
  });

  report.entities?.forEach((entity, index) => {
    requireReferences(
      entity.sourceDocumentIds,
      sourceDocumentIds,
      ['entities', index, 'sourceDocumentIds'],
      context,
      'source document',
    );
  });

  report.relationships?.forEach((relationship, index) => {
    if (!entityIds.has(relationship.fromEntityId)) {
      context.addIssue({
        code: 'custom',
        path: ['relationships', index, 'fromEntityId'],
        message: `Unknown entity id: ${relationship.fromEntityId}`,
      });
    }
    if (!entityIds.has(relationship.toEntityId)) {
      context.addIssue({
        code: 'custom',
        path: ['relationships', index, 'toEntityId'],
        message: `Unknown entity id: ${relationship.toEntityId}`,
      });
    }
    requireReferences(
      relationship.sourceDocumentIds,
      sourceDocumentIds,
      ['relationships', index, 'sourceDocumentIds'],
      context,
      'source document',
    );
  });

  report.comparisons?.forEach((comparison, index) => {
    requireReferences(comparison.factIds, factIds, ['comparisons', index, 'factIds'], context, 'fact');
    if (new Set(comparison.factIds).size !== comparison.factIds.length) {
      context.addIssue({
        code: 'custom',
        path: ['comparisons', index, 'factIds'],
        message: 'Comparison factIds must be unique.',
      });
    }
  });

  report.findings?.forEach((finding, index) => {
    requireReferences(
      finding.supportingFactIds,
      factIds,
      ['findings', index, 'supportingFactIds'],
      context,
      'fact',
    );
  });

  report.risksOrAlerts?.forEach((risk, index) => {
    requireReferences(
      risk.supportingFactIds,
      factIds,
      ['risksOrAlerts', index, 'supportingFactIds'],
      context,
      'fact',
    );
  });

  report.conclusions?.forEach((conclusion, index) => {
    requireReferences(
      conclusion.supportingFindingIds,
      findingIds,
      ['conclusions', index, 'supportingFindingIds'],
      context,
      'finding',
    );
  });

  report.timeline?.forEach((event, index) => {
    requireReferences(
      event.supportingFactIds,
      factIds,
      ['timeline', index, 'supportingFactIds'],
      context,
      'fact',
    );
  });
});

export type TitleStudy = z.infer<typeof titleStudySchema>;

/** Derives Draft 2020-12 JSON Schema from the executable Zod contract. */
export function toTitleStudyJsonSchema() {
  return z.toJSONSchema(titleStudySchema, { target: 'draft-2020-12' });
}
