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

export function normalizeProjectName(name: string): string {
  const normalized = name.trim();
  if (!normalized) throw new ProjectRepositoryInputError('El nombre del proyecto no puede estar vacío.');
  return normalized;
}

export function createProjectRepository(driver: ProjectDriver): ProjectRepository {
  return {
    create(uid, name) {
      return driver.create(requireUid(uid), normalizeProjectName(name));
    },

    list(uid) {
      return driver.list(requireUid(uid));
    },

    get(uid, projectId) {
      return driver.get(requireUid(uid), requireProjectId(projectId));
    },
  };
}
