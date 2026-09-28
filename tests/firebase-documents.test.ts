import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  createProjectDocumentDriverWithRuntime,
  projectDocumentFromSnapshot,
  type ProjectDocumentFirestoreRuntime,
} from '../src/services/firestore/firebase-documents.js';
import type {
  CreateProjectDocumentInput,
  ProjectDocumentSource,
} from '../src/services/firestore/document-types.js';

function input(
  source: ProjectDocumentSource = 'local-upload',
  overrides: Partial<CreateProjectDocumentInput> = {},
): CreateProjectDocumentInput {
  return {
    driveFileId: 'drive-file-1',
    source,
    name: 'Documento.pdf',
    mimeType: 'application/pdf',
    ...overrides,
  };
}

function snapshot(
  id: string,
  data: Record<string, unknown> | undefined,
  exists = true,
) {
  return {
    id,
    data: () => data,
    exists: () => exists,
  };
}

function timestamp(date: Date) {
  return { toDate: () => date };
}

function createFakeRuntime() {
  const calls: Array<{
    operation: 'create' | 'list' | 'get';
    path: string;
    data?: Record<string, unknown>;
  }> = [];
  const serverTimestampValue = { kind: 'server-timestamp' };
  let listSnapshots = [
    snapshot('metadata-2', {
      driveFileId: 'drive-2',
      source: 'drive-picker',
      createdAt: timestamp(new Date('2026-01-01T00:00:00.000Z')),
      updatedAt: timestamp(new Date('2026-01-03T00:00:00.000Z')),
    }),
    snapshot('metadata-1', {
      driveFileId: 'drive-1',
      source: 'local-upload',
      name: 'Uno.pdf',
      mimeType: 'application/pdf',
      createdAt: timestamp(new Date('2026-01-01T00:00:00.000Z')),
      updatedAt: timestamp(new Date('2026-01-02T00:00:00.000Z')),
    }),
  ];
  let getSnapshot = listSnapshots[0];

  const runtime: ProjectDocumentFirestoreRuntime = {
    serverTimestamp() {
      return serverTimestampValue;
    },

    async create(path, data) {
      calls.push({ operation: 'create', path, data });
      return { id: 'generated-metadata-id' };
    },

    async list(path) {
      calls.push({ operation: 'list', path });
      return listSnapshots;
    },

    async get(path) {
      calls.push({ operation: 'get', path });
      return getSnapshot;
    },
  };

  return {
    runtime,
    calls,
    serverTimestampValue,
    setListSnapshots(value: typeof listSnapshots) {
      listSnapshots = value;
    },
    setGetSnapshot(value: typeof getSnapshot) {
      getSnapshot = value;
    },
  };
}

test('driver create uses generated document ID under exact project documents path', async () => {
  const fake = createFakeRuntime();
  const driver = createProjectDocumentDriverWithRuntime(fake.runtime);

  const result = await driver.create('uid-a', 'project-a', input());

  assert.equal(result.id, 'generated-metadata-id');
  assert.equal(fake.calls[0]?.path, 'users/uid-a/projects/project-a/documents');
});

test('driver create persists only canonical metadata fields plus server timestamps', async () => {
  const fake = createFakeRuntime();
  const driver = createProjectDocumentDriverWithRuntime(fake.runtime);

  await driver.create('uid-a', 'project-a', input());

  assert.deepEqual(fake.calls[0]?.data, {
    driveFileId: 'drive-file-1',
    source: 'local-upload',
    createdAt: fake.serverTimestampValue,
    updatedAt: fake.serverTimestampValue,
    name: 'Documento.pdf',
    mimeType: 'application/pdf',
  });
  assert.deepEqual(Object.keys(fake.calls[0]?.data ?? {}).sort(), [
    'createdAt',
    'driveFileId',
    'mimeType',
    'name',
    'source',
    'updatedAt',
  ]);
});

test('both canonical sources round-trip through create', async () => {
  for (const source of ['local-upload', 'drive-picker'] as const) {
    const fake = createFakeRuntime();
    const driver = createProjectDocumentDriverWithRuntime(fake.runtime);

    const result = await driver.create('uid-a', 'project-a', input(source));

    assert.equal(result.source, source);
    assert.equal(fake.calls[0]?.data?.source, source);
  }
});

test('optional name and MIME remain absent when not supplied', async () => {
  const fake = createFakeRuntime();
  const driver = createProjectDocumentDriverWithRuntime(fake.runtime);

  const result = await driver.create(
    'uid-a',
    'project-a',
    { driveFileId: 'drive-file-1', source: 'local-upload' },
  );

  assert.equal('name' in result, false);
  assert.equal('mimeType' in result, false);
  assert.equal('name' in (fake.calls[0]?.data ?? {}), false);
  assert.equal('mimeType' in (fake.calls[0]?.data ?? {}), false);
});

test('list and get are scoped by UID plus project ID and map timestamps', async () => {
  const fake = createFakeRuntime();
  const driver = createProjectDocumentDriverWithRuntime(fake.runtime);

  const listed = await driver.list('uid-a', 'project-a');
  const found = await driver.get('uid-b', 'project-b', 'metadata-7');

  assert.equal(listed[0]?.id, 'metadata-2');
  assert.equal(listed[0]?.source, 'drive-picker');
  assert.equal(
    listed[0]?.updatedAt?.toISOString(),
    '2026-01-03T00:00:00.000Z',
  );
  assert.equal(found?.id, 'metadata-2');
  assert.deepEqual(fake.calls.map(({ operation, path }) => ({ operation, path })), [
    {
      operation: 'list',
      path: 'users/uid-a/projects/project-a/documents',
    },
    {
      operation: 'get',
      path: 'users/uid-b/projects/project-b/documents/metadata-7',
    },
  ]);
});

test('missing document returns null', async () => {
  const fake = createFakeRuntime();
  fake.setGetSnapshot(snapshot('missing', undefined, false));
  const driver = createProjectDocumentDriverWithRuntime(fake.runtime);

  assert.equal(await driver.get('uid-a', 'project-a', 'missing'), null);
});

test('invalid persisted document metadata is rejected explicitly', () => {
  for (const data of [
    {
      source: 'local-upload',
      driveFileId: '   ',
    },
    {
      source: 'unsupported',
      driveFileId: 'drive-1',
    },
    {
      source: 'drive-picker',
      driveFileId: 'drive-1',
      name: '   ',
    },
    {
      source: 'local-upload',
      driveFileId: 'drive-1',
      mimeType: 123,
    },
  ]) {
    assert.throws(
      () => projectDocumentFromSnapshot(snapshot('metadata-1', data)),
      /metadatos documentales persistidos/,
    );
  }
});

test('valid stored optional metadata maps without fabrication', () => {
  const result = projectDocumentFromSnapshot(snapshot('metadata-1', {
    driveFileId: '  drive-1  ',
    source: 'drive-picker',
    name: '  Informe.pdf  ',
    createdAt: undefined,
    updatedAt: undefined,
  }));

  assert.deepEqual(result, {
    id: 'metadata-1',
    driveFileId: 'drive-1',
    source: 'drive-picker',
    name: 'Informe.pdf',
    createdAt: null,
    updatedAt: null,
  });
});

test('driver failures propagate without fake success', async () => {
  const failingRuntime: ProjectDocumentFirestoreRuntime = {
    serverTimestamp: () => ({ kind: 'server-timestamp' }),
    async create() {
      throw new Error('firestore unavailable');
    },
    async list() {
      throw new Error('firestore unavailable');
    },
    async get() {
      throw new Error('firestore unavailable');
    },
  };
  const driver = createProjectDocumentDriverWithRuntime(failingRuntime);

  await assert.rejects(
    driver.create('uid-a', 'project-a', input()),
    /firestore unavailable/,
  );
  await assert.rejects(
    driver.list('uid-a', 'project-a'),
    /firestore unavailable/,
  );
  await assert.rejects(
    driver.get('uid-a', 'project-a', 'metadata-1'),
    /firestore unavailable/,
  );
});

test('document driver source contains no redundant owner/project body fields or forbidden persistence material', () => {
  const source = readFileSync(
    'src/services/firestore/firebase-documents.ts',
    'utf8',
  );

  assert.doesNotMatch(source, /ownerUid|uidOverride/);
  assert.doesNotMatch(source, /accessToken|refreshToken|apiKey|credential/i);
  assert.doesNotMatch(source, /documentBytes|fileBytes|binaryContent|fileBody/);
  assert.doesNotMatch(source, /sessionUrl|pickerSession/i);
});
