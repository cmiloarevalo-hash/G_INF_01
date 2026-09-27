export const DRIVE_FILE_SCOPE = 'https://www.googleapis.com/auth/drive.file' as const;
export const DRIVE_FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder' as const;

export type DriveAuthorizationState =
  | { status: 'unauthorized' }
  | { status: 'authorizing' }
  | { status: 'authorized' }
  | { status: 'authorization-error' }
  | { status: 'reauthorization-required' };

export interface DriveAccessTokenResponse {
  accessToken: string;
}

export interface DriveAuthorizationAdapter {
  requestAccessToken(scope: typeof DRIVE_FILE_SCOPE): Promise<DriveAccessTokenResponse>;
}

export interface DriveAuthorizationService {
  getState(): DriveAuthorizationState;
  authorize(): Promise<void>;
  getAccessToken(): string | null;
  clear(): void;
  requireReauthorization(): void;
}

export interface DriveFolderMetadata {
  id: string;
}

export interface CreateDriveFolderInput {
  name: string;
  parentId?: string;
}

export type DriveTransport = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export interface DriveClient {
  createFolder(
    accessToken: string,
    input: CreateDriveFolderInput,
  ): Promise<DriveFolderMetadata>;
}

export interface ProjectDriveFolderInput {
  applicationRootName: string;
  projectId: string;
  projectName: string;
}

export interface ProjectDriveFolders {
  applicationRootId: string;
  projectsRootId: string;
  projectFolderId: string;
  documentsFolderId: string;
  analysisFolderId: string;
  reportsFolderId: string;
}

export interface ProjectDriveFolderService {
  provision(input: ProjectDriveFolderInput): Promise<ProjectDriveFolders>;
}

export type ProjectDriveProvisioningStage =
  | 'application-root'
  | 'projects-root'
  | 'project-folder'
  | 'documents-folder'
  | 'analysis-folder'
  | 'reports-folder';

export interface DriveLocalFileUploadInput {
  name: string;
  mimeType: string;
  byteLength: number;
  body: BodyInit;
  documentsFolderId: string;
}

export interface ConfirmedDriveFile {
  id: string;
  name?: string;
  mimeType?: string;
}

export interface DriveLocalFileUploadService {
  upload(input: DriveLocalFileUploadInput): Promise<ConfirmedDriveFile>;
}
