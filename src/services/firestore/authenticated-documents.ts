import type { AuthSessionState } from '../auth/types.js';
import { AuthenticatedProjectSessionError } from './authenticated.js';
import type {
  CreateProjectDocumentInput,
  ProjectDocumentMetadata,
  ProjectDocumentRepository,
} from './document-types.js';

export interface AuthenticatedProjectDocumentService {
  create(
    session: AuthSessionState,
    projectId: string,
    input: CreateProjectDocumentInput,
  ): Promise<ProjectDocumentMetadata>;
  list(
    session: AuthSessionState,
    projectId: string,
  ): Promise<ProjectDocumentMetadata[]>;
  get(
    session: AuthSessionState,
    projectId: string,
    documentId: string,
  ): Promise<ProjectDocumentMetadata | null>;
}

function authenticatedUid(session: AuthSessionState): string {
  if (session.status !== 'authenticated') {
    throw new AuthenticatedProjectSessionError(session.status);
  }
  return session.user.uid;
}

export function createAuthenticatedProjectDocumentService(
  repository: ProjectDocumentRepository,
): AuthenticatedProjectDocumentService {
  return {
    async create(session, projectId, input) {
      return repository.create(authenticatedUid(session), projectId, input);
    },

    async list(session, projectId) {
      return repository.list(authenticatedUid(session), projectId);
    },

    async get(session, projectId, documentId) {
      return repository.get(
        authenticatedUid(session),
        projectId,
        documentId,
      );
    },
  };
}
