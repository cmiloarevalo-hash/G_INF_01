import * as z from 'zod';

const identifierSchema = z.string().min(1);

export const titleStudySourceDocumentSchema = z.strictObject({
  id: identifierSchema,
  documentType: identifierSchema,
  name: identifierSchema,
});

export const titleStudyDocumentValueSchema = z.strictObject({
  documentId: identifierSchema,
  field: identifierSchema,
  original: z.string(),
  normalized: z.string().optional(),
});

export const titleStudyFindingSchema = z.strictObject({
  id: identifierSchema,
  statement: identifierSchema,
  sourceDocumentIds: z.array(identifierSchema).min(1),
  values: z.array(titleStudyDocumentValueSchema).optional(),
});

export const titleStudyComparisonSchema = z.strictObject({
  id: identifierSchema,
  field: identifierSchema,
  values: z.array(titleStudyDocumentValueSchema).min(2),
  result: z.enum([
    'CONSISTENT',
    'NORMALIZED_EQUIVALENT',
    'DIFFERENT',
    'POSSIBLE_CONTRADICTION',
    'INSUFFICIENT_INFORMATION',
  ]),
  explanation: z.string().optional(),
});

export const titleStudyConclusionSchema = z.strictObject({
  id: identifierSchema,
  statement: identifierSchema,
  supportingFindingIds: z.array(identifierSchema).min(1),
});

const titleStudyStructureSchema = z.strictObject({
  reportType: z.literal('TITLE_STUDY'),
  sourceDocuments: z.array(titleStudySourceDocumentSchema).min(1),
  findings: z.array(titleStudyFindingSchema).optional(),
  comparisons: z.array(titleStudyComparisonSchema).optional(),
  conclusions: z.array(titleStudyConclusionSchema).optional(),
});

export const titleStudySchema = titleStudyStructureSchema.superRefine((report, context) => {
  const sourceDocumentIds = new Set<string>();
  report.sourceDocuments.forEach((document, index) => {
    if (sourceDocumentIds.has(document.id)) {
      context.addIssue({
        code: 'custom',
        path: ['sourceDocuments', index, 'id'],
        message: `Duplicate source document id: ${document.id}`,
      });
    }
    sourceDocumentIds.add(document.id);
  });

  const findingIds = new Set<string>();
  report.findings?.forEach((finding, index) => {
    if (findingIds.has(finding.id)) {
      context.addIssue({
        code: 'custom',
        path: ['findings', index, 'id'],
        message: `Duplicate finding id: ${finding.id}`,
      });
    }
    findingIds.add(finding.id);

    finding.sourceDocumentIds.forEach((documentId, referenceIndex) => {
      if (!sourceDocumentIds.has(documentId)) {
        context.addIssue({
          code: 'custom',
          path: ['findings', index, 'sourceDocumentIds', referenceIndex],
          message: `Unknown source document id: ${documentId}`,
        });
      }
    });

    finding.values?.forEach((value, valueIndex) => {
      if (!sourceDocumentIds.has(value.documentId)) {
        context.addIssue({
          code: 'custom',
          path: ['findings', index, 'values', valueIndex, 'documentId'],
          message: `Unknown source document id: ${value.documentId}`,
        });
      }
    });
  });

  report.comparisons?.forEach((comparison, comparisonIndex) => {
    comparison.values.forEach((value, valueIndex) => {
      if (!sourceDocumentIds.has(value.documentId)) {
        context.addIssue({
          code: 'custom',
          path: ['comparisons', comparisonIndex, 'values', valueIndex, 'documentId'],
          message: `Unknown source document id: ${value.documentId}`,
        });
      }
    });
  });

  report.conclusions?.forEach((conclusion, conclusionIndex) => {
    conclusion.supportingFindingIds.forEach((findingId, referenceIndex) => {
      if (!findingIds.has(findingId)) {
        context.addIssue({
          code: 'custom',
          path: ['conclusions', conclusionIndex, 'supportingFindingIds', referenceIndex],
          message: `Unknown finding id: ${findingId}`,
        });
      }
    });
  });
});

export type TitleStudy = z.infer<typeof titleStudySchema>;

/** Derives Draft 2020-12 JSON Schema from the executable Zod contract. */
export function toTitleStudyJsonSchema() {
  return z.toJSONSchema(titleStudySchema, { target: 'draft-2020-12' });
}
