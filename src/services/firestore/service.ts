import type { ProjectDriveFolders } from '../drive/types.js';
import type { ProjectDriver, ProjectRepository } from './types.js';

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

function requireDriveFolderId(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new ProjectRepositoryInputError(`Se requiere un identificador válido para ${label}.`);
  }
  return value.trim();
}

function normalizeDriveFolders(value: ProjectDriveFolders): ProjectDriveFolders {
  if (!value || typeof value !== 'object') {
    throw new ProjectRepositoryInputError('Se requieren referencias Drive completas.');
  }

  const record = value as unknown as Record<string, unknown>;
  return {
    applicationRootId: requireDriveFolderId(record.applicationRootId, 'applicationRootId'),
    projectsRootId: requireDriveFolderId(record.projectsRootId, 'projectsRootId'),
    projectFolderId: requireDriveFolderId(record.projectFolderId, 'projectFolderId'),
    documentsFolderId: requireDriveFolderId(record.documentsFolderId, 'documentsFolderId'),
    analysisFolderId: requireDriveFolderId(record.analysisFolderId, 'analysisFolderId'),
    reportsFolderId: requireDriveFolderId(record.reportsFolderId, 'reportsFolderId'),
  };
}

export function normalizeProjectName(name: string): string {
  const normalized = name.trim();
  if (!normalized) throw new ProjectRepositoryInputError('El nombre del proyecto no puede estar vacío.');
  return normalized;
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
        normalizeDriveFolders(driveFolders),
      );
    },
  };
}
