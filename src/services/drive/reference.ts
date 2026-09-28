import type {
  DriveAuthorizationService,
  DriveTransport,
} from './types.js';

const DRIVE_FILE_FIELDS =
  'id,name,mimeType,trashed,size';
const DEFAULT_MAX_BYTES = 20 * 1024 * 1024;

export type DriveReferenceStatus =
  | { status: 'available'; file: DriveReferencedFile }
  | { status: 'not-found' }
  | { status: 'unavailable' }
  | { status: 'authorization-required' };

export interface DriveReferencedFile {
  id: string;
  name?: string;
  mimeType?: string;
  content: ArrayBuffer;
}

export interface DriveReferenceReader {
  read(fileId: string): Promise<DriveReferenceStatus>;
}

export type DriveReferenceFailureKind =
  | 'network'
  | 'quota'
  | 'storage'
  | 'api'
  | 'too-large'
  | 'invalid-response';

export class DriveReferenceError extends Error {
  readonly kind: DriveReferenceFailureKind;
  readonly status: number | null;

  constructor(
    message: string,
    kind: DriveReferenceFailureKind,
    status: number | null = null,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'DriveReferenceError';
    this.kind = kind;
    this.status = status;
  }
}

function requireText(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new DriveReferenceError(
      `${label} is required.`,
      'invalid-response',
    );
  }
  return normalized;
}

function classifyFailure(status: number): DriveReferenceFailureKind {
  if (status === 429) return 'quota';
  if (status === 507) return 'storage';
  return 'api';
}

async function send(
  transport: DriveTransport,
  input: RequestInfo | URL,
  init: RequestInit,
): Promise<Response> {
  try {
    return await transport(input, init);
  } catch (error) {
    throw new DriveReferenceError(
      'Drive read request failed before confirmation.',
      'network',
      null,
      { cause: error },
    );
  }
}

function optionalText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized || undefined;
}

type ResizableArrayBufferLike = ArrayBuffer & {
  readonly resizable: boolean;
  resize(newByteLength: number): void;
};

function createResizableBuffer(maxBytes: number): ResizableArrayBufferLike {
  const BufferConstructor = ArrayBuffer as unknown as new (
    byteLength: number,
    options: { maxByteLength: number },
  ) => ResizableArrayBufferLike;
  const buffer = new BufferConstructor(0, { maxByteLength: maxBytes });
  if (!buffer.resizable || typeof buffer.resize !== 'function') {
    throw new DriveReferenceError(
      'This runtime cannot enforce bounded streaming Drive reads.',
      'invalid-response',
    );
  }
  return buffer;
}

function confirmedContentLength(response: Response): number | null {
  const raw = response.headers.get('Content-Length');
  if (raw === null) return null;
  const normalized = raw.trim();
  if (!/^\d+$/.test(normalized)) return null;

  const value = Number(normalized);
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

async function readBodyBounded(
  response: Response,
  maxBytes: number,
): Promise<ArrayBuffer> {
  const contentLength = confirmedContentLength(response);
  if (contentLength !== null && contentLength > maxBytes) {
    await response.body?.cancel().catch(() => undefined);
    throw new DriveReferenceError(
      'Drive file exceeds the configured in-memory read limit.',
      'too-large',
      response.status,
    );
  }

  if (!response.body) {
    return new ArrayBuffer(0);
  }

  const reader = response.body.getReader();
  const content = createResizableBuffer(maxBytes);
  let totalBytes = 0;

  try {
    while (true) {
      const result = await reader.read();
      if (result.done) break;

      const chunk = result.value;
      if (chunk.byteLength > maxBytes - totalBytes) {
        await reader.cancel().catch(() => undefined);
        throw new DriveReferenceError(
          'Drive file exceeds the configured in-memory read limit.',
          'too-large',
          response.status,
        );
      }

      const previousLength = totalBytes;
      totalBytes += chunk.byteLength;
      content.resize(totalBytes);
      new Uint8Array(
        content,
        previousLength,
        chunk.byteLength,
      ).set(chunk);
    }
  } finally {
    reader.releaseLock();
  }

  return content;
}

export function createDriveReferenceReader(
  authorization: DriveAuthorizationService,
  transport: DriveTransport,
  maxBytes = DEFAULT_MAX_BYTES,
): DriveReferenceReader {
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) {
    throw new DriveReferenceError(
      'Drive read byte limit must be a positive safe integer.',
      'invalid-response',
    );
  }

  return {
    async read(fileId) {
      const accessToken = authorization.getAccessToken()?.trim();
      if (!accessToken) {
        return { status: 'authorization-required' };
      }

      const id = requireText(fileId, 'Drive file ID');
      const encodedId = encodeURIComponent(id);
      const metadataResponse = await send(
        transport,
        `https://www.googleapis.com/drive/v3/files/${encodedId}?fields=${encodeURIComponent(DRIVE_FILE_FIELDS)}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (metadataResponse.status === 401) {
        authorization.requireReauthorization();
        return { status: 'authorization-required' };
      }
      if (metadataResponse.status === 404) {
        return { status: 'not-found' };
      }
      if (metadataResponse.status === 403) {
        return { status: 'unavailable' };
      }
      if (!metadataResponse.ok) {
        throw new DriveReferenceError(
          `Drive metadata read failed (HTTP ${metadataResponse.status}).`,
          classifyFailure(metadataResponse.status),
          metadataResponse.status,
        );
      }

      let metadata: unknown;
      try {
        metadata = await metadataResponse.json();
      } catch (error) {
        throw new DriveReferenceError(
          'Drive metadata response was not valid JSON.',
          'invalid-response',
          metadataResponse.status,
          { cause: error },
        );
      }

      if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
        throw new DriveReferenceError(
          'Drive metadata response was malformed.',
          'invalid-response',
          metadataResponse.status,
        );
      }

      const record = metadata as Record<string, unknown>;
      if (record.trashed === true) {
        return { status: 'not-found' };
      }

      const confirmedId = optionalText(record.id);
      if (!confirmedId || confirmedId !== id) {
        throw new DriveReferenceError(
          'Drive metadata response did not confirm the requested file ID.',
          'invalid-response',
          metadataResponse.status,
        );
      }

      const contentResponse = await send(
        transport,
        `https://www.googleapis.com/drive/v3/files/${encodedId}?alt=media`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (contentResponse.status === 401) {
        authorization.requireReauthorization();
        return { status: 'authorization-required' };
      }
      if (contentResponse.status === 404) {
        return { status: 'not-found' };
      }
      if (contentResponse.status === 403) {
        return { status: 'unavailable' };
      }
      if (!contentResponse.ok) {
        throw new DriveReferenceError(
          `Drive content read failed (HTTP ${contentResponse.status}).`,
          classifyFailure(contentResponse.status),
          contentResponse.status,
        );
      }

      const content = await readBodyBounded(
        contentResponse,
        maxBytes,
      );

      const name = optionalText(record.name);
      const mimeType = optionalText(record.mimeType);

      return {
        status: 'available',
        file: {
          id,
          content,
          ...(name ? { name } : {}),
          ...(mimeType ? { mimeType } : {}),
        },
      };
    },
  };
}
