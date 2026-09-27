export const DRIVE_FILE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

export type DriveAuthorizationState =
  | { status: 'unauthorized' }
  | { status: 'authorizing' }
  | { status: 'authorized' }
  | { status: 'error'; message: string };

export interface DriveAuthorizationGateway {
  authorize(input: { scope: typeof DRIVE_FILE_SCOPE }): Promise<{ accessToken: string }>;
}

export interface DriveAuthorizationService {
  getState(): DriveAuthorizationState;
  authorize(): Promise<void>;
  getAccessToken(): string;
  clear(): void;
}

export interface DriveRequest {
  method: 'POST';
  url: string;
  headers: Record<string, string>;
  body: unknown;
}

export interface DriveResponse {
  status: number;
  json: unknown;
}

export interface DriveTransport {
  send(request: DriveRequest): Promise<DriveResponse>;
}

export interface ConfirmedDriveFolder {
  id: string;
  name: string;
  mimeType: 'application/vnd.google-apps.folder';
}

export interface ProjectDriveFolders {
  applicationRootFolderId: string;
  projectsRootFolderId: string;
  projectFolderId: string;
  documentsFolderId: string;
  analysisFolderId: string;
  reportsFolderId: string;
}
