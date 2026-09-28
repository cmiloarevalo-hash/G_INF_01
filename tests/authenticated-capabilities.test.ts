import assert from 'node:assert/strict';
import test from 'node:test';
import type { AuthSessionState } from '../src/services/auth/types.js';
import {
  AuthenticatedCapabilityError,
  createAnalysisPersistenceService,
  createArtifactHistoryService,
  createDocumentIncorporationService,
  createReportPersistenceService,
} from '../src/services/application/authenticated-capabilities.js';
import type { AuthenticatedProjectService } from '../src/services/firestore/authenticated.js';
import type { AuthenticatedProjectDocumentService } from '../src/services/firestore/authenticated-documents.js';
import type {
  AuthenticatedProjectArtifactService,
  ProjectAnalysisMetadata,
  ProjectReportMetadata,
} from '../src/services/firestore/artifacts.js';
import type {
  DriveLocalFileUploadService,
  DrivePickerService,
  ProjectDriveFolders,
} from '../src/services/drive/types.js';
import type { DriveReferenceReader } from '../src/services/drive/reference.js';

const folders: ProjectDriveFolders = {
  applicationRootId: 'app-root',
  projectsRootId: 'projects-root',
  projectFolderId: 'project-folder',
  documentsFolderId: 'documents-folder',
  analysisFolderId: 'analysis-folder',
  reportsFolderId: 'reports-folder',
};

const session: AuthSessionState = {
  status: 'authenticated',
  user: {
    uid: 'uid-a',
    displayName: null,
    email: null,
    photoURL: null,
  },
};

const titleStudy = {
  reportType: 'TITLE_STUDY' as const,
  sourceDocuments: [{
    id: 'doc-1',
    documentType: 'texto',
    name: 'Documento',
  }],
};

function projectService(): AuthenticatedProjectService {
  return {
    async create() {
      throw new Error('not used');
    },
    async list() {
      return [];
    },
    async get() {
      return {
        id: 'project-a',
        name: 'Proyecto',
        createdAt: null,
        updatedAt: null,
        driveFolders: folders,
      };
    },
    async updateDriveFolders() {
      throw new Error('not used');
    },
  };
}

function documentService(
  createImpl?: AuthenticatedProjectDocumentService['create'],
): AuthenticatedProjectDocumentService {
  return {
    create: createImpl ?? (async (_session, _projectId, input) => ({
      id: 'metadata-1',
      ...input,
      createdAt: null,
      updatedAt: null,
    })),
    async list() {
      return [];
    },
    async get() {
      return null;
    },
  };
}

function analysisMetadata(id = 'analysis-1'): ProjectAnalysisMetadata {
  return {
    id,
    driveFileId: `drive-${id}`,
    name: 'analisis.json',
    mimeType: 'application/json',
    createdAt: null,
    updatedAt: null,
  };
}

function reportMetadata(id = 'report-1'): ProjectReportMetadata {
  return {
    id,
    driveFileId: `drive-${id}`,
    name: 'informe.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    createdAt: null,
    updatedAt: null,
  };
}

function artifactService<T extends ProjectAnalysisMetadata | ProjectReportMetadata>(
  values: T[],
): AuthenticatedProjectArtifactService<T> {
  return {
    async create(_session, _projectId, input) {
      return {
        id: 'generated-metadata',
        ...input,
        createdAt: null,
        updatedAt: null,
      } as T;
    },
    async list() {
      return values;
    },
    async get(_session, _projectId, id) {
      return values.find((item) => item.id === id) ?? null;
    },
  };
}

test('local upload persists document metadata only after confirmed Drive file ID', async () => {
  const order: string[] = [];
  const upload: DriveLocalFileUploadService = {
    async upload(input) {
      order.push(`upload:${input.documentsFolderId}`);
      return {
        id: 'drive-confirmed',
        name: 'Contrato.pdf',
        mimeType: 'application/pdf',
      };
    },
  };
  const documents = documentService(async (_session, _projectId, input) => {
    order.push(`metadata:${input.driveFileId}`);
    return {
      id: 'metadata-confirmed',
      ...input,
      createdAt: null,
      updatedAt: null,
    };
  });
  const picker: DrivePickerService = {
    async open() {
      return { status: 'cancelled' };
    },
  };

  const service = createDocumentIncorporationService(
    projectService(),
    upload,
    picker,
    documents,
  );
  const result = await service.uploadLocal(session, 'project-a', {
    name: 'Contrato.pdf',
    mimeType: 'application/pdf',
    byteLength: 3,
    body: new Blob(['abc']),
  });

  assert.deepEqual(order, [
    'upload:documents-folder',
    'metadata:drive-confirmed',
  ]);
  assert.deepEqual(result, {
    metadataId: 'metadata-confirmed',
    driveFileId: 'drive-confirmed',
  });
});

test('failed local Drive upload never calls metadata persistence', async () => {
  let metadataCalls = 0;
  const service = createDocumentIncorporationService(
    projectService(),
    {
      async upload() {
        throw new Error('upload failed');
      },
    },
    { async open() { return { status: 'cancelled' }; } },
    documentService(async () => {
      metadataCalls += 1;
      throw new Error('unexpected');
    }),
  );

  await assert.rejects(
    service.uploadLocal(session, 'project-a', {
      name: 'x.txt',
      mimeType: 'text/plain',
      byteLength: 1,
      body: new Blob(['x']),
    }),
    (error) =>
      error instanceof AuthenticatedCapabilityError &&
      error.stage === 'upload',
  );
  assert.equal(metadataCalls, 0);
});

test('Picker cancellation persists nothing; confirmed picks persist only confirmed IDs', async () => {
  let metadataCalls = 0;
  const cancelled = createDocumentIncorporationService(
    projectService(),
    { async upload() { throw new Error('not used'); } },
    { async open() { return { status: 'cancelled' }; } },
    documentService(async () => {
      metadataCalls += 1;
      throw new Error('unexpected');
    }),
  );

  assert.deepEqual(await cancelled.pick(session, 'project-a'), {
    status: 'cancelled',
  });
  assert.equal(metadataCalls, 0);

  const persistedIds: string[] = [];
  const picked = createDocumentIncorporationService(
    projectService(),
    { async upload() { throw new Error('not used'); } },
    {
      async open() {
        return {
          status: 'picked',
          documents: [
            { id: 'drive-1', name: 'Uno' },
            { id: 'drive-2', mimeType: 'application/pdf' },
          ],
        };
      },
    },
    documentService(async (_session, _projectId, input) => {
      persistedIds.push(input.driveFileId);
      return {
        id: `metadata-${persistedIds.length}`,
        ...input,
        createdAt: null,
        updatedAt: null,
      };
    }),
  );

  assert.deepEqual(await picked.pick(session, 'project-a'), {
    status: 'persisted',
    metadataIds: ['metadata-1', 'metadata-2'],
  });
  assert.deepEqual(persistedIds, ['drive-1', 'drive-2']);
});

test('Picker partial metadata persistence is explicit and never fake success', async () => {
  let calls = 0;
  const service = createDocumentIncorporationService(
    projectService(),
    { async upload() { throw new Error('not used'); } },
    {
      async open() {
        return {
          status: 'picked',
          documents: [{ id: 'drive-1' }, { id: 'drive-2' }],
        };
      },
    },
    documentService(async (_session, _projectId, input) => {
      calls += 1;
      if (calls === 2) throw new Error('firestore failed');
      return {
        id: 'metadata-1',
        ...input,
        createdAt: null,
        updatedAt: null,
      };
    }),
  );

  await assert.rejects(
    service.pick(session, 'project-a'),
    (error) =>
      error instanceof AuthenticatedCapabilityError &&
      error.stage === 'metadata' &&
      error.confirmedDriveFileId === 'drive-2' &&
      error.completedMetadataIds.length === 1,
  );
});

test('validated analysis JSON uploads to analysis folder before metadata persistence', async () => {
  const order: string[] = [];
  const upload: DriveLocalFileUploadService = {
    async upload(input) {
      order.push(`upload:${input.documentsFolderId}`);
      assert.equal(input.mimeType, 'application/json');
      assert.equal(input.byteLength > 0, true);
      return {
        id: 'drive-analysis',
        name: input.name,
        mimeType: input.mimeType,
      };
    },
  };
  const analyses: AuthenticatedProjectArtifactService<ProjectAnalysisMetadata> = {
    async create(_session, _projectId, input) {
      order.push(`metadata:${input.driveFileId}`);
      return {
        id: 'analysis-metadata',
        ...input,
        createdAt: null,
        updatedAt: null,
      };
    },
    async list() { return []; },
    async get() { return null; },
  };

  const service = createAnalysisPersistenceService(
    projectService(),
    upload,
    analyses,
  );
  const result = await service.persist(session, 'project-a', titleStudy);

  assert.equal(result.driveFileId, 'drive-analysis');
  assert.deepEqual(order, [
    'upload:analysis-folder',
    'metadata:drive-analysis',
  ]);
});

test('invalid analysis is rejected before Drive access', async () => {
  let uploadCalls = 0;
  const service = createAnalysisPersistenceService(
    projectService(),
    {
      async upload() {
        uploadCalls += 1;
        throw new Error('unexpected');
      },
    },
    artifactService<ProjectAnalysisMetadata>([]),
  );

  await assert.rejects(
    service.persist(session, 'project-a', { reportType: 'INVALID' }),
    (error) =>
      error instanceof AuthenticatedCapabilityError &&
      error.stage === 'validation',
  );
  assert.equal(uploadCalls, 0);
});

test('report coordinator renders then uploads to reports folder and persists confirmed reference', async () => {
  const order: string[] = [];
  const reports: AuthenticatedProjectArtifactService<ProjectReportMetadata> = {
    async create(_session, _projectId, input) {
      order.push(`metadata:${input.driveFileId}`);
      return {
        id: 'report-metadata',
        ...input,
        createdAt: null,
        updatedAt: null,
      };
    },
    async list() { return []; },
    async get() { return null; },
  };
  const service = createReportPersistenceService(
    projectService(),
    {
      async upload(input) {
        order.push(`upload:${input.documentsFolderId}`);
        return {
          id: 'drive-report',
          name: input.name,
          mimeType: input.mimeType,
        };
      },
    },
    reports,
    async () => {
      order.push('render');
      return new Uint8Array([1, 2, 3]);
    },
  );

  const result = await service.persist(session, 'project-a', titleStudy);
  assert.equal(result.driveFileId, 'drive-report');
  assert.deepEqual(order, [
    'render',
    'upload:reports-folder',
    'metadata:drive-report',
  ]);
});

test('report metadata partial failure preserves confirmed Drive ID in error', async () => {
  const service = createReportPersistenceService(
    projectService(),
    {
      async upload() {
        return { id: 'drive-confirmed' };
      },
    },
    {
      async create() {
        throw new Error('firestore unavailable');
      },
      async list() { return []; },
      async get() { return null; },
    },
    async () => new Uint8Array([1]),
  );

  await assert.rejects(
    service.persist(session, 'project-a', titleStudy),
    (error) =>
      error instanceof AuthenticatedCapabilityError &&
      error.stage === 'metadata' &&
      error.confirmedDriveFileId === 'drive-confirmed',
  );
});

test('history list distinguishes empty, items, and persistence failure', async () => {
  const reader: DriveReferenceReader = {
    async read() {
      return { status: 'not-found' };
    },
  };

  const empty = createArtifactHistoryService(
    artifactService<ProjectAnalysisMetadata>([]),
    artifactService<ProjectReportMetadata>([]),
    reader,
  );
  assert.deepEqual(await empty.listAnalyses(session, 'project-a'), {
    status: 'empty',
  });

  const items = createArtifactHistoryService(
    artifactService([analysisMetadata()]),
    artifactService([reportMetadata()]),
    reader,
  );
  const listed = await items.listReports(session, 'project-a');
  assert.equal(listed.status, 'items');

  const failure = createArtifactHistoryService(
    {
      async create() { throw new Error('not used'); },
      async list() { throw new Error('firestore failed'); },
      async get() { return null; },
    },
    artifactService<ProjectReportMetadata>([]),
    reader,
  );
  assert.equal(
    (await failure.listAnalyses(session, 'project-a')).status,
    'failure',
  );
});

test('history reopen distinguishes metadata not-found, stale Drive ref, auth, and available content', async () => {
  const analyses = artifactService([analysisMetadata()]);
  const reports = artifactService([reportMetadata()]);

  const missing = createArtifactHistoryService(
    artifactService<ProjectAnalysisMetadata>([]),
    reports,
    { async read() { throw new Error('should not read'); } },
  );
  assert.deepEqual(
    await missing.reopenAnalysis(session, 'project-a', 'missing'),
    { status: 'not-found' },
  );

  for (const driveStatus of ['not-found', 'unavailable'] as const) {
    const stale = createArtifactHistoryService(
      analyses,
      reports,
      { async read() { return { status: driveStatus }; } },
    );
    const result = await stale.reopenAnalysis(
      session,
      'project-a',
      'analysis-1',
    );
    assert.equal(result.status, 'stale');
  }

  const auth = createArtifactHistoryService(
    analyses,
    reports,
    { async read() { return { status: 'authorization-required' }; } },
  );
  assert.equal(
    (await auth.reopenReport(session, 'project-a', 'report-1')).status,
    'authorization-required',
  );

  const json = new TextEncoder().encode(JSON.stringify(titleStudy));
  const available = createArtifactHistoryService(
    analyses,
    reports,
    {
      async read(fileId) {
        return {
          status: 'available',
          file: {
            id: fileId,
            content: json.buffer,
          },
        };
      },
    },
  );
  const reopened = await available.reopenAnalysis(
    session,
    'project-a',
    'analysis-1',
  );
  assert.equal(reopened.status, 'available');
  if (reopened.status === 'available') {
    assert.equal(reopened.content.reportType, 'TITLE_STUDY');
  }
});
