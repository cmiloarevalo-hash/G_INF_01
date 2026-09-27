import type {
  ConfirmedDriveFolder,
  DriveTransport,
  ProjectDriveFolders,
} from './types.js';

export const DRIVE_FOLDER_MIME = 'application/vnd.google-apps.folder' as const;
export const DRIVE_FILES_CREATE_URL =
  'https://www.googleapis.com/drive/v3/files?fields=id%2Cname%2CmimeType';

export class DriveFolderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DriveFolderError';
  }
}

function requireText(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) throw new DriveFolderError(`Se requiere ${label}.`);
  return normalized;
}

function confirmedFolder(value: unknown): ConfirmedDriveFolder {
  if (!value || typeof value !== 'object') {
    throw new DriveFolderError('Drive devolvió una respuesta de carpeta inválida.');
  }
  const record = value as Record<string, unknown>;
  if (typeof record.id !== 'string' || !record.id.trim()) {
    throw new DriveFolderError('Drive no confirmó el identificador de la carpeta.');
  }
  if (typeof record.name !== 'string' || !record.name.trim()) {
    throw new DriveFolderError('Drive no confirmó el nombre de la carpeta.');
  }
  return {
    id: record.id,
    name: record.name,
    mimeType: DRIVE_FOLDER_MIME,
  };
}

export function createDriveFolderClient(transport: DriveTransport) {
  return {
    async createFolder(
      accessToken: string,
      name: string,
      parentId?: string,
    ): Promise<ConfirmedDriveFolder> {
      const token = requireText(accessToken, 'token de acceso');
      const folderName = requireText(name, 'nombre de carpeta');
      const metadata: Record<string, unknown> = {
        name: folderName,
        mimeType: DRIVE_FOLDER_MIME,
      };
      if (parentId !== undefined) {
        metadata.parents = [requireText(parentId, 'carpeta padre')];
      }

      const response = await transport.send({
        method: 'POST',
        url: DRIVE_FILES_CREATE_URL,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metadata),
      });

      if (response.status < 200 || response.status >= 300) {
        throw new DriveFolderError(`Drive rechazó la creación de carpeta (HTTP ${response.status}).`);
      }

      return confirmedFolder(response.json);
    },
  };
}

export interface ProjectFolderProvisionInput {
  applicationRootName: string;
  projectName: string;
  projectId: string;
}

export async function provisionProjectFolders(
  accessToken: string,
  input: ProjectFolderProvisionInput,
  client: ReturnType<typeof createDriveFolderClient>,
): Promise<ProjectDriveFolders> {
  const projectLabel =
    `${requireText(input.projectName, 'nombre de proyecto')} [${requireText(input.projectId, 'ID de proyecto')}]`;

  const applicationRoot = await client.createFolder(
    accessToken,
    requireText(input.applicationRootName, 'nombre de raíz de aplicación'),
  );
  const projectsRoot = await client.createFolder(accessToken, 'Proyectos', applicationRoot.id);
  const project = await client.createFolder(accessToken, projectLabel, projectsRoot.id);
  const documents = await client.createFolder(accessToken, 'Documentos', project.id);
  const analysis = await client.createFolder(accessToken, 'Analisis', project.id);
  const reports = await client.createFolder(accessToken, 'Informes', project.id);

  return {
    applicationRootFolderId: applicationRoot.id,
    projectsRootFolderId: projectsRoot.id,
    projectFolderId: project.id,
    documentsFolderId: documents.id,
    analysisFolderId: analysis.id,
    reportsFolderId: reports.id,
  };
}
