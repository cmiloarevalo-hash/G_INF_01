import type { DriveTransport } from './types.js';

export const DRIVE_MULTIPART_UPLOAD_URL =
  'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id%2Cname%2CmimeType';

export interface LocalDriveDocument {
  name: string;
  mimeType: string;
  data: Uint8Array | Blob;
}

export interface ConfirmedDriveFile {
  id: string;
  name: string;
  mimeType: string;
}

export class DriveUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DriveUploadError';
  }
}

function requireText(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) throw new DriveUploadError(`Se requiere ${label}.`);
  return normalized;
}

async function fileBytes(data: Uint8Array | Blob): Promise<Uint8Array> {
  if (data instanceof Uint8Array) return data;
  return new Uint8Array(await data.arrayBuffer());
}

function concat(parts: Uint8Array[]): Uint8Array {
  const length = parts.reduce((total, part) => total + part.byteLength, 0);
  const output = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.byteLength;
  }
  return output;
}

function confirmedFile(value: unknown): ConfirmedDriveFile {
  if (!value || typeof value !== 'object') {
    throw new DriveUploadError('Drive devolvió una respuesta de archivo inválida.');
  }
  const record = value as Record<string, unknown>;
  if (typeof record.id !== 'string' || !record.id.trim()) {
    throw new DriveUploadError('Drive no confirmó el identificador del archivo.');
  }
  if (typeof record.name !== 'string' || !record.name.trim()) {
    throw new DriveUploadError('Drive no confirmó el nombre del archivo.');
  }
  if (typeof record.mimeType !== 'string' || !record.mimeType.trim()) {
    throw new DriveUploadError('Drive no confirmó el MIME type del archivo.');
  }
  return { id: record.id, name: record.name, mimeType: record.mimeType };
}

export async function uploadLocalDocument(
  transport: DriveTransport,
  accessToken: string,
  documentsFolderId: string,
  file: LocalDriveDocument,
): Promise<ConfirmedDriveFile> {
  const token = requireText(accessToken, 'token de acceso');
  const parent = requireText(documentsFolderId, 'carpeta Documentos');
  const name = requireText(file.name, 'nombre de archivo');
  const mimeType = requireText(file.mimeType, 'MIME type');
  const bytes = await fileBytes(file.data);
  const boundary = 'g_inf_01_drive_multipart';
  const encoder = new TextEncoder();

  const metadata = JSON.stringify({ name, parents: [parent] });
  const body = concat([
    encoder.encode(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`),
    encoder.encode(`--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`),
    bytes,
    encoder.encode(`\r\n--${boundary}--\r\n`),
  ]);

  const response = await transport.send({
    method: 'POST',
    url: DRIVE_MULTIPART_UPLOAD_URL,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  });

  if (response.status < 200 || response.status >= 300) {
    throw new DriveUploadError(`Drive rechazó el archivo (HTTP ${response.status}).`);
  }

  return confirmedFile(response.json);
}
