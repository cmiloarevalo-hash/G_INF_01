import type {
  ConfirmedDriveFile,
  DriveAuthorizationService,
  DriveLocalFileUploadInput,
  DriveLocalFileUploadService,
  DriveTransport,
} from './types.js';

const DRIVE_RESUMABLE_UPLOAD_ENDPOINT =
  'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id%2Cname%2CmimeType';

export type DriveUploadStage = 'authorization' | 'initiation' | 'content';

export class DriveUploadError extends Error {
  readonly stage: DriveUploadStage;
  readonly status: number | null;

  constructor(
    message: string,
    stage: DriveUploadStage,
    status: number | null = null,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'DriveUploadError';
    this.stage = stage;
    this.status = status;
  }
}

function requireText(value: string, label: string): string {
  if (!value.trim()) {
    throw new DriveUploadError(`${label} is required.`, 'initiation');
  }
  return value;
}

function requireByteLength(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new DriveUploadError(
      'File byte length must be a non-negative safe integer.',
      'initiation',
    );
  }
  return value;
}

async function send(
  transport: DriveTransport,
  input: RequestInfo | URL,
  init: RequestInit,
  stage: Exclude<DriveUploadStage, 'authorization'>,
): Promise<Response> {
  try {
    return await transport(input, init);
  } catch (error) {
    throw new DriveUploadError(
      `Drive ${stage} request failed before confirmation.`,
      stage,
      null,
      { cause: error },
    );
  }
}

function parseConfirmedFile(payload: unknown, status: number): ConfirmedDriveFile {
  if (
    typeof payload !== 'object' ||
    payload === null ||
    !('id' in payload) ||
    typeof (payload as { id?: unknown }).id !== 'string' ||
    !(payload as { id: string }).id.trim()
  ) {
    throw new DriveUploadError(
      'Drive upload response did not contain a confirmed file ID.',
      'content',
      status,
    );
  }

  const record = payload as { id: string; name?: unknown; mimeType?: unknown };
  return {
    id: record.id.trim(),
    ...(typeof record.name === 'string' ? { name: record.name } : {}),
    ...(typeof record.mimeType === 'string' ? { mimeType: record.mimeType } : {}),
  };
}

export function createDriveLocalFileUploadService(
  authorization: DriveAuthorizationService,
  transport: DriveTransport,
): DriveLocalFileUploadService {
  return {
    async upload(input: DriveLocalFileUploadInput) {
      const accessToken = authorization.getAccessToken();
      if (!accessToken) {
        throw new DriveUploadError(
          'Drive authorization is required before uploading a local file.',
          'authorization',
        );
      }

      const name = requireText(input.name, 'File name');
      const mimeType = requireText(input.mimeType, 'File MIME type');
      const documentsFolderId = requireText(
        input.documentsFolderId,
        'Documents folder ID',
      );
      const byteLength = requireByteLength(input.byteLength);

      const initiationResponse = await send(
        transport,
        DRIVE_RESUMABLE_UPLOAD_ENDPOINT,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-Upload-Content-Type': mimeType,
            'X-Upload-Content-Length': String(byteLength),
          },
          body: JSON.stringify({
            name,
            mimeType,
            parents: [documentsFolderId],
          }),
        },
        'initiation',
      );

      if (!initiationResponse.ok) {
        throw new DriveUploadError(
          `Drive resumable upload initiation was not confirmed (HTTP ${initiationResponse.status}).`,
          'initiation',
          initiationResponse.status,
        );
      }

      const sessionUrl = initiationResponse.headers.get('Location')?.trim();
      if (!sessionUrl) {
        throw new DriveUploadError(
          'Drive resumable upload initiation did not return a session URL.',
          'initiation',
          initiationResponse.status,
        );
      }

      const uploadResponse = await send(
        transport,
        sessionUrl,
        {
          method: 'PUT',
          headers: {
            'Content-Type': mimeType,
          },
          body: input.body,
        },
        'content',
      );

      if (!uploadResponse.ok) {
        throw new DriveUploadError(
          `Drive file content upload was not confirmed (HTTP ${uploadResponse.status}).`,
          'content',
          uploadResponse.status,
        );
      }

      let payload: unknown;
      try {
        payload = await uploadResponse.json();
      } catch (error) {
        throw new DriveUploadError(
          'Drive file content upload response was not valid JSON.',
          'content',
          uploadResponse.status,
          { cause: error },
        );
      }

      return parseConfirmedFile(payload, uploadResponse.status);
    },
  };
}
