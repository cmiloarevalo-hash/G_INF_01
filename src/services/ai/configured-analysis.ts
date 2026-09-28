import type { AuthSessionState } from '../auth/types.js';
import {
  analyzeGuestDocuments,
  type AnalysisInvocationOptions,
  type GeminiFetch,
  type GuestDocumentInput,
} from './gemini.js';
import {
  SUPPORTED_AI_MODEL,
  SUPPORTED_AI_PROVIDER,
  type AuthenticatedAiPreferenceService,
  type SessionAiCredentialStore,
} from './preferences.js';

export interface ConfiguredAnalysisService {
  analyze(
    session: AuthSessionState,
    files: GuestDocumentInput[],
    additionalInstruction?: string,
    fetchImpl?: GeminiFetch,
  ): ReturnType<typeof analyzeGuestDocuments>;
}

export function createConfiguredAnalysisService(
  preferences: AuthenticatedAiPreferenceService,
  credentials: SessionAiCredentialStore,
): ConfiguredAnalysisService {
  return {
    async analyze(
      session,
      files,
      additionalInstruction,
      fetchImpl = fetch,
    ) {
      const credential = credentials.get();
      if (!credential) {
        throw new Error('Se requiere una credencial API de sesión.');
      }

      const preference = await preferences.get(session) ?? {
        provider: SUPPORTED_AI_PROVIDER,
        model: SUPPORTED_AI_MODEL,
      };

      const options: AnalysisInvocationOptions = {
        provider: preference.provider,
        model: preference.model,
        ...(additionalInstruction?.trim()
          ? { additionalInstruction: additionalInstruction.trim() }
          : {}),
      };

      return analyzeGuestDocuments(
        credential,
        files,
        fetchImpl,
        options,
      );
    },
  };
}
