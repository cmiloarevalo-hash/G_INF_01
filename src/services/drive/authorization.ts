import {
  DRIVE_FILE_SCOPE,
  type DriveAuthorizationGateway,
  type DriveAuthorizationService,
  type DriveAuthorizationState,
} from './types.js';

export class DriveAuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DriveAuthorizationError';
  }
}

function messageFrom(cause: unknown): string {
  return cause instanceof Error && cause.message
    ? cause.message
    : 'No fue posible autorizar Google Drive.';
}

export function createDriveAuthorizationService(
  gateway: DriveAuthorizationGateway,
): DriveAuthorizationService {
  let state: DriveAuthorizationState = { status: 'unauthorized' };
  let accessToken: string | null = null;

  return {
    getState() {
      return state;
    },

    async authorize() {
      state = { status: 'authorizing' };
      accessToken = null;
      try {
        const result = await gateway.authorize({ scope: DRIVE_FILE_SCOPE });
        const token = result.accessToken.trim();
        if (!token) throw new DriveAuthorizationError('Google Drive no devolvió un token de acceso.');
        accessToken = token;
        state = { status: 'authorized' };
      } catch (cause) {
        accessToken = null;
        state = { status: 'error', message: messageFrom(cause) };
        throw cause instanceof Error ? cause : new DriveAuthorizationError(messageFrom(cause));
      }
    },

    getAccessToken() {
      if (state.status !== 'authorized' || !accessToken) {
        throw new DriveAuthorizationError('Google Drive no está autorizado.');
      }
      return accessToken;
    },

    clear() {
      accessToken = null;
      state = { status: 'unauthorized' };
    },
  };
}
