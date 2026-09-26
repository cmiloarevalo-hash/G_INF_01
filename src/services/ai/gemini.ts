import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { titleStudySchema, toTitleStudyJsonSchema, type TitleStudy } from '../../report-types/title-study/schema.js';
import { selectionLimitError } from '../../shared/guest-limits.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function loadTitleStudyPrompt(): Promise<string> {
  const candidatePaths = [
    path.resolve(__dirname, '../../report-types/title-study/prompt.md'),
    path.resolve(__dirname, '../../../../src/report-types/title-study/prompt.md'),
    path.resolve(process.cwd(), 'src/report-types/title-study/prompt.md'),
    path.resolve(process.cwd(), 'dist/src/report-types/title-study/prompt.md'),
  ];
  for (const candidate of candidatePaths) {
    try {
      return await readFile(candidate, 'utf8');
    } catch {
      // try next candidate
    }
  }
  throw new Error('No se pudo encontrar la plantilla prompt.md del estudio de títulos.');
}

export const GEMINI_MODEL = 'gemini-3.6-flash';
export const GEMINI_INTERACTIONS_URL = 'https://generativelanguage.googleapis.com/v1beta/interactions';

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

export type DocumentStatus = { id: string; name: string; status: 'Analizado' | 'No analizado'; reason?: string };

function detectReadableInput(file: GuestDocumentInput): { input: GeminiInputPart; supported: true } | { supported: false; reason: string } {
  const lower = file.name.toLowerCase();
  if (!/\.(pdf|png|jpe?g|txt|md|markdown)$/.test(lower)) return { supported: false, reason: 'Formato aún no procesado en este piloto. Se conserva el archivo seleccionado.' };
  if (file.size === 0) return { supported: false, reason: 'El archivo está vacío (0 B); no se envió a Gemini.' };
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(file.data)) return { supported: false, reason: 'El contenido Base64 del archivo no es válido.' };
  const bytes = Uint8Array.from(Buffer.from(file.data, 'base64'));
  if (bytes.byteLength !== file.size) return { supported: false, reason: 'El archivo recibido está incompleto.' };
  if (lower.endsWith('.pdf')) {
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

export async function analyzeGuestDocuments(
  apiKey: string,
  files: GuestDocumentInput[],
  fetchImpl: GeminiFetch = fetch,
): Promise<{ report?: TitleStudy; statuses: DocumentStatus[]; partial: boolean; error?: string }> {
  const limit = selectionLimitError(files);
  if (limit) return { statuses: files.map(({ id, name }) => ({ id, name, status: 'No analizado', reason: limit })), partial: false, error: limit };
  if (!apiKey.trim()) throw new Error('Ingresa tu clave de Gemini para esta sesión.');
  const input: GeminiInputPart[] = [];
  const sent: GuestDocumentInput[] = [];
  const statuses: DocumentStatus[] = [];
  for (const file of files) {
    const detected = detectReadableInput(file);
    if (!detected.supported) {
      statuses.push({ id: file.id, name: file.name, status: 'No analizado', reason: detected.reason });
      continue;
    }
    sent.push(file);
    statuses.push({ id: file.id, name: file.name, status: 'No analizado', reason: 'Enviado a Gemini; todavía no hay un resultado validado.' });
    input.push({ type: 'text', text: `Fuente ${JSON.stringify({ id: file.id, name: file.name })}. Identifica esta fuente por ese ID y nombre en sourceDocuments.` }, detected.input);
  }
  if (sent.length === 0) return { statuses, partial: true, error: 'Ningún archivo técnicamente legible se envió a Gemini.' };
  const prompt = await loadTitleStudyPrompt();
  try {
    const response = await callGemini(apiKey, [{ type: 'text', text: prompt }, ...input], toTitleStudyJsonSchema(), fetchImpl);
    const parsed = titleStudySchema.parse(response);
    const expectedDocuments = new Map(sent.map((item) => [item.id, item.name]));
    if (parsed.sourceDocuments.length !== expectedDocuments.size || parsed.sourceDocuments.some((source) => expectedDocuments.get(source.id) !== source.name)) {
      throw new Error('La respuesta de Gemini omitió, agregó o cambió la identidad de un documento fuente; no se muestra como informe válido.');
    }
    return { report: parsed, statuses: statuses.map((item) => expectedDocuments.has(item.id) ? { id: item.id, name: item.name, status: 'Analizado' } : item), partial: sent.length !== files.length };
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'No se obtuvo un resultado verificable de Gemini.';
    return { statuses: statuses.map((item) => sent.some((file) => file.id === item.id) ? { ...item, reason: `Enviado, sin resultado validado: ${reason}` } : item), partial: sent.length !== files.length, error: reason };
  }
}
