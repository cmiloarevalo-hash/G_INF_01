import type {
  DriveAuthorizationService,
  DriveClient,
  ProjectDriveFolderInput,
  ProjectDriveFolderService,
  ProjectDriveProvisioningStage,
} from './types.js';

export class DriveAuthorizationRequiredError extends Error {
  constructor() {
    super('Drive authorization is required before provisioning project folders.');
    this.name = 'DriveAuthorizationRequiredError';
  }
}

export class ProjectDriveProvisioningError extends Error {
  readonly stage: ProjectDriveProvisioningStage;

  constructor(
    stage: ProjectDriveProvisioningStage,
    options?: ErrorOptions,
  ) {
    super(`Drive project-folder provisioning failed at ${stage}.`, options);
    this.name = 'ProjectDriveProvisioningError';
    this.stage = stage;
  }
}

function requireInput(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new TypeError(`${label} is required.`);
  }
  return normalized;
}

export function createProjectDriveFolderService(
  authorization: DriveAuthorizationService,
  client: DriveClient,
): ProjectDriveFolderService {
  async function create(
    stage: ProjectDriveProvisioningStage,
    accessToken: string,
    name: string,
    parentId?: string,
  ): Promise<string> {
    try {
      const folder = await client.createFolder(
        accessToken,
        parentId === undefined ? { name } : { name, parentId },
      );
      return folder.id;
    } catch (error) {
      throw new ProjectDriveProvisioningError(stage, { cause: error });
    }
  }

  return {
    async provision(input: ProjectDriveFolderInput) {
      const accessToken = authorization.getAccessToken();
      if (!accessToken) {
        throw new DriveAuthorizationRequiredError();
      }

      const applicationRootName = requireInput(
        input.applicationRootName,
        'Application root name',
      );
      const projectId = requireInput(input.projectId, 'Project ID');
      const projectName = requireInput(input.projectName, 'Project name');
      const projectFolderName = `${projectName} [${projectId}]`;

      const applicationRootId = await create(
        'application-root',
        accessToken,
        applicationRootName,
      );
      const projectsRootId = await create(
        'projects-root',
        accessToken,
        'Proyectos',
        applicationRootId,
      );
      const projectFolderId = await create(
        'project-folder',
        accessToken,
        projectFolderName,
        projectsRootId,
      );
      const documentsFolderId = await create(
        'documents-folder',
        accessToken,
        'Documentos',
        projectFolderId,
      );
      const analysisFolderId = await create(
        'analysis-folder',
        accessToken,
        'Analisis',
        projectFolderId,
      );
      const reportsFolderId = await create(
        'reports-folder',
        accessToken,
        'Informes',
        projectFolderId,
      );

      return {
        applicationRootId,
        projectsRootId,
        projectFolderId,
        documentsFolderId,
        analysisFolderId,
        reportsFolderId,
      };
    },
  };
}
