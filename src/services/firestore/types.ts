export interface ProjectDriveFolderRefs {
  applicationRootFolderId: string;
  projectsRootFolderId: string;
  projectFolderId: string;
  documentsFolderId: string;
  analysisFolderId: string;
  reportsFolderId: string;
}

export interface ProjectMetadata {
  id: string;
  name: string;
  createdAt: Date | null;
  updatedAt: Date | null;
  driveFolders?: ProjectDriveFolderRefs;
}

export interface ProjectDriver {
  create(uid: string, name: string): Promise<ProjectMetadata>;
  list(uid: string): Promise<ProjectMetadata[]>;
  get(uid: string, projectId: string): Promise<ProjectMetadata | null>;
  updateDriveFolders(
    uid: string,
    projectId: string,
    driveFolders: ProjectDriveFolderRefs,
  ): Promise<ProjectMetadata | null>;
}

export interface ProjectRepository {
  create(uid: string, name: string): Promise<ProjectMetadata>;
  list(uid: string): Promise<ProjectMetadata[]>;
  get(uid: string, projectId: string): Promise<ProjectMetadata | null>;
  updateDriveFolders(
    uid: string,
    projectId: string,
    driveFolders: ProjectDriveFolderRefs,
  ): Promise<ProjectMetadata | null>;
}
