import { createBrowserDrivePickerRuntime } from './browser-picker.js';
import type {
  DriveAccessTokenResponse,
  DriveAuthorizationAdapter,
  DrivePickerRuntime,
} from './types.js';

const GOOGLE_IDENTITY_SCRIPT = 'https://accounts.google.com/gsi/client';
const GOOGLE_APIS_SCRIPT = 'https://apis.google.com/js/api.js';

export const GOOGLE_DRIVE_ENVIRONMENT_KEYS = {
  clientId: 'VITE_GOOGLE_OAUTH_CLIENT_ID',
  pickerDeveloperKey: 'VITE_GOOGLE_PICKER_DEVELOPER_KEY',
  pickerAppId: 'VITE_GOOGLE_PICKER_APP_ID',
} as const;

export interface BrowserGoogleDriveConfig {
  clientId: string;
  pickerDeveloperKey: string;
  pickerAppId: string;
}

export type BrowserGoogleDriveConfigResolution =
  | { available: true; config: BrowserGoogleDriveConfig }
  | { available: false; missing: string[] };

export type GoogleDriveEnvironment = Record<string, string | undefined>;

interface GoogleTokenResponseLike {
  access_token?: string;
  error?: string;
  error_description?: string;
}

interface GoogleTokenClientLike {
  requestAccessToken(): void;
}

interface GoogleAccountsOauth2Like {
  initTokenClient(config: {
    client_id: string;
    scope: string;
    callback(response: GoogleTokenResponseLike): void;
    error_callback?(error: unknown): void;
  }): GoogleTokenClientLike;
}

interface GoogleApisLike {
  load(
    library: string,
    options: {
      callback(): void;
      onerror(): void;
      timeout?: number;
      ontimeout?(): void;
    },
  ): void;
}

interface BrowserGoogleHost {
  google?: {
    accounts?: { oauth2?: GoogleAccountsOauth2Like };
    picker?: unknown;
  };
  gapi?: GoogleApisLike;
}

type ScriptDocument = Pick<Document, 'createElement' | 'getElementById' | 'head'>;

function browserEnvironment(): GoogleDriveEnvironment {
  const meta = import.meta as ImportMeta & { env?: GoogleDriveEnvironment };
  return meta.env ?? {};
}

export function resolveBrowserGoogleDriveConfig(
  env: GoogleDriveEnvironment = browserEnvironment(),
): BrowserGoogleDriveConfigResolution {
  const values = Object.fromEntries(
    Object.entries(GOOGLE_DRIVE_ENVIRONMENT_KEYS).map(([field, key]) => [
      field,
      env[key]?.trim() ?? '',
    ]),
  ) as unknown as BrowserGoogleDriveConfig;

  const missing = Object.entries(GOOGLE_DRIVE_ENVIRONMENT_KEYS)
    .filter(([field]) => !values[field as keyof BrowserGoogleDriveConfig])
    .map(([, key]) => key);

  return missing.length > 0
    ? { available: false, missing }
    : { available: true, config: values };
}

const scriptLoads = new Map<string, Promise<void>>();

function loadScript(
  id: string,
  source: string,
  documentLike: ScriptDocument,
): Promise<void> {
  const existing = scriptLoads.get(id);
  if (existing) return existing;

  const pending = new Promise<void>((resolve, reject) => {
    const present = documentLike.getElementById(id);
    if (present) {
      resolve();
      return;
    }

    const script = documentLike.createElement('script');
    script.id = id;
    script.src = source;
    script.async = true;
    script.defer = true;
    script.addEventListener('load', () => resolve(), { once: true });
    script.addEventListener(
      'error',
      () => reject(new Error(`No fue posible cargar ${source}.`)),
      { once: true },
    );
    documentLike.head.append(script);
  });

  scriptLoads.set(id, pending);
  return pending;
}

function defaultHost(): BrowserGoogleHost {
  return globalThis as unknown as BrowserGoogleHost;
}

function defaultDocument(): ScriptDocument {
  if (typeof document === 'undefined') {
    throw new Error('El runtime Google de navegador no está disponible.');
  }
  return document;
}

async function ensureIdentity(
  host: BrowserGoogleHost,
  documentLike: ScriptDocument,
): Promise<GoogleAccountsOauth2Like> {
  if (!host.google?.accounts?.oauth2) {
    await loadScript('google-identity-services', GOOGLE_IDENTITY_SCRIPT, documentLike);
  }
  const oauth2 = host.google?.accounts?.oauth2;
  if (!oauth2) {
    throw new Error('Google Identity Services no quedó disponible.');
  }
  return oauth2;
}

async function ensurePicker(
  host: BrowserGoogleHost,
  documentLike: ScriptDocument,
): Promise<DrivePickerRuntime> {
  if (!host.gapi) {
    await loadScript('google-api-loader', GOOGLE_APIS_SCRIPT, documentLike);
  }
  if (!host.gapi) {
    throw new Error('Google API loader no quedó disponible.');
  }

  if (!host.google?.picker) {
    await new Promise<void>((resolve, reject) => {
      host.gapi?.load('picker', {
        callback: resolve,
        onerror: () => reject(new Error('Google Picker no pudo inicializarse.')),
        timeout: 15_000,
        ontimeout: () => reject(new Error('Google Picker excedió el tiempo de inicialización.')),
      });
    });
  }

  return createBrowserDrivePickerRuntime(
    host as unknown as Parameters<typeof createBrowserDrivePickerRuntime>[0],
  );
}

export function createBrowserDriveAuthorizationAdapter(
  config: BrowserGoogleDriveConfig,
  host: BrowserGoogleHost = defaultHost(),
  documentLike: ScriptDocument = defaultDocument(),
): DriveAuthorizationAdapter {
  return {
    async requestAccessToken(scope): Promise<DriveAccessTokenResponse> {
      const oauth2 = await ensureIdentity(host, documentLike);
      return new Promise<DriveAccessTokenResponse>((resolve, reject) => {
        const client = oauth2.initTokenClient({
          client_id: config.clientId,
          scope,
          callback(response) {
            const token = response.access_token?.trim();
            if (!token || response.error) {
              reject(new Error(
                response.error_description?.trim() ||
                response.error?.trim() ||
                'Google no confirmó autorización de Drive.',
              ));
              return;
            }
            resolve({ accessToken: token });
          },
          error_callback(error) {
            reject(new Error(
              'Google no pudo completar la autorización de Drive.',
              { cause: error },
            ));
          },
        });
        client.requestAccessToken();
      });
    },
  };
}

export function loadBrowserDrivePickerRuntime(
  host: BrowserGoogleHost = defaultHost(),
  documentLike: ScriptDocument = defaultDocument(),
): Promise<DrivePickerRuntime> {
  return ensurePicker(host, documentLike);
}
