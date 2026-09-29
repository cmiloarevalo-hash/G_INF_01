import type { AuthSessionState } from '../auth/types.js';
import type {
  DriveAuthorizationService,
  ProjectDriveFolders,
  ProjectDriveFolderService,
} from '../drive/types.js';
import {
  AuthenticatedProjectSessionError,
  type AuthenticatedProjectService,
} from '../firestore/authenticated.js';
import type { ProjectMetadata } from '../firestore/types.js';

export class ProjectDriveFolderLinkError extends Error {
  readonly confirmedFolders: ProjectDriveFolders;

  constructor(
    confirmedFolders: ProjectDriveFolders,
    options?: ErrorOptions,
  ) {
    super(
      'Drive confirmó las carpetas, pero Firestore no confirmó la metadata del proyecto. El reintento reutilizará las referencias ya confirmadas durante esta sesión.',
      options,
    );
    this.name = 'ProjectDriveFolderLinkError';
    this.confirmedFolders = confirmedFolders;
  }
}

export interface ProjectDriveFolderLinkService {
  prepare(
    session: AuthSessionState,
    project: ProjectMetadata,
  ): Promise<ProjectMetadata>;
  clear(): void;
}

function authenticatedUid(session: AuthSessionState): string {
  if (session.status !== 'authenticated') {
    throw new AuthenticatedProjectSessionError(session.status);
  }
  return session.user.uid;
}

export function createProjectDriveFolderLinkService(
  projects: AuthenticatedProjectService,
  authorization: DriveAuthorizationService,
  driveFolders: ProjectDriveFolderService,
): ProjectDriveFolderLinkService {
  const pendingConfirmedFolders = new Map<string, ProjectDriveFolders>();

  return {
    async prepare(session, project) {
      const uid = authenticatedUid(session);
      const recoveryKey = `${uid}\u0000${project.id}`;

      if (project.driveFolders) {
        pendingConfirmedFolders.delete(recoveryKey);
        return project;
      }

      let folders = pendingConfirmedFolders.get(recoveryKey);
      if (!folders) {
        if (!authorization.getAccessToken()) {
          await authorization.authorize();
        }

        folders = await driveFolders.provision({
          applicationRootName: 'Analisis Documental',
          projectId: project.id,
          projectName: project.name,
        });
        pendingConfirmedFolders.set(recoveryKey, folders);
      }

      let updated: ProjectMetadata | null;
      try {
        updated = await projects.updateDriveFolders(
          session,
          project.id,
          folders,
        );
      } catch (error) {
        throw new ProjectDriveFolderLinkError(folders, { cause: error });
      }

      if (!updated) {
        throw new ProjectDriveFolderLinkError(folders);
      }

      pendingConfirmedFolders.delete(recoveryKey);
      return updated;
    },

    clear() {
      pendingConfirmedFolders.clear();
    },
  };
}
