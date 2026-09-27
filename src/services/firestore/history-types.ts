export interface AnalysisMetadata {
  id: string;
  reportType: string;
  createdAt: Date | null;
  updatedAt: Date | null;
  driveJsonFileId?: string;
}

export interface ReportMetadata {
  id: string;
  analysisId: string;
  reportType: string;
  createdAt: Date | null;
  updatedAt: Date | null;
  driveDocxFileId?: string;
}

export interface CreateAnalysisMetadataInput {
  reportType: string;
  driveJsonFileId?: string;
}

export interface CreateReportMetadataInput {
  analysisId: string;
  reportType: string;
  driveDocxFileId?: string;
}

export interface ProjectHistoryDriver {
  createAnalysis(
    uid: string,
    projectId: string,
    input: CreateAnalysisMetadataInput,
  ): Promise<AnalysisMetadata>;
  listAnalyses(uid: string, projectId: string): Promise<AnalysisMetadata[]>;
  getAnalysis(
    uid: string,
    projectId: string,
    analysisId: string,
  ): Promise<AnalysisMetadata | null>;
  createReport(
    uid: string,
    projectId: string,
    input: CreateReportMetadataInput,
  ): Promise<ReportMetadata>;
  listReports(uid: string, projectId: string): Promise<ReportMetadata[]>;
  getReport(
    uid: string,
    projectId: string,
    reportId: string,
  ): Promise<ReportMetadata | null>;
}

export type ProjectHistoryRepository = ProjectHistoryDriver;
