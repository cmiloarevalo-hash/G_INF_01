import * as z from 'zod';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { titleStudySchema, toTitleStudyJsonSchema, type TitleStudy } from '../../report-types/title-study/schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const GEMINI_MODEL = 'gemini-3.6-flash';
export const GEMINI_INTERACTIONS_URL = 'https://generativelanguage.googleapis.com/v1beta/interactions';
export const MAX_INLINE_FILE_BYTES = 70 * 1024 * 1024;
export const MAX_PDF_BYTES = 50 * 1024 * 1024;

export const guestDocumentFactsSchema = z.strictObject({
  documentType: z.string().min(1),
  findings: z.array(z.strictObject({
    statement: z.string().min(1),
    values: z.array(z.strictObject({
      field: z.string().min(1),
      original: z.string(),
      normalized: z.string().optional(),
    })).optional(),
  })),
});

export type ExtractedFacts = z.infer<typeof guestDocumentFactsSchema>;
export type GeminiFetch = typeof fetch;

export interface GuestDocumentInput {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  data: string;
}

export interface GeminiInputPart {
  type: 'text' | 'document' | 'image';
  text?: string;
  data?: string;
  mime_type?: string;
}

function userFacingProviderError(status: number, message: string, apiKey: string): Error {
  const clean = message.replace(/AIza[\w-]{20,}/g, '[clave omitida]')
    .split(apiKey).join('[clave omitida]').slice(0, 500);
  if (status === 429) return new Error(`Gemini no pudo completar el análisis por cuota o límite de solicitudes (HTTP 429): ${clean}`);
  if (status === 401 || status === 403) return new Error(`Gemini rechazó la clave o no tiene acceso al modelo ${GEMINI_MODEL} (HTTP ${status}): ${clean}`);
  return new Error(`Gemini devolvió un error HTTP ${status}: ${clean}`);
}

export function toGeminiJsonSchema(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(toGeminiJsonSchema);
  if (!schema || typeof schema !== 'object') return schema;
  const value = schema as Record<string, unknown>;
  const converted: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    if (key === '$schema') continue;
    if (key === 'const') converted.enum = [child];
    else converted[key] = toGeminiJsonSchema(child);
  }
  return converted;
}

export function extractInteractionOutputText(body: Record<string, unknown>): string {
  if (body.status !== 'completed') {
    throw new Error(`Gemini no entregó una respuesta completa (estado ${String(body.status)}).`);
  }
  if (Array.isArray(body.steps)) {
    const modelOutputs = body.steps.filter((step): step is Record<string, unknown> =>
      Boolean(step && typeof step === 'object' && (step as Record<string, unknown>).type === 'model_output')
    );
    if (modelOutputs.length === 0) {
      throw new Error('Gemini no devolvió texto estructurado completo.');
    }
    const finalOutput = modelOutputs[modelOutputs.length - 1];
    const content = Array.isArray(finalOutput.content) ? finalOutput.content : [];
    const textParts = content
      .filter((item): item is Record<string, unknown> =>
        Boolean(item && typeof item === 'object' && (item as Record<string, unknown>).type === 'text' && typeof (item as Record<string, unknown>).text === 'string')
      )
      .map((item) => item.text as string);
    const combined = textParts.join('').trim();
    if (!combined) {
      throw new Error('Gemini no devolvió texto estructurado completo.');
    }
    return combined;
  }
  if (typeof body.output_text === 'string' && body.output_text.trim()) {
    return body.output_text.trim();
  }
  throw new Error('Gemini no devolvió texto estructurado completo.');
}

async function callGemini(apiKey: string, input: GeminiInputPart[], schema: unknown, fetchImpl: GeminiFetch): Promise<unknown> {
  let response: Response;
  try {
    response = await fetchImpl(GEMINI_INTERACTIONS_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
      signal: AbortSignal.timeout(120_000),
      body: JSON.stringify({
        model: GEMINI_MODEL,
        store: false,
        input,
        response_format: { type: 'text', mime_type: 'application/json', schema: toGeminiJsonSchema(schema) },
      }),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'TimeoutError') throw new Error('Gemini excedió el tiempo máximo de 120 segundos; no se generó un resultado.');
    throw new Error('No se pudo completar la conexión con Gemini; no se generó un resultado.');
  }
  const body = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) {
    const errorBody = body.error as { message?: unknown } | undefined;
    throw userFacingProviderError(response.status, typeof errorBody?.message === 'string' ? errorBody.message : 'Error del proveedor.', apiKey);
  }
  const rawText = extractInteractionOutputText(body);
  try {
    return JSON.parse(rawText) as unknown;
  } catch {
    throw new Error('Gemini devolvió JSON inválido o truncado; no se muestra como resultado.');
  }
}

function decodeBase64(value: string): Uint8Array {
  return Uint8Array.from(Buffer.from(value, 'base64'));
}

function detectReadableInput(file: GuestDocumentInput): { input: GeminiInputPart; supported: true } | { supported: false; reason: string } {
  const bytes = decodeBase64(file.data);
  const lower = file.name.toLowerCase();
  if (bytes.byteLength !== file.size) return { supported: false, reason: 'El archivo recibido está incompleto.' };
  if (bytes.byteLength > MAX_INLINE_FILE_BYTES) return { supported: false, reason: 'Supera 70 MiB, límite derivado del máximo de 100 MB del payload Gemini y la codificación Base64.' };
  if (lower.endsWith('.pdf')) {
    if (bytes.byteLength > MAX_PDF_BYTES) return { supported: false, reason: 'Los PDF inline tienen un máximo técnico de 50 MiB en Gemini.' };
    if (new TextDecoder().decode(bytes.slice(0, 1024)).includes('%PDF-')) {
      return { supported: true, input: { type: 'document', data: file.data, mime_type: 'application/pdf' } };
    }
    return { supported: false, reason: 'La extensión es PDF, pero no se encontró una firma PDF válida en el encabezado.' };
  }
  if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg')) {
    const png = lower.endsWith('.png');
    const valid = png
      ? bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value)
      : bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    if (!valid) return { supported: false, reason: 'La extensión de imagen no coincide con su firma PNG/JPEG.' };
    return { supported: true, input: { type: 'image', data: file.data, mime_type: png ? 'image/png' : 'image/jpeg' } };
  }
  if (lower.endsWith('.txt') || lower.endsWith('.md') || lower.endsWith('.markdown')) {
    try {
      const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      if (text.includes('\u0000')) return { supported: false, reason: 'El archivo contiene bytes nulos y no se reconoce como texto legible.' };
      return { supported: true, input: { type: 'text', text: `Documento: ${file.name}\n\n${text}` } };
    } catch {
      return { supported: false, reason: 'El archivo no contiene texto UTF-8 legible.' };
    }
  }
  return { supported: false, reason: 'Formato aún no procesado en este piloto. Se conserva el archivo seleccionado.' };
}

export async function extractGuestDocument(
  apiKey: string,
  file: GuestDocumentInput,
  fetchImpl: GeminiFetch = fetch,
): Promise<{ documentId: string; name: string; extraction: ExtractedFacts }> {
  const detected = detectReadableInput(file);
  if (!detected.supported) throw new Error(detected.reason);
  if (!apiKey.trim()) throw new Error('Ingresa tu clave de Gemini para esta sesión.');
  const instructions = `Analiza sólo el documento adjunto ${JSON.stringify(file.name)}. Extrae hechos inmobiliarios directamente sustentados. Conserva los valores originales y agrega normalized sólo cuando sea una normalización segura. No infieras hechos jurídicos ni inventes ausencias. Devuelve documentType y findings; findings puede estar vacío.`;
  const jsonSchema = z.toJSONSchema(guestDocumentFactsSchema, { target: 'draft-2020-12' });
  const parsed = guestDocumentFactsSchema.parse(await callGemini(apiKey, [{ type: 'text', text: instructions }, detected.input], jsonSchema, fetchImpl));
  return { documentId: file.id, name: file.name, extraction: parsed };
}

export async function synthesizeTitleStudy(
  apiKey: string,
  extractions: Array<{ documentId: string; name: string; extraction: ExtractedFacts }>,
  fetchImpl: GeminiFetch = fetch,
): Promise<TitleStudy> {
  if (!apiKey.trim()) throw new Error('Ingresa tu clave de Gemini para esta sesión.');
  if (extractions.length === 0) throw new Error('No hay documentos legibles para consolidar.');
  const prompt = await readFile(path.resolve(__dirname, '../../report-types/title-study/prompt.md'), 'utf8');
  const documents = extractions.map(({ documentId, name, extraction }) => ({
    document: { id: documentId, name, documentType: extraction.documentType },
    findings: extraction.findings.map((finding, index) => ({
      id: `${documentId}-finding-${index + 1}`,
      statement: finding.statement,
      sourceDocumentIds: [documentId],
      values: finding.values?.map((value) => ({ documentId, ...value })),
    })),
  }));
  const response = await callGemini(apiKey, [
    { type: 'text', text: `${prompt}\n\nExtractos por documento:\n${JSON.stringify(documents)}` },
  ], toTitleStudyJsonSchema(), fetchImpl);
  const parsed = titleStudySchema.parse(response);
  const expectedDocuments = new Map(extractions.map((item) => [item.documentId, { name: item.name, documentType: item.extraction.documentType }]));
  if (parsed.sourceDocuments.length !== expectedDocuments.size) {
    throw new Error('La respuesta de Gemini omitió o agregó documentos fuente; no se muestra como análisis completo.');
  }
  for (const source of parsed.sourceDocuments) {
    const expected = expectedDocuments.get(source.id);
    if (!expected || expected.name !== source.name || expected.documentType !== source.documentType) {
      throw new Error('La respuesta de Gemini cambió la identidad de un documento fuente; no se muestra como informe válido.');
    }
  }
  return parsed;
}
