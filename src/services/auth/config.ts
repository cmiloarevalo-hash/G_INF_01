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

type FirebaseEnvironment = Record<string, string | undefined>;

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

export function resolveBrowserFirebaseConfig(): FirebaseConfigResolution {
  const meta = import.meta as ImportMeta & { env?: FirebaseEnvironment };
  return resolveFirebaseWebConfig(meta.env ?? {});
}
