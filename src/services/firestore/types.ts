import type { ProjectDriveFolders } from '../drive/types.js';

export interface ProjectMetadata {
  id: string;
  name: string;
  createdAt: Date | null;
  updatedAt: Date | null;
  driveFolders?: ProjectDriveFolders;
}

export interface ProjectDriver {
  create(uid: string, name: string): Promise<ProjectMetadata>;
  list(uid: string): Promise<ProjectMetadata[]>;
  get(uid: string, projectId: string): Promise<ProjectMetadata | null>;
  updateDriveFolders(
    uid: string,
    projectId: string,
    driveFolders: ProjectDriveFolders,
  ): Promise<ProjectMetadata | null>;
}

export interface ProjectRepository {
  create(uid: string, name: string): Promise<ProjectMetadata>;
  list(uid: string): Promise<ProjectMetadata[]>;
  get(uid: string, projectId: string): Promise<ProjectMetadata | null>;
  updateDriveFolders(
    uid: string,
    projectId: string,
    driveFolders: ProjectDriveFolders,
  ): Promise<ProjectMetadata | null>;
}
