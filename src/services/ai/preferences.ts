import type { AuthSessionState } from '../auth/types.js';
import { AuthenticatedProjectSessionError } from '../firestore/authenticated.js';

export const SUPPORTED_AI_PROVIDER = 'gemini' as const;
export const SUPPORTED_AI_MODEL = 'gemini-3.6-flash' as const;

export type SupportedAiProvider = typeof SUPPORTED_AI_PROVIDER;
export type SupportedAiModel = typeof SUPPORTED_AI_MODEL;

export interface AiPreference {
  provider: SupportedAiProvider;
  model: SupportedAiModel;
}

export interface AiPreferenceRepository {
  get(uid: string): Promise<AiPreference | null>;
  set(uid: string, preference: AiPreference): Promise<AiPreference>;
}

export interface AuthenticatedAiPreferenceService {
  get(session: AuthSessionState): Promise<AiPreference | null>;
  set(
    session: AuthSessionState,
    preference: AiPreference,
  ): Promise<AiPreference>;
}

export interface SessionAiCredentialStore {
  get(): string | null;
  set(value: string): void;
  clear(): void;
}

export function requireSupportedAiPreference(value: AiPreference): AiPreference {
  if (
    value.provider !== SUPPORTED_AI_PROVIDER ||
    value.model !== SUPPORTED_AI_MODEL
  ) {
    throw new Error('La preferencia de proveedor/modelo no está soportada.');
  }
  return {
    provider: SUPPORTED_AI_PROVIDER,
    model: SUPPORTED_AI_MODEL,
  };
}

function authenticatedUid(session: AuthSessionState): string {
  if (session.status !== 'authenticated') {
    throw new AuthenticatedProjectSessionError(session.status);
  }
  return session.user.uid;
}

export function createAuthenticatedAiPreferenceService(
  repository: AiPreferenceRepository,
): AuthenticatedAiPreferenceService {
  return {
    async get(session) {
      return repository.get(authenticatedUid(session));
    },

    async set(session, preference) {
      return repository.set(
        authenticatedUid(session),
        requireSupportedAiPreference(preference),
      );
    },
  };
}

export function createMemoryAiCredentialStore(): SessionAiCredentialStore {
  let credential: string | null = null;

  return {
    get() {
      return credential;
    },

    set(value) {
      const normalized = value.trim();
      if (!normalized) {
        throw new Error('La credencial API de sesión no puede estar vacía.');
      }
      credential = normalized;
    },

    clear() {
      credential = null;
    },
  };
}
