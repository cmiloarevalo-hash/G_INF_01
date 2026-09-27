import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import type { AuthSessionState } from '../src/services/auth/types.js';
import {
  createAuthenticatedProjectDocumentService,
} from '../src/services/firestore/authenticated-documents.js';
import {
  createProjectDocumentRepository,
  ProjectDocumentRepositoryInputError,
} from '../src/services/firestore/document-service.js';
import type {
  CreateProjectDocumentInput,
  ProjectDocumentDriver,
  ProjectDocumentMetadata,
  ProjectDocumentRepository,
  ProjectDocumentSource,
} from '../src/services/firestore/document-types.js';

function metadata(
  id: string,
  projectFileId: string,
  source: ProjectDocumentSource = 'local-upload',
): ProjectDocumentMetadata {
  return {
    id,
    driveFileId: projectFileId,
    name: 'Documento.pdf',
    mimeType: 'application/pdf',
    source,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  };
}

function input(
  overrides: Partial<CreateProjectDocumentInput> = {},
): CreateProjectDocumentInput {
  return {
    driveFileId: 'drive-file-1',
    name: 'Documento.pdf',
    mimeType: 'application/pdf',
    source: 'local-upload',
    ...overrides,
  };
}

function authenticated(uid = 'session-uid'): AuthSessionState {
  return {
    status: 'authenticated',
    user: {
      uid,
      displayName: 'Usuario',
      email: 'usuario@example.com',
      photoURL: null,
    },
  };
}

function createFakeDriver() {
  const calls: Array<{
    operation: 'create' | 'list' | 'get';
    uid: string;
    projectId: string;
    documentId?: string;
    input?: CreateProjectDocumentInput;
  }> = [];

  const listed = [
    metadata('doc-1', 'drive-1'),
    metadata('doc-2', 'drive-2', 'drive-picker'),
  ];

  const driver: ProjectDocumentDriver = {
    async create(uid, projectId, createInput) {
      calls.push({ operation: 'create', uid, projectId, input: createInput });
      return {
        id: 'metadata-1',
        ...createInput,
        createdAt: null,
        updatedAt: null,
      };
    },

    async list(uid, projectId) {
      calls.push({ operation: 'list', uid, projectId });
      return listed;
    },

    async get(uid, projectId, documentId) {
      calls.push({ operation: 'get', uid, projectId, documentId });
      return documentId === 'missing'
        ? null
        : metadata(documentId, 'drive-found');
    },
  };

  return { driver, calls, listed };
}

test('valid confirmed metadata delegates normalized UID, project and file fields', async () => {
  const fake = createFakeDriver();
  const repository = createProjectDocumentRepository(fake.driver);

  const result = await repository.create(
    '  uid-a  ',
    '  project-a  ',
    input({
      driveFileId: '  drive-file-1  ',
      name: '  Informe final.pdf  ',
      mimeType: '  application/pdf  ',
    }),
  );

  assert.equal(result.id, 'metadata-1');
  assert.deepEqual(fake.calls, [{
    operation: 'create',
    uid: 'uid-a',
    projectId: 'project-a',
    input: {
      driveFileId: 'drive-file-1',
      name: 'Informe final.pdf',
      mimeType: 'application/pdf',
      source: 'local-upload',
    },
  }]);
});

test('blank UID, project ID, or confirmed Drive file ID fails before driver access', async () => {
  for (const scenario of [
    { uid: '   ', projectId: 'project-a', createInput: input() },
    { uid: 'uid-a', projectId: '   ', createInput: input() },
    {
      uid: 'uid-a',
      projectId: 'project-a',
      createInput: input({ driveFileId: '   ' }),
    },
  ]) {
    const fake = createFakeDriver();
    const repository = createProjectDocumentRepository(fake.driver);

    await assert.rejects(
      repository.create(
        scenario.uid,
        scenario.projectId,
        scenario.createInput,
      ),
      (error) => error instanceof ProjectDocumentRepositoryInputError,
    );
    assert.deepEqual(fake.calls, []);
  }
});

test('invalid document source fails before driver access', async () => {
  const fake = createFakeDriver();
  const repository = createProjectDocumentRepository(fake.driver);

  await assert.rejects(
    repository.create(
      'uid-a',
      'project-a',
      input({ source: 'invalid-source' as ProjectDocumentSource }),
    ),
    (error) => error instanceof ProjectDocumentRepositoryInputError,
  );
  assert.deepEqual(fake.calls, []);
});

test('optional blank name and MIME are omitted instead of fabricated as confirmed text', async () => {
  const fake = createFakeDriver();
  const repository = createProjectDocumentRepository(fake.driver);

  await repository.create(
    'uid-a',
    'project-a',
    input({ name: '   ', mimeType: '   ' }),
  );

  assert.deepEqual(fake.calls[0]?.input, {
    driveFileId: 'drive-file-1',
    source: 'local-upload',
  });
});

test('both canonical document sources are accepted', async () => {
  for (const source of ['local-upload', 'drive-picker'] as const) {
    const fake = createFakeDriver();
    const repository = createProjectDocumentRepository(fake.driver);

    await repository.create('uid-a', 'project-a', input({ source }));

    assert.equal(fake.calls[0]?.input?.source, source);
  }
});

test('list and get scope exactly by UID and project ID, with document ID only for get', async () => {
  const fake = createFakeDriver();
  const repository = createProjectDocumentRepository(fake.driver);

  assert.deepEqual(
    await repository.list('  uid-a  ', '  project-a  '),
    fake.listed,
  );
  assert.equal(
    (await repository.get('  uid-b  ', '  project-b  ', '  metadata-7  '))?.id,
    'metadata-7',
  );

  assert.deepEqual(fake.calls, [
    { operation: 'list', uid: 'uid-a', projectId: 'project-a' },
    {
      operation: 'get',
      uid: 'uid-b',
      projectId: 'project-b',
      documentId: 'metadata-7',
    },
  ]);
});

test('blank document metadata ID fails before get driver access', async () => {
  const fake = createFakeDriver();
  const repository = createProjectDocumentRepository(fake.driver);

  await assert.rejects(
    repository.get('uid-a', 'project-a', '   '),
    (error) => error instanceof ProjectDocumentRepositoryInputError,
  );
  assert.deepEqual(fake.calls, []);
});

test('get not-found remains null', async () => {
  const repository = createProjectDocumentRepository(createFakeDriver().driver);
  assert.equal(await repository.get('uid-a', 'project-a', 'missing'), null);
});

test('driver failures propagate as errors', async () => {
  const failingDriver: ProjectDocumentDriver = {
    async create() {
      throw new Error('driver unavailable');
    },
    async list() {
      throw new Error('driver unavailable');
    },
    async get() {
      throw new Error('driver unavailable');
    },
  };
  const repository = createProjectDocumentRepository(failingDriver);

  await assert.rejects(
    repository.list('uid-a', 'project-a'),
    /driver unavailable/,
  );
});

test('authenticated service derives UID only from session for create/list/get', async () => {
  const calls: Array<{
    operation: 'create' | 'list' | 'get';
    uid: string;
    projectId: string;
    documentId?: string;
  }> = [];

  const repository: ProjectDocumentRepository = {
    async create(uid, projectId, createInput) {
      calls.push({ operation: 'create', uid, projectId });
      return {
        id: 'metadata-1',
        ...createInput,
        createdAt: null,
        updatedAt: null,
      };
    },
    async list(uid, projectId) {
      calls.push({ operation: 'list', uid, projectId });
      return [];
    },
    async get(uid, projectId, documentId) {
      calls.push({ operation: 'get', uid, projectId, documentId });
      return null;
    },
  };

  const service = createAuthenticatedProjectDocumentService(repository);
  const session = authenticated('uid-from-session');

  await service.create(session, 'project-a', input());
  await service.list(session, 'project-a');
  await service.get(session, 'project-a', 'metadata-1');

  assert.deepEqual(calls, [
    { operation: 'create', uid: 'uid-from-session', projectId: 'project-a' },
    { operation: 'list', uid: 'uid-from-session', projectId: 'project-a' },
    {
      operation: 'get',
      uid: 'uid-from-session',
      projectId: 'project-a',
      documentId: 'metadata-1',
    },
  ]);
});

test('checking and unauthenticated sessions fail before repository access', async () => {
  for (const session of [
    { status: 'checking' } as const,
    { status: 'unauthenticated' } as const,
  ]) {
    let repositoryCalls = 0;
    const repository: ProjectDocumentRepository = {
      async create() {
        repositoryCalls += 1;
        throw new Error('unexpected');
      },
      async list() {
        repositoryCalls += 1;
        throw new Error('unexpected');
      },
      async get() {
        repositoryCalls += 1;
        throw new Error('unexpected');
      },
    };
    const service = createAuthenticatedProjectDocumentService(repository);

    await assert.rejects(service.list(session, 'project-a'));
    assert.equal(repositoryCalls, 0);
  }
});

test('document persistence contracts expose no owner override, credentials, storage, session URL, or document bytes', () => {
  const source = [
    'src/services/firestore/document-types.ts',
    'src/services/firestore/document-service.ts',
    'src/services/firestore/authenticated-documents.ts',
  ]
    .map((path) => readFileSync(path, 'utf8'))
    .join('\n');

  assert.doesNotMatch(source, /ownerUid|uidOverride/);
  assert.doesNotMatch(source, /accessToken|idToken|refreshToken|apiKey/);
  assert.doesNotMatch(source, /localStorage|sessionStorage|indexedDB|document\.cookie/);
  assert.doesNotMatch(source, /sessionUrl|pickerSession/i);
  assert.doesNotMatch(source, /documentBytes|fileBytes|binaryContent|fileBody/);
});
