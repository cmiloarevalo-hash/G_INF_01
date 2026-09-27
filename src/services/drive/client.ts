import {
  DRIVE_FOLDER_MIME_TYPE,
  type DriveClient,
  type DriveTransport,
} from './types.js';

const DRIVE_FILES_ENDPOINT = 'https://www.googleapis.com/drive/v3/files?fields=id';

export class DriveApiError extends Error {
  readonly status: number | null;

  constructor(message: string, status: number | null, options?: ErrorOptions) {
    super(message, options);
    this.name = 'DriveApiError';
    this.status = status;
  }
}

function requireValue(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new DriveApiError(`${label} is required.`, null);
  }
  return normalized;
}

export function createDriveClient(transport: DriveTransport): DriveClient {
  return {
    async createFolder(accessToken, input) {
      const token = requireValue(accessToken, 'Drive access token');
      const name = requireValue(input.name, 'Drive folder name');
      const parentId = input.parentId === undefined
        ? undefined
        : requireValue(input.parentId, 'Drive parent folder ID');

      let response: Response;
      try {
        response = await transport(DRIVE_FILES_ENDPOINT, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name,
            mimeType: DRIVE_FOLDER_MIME_TYPE,
            ...(parentId ? { parents: [parentId] } : {}),
          }),
        });
      } catch (error) {
        throw new DriveApiError('Drive folder request failed before confirmation.', null, {
          cause: error,
        });
      }

      if (!response.ok) {
        throw new DriveApiError(
          `Drive folder request was not confirmed (HTTP ${response.status}).`,
          response.status,
        );
      }

      let payload: unknown;
      try {
        payload = await response.json();
      } catch (error) {
        throw new DriveApiError('Drive folder response was not valid JSON.', response.status, {
          cause: error,
        });
      }

      if (
        typeof payload !== 'object' ||
        payload === null ||
        !('id' in payload) ||
        typeof (payload as { id?: unknown }).id !== 'string' ||
        !(payload as { id: string }).id.trim()
      ) {
        throw new DriveApiError(
          'Drive folder response did not contain a confirmed folder ID.',
          response.status,
        );
      }

      return { id: (payload as { id: string }).id.trim() };
    },
  };
}
