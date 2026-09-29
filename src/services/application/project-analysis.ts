import type { TitleStudy } from '../../report-types/title-study/schema.js';
import {
  MAX_GUEST_FILES,
  MAX_GUEST_TOTAL_BYTES,
} from '../../shared/guest-limits.js';
import type { AuthSessionState } from '../auth/types.js';
import type { ConfiguredAnalysisService } from '../ai/configured-analysis.js';
import type { GuestDocumentInput } from '../ai/gemini.js';
import type { DriveReferenceReader } from '../drive/reference.js';
import type { AuthenticatedProjectDocumentService } from '../firestore/authenticated-documents.js';
import type { ProjectAnalysisMetadata } from '../firestore/artifacts.js';
import type { AnalysisPersistenceService } from './authenticated-capabilities.js';

export type PersistedProjectAnalysisFailureKind =
  | 'empty'
  | 'authorization-required'
  | 'stale'
  | 'unavailable'
  | 'drive'
  | 'provider'
  | 'validation'
  | 'persistence'
  | 'duplicate'
  | 'limit';

export class PersistedProjectAnalysisError extends Error {
  readonly kind: PersistedProjectAnalysisFailureKind;
  readonly documentId: string | null;
  readonly validatedReport: TitleStudy | null;

  constructor(
    message: string,
    kind: PersistedProjectAnalysisFailureKind,
    options: {
      documentId?: string | null;
      validatedReport?: TitleStudy | null;
      cause?: unknown;
    } = {},
  ) {
    super(
      message,
      options.cause === undefined ? undefined : { cause: options.cause },
    );
    this.name = 'PersistedProjectAnalysisError';
    this.kind = kind;
    this.documentId = options.documentId ?? null;
    this.validatedReport = options.validatedReport ?? null;
  }
}

export interface PersistedProjectAnalysisResult {
  report: TitleStudy;
  metadata: ProjectAnalysisMetadata;
}

export interface PersistedProjectAnalysisService {
  analyze(
    session: AuthSessionState,
    projectId: string,
    additionalInstruction?: string,
  ): Promise<PersistedProjectAnalysisResult>;
}

export function arrayBufferToBase64(content: ArrayBuffer): string {
  const bytes = new Uint8Array(content);
  const chunkSize = 0x8000;
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(
      ...bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length)),
    );
  }
  return btoa(binary);
}

function classifyAnalysisFailure(message: string): 'provider' | 'validation' {
  return /json|schema|valid|truncad|fuente|documento fuente/i.test(message)
    ? 'validation'
    : 'provider';
}

export function createPersistedProjectAnalysisService(
  documents: AuthenticatedProjectDocumentService,
  reader: DriveReferenceReader,
  configuredAnalysis: ConfiguredAnalysisService,
  persistence: AnalysisPersistenceService,
): PersistedProjectAnalysisService {
  const inFlight = new Set<string>();

  return {
    async analyze(session, projectId, additionalInstruction) {
      const operationKey = `analysis:${projectId}`;
      if (inFlight.has(operationKey)) {
        throw new PersistedProjectAnalysisError(
          'Ya existe un análisis del proyecto en curso.',
          'duplicate',
        );
      }

      inFlight.add(operationKey);
      try {
        const persisted = await documents.list(session, projectId);
        if (persisted.length === 0) {
          throw new PersistedProjectAnalysisError(
            'El proyecto no tiene documentos persistidos para analizar.',
            'empty',
          );
        }
        if (persisted.length > MAX_GUEST_FILES) {
          throw new PersistedProjectAnalysisError(
            `El análisis está limitado a ${MAX_GUEST_FILES} documentos por operación.`,
            'limit',
          );
        }

        const inputs: GuestDocumentInput[] = [];
        let totalBytes = 0;

        for (const document of persisted) {
          let resolved;
          try {
            resolved = await reader.read(document.driveFileId);
          } catch (error) {
            throw new PersistedProjectAnalysisError(
              'No fue posible leer una referencia Drive del proyecto.',
              'drive',
              { documentId: document.id, cause: error },
            );
          }

          if (resolved.status === 'authorization-required') {
            throw new PersistedProjectAnalysisError(
              'Drive requiere autorización antes del análisis.',
              'authorization-required',
              { documentId: document.id },
            );
          }
          if (resolved.status === 'not-found') {
            throw new PersistedProjectAnalysisError(
              'Un documento persistido ya no existe en Drive.',
              'stale',
              { documentId: document.id },
            );
          }
          if (resolved.status === 'unavailable') {
            throw new PersistedProjectAnalysisError(
              'Un documento persistido no está accesible en Drive.',
              'unavailable',
              { documentId: document.id },
            );
          }

          totalBytes += resolved.file.content.byteLength;
          if (totalBytes > MAX_GUEST_TOTAL_BYTES) {
            throw new PersistedProjectAnalysisError(
              `Los documentos superan el límite de ${MAX_GUEST_TOTAL_BYTES} bytes por análisis.`,
              'limit',
              { documentId: document.id },
            );
          }

          inputs.push({
            id: document.id,
            name: document.name ?? resolved.file.name ?? document.id,
            mimeType:
              document.mimeType ??
              resolved.file.mimeType ??
              'application/octet-stream',
            size: resolved.file.content.byteLength,
            data: arrayBufferToBase64(resolved.file.content),
          });
        }

        let analysis;
        try {
          analysis = await configuredAnalysis.analyze(
            session,
            inputs,
            additionalInstruction,
          );
        } catch (error) {
          throw new PersistedProjectAnalysisError(
            error instanceof Error
              ? error.message
              : 'El proveedor no pudo completar el análisis.',
            'provider',
            { cause: error },
          );
        }

        if (!analysis.report) {
          const message =
            analysis.error ?? 'El proveedor no entregó un resultado validado.';
          throw new PersistedProjectAnalysisError(
            message,
            classifyAnalysisFailure(message),
          );
        }
        if (analysis.partial) {
          throw new PersistedProjectAnalysisError(
            'El análisis fue parcial; no se persistirá como resultado confirmado.',
            'validation',
            { validatedReport: analysis.report },
          );
        }

        try {
          const metadata = await persistence.persist(
            session,
            projectId,
            analysis.report,
          );
          return { report: analysis.report, metadata };
        } catch (error) {
          throw new PersistedProjectAnalysisError(
            'El resultado fue validado, pero su persistencia no se confirmó.',
            'persistence',
            {
              validatedReport: analysis.report,
              cause: error,
            },
          );
        }
      } finally {
        inFlight.delete(operationKey);
      }
    },
  };
}
