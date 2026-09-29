import type {
  ConfiguredAnalysisService,
} from '../ai/configured-analysis.js';
import type {
  AuthenticatedAiPreferenceService,
  SessionAiCredentialStore,
} from '../ai/preferences.js';
import {
  SUPPORTED_AI_MODEL,
  SUPPORTED_AI_PROVIDER,
} from '../ai/preferences.js';
import type {
  GuestDocumentInput,
} from '../ai/gemini.js';
import type { AuthSessionState } from '../auth/types.js';
import { titleStudySchema } from '../../report-types/title-study/schema.js';

interface AnalysisHttpPayload {
  report?: unknown;
  partial?: boolean;
  error?: string;
  statuses?: Array<{
    id: string;
    name: string;
    status: 'Fuente identificada' | 'No analizado';
    submissionAttempted: boolean;
    sourceIdentified: boolean;
    contentVerified: false;
    reason?: string;
  }>;
}

export function createAuthenticatedAnalysisHttpService(
  preferences: AuthenticatedAiPreferenceService,
  credentials: SessionAiCredentialStore,
  fetchImpl: typeof fetch = fetch,
): ConfiguredAnalysisService {
  return {
    async analyze(
      session: AuthSessionState,
      files: GuestDocumentInput[],
      additionalInstruction?: string,
    ) {
      const credential = credentials.get();
      if (!credential) {
        throw new Error('Se requiere una credencial API de sesión.');
      }

      const preference = await preferences.get(session) ?? {
        provider: SUPPORTED_AI_PROVIDER,
        model: SUPPORTED_AI_MODEL,
      };
      if (
        preference.provider !== SUPPORTED_AI_PROVIDER ||
        preference.model !== SUPPORTED_AI_MODEL
      ) {
        throw new Error('La preferencia de proveedor/modelo no está soportada.');
      }

      const response = await fetchImpl('/api/guest/analyze', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-gemini-api-key': credential,
        },
        body: JSON.stringify({
          files,
          provider: preference.provider,
          model: preference.model,
          ...(additionalInstruction?.trim()
            ? { additionalInstruction: additionalInstruction.trim() }
            : {}),
        }),
      });

      const payload = await response.json().catch(() => ({
        error: `Error HTTP ${response.status}; no se confirmó el análisis.`,
      })) as AnalysisHttpPayload;

      const report = payload.report === undefined
        ? undefined
        : titleStudySchema.safeParse(payload.report);

      if (!response.ok || (report && !report.success)) {
        return {
          statuses: payload.statuses ?? files.map(({ id, name }) => ({
            id,
            name,
            status: 'No analizado' as const,
            submissionAttempted: false,
            sourceIdentified: false,
            contentVerified: false as const,
            reason: payload.error ?? 'No se confirmó un resultado validado.',
          })),
          partial: Boolean(payload.partial),
          error: payload.error ??
            (report && !report.success
              ? 'La respuesta no cumple el contrato TITLE_STUDY.'
              : `Error HTTP ${response.status}`),
        };
      }

      return {
        ...(report?.success ? { report: report.data } : {}),
        statuses: payload.statuses ?? [],
        partial: Boolean(payload.partial),
        ...(payload.error ? { error: payload.error } : {}),
      };
    },
  };
}
