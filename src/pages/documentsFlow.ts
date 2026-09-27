import type { AuthSessionState } from '../services/auth/types.js';
import {
  createDrivePickerService,
  uploadLocalDocument,
  type ConfirmedDriveFile,
  type DriveAuthorizationService,
  type DrivePickerConfiguration,
  type DrivePickerResult,
  type DriveTransport,
  type LocalDriveDocument,
} from '../services/drive/index.js';
import type { ProjectMetadata } from '../services/firestore/types.js';

export type ProjectDocumentsRuntime =
  | { status: 'unavailable'; reason: string }
  | {
      status: 'available';
      authorization: DriveAuthorizationService;
      transport: DriveTransport;
      picker: ReturnType<typeof createDrivePickerService>;
      pickerConfiguration: Omit<DrivePickerConfiguration, 'accessToken'>;
    };

export type ProjectDocumentsAvailability =
  | { status: 'checking-session' }
  | { status: 'sign-in-required' }
  | { status: 'runtime-unavailable'; reason: string }
  | { status: 'folders-unavailable' }
  | { status: 'unauthorized' }
  | { status: 'authorizing' }
  | { status: 'authorized' }
  | { status: 'authorization-error'; message: string };

export const UNAVAILABLE_PROJECT_DOCUMENTS_RUNTIME: ProjectDocumentsRuntime = {
  status: 'unavailable',
  reason: 'La integración real de Google Drive no está configurada en este experimento.',
};

export function projectDocumentsAvailability(
  session: AuthSessionState,
  runtime: ProjectDocumentsRuntime,
  project: ProjectMetadata,
): ProjectDocumentsAvailability {
  if (session.status === 'checking') return { status: 'checking-session' };
  if (session.status === 'unauthenticated') return { status: 'sign-in-required' };
  if (runtime.status === 'unavailable') {
    return { status: 'runtime-unavailable', reason: runtime.reason };
  }
  if (!project.driveFolders) return { status: 'folders-unavailable' };

  const auth = runtime.authorization.getState();
  if (auth.status === 'error') return { status: 'authorization-error', message: auth.message };
  return auth;
}

function requireReady(
  session: AuthSessionState,
  runtime: ProjectDocumentsRuntime,
  project: ProjectMetadata,
) {
  const availability = projectDocumentsAvailability(session, runtime, project);
  if (session.status !== 'authenticated' || runtime.status !== 'available' || !project.driveFolders) {
    throw new Error('Documentos Drive no están disponibles para este proyecto.');
  }
  if (availability.status !== 'authorized') {
    throw new Error('Google Drive requiere autorización explícita.');
  }
  return { runtime, folders: project.driveFolders };
}

export async function authorizeDriveForUi(
  session: AuthSessionState,
  runtime: ProjectDocumentsRuntime,
): Promise<void> {
  if (session.status !== 'authenticated') {
    throw new Error('Se requiere una sesión autenticada para autorizar Drive.');
  }
  if (runtime.status !== 'available') {
    throw new Error(runtime.reason);
  }
  await runtime.authorization.authorize();
}

export async function uploadProjectDocumentForUi(
  session: AuthSessionState,
  runtime: ProjectDocumentsRuntime,
  project: ProjectMetadata,
  file: LocalDriveDocument,
): Promise<ConfirmedDriveFile> {
  const ready = requireReady(session, runtime, project);
  return uploadLocalDocument(
    ready.runtime.transport,
    ready.runtime.authorization.getAccessToken(),
    ready.folders.documentsFolderId,
    file,
  );
}

export async function pickProjectDocumentForUi(
  session: AuthSessionState,
  runtime: ProjectDocumentsRuntime,
  project: ProjectMetadata,
): Promise<DrivePickerResult> {
  const ready = requireReady(session, runtime, project);
  return ready.runtime.picker.openPicker({
    ...ready.runtime.pickerConfiguration,
    accessToken: ready.runtime.authorization.getAccessToken(),
  });
}
