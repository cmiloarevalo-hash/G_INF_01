import type {
  CreateAnalysisMetadataInput,
  CreateReportMetadataInput,
  ProjectHistoryDriver,
  ProjectHistoryRepository,
} from './history-types.js';

export class ProjectHistoryInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProjectHistoryInputError';
  }
}

function requireText(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) throw new ProjectHistoryInputError(`Se requiere ${label}.`);
  return normalized;
}

function optionalRef(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  return requireText(value, 'referencia Drive');
}

function analysisInput(input: CreateAnalysisMetadataInput): CreateAnalysisMetadataInput {
  const driveJsonFileId = optionalRef(input.driveJsonFileId);
  return {
    reportType: requireText(input.reportType, 'tipo de informe'),
    ...(driveJsonFileId ? { driveJsonFileId } : {}),
  };
}

function reportInput(input: CreateReportMetadataInput): CreateReportMetadataInput {
  const driveDocxFileId = optionalRef(input.driveDocxFileId);
  return {
    analysisId: requireText(input.analysisId, 'ID de análisis'),
    reportType: requireText(input.reportType, 'tipo de informe'),
    ...(driveDocxFileId ? { driveDocxFileId } : {}),
  };
}

export function createProjectHistoryRepository(
  driver: ProjectHistoryDriver,
): ProjectHistoryRepository {
  return {
    createAnalysis(uid, projectId, input) {
      return driver.createAnalysis(
        requireText(uid, 'identidad autenticada'),
        requireText(projectId, 'ID de proyecto'),
        analysisInput(input),
      );
    },
    listAnalyses(uid, projectId) {
      return driver.listAnalyses(
        requireText(uid, 'identidad autenticada'),
        requireText(projectId, 'ID de proyecto'),
      );
    },
    getAnalysis(uid, projectId, analysisId) {
      return driver.getAnalysis(
        requireText(uid, 'identidad autenticada'),
        requireText(projectId, 'ID de proyecto'),
        requireText(analysisId, 'ID de análisis'),
      );
    },
    createReport(uid, projectId, input) {
      return driver.createReport(
        requireText(uid, 'identidad autenticada'),
        requireText(projectId, 'ID de proyecto'),
        reportInput(input),
      );
    },
    listReports(uid, projectId) {
      return driver.listReports(
        requireText(uid, 'identidad autenticada'),
        requireText(projectId, 'ID de proyecto'),
      );
    },
    getReport(uid, projectId, reportId) {
      return driver.getReport(
        requireText(uid, 'identidad autenticada'),
        requireText(projectId, 'ID de proyecto'),
        requireText(reportId, 'ID de informe'),
      );
    },
  };
}
