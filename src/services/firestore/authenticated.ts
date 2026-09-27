import type { AuthSessionState } from '../auth/types.js';
import type { ProjectMetadata, ProjectRepository } from './types.js';

export class AuthenticatedProjectSessionError extends Error {
  constructor(status: AuthSessionState['status']) {
    super(
      status === 'checking'
        ? 'La sesión autenticada todavía no está resuelta.'
        : 'Se requiere una sesión autenticada para acceder a proyectos.',
    );
    this.name = 'AuthenticatedProjectSessionError';
  }
}

export interface AuthenticatedProjectService {
  create(session: AuthSessionState, name: string): Promise<ProjectMetadata>;
  list(session: AuthSessionState): Promise<ProjectMetadata[]>;
  get(session: AuthSessionState, projectId: string): Promise<ProjectMetadata | null>;
}

function authenticatedUid(session: AuthSessionState): string {
  if (session.status !== 'authenticated') {
    throw new AuthenticatedProjectSessionError(session.status);
  }

  return session.user.uid;
}

export function createAuthenticatedProjectService(
  repository: ProjectRepository,
): AuthenticatedProjectService {
  return {
    async create(session, name) {
      return repository.create(authenticatedUid(session), name);
    },

    async list(session) {
      return repository.list(authenticatedUid(session));
    },

    async get(session, projectId) {
      return repository.get(authenticatedUid(session), projectId);
    },
  };
}
