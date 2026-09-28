import type { AuthSessionState } from '../auth/types.js';
import { AuthenticatedProjectSessionError } from './authenticated.js';

export interface ProjectArtifactMetadata {
  id: string;
  driveFileId: string;
  name?: string;
  mimeType?: string;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface ProjectAnalysisMetadata extends ProjectArtifactMetadata {}
export interface ProjectReportMetadata extends ProjectArtifactMetadata {}

export interface CreateProjectArtifactInput {
  driveFileId: string;
  name?: string;
  mimeType?: string;
}

export interface ProjectArtifactDriver<T extends ProjectArtifactMetadata> {
  create(
    uid: string,
    projectId: string,
    input: CreateProjectArtifactInput,
  ): Promise<T>;
  list(uid: string, projectId: string): Promise<T[]>;
  get(
    uid: string,
    projectId: string,
    artifactId: string,
  ): Promise<T | null>;
}

export interface ProjectArtifactRepository<T extends ProjectArtifactMetadata>
  extends ProjectArtifactDriver<T> {}

export type ProjectAnalysisDriver =
  ProjectArtifactDriver<ProjectAnalysisMetadata>;
export type ProjectAnalysisRepository =
  ProjectArtifactRepository<ProjectAnalysisMetadata>;
export type ProjectReportDriver =
  ProjectArtifactDriver<ProjectReportMetadata>;
export type ProjectReportRepository =
  ProjectArtifactRepository<ProjectReportMetadata>;

export class ProjectArtifactRepositoryInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProjectArtifactRepositoryInputError';
  }
}

function requireText(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new ProjectArtifactRepositoryInputError(
      `${label} no puede estar vacío.`,
    );
  }
  return value.trim();
}

function optionalText(value: unknown, label: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') {
    throw new ProjectArtifactRepositoryInputError(`${label} debe ser texto.`);
  }
  const normalized = value.trim();
  return normalized || undefined;
}

function normalizeInput(
  input: CreateProjectArtifactInput,
): CreateProjectArtifactInput {
  if (!input || typeof input !== 'object') {
    throw new ProjectArtifactRepositoryInputError(
      'Se requieren metadatos confirmados del artefacto.',
    );
  }

  const record = input as unknown as Record<string, unknown>;
  const name = optionalText(record.name, 'El nombre');
  const mimeType = optionalText(record.mimeType, 'El tipo MIME');

  return {
    driveFileId: requireText(
      record.driveFileId,
      'El identificador confirmado de Drive',
    ),
    ...(name ? { name } : {}),
    ...(mimeType ? { mimeType } : {}),
  };
}

export function createProjectArtifactRepository<T extends ProjectArtifactMetadata>(
  driver: ProjectArtifactDriver<T>,
): ProjectArtifactRepository<T> {
  return {
    async create(uid, projectId, input) {
      return driver.create(
        requireText(uid, 'El UID autenticado'),
        requireText(projectId, 'El identificador de proyecto'),
        normalizeInput(input),
      );
    },

    async list(uid, projectId) {
      return driver.list(
        requireText(uid, 'El UID autenticado'),
        requireText(projectId, 'El identificador de proyecto'),
      );
    },

    async get(uid, projectId, artifactId) {
      return driver.get(
        requireText(uid, 'El UID autenticado'),
        requireText(projectId, 'El identificador de proyecto'),
        requireText(artifactId, 'El identificador del artefacto'),
      );
    },
  };
}

export interface AuthenticatedProjectArtifactService<
  T extends ProjectArtifactMetadata,
> {
  create(
    session: AuthSessionState,
    projectId: string,
    input: CreateProjectArtifactInput,
  ): Promise<T>;
  list(session: AuthSessionState, projectId: string): Promise<T[]>;
  get(
    session: AuthSessionState,
    projectId: string,
    artifactId: string,
  ): Promise<T | null>;
}

function authenticatedUid(session: AuthSessionState): string {
  if (session.status !== 'authenticated') {
    throw new AuthenticatedProjectSessionError(session.status);
  }
  return session.user.uid;
}

export function createAuthenticatedProjectArtifactService<
  T extends ProjectArtifactMetadata,
>(
  repository: ProjectArtifactRepository<T>,
): AuthenticatedProjectArtifactService<T> {
  return {
    async create(session, projectId, input) {
      return repository.create(authenticatedUid(session), projectId, input);
    },

    async list(session, projectId) {
      return repository.list(authenticatedUid(session), projectId);
    },

    async get(session, projectId, artifactId) {
      return repository.get(
        authenticatedUid(session),
        projectId,
        artifactId,
      );
    },
  };
}


export function createProjectAnalysisRepository(
  driver: ProjectAnalysisDriver,
): ProjectAnalysisRepository {
  return createProjectArtifactRepository(driver);
}

export function createProjectReportRepository(
  driver: ProjectReportDriver,
): ProjectReportRepository {
  return createProjectArtifactRepository(driver);
}

export type AuthenticatedProjectAnalysisService =
  AuthenticatedProjectArtifactService<ProjectAnalysisMetadata>;
export type AuthenticatedProjectReportService =
  AuthenticatedProjectArtifactService<ProjectReportMetadata>;

export function createAuthenticatedProjectAnalysisService(
  repository: ProjectAnalysisRepository,
): AuthenticatedProjectAnalysisService {
  return createAuthenticatedProjectArtifactService(repository);
}

export function createAuthenticatedProjectReportService(
  repository: ProjectReportRepository,
): AuthenticatedProjectReportService {
  return createAuthenticatedProjectArtifactService(repository);
}
