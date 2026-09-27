import type {
  ProjectDriveFolderRefs,
  ProjectDriver,
  ProjectRepository,
} from './types.js';

export class ProjectRepositoryInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProjectRepositoryInputError';
  }
}

function requireUid(uid: string): string {
  const normalized = uid.trim();
  if (!normalized) throw new ProjectRepositoryInputError('Se requiere una identidad autenticada válida.');
  return normalized;
}

function requireProjectId(projectId: string): string {
  const normalized = projectId.trim();
  if (!normalized) throw new ProjectRepositoryInputError('Se requiere un identificador de proyecto válido.');
  return normalized;
}

function requireFolderId(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) throw new ProjectRepositoryInputError(`Se requiere ${label}.`);
  return normalized;
}

export function normalizeProjectName(name: string): string {
  const normalized = name.trim();
  if (!normalized) throw new ProjectRepositoryInputError('El nombre del proyecto no puede estar vacío.');
  return normalized;
}

export function normalizeProjectDriveFolders(
  input: ProjectDriveFolderRefs,
): ProjectDriveFolderRefs {
  return {
    applicationRootFolderId: requireFolderId(input.applicationRootFolderId, 'applicationRootFolderId'),
    projectsRootFolderId: requireFolderId(input.projectsRootFolderId, 'projectsRootFolderId'),
    projectFolderId: requireFolderId(input.projectFolderId, 'projectFolderId'),
    documentsFolderId: requireFolderId(input.documentsFolderId, 'documentsFolderId'),
    analysisFolderId: requireFolderId(input.analysisFolderId, 'analysisFolderId'),
    reportsFolderId: requireFolderId(input.reportsFolderId, 'reportsFolderId'),
  };
}

export function createProjectRepository(driver: ProjectDriver): ProjectRepository {
  return {
    async create(uid, name) {
      return driver.create(requireUid(uid), normalizeProjectName(name));
    },

    async list(uid) {
      return driver.list(requireUid(uid));
    },

    async get(uid, projectId) {
      return driver.get(requireUid(uid), requireProjectId(projectId));
    },

    async updateDriveFolders(uid, projectId, driveFolders) {
      return driver.updateDriveFolders(
        requireUid(uid),
        requireProjectId(projectId),
        normalizeProjectDriveFolders(driveFolders),
      );
    },
  };
}
