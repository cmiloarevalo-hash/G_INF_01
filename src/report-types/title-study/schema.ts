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

export const titleStudySchema = z.strictObject({
  reportType: z.literal('TITLE_STUDY'),
  sourceDocuments: z.array(titleStudySourceDocumentSchema).min(1),
  findings: z.array(titleStudyFindingSchema).optional(),
  comparisons: z.array(titleStudyComparisonSchema).optional(),
  conclusions: z.array(titleStudyConclusionSchema).optional(),
});

export type TitleStudy = z.infer<typeof titleStudySchema>;

/** Derives Draft 2020-12 JSON Schema from the executable Zod contract. */
export function toTitleStudyJsonSchema() {
  return z.toJSONSchema(titleStudySchema, { target: 'draft-2020-12' });
}
