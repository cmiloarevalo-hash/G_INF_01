export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
}

export type FirebaseConfigResolution =
  | { available: true; config: FirebaseWebConfig }
  | { available: false; missing: string[] };

export const FIREBASE_ENVIRONMENT_KEYS = {
  apiKey: 'VITE_FIREBASE_API_KEY',
  authDomain: 'VITE_FIREBASE_AUTH_DOMAIN',
  projectId: 'VITE_FIREBASE_PROJECT_ID',
  appId: 'VITE_FIREBASE_APP_ID',
} as const;

export type FirebaseEnvironment = Record<string, string | undefined>;
export type FirebaseConfigFetch = typeof fetch;

export function resolveFirebaseWebConfig(env: FirebaseEnvironment): FirebaseConfigResolution {
  const values = Object.fromEntries(
    Object.entries(FIREBASE_ENVIRONMENT_KEYS).map(([field, envKey]) => [
      field,
      env[envKey]?.trim() ?? '',
    ]),
  ) as unknown as FirebaseWebConfig;

  const missing = Object.entries(FIREBASE_ENVIRONMENT_KEYS)
    .filter(([field]) => !values[field as keyof FirebaseWebConfig])
    .map(([, envKey]) => envKey);

  if (missing.length > 0) {
    return { available: false, missing };
  }

  return { available: true, config: values };
}

function runtimePayloadConfig(payload: unknown): FirebaseWebConfig | null {
  if (typeof payload !== 'object' || payload === null) return null;

  const source = payload as Record<string, unknown>;
  const config = {
    apiKey: typeof source.apiKey === 'string' ? source.apiKey.trim() : '',
    authDomain: typeof source.authDomain === 'string' ? source.authDomain.trim() : '',
    projectId: typeof source.projectId === 'string' ? source.projectId.trim() : '',
    appId: typeof source.appId === 'string' ? source.appId.trim() : '',
  };

  return Object.values(config).every(Boolean) ? config : null;
}

export async function loadFirebaseWebConfig(
  env: FirebaseEnvironment,
  fetchImpl: FirebaseConfigFetch = fetch,
): Promise<FirebaseConfigResolution> {
  const buildTime = resolveFirebaseWebConfig(env);
  if (buildTime.available) return buildTime;

  try {
    const response = await fetchImpl('/api/firebase-config', {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!response.ok) return buildTime;

    const runtimeConfig = runtimePayloadConfig(await response.json());
    return runtimeConfig ? { available: true, config: runtimeConfig } : buildTime;
  } catch {
    return buildTime;
  }
}

function browserFirebaseEnvironment(): FirebaseEnvironment {
  const meta = import.meta as ImportMeta & { env?: FirebaseEnvironment };
  return meta.env ?? {};
}

export function resolveBrowserFirebaseConfig(): FirebaseConfigResolution {
  return resolveFirebaseWebConfig(browserFirebaseEnvironment());
}

export function loadBrowserFirebaseConfig(
  fetchImpl: FirebaseConfigFetch = fetch,
): Promise<FirebaseConfigResolution> {
  return loadFirebaseWebConfig(browserFirebaseEnvironment(), fetchImpl);
}
