export type ProjectDocumentSource = 'local-upload' | 'drive-picker';

export interface ProjectDocumentMetadata {
  id: string;
  driveFileId: string;
  name?: string;
  mimeType?: string;
  source: ProjectDocumentSource;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface CreateProjectDocumentInput {
  driveFileId: string;
  name?: string;
  mimeType?: string;
  source: ProjectDocumentSource;
}

export interface ProjectDocumentDriver {
  create(
    uid: string,
    projectId: string,
    input: CreateProjectDocumentInput,
  ): Promise<ProjectDocumentMetadata>;
  list(uid: string, projectId: string): Promise<ProjectDocumentMetadata[]>;
  get(
    uid: string,
    projectId: string,
    documentId: string,
  ): Promise<ProjectDocumentMetadata | null>;
}

export interface ProjectDocumentRepository {
  create(
    uid: string,
    projectId: string,
    input: CreateProjectDocumentInput,
  ): Promise<ProjectDocumentMetadata>;
  list(uid: string, projectId: string): Promise<ProjectDocumentMetadata[]>;
  get(
    uid: string,
    projectId: string,
    documentId: string,
  ): Promise<ProjectDocumentMetadata | null>;
}
