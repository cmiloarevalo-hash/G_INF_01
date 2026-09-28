import { renderTitleStudyDocx } from '../../report-types/title-study/renderer.js';
import { titleStudySchema, type TitleStudy } from '../../report-types/title-study/schema.js';
import type { AuthSessionState } from '../auth/types.js';
import type {
  DriveLocalFileUploadInput,
  DriveLocalFileUploadService,
  DrivePickerService,
} from '../drive/types.js';
import type {
  DriveReferenceReader,
  DriveReferenceStatus,
} from '../drive/reference.js';
import type { AuthenticatedProjectService } from '../firestore/authenticated.js';
import type { AuthenticatedProjectDocumentService } from '../firestore/authenticated-documents.js';
import type {
  AuthenticatedProjectArtifactService,
  ProjectAnalysisMetadata,
  ProjectReportMetadata,
} from '../firestore/artifacts.js';

const ANALYSIS_MIME = 'application/json';
const REPORT_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export type CapabilityStage =
  | 'project'
  | 'upload'
  | 'picker'
  | 'render'
  | 'metadata'
  | 'drive-read'
  | 'validation';

export class AuthenticatedCapabilityError extends Error {
  readonly stage: CapabilityStage;
  readonly confirmedDriveFileId: string | null;
  readonly completedMetadataIds: string[];

  constructor(
    message: string,
    stage: CapabilityStage,
    options: {
      confirmedDriveFileId?: string | null;
      completedMetadataIds?: string[];
      cause?: unknown;
    } = {},
  ) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = 'AuthenticatedCapabilityError';
    this.stage = stage;
    this.confirmedDriveFileId = options.confirmedDriveFileId ?? null;
    this.completedMetadataIds = options.completedMetadataIds ?? [];
  }
}

function requireProjectFolders(
  project: Awaited<ReturnType<AuthenticatedProjectService['get']>>,
) {
  if (!project) {
    throw new AuthenticatedCapabilityError(
      'El proyecto autenticado no existe.',
      'project',
    );
  }
  if (!project.driveFolders) {
    throw new AuthenticatedCapabilityError(
      'El proyecto no tiene referencias Drive confirmadas.',
      'project',
    );
  }
  return project.driveFolders;
}

async function runExclusive<T>(
  inFlight: Set<string>,
  key: string,
  operation: () => Promise<T>,
): Promise<T> {
  if (inFlight.has(key)) {
    throw new AuthenticatedCapabilityError(
      'Ya existe una operación equivalente en curso.',
      'upload',
    );
  }
  inFlight.add(key);
  try {
    return await operation();
  } finally {
    inFlight.delete(key);
  }
}

export interface LocalDocumentIncorporationInput
  extends Omit<DriveLocalFileUploadInput, 'documentsFolderId'> {}

export interface DocumentIncorporationService {
  uploadLocal(
    session: AuthSessionState,
    projectId: string,
    input: LocalDocumentIncorporationInput,
  ): Promise<{ metadataId: string; driveFileId: string }>;
  pick(
    session: AuthSessionState,
    projectId: string,
  ): Promise<
    | { status: 'cancelled' }
    | { status: 'persisted'; metadataIds: string[] }
  >;
}

export function createDocumentIncorporationService(
  projects: AuthenticatedProjectService,
  upload: DriveLocalFileUploadService,
  picker: DrivePickerService,
  documents: AuthenticatedProjectDocumentService,
): DocumentIncorporationService {
  const inFlight = new Set<string>();

  return {
    async uploadLocal(session, projectId, input) {
      return runExclusive(
        inFlight,
        `local:${projectId}:${input.name}:${input.byteLength}`,
        async () => {
          const project = await projects.get(session, projectId);
          const folders = requireProjectFolders(project);

          let confirmed;
          try {
            confirmed = await upload.upload({
              ...input,
              documentsFolderId: folders.documentsFolderId,
            });
          } catch (error) {
            throw new AuthenticatedCapabilityError(
              'La carga a Drive no fue confirmada.',
              'upload',
              { cause: error },
            );
          }

          try {
            const metadata = await documents.create(session, projectId, {
              driveFileId: confirmed.id,
              source: 'local-upload',
              ...(confirmed.name ? { name: confirmed.name } : {}),
              ...(confirmed.mimeType ? { mimeType: confirmed.mimeType } : {}),
            });
            return {
              metadataId: metadata.id,
              driveFileId: confirmed.id,
            };
          } catch (error) {
            throw new AuthenticatedCapabilityError(
              'Drive confirmó el archivo, pero la metadata no pudo persistirse.',
              'metadata',
              {
                confirmedDriveFileId: confirmed.id,
                cause: error,
              },
            );
          }
        },
      );
    },

    async pick(session, projectId) {
      return runExclusive(inFlight, `picker:${projectId}`, async () => {
        let outcome;
        try {
          outcome = await picker.open();
        } catch (error) {
          throw new AuthenticatedCapabilityError(
            'Google Picker no confirmó una selección.',
            'picker',
            { cause: error },
          );
        }

        if (outcome.status === 'cancelled') {
          return { status: 'cancelled' } as const;
        }

        const completedMetadataIds: string[] = [];
        for (const document of outcome.documents) {
          try {
            const metadata = await documents.create(session, projectId, {
              driveFileId: document.id,
              source: 'drive-picker',
              ...(document.name ? { name: document.name } : {}),
              ...(document.mimeType ? { mimeType: document.mimeType } : {}),
            });
            completedMetadataIds.push(metadata.id);
          } catch (error) {
            throw new AuthenticatedCapabilityError(
              'Picker confirmó documentos, pero la metadata no pudo persistirse por completo.',
              'metadata',
              {
                confirmedDriveFileId: document.id,
                completedMetadataIds,
                cause: error,
              },
            );
          }
        }

        return {
          status: 'persisted',
          metadataIds: completedMetadataIds,
        } as const;
      });
    },
  };
}

export interface AnalysisPersistenceService {
  persist(
    session: AuthSessionState,
    projectId: string,
    analysis: unknown,
    name?: string,
  ): Promise<ProjectAnalysisMetadata>;
}

export function createAnalysisPersistenceService(
  projects: AuthenticatedProjectService,
  upload: DriveLocalFileUploadService,
  analyses: AuthenticatedProjectArtifactService<ProjectAnalysisMetadata>,
): AnalysisPersistenceService {
  const inFlight = new Set<string>();

  return {
    async persist(session, projectId, analysis, name = 'analisis.json') {
      let parsed: TitleStudy;
      try {
        parsed = titleStudySchema.parse(analysis);
      } catch (error) {
        throw new AuthenticatedCapabilityError(
          'El análisis no cumple el contrato TITLE_STUDY.',
          'validation',
          { cause: error },
        );
      }

      return runExclusive(inFlight, `analysis:${projectId}`, async () => {
        const folders = requireProjectFolders(await projects.get(session, projectId));
        const json = JSON.stringify(parsed);
        const bytes = new TextEncoder().encode(json);

        let confirmed;
        try {
          confirmed = await upload.upload({
            name,
            mimeType: ANALYSIS_MIME,
            byteLength: bytes.byteLength,
            body: new Blob([bytes.buffer], { type: ANALYSIS_MIME }),
            documentsFolderId: folders.analysisFolderId,
          });
        } catch (error) {
          throw new AuthenticatedCapabilityError(
            'El análisis validado no pudo persistirse en Drive.',
            'upload',
            { cause: error },
          );
        }

        try {
          return await analyses.create(session, projectId, {
            driveFileId: confirmed.id,
            name: confirmed.name ?? name,
            mimeType: confirmed.mimeType ?? ANALYSIS_MIME,
          });
        } catch (error) {
          throw new AuthenticatedCapabilityError(
            'Drive confirmó el análisis, pero la metadata no pudo persistirse.',
            'metadata',
            {
              confirmedDriveFileId: confirmed.id,
              cause: error,
            },
          );
        }
      });
    },
  };
}

export type ReportRenderer = (analysis: unknown) => Promise<Uint8Array>;

export interface ReportPersistenceService {
  persist(
    session: AuthSessionState,
    projectId: string,
    analysis: unknown,
    name?: string,
  ): Promise<ProjectReportMetadata>;
}

export function createReportPersistenceService(
  projects: AuthenticatedProjectService,
  upload: DriveLocalFileUploadService,
  reports: AuthenticatedProjectArtifactService<ProjectReportMetadata>,
  render: ReportRenderer,
): ReportPersistenceService {
  const inFlight = new Set<string>();

  return {
    async persist(
      session,
      projectId,
      analysis,
      name = 'estudio-de-titulos.docx',
    ) {
      let bytes: Uint8Array;
      try {
        bytes = await render(analysis);
      } catch (error) {
        throw new AuthenticatedCapabilityError(
          'El informe DOCX no pudo generarse.',
          'render',
          { cause: error },
        );
      }

      return runExclusive(inFlight, `report:${projectId}`, async () => {
        const folders = requireProjectFolders(await projects.get(session, projectId));

        let confirmed;
        try {
          confirmed = await upload.upload({
            name,
            mimeType: REPORT_MIME,
            byteLength: bytes.byteLength,
            body: new Blob([Uint8Array.from(bytes).buffer], { type: REPORT_MIME }),
            documentsFolderId: folders.reportsFolderId,
          });
        } catch (error) {
          throw new AuthenticatedCapabilityError(
            'El informe DOCX no pudo persistirse en Drive.',
            'upload',
            { cause: error },
          );
        }

        try {
          return await reports.create(session, projectId, {
            driveFileId: confirmed.id,
            name: confirmed.name ?? name,
            mimeType: confirmed.mimeType ?? REPORT_MIME,
          });
        } catch (error) {
          throw new AuthenticatedCapabilityError(
            'Drive confirmó el informe, pero la metadata no pudo persistirse.',
            'metadata',
            {
              confirmedDriveFileId: confirmed.id,
              cause: error,
            },
          );
        }
      });
    },
  };
}

export function createTitleStudyReportPersistenceService(
  projects: AuthenticatedProjectService,
  upload: DriveLocalFileUploadService,
  reports: AuthenticatedProjectArtifactService<ProjectReportMetadata>,
): ReportPersistenceService {
  return createReportPersistenceService(
    projects,
    upload,
    reports,
    async (analysis) => Uint8Array.from(
      await renderTitleStudyDocx(analysis),
    ),
  );
}

export type HistoryListResult<T> =
  | { status: 'items'; items: T[] }
  | { status: 'empty' }
  | { status: 'failure'; error: unknown };

export type HistoryReopenResult<TMetadata, TContent> =
  | { status: 'available'; metadata: TMetadata; content: TContent }
  | { status: 'not-found' }
  | {
      status: 'stale';
      metadata: TMetadata;
      reason: 'not-found' | 'unavailable';
    }
  | { status: 'authorization-required'; metadata: TMetadata }
  | { status: 'failure'; error: unknown };

export interface ArtifactHistoryService {
  listAnalyses(
    session: AuthSessionState,
    projectId: string,
  ): Promise<HistoryListResult<ProjectAnalysisMetadata>>;
  listReports(
    session: AuthSessionState,
    projectId: string,
  ): Promise<HistoryListResult<ProjectReportMetadata>>;
  reopenAnalysis(
    session: AuthSessionState,
    projectId: string,
    metadataId: string,
  ): Promise<HistoryReopenResult<ProjectAnalysisMetadata, TitleStudy>>;
  reopenReport(
    session: AuthSessionState,
    projectId: string,
    metadataId: string,
  ): Promise<HistoryReopenResult<ProjectReportMetadata, ArrayBuffer>>;
}

function mapStale<TMetadata>(
  metadata: TMetadata,
  drive: DriveReferenceStatus,
):
  | { status: 'stale'; metadata: TMetadata; reason: 'not-found' | 'unavailable' }
  | { status: 'authorization-required'; metadata: TMetadata }
  | null {
  if (drive.status === 'not-found') {
    return { status: 'stale', metadata, reason: 'not-found' };
  }
  if (drive.status === 'unavailable') {
    return { status: 'stale', metadata, reason: 'unavailable' };
  }
  if (drive.status === 'authorization-required') {
    return { status: 'authorization-required', metadata };
  }
  return null;
}

export function createArtifactHistoryService(
  analyses: AuthenticatedProjectArtifactService<ProjectAnalysisMetadata>,
  reports: AuthenticatedProjectArtifactService<ProjectReportMetadata>,
  reader: DriveReferenceReader,
): ArtifactHistoryService {
  return {
    async listAnalyses(session, projectId) {
      try {
        const items = await analyses.list(session, projectId);
        return items.length === 0
          ? { status: 'empty' }
          : { status: 'items', items };
      } catch (error) {
        return { status: 'failure', error };
      }
    },

    async listReports(session, projectId) {
      try {
        const items = await reports.list(session, projectId);
        return items.length === 0
          ? { status: 'empty' }
          : { status: 'items', items };
      } catch (error) {
        return { status: 'failure', error };
      }
    },

    async reopenAnalysis(session, projectId, metadataId) {
      try {
        const metadata = await analyses.get(session, projectId, metadataId);
        if (!metadata) return { status: 'not-found' };

        const drive = await reader.read(metadata.driveFileId);
        const stale = mapStale(metadata, drive);
        if (stale) return stale;
        if (drive.status !== 'available') {
          return { status: 'failure', error: new Error('Unexpected Drive state.') };
        }

        const json = new TextDecoder().decode(drive.file.content);
        const parsed = titleStudySchema.parse(JSON.parse(json) as unknown);
        return { status: 'available', metadata, content: parsed };
      } catch (error) {
        return { status: 'failure', error };
      }
    },

    async reopenReport(session, projectId, metadataId) {
      try {
        const metadata = await reports.get(session, projectId, metadataId);
        if (!metadata) return { status: 'not-found' };

        const drive = await reader.read(metadata.driveFileId);
        const stale = mapStale(metadata, drive);
        if (stale) return stale;
        if (drive.status !== 'available') {
          return { status: 'failure', error: new Error('Unexpected Drive state.') };
        }

        return {
          status: 'available',
          metadata,
          content: drive.file.content,
        };
      } catch (error) {
        return { status: 'failure', error };
      }
    },
  };
}
