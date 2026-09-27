import {
  DRIVE_FILE_SCOPE,
  type DriveAuthorizationAdapter,
  type DriveAuthorizationService,
  type DriveAuthorizationState,
} from './types.js';

export class DriveAuthorizationError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'DriveAuthorizationError';
  }
}

export function createDriveAuthorizationService(
  adapter: DriveAuthorizationAdapter,
): DriveAuthorizationService {
  let state: DriveAuthorizationState = { status: 'unauthorized' };
  let accessToken: string | null = null;

  return {
    getState() {
      return state;
    },

    async authorize() {
      accessToken = null;
      state = { status: 'authorizing' };

      try {
        const response = await adapter.requestAccessToken(DRIVE_FILE_SCOPE);
        const token = response.accessToken.trim();
        if (!token) {
          throw new DriveAuthorizationError(
            'Drive authorization did not return an access token.',
          );
        }

        accessToken = token;
        state = { status: 'authorized' };
      } catch (error) {
        accessToken = null;
        state = { status: 'authorization-error' };

        if (error instanceof DriveAuthorizationError) {
          throw error;
        }

        throw new DriveAuthorizationError('Drive authorization failed.', {
          cause: error,
        });
      }
    },

    getAccessToken() {
      return accessToken;
    },

    clear() {
      accessToken = null;
      state = { status: 'unauthorized' };
    },

    requireReauthorization() {
      accessToken = null;
      state = { status: 'reauthorization-required' };
    },
  };
}
