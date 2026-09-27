import type {
  CreateProjectDocumentInput,
  ProjectDocumentDriver,
  ProjectDocumentRepository,
  ProjectDocumentSource,
} from './document-types.js';

export class ProjectDocumentRepositoryInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProjectDocumentRepositoryInputError';
  }
}

function requireText(value: unknown, label: string): string {
  if (typeof value !== 'string') {
    throw new ProjectDocumentRepositoryInputError(`${label} debe ser texto.`);
  }
  const normalized = value.trim();
  if (!normalized) {
    throw new ProjectDocumentRepositoryInputError(`${label} no puede estar vacío.`);
  }
  return normalized;
}

function normalizeOptionalText(
  value: unknown,
  label: string,
): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') {
    throw new ProjectDocumentRepositoryInputError(`${label} debe ser texto.`);
  }
  const normalized = value.trim();
  return normalized || undefined;
}

function requireSource(value: unknown): ProjectDocumentSource {
  if (value !== 'local-upload' && value !== 'drive-picker') {
    throw new ProjectDocumentRepositoryInputError(
      'La fuente documental debe ser local-upload o drive-picker.',
    );
  }
  return value;
}

function normalizeCreateInput(
  input: CreateProjectDocumentInput,
): CreateProjectDocumentInput {
  if (!input || typeof input !== 'object') {
    throw new ProjectDocumentRepositoryInputError(
      'Se requieren metadatos documentales confirmados.',
    );
  }

  const record = input as unknown as Record<string, unknown>;
  const name = normalizeOptionalText(record.name, 'El nombre');
  const mimeType = normalizeOptionalText(record.mimeType, 'El tipo MIME');

  return {
    driveFileId: requireText(
      record.driveFileId,
      'El identificador confirmado de Drive',
    ),
    source: requireSource(record.source),
    ...(name ? { name } : {}),
    ...(mimeType ? { mimeType } : {}),
  };
}

export function createProjectDocumentRepository(
  driver: ProjectDocumentDriver,
): ProjectDocumentRepository {
  return {
    async create(uid, projectId, input) {
      return driver.create(
        requireText(uid, 'El UID autenticado'),
        requireText(projectId, 'El identificador de proyecto'),
        normalizeCreateInput(input),
      );
    },

    async list(uid, projectId) {
      return driver.list(
        requireText(uid, 'El UID autenticado'),
        requireText(projectId, 'El identificador de proyecto'),
      );
    },

    async get(uid, projectId, documentId) {
      return driver.get(
        requireText(uid, 'El UID autenticado'),
        requireText(projectId, 'El identificador de proyecto'),
        requireText(documentId, 'El identificador de metadata documental'),
      );
    },
  };
}
