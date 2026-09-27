import type { AuthSessionState } from '../auth/types.js';
import type {
  AnalysisMetadata,
  CreateAnalysisMetadataInput,
  CreateReportMetadataInput,
  ProjectHistoryRepository,
  ReportMetadata,
} from './history-types.js';

export class AuthenticatedHistorySessionError extends Error {
  constructor(status: AuthSessionState['status']) {
    super(
      status === 'checking'
        ? 'La sesión autenticada todavía no está resuelta.'
        : 'Se requiere una sesión autenticada para acceder al historial.',
    );
    this.name = 'AuthenticatedHistorySessionError';
  }
}

function authenticatedUid(session: AuthSessionState): string {
  if (session.status !== 'authenticated') {
    throw new AuthenticatedHistorySessionError(session.status);
  }
  return session.user.uid;
}

export interface AuthenticatedProjectHistoryService {
  createAnalysis(
    session: AuthSessionState,
    projectId: string,
    input: CreateAnalysisMetadataInput,
  ): Promise<AnalysisMetadata>;
  listAnalyses(
    session: AuthSessionState,
    projectId: string,
  ): Promise<AnalysisMetadata[]>;
  getAnalysis(
    session: AuthSessionState,
    projectId: string,
    analysisId: string,
  ): Promise<AnalysisMetadata | null>;
  createReport(
    session: AuthSessionState,
    projectId: string,
    input: CreateReportMetadataInput,
  ): Promise<ReportMetadata>;
  listReports(
    session: AuthSessionState,
    projectId: string,
  ): Promise<ReportMetadata[]>;
  getReport(
    session: AuthSessionState,
    projectId: string,
    reportId: string,
  ): Promise<ReportMetadata | null>;
}

export function createAuthenticatedProjectHistoryService(
  repository: ProjectHistoryRepository,
): AuthenticatedProjectHistoryService {
  return {
    createAnalysis(session, projectId, input) {
      return repository.createAnalysis(authenticatedUid(session), projectId, input);
    },
    listAnalyses(session, projectId) {
      return repository.listAnalyses(authenticatedUid(session), projectId);
    },
    getAnalysis(session, projectId, analysisId) {
      return repository.getAnalysis(
        authenticatedUid(session),
        projectId,
        analysisId,
      );
    },
    createReport(session, projectId, input) {
      return repository.createReport(authenticatedUid(session), projectId, input);
    },
    listReports(session, projectId) {
      return repository.listReports(authenticatedUid(session), projectId);
    },
    getReport(session, projectId, reportId) {
      return repository.getReport(authenticatedUid(session), projectId, reportId);
    },
  };
}
