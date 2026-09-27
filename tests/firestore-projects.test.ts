import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import type { ProjectDriveFolders } from '../src/services/drive/types.js';
import { projectFromSnapshot } from '../src/services/firestore/firebase.js';
import {
  createProjectRepository,
  ProjectRepositoryInputError,
} from '../src/services/firestore/service.js';
import type {
  ProjectDriver,
  ProjectMetadata,
} from '../src/services/firestore/types.js';

function driveFolders(overrides: Partial<ProjectDriveFolders> = {}): ProjectDriveFolders {
  return {
    applicationRootId: 'app-root',
    projectsRootId: 'projects-root',
    projectFolderId: 'project-folder',
    documentsFolderId: 'documents-folder',
    analysisFolderId: 'analysis-folder',
    reportsFolderId: 'reports-folder',
    ...overrides,
  };
}

function project(
  id: string,
  name: string,
  folders?: ProjectDriveFolders,
): ProjectMetadata {
  return {
    id,
    name,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    ...(folders ? { driveFolders: folders } : {}),
  };
}

function createFakeDriver(recordsByUid: Record<string, ProjectMetadata[]> = {}) {
  const calls: Array<{
    operation: 'create' | 'list' | 'get' | 'updateDriveFolders';
    uid: string;
    value?: string;
    driveFolders?: ProjectDriveFolders;
  }> = [];
  let createCounter = 0;

  const driver: ProjectDriver = {
    async create(uid, name) {
      calls.push({ operation: 'create', uid, value: name });
      createCounter += 1;
      const created = project(`created-${createCounter}`, name);
      recordsByUid[uid] = [...(recordsByUid[uid] ?? []), created];
      return created;
    },

    async list(uid) {
      calls.push({ operation: 'list', uid });
      return [...(recordsByUid[uid] ?? [])];
    },

    async get(uid, projectId) {
      calls.push({ operation: 'get', uid, value: projectId });
      return (recordsByUid[uid] ?? []).find((item) => item.id === projectId) ?? null;
    },

    async updateDriveFolders(uid, projectId, folders) {
      calls.push({
        operation: 'updateDriveFolders',
        uid,
        value: projectId,
        driveFolders: folders,
      });
      const records = recordsByUid[uid] ?? [];
      const index = records.findIndex((item) => item.id === projectId);
      if (index < 0) return null;

      const updated = {
        ...records[index],
        driveFolders: folders,
        updatedAt: new Date('2026-01-03T00:00:00.000Z'),
      };
      recordsByUid[uid] = records.map((item, itemIndex) => (
        itemIndex === index ? updated : item
      ));
      return updated;
    },
  };

  return { driver, calls, recordsByUid };
}

test('blank UID is rejected before project driver access', async () => {
  const fake = createFakeDriver();
  const repository = createProjectRepository(fake.driver);

  await assert.rejects(
    repository.list('   '),
    (error) => error instanceof ProjectRepositoryInputError,
  );
  assert.deepEqual(fake.calls, []);
});

test('blank project name is rejected before project driver access', async () => {
  const fake = createFakeDriver();
  const repository = createProjectRepository(fake.driver);

  await assert.rejects(
    repository.create('uid-a', '   '),
    (error) => error instanceof ProjectRepositoryInputError,
  );
  assert.deepEqual(fake.calls, []);
});

test('create uses authenticated UID and trimmed project name', async () => {
  const fake = createFakeDriver();
  const repository = createProjectRepository(fake.driver);

  const created = await repository.create('  uid-a  ', '  Proyecto Uno  ');

  assert.equal(created.name, 'Proyecto Uno');
  assert.deepEqual(fake.calls, [
    { operation: 'create', uid: 'uid-a', value: 'Proyecto Uno' },
  ]);
});

test('list returns only projects scoped to the supplied UID', async () => {
  const own = project('project-a', 'Proyecto A');
  const other = project('project-b', 'Proyecto B');
  const fake = createFakeDriver({
    'uid-a': [own],
    'uid-b': [other],
  });
  const repository = createProjectRepository(fake.driver);

  const result = await repository.list('uid-a');

  assert.deepEqual(result, [own]);
  assert.equal(result.some((item) => item.id === other.id), false);
  assert.deepEqual(fake.calls, [{ operation: 'list', uid: 'uid-a' }]);
});

test('get is scoped to UID and project ID', async () => {
  const own = project('shared-id', 'Proyecto A');
  const other = project('shared-id', 'Proyecto B');
  const fake = createFakeDriver({
    'uid-a': [own],
    'uid-b': [other],
  });
  const repository = createProjectRepository(fake.driver);

  const result = await repository.get('uid-a', 'shared-id');

  assert.deepEqual(result, own);
  assert.deepEqual(fake.calls, [
    { operation: 'get', uid: 'uid-a', value: 'shared-id' },
  ]);
});

test('complete Drive folder refs are normalized and delegated to the project driver', async () => {
  const fake = createFakeDriver({
    'uid-a': [project('project-a', 'Proyecto A')],
  });
  const repository = createProjectRepository(fake.driver);
  const input = driveFolders({
    applicationRootId: '  app-root  ',
    documentsFolderId: '  documents-folder  ',
  });

  const result = await repository.updateDriveFolders(
    '  uid-a  ',
    '  project-a  ',
    input,
  );

  const expected = driveFolders();
  assert.deepEqual(result?.driveFolders, expected);
  assert.deepEqual(fake.calls, [{
    operation: 'updateDriveFolders',
    uid: 'uid-a',
    value: 'project-a',
    driveFolders: expected,
  }]);
});

test('every blank or missing Drive folder ID is rejected before driver access', async () => {
  const keys: Array<keyof ProjectDriveFolders> = [
    'applicationRootId',
    'projectsRootId',
    'projectFolderId',
    'documentsFolderId',
    'analysisFolderId',
    'reportsFolderId',
  ];

  for (const key of keys) {
    const blankFake = createFakeDriver();
    const blankRepository = createProjectRepository(blankFake.driver);
    await assert.rejects(
      blankRepository.updateDriveFolders(
        'uid-a',
        'project-a',
        driveFolders({ [key]: '   ' }),
      ),
      (error) => error instanceof ProjectRepositoryInputError,
    );
    assert.deepEqual(blankFake.calls, []);

    const missingFake = createFakeDriver();
    const missingRepository = createProjectRepository(missingFake.driver);
    const incomplete = { ...driveFolders() } as Record<string, string>;
    delete incomplete[key];
    await assert.rejects(
      missingRepository.updateDriveFolders(
        'uid-a',
        'project-a',
        incomplete as unknown as ProjectDriveFolders,
      ),
      (error) => error instanceof ProjectRepositoryInputError,
    );
    assert.deepEqual(missingFake.calls, []);
  }
});

test('Drive folder update persists the complete refs on an existing project', async () => {
  const fake = createFakeDriver({
    'uid-a': [project('project-a', 'Proyecto A')],
  });
  const repository = createProjectRepository(fake.driver);
  const folders = driveFolders();

  const updated = await repository.updateDriveFolders('uid-a', 'project-a', folders);
  const persisted = await repository.get('uid-a', 'project-a');

  assert.deepEqual(updated?.driveFolders, folders);
  assert.deepEqual(persisted?.driveFolders, folders);
});

test('Drive folder update returns null for a missing project and never creates it', async () => {
  const fake = createFakeDriver({ 'uid-a': [] });
  const repository = createProjectRepository(fake.driver);

  assert.equal(
    await repository.updateDriveFolders('uid-a', 'missing', driveFolders()),
    null,
  );
  assert.deepEqual(fake.recordsByUid['uid-a'], []);
});

test('project not found is null while external driver failure remains an error', async () => {
  const repository = createProjectRepository(createFakeDriver().driver);
  assert.equal(await repository.get('uid-a', 'missing'), null);

  const failingDriver: ProjectDriver = {
    async create() {
      throw new Error('firestore unavailable');
    },
    async list() {
      throw new Error('firestore unavailable');
    },
    async get() {
      throw new Error('firestore unavailable');
    },
    async updateDriveFolders() {
      throw new Error('firestore unavailable');
    },
  };
  const failingRepository = createProjectRepository(failingDriver);

  await assert.rejects(
    failingRepository.updateDriveFolders('uid-a', 'project-a', driveFolders()),
    /firestore unavailable/,
  );
});

test('old project snapshots without Drive refs remain readable', () => {
  const created = new Date('2026-01-01T00:00:00.000Z');
  const updated = new Date('2026-01-02T00:00:00.000Z');

  const result = projectFromSnapshot({
    id: 'legacy-project',
    data: () => ({
      name: ' Legacy ',
      createdAt: { toDate: () => created },
      updatedAt: { toDate: () => updated },
    }),
  });

  assert.deepEqual(result, {
    id: 'legacy-project',
    name: 'Legacy',
    createdAt: created,
    updatedAt: updated,
  });
});

test('valid stored Drive refs are parsed into canonical ProjectMetadata', () => {
  const result = projectFromSnapshot({
    id: 'project-a',
    data: () => ({
      name: 'Proyecto A',
      driveFolders: driveFolders({ reportsFolderId: '  reports-folder  ' }),
    }),
  });

  assert.deepEqual(result.driveFolders, driveFolders());
});

test('invalid or incomplete stored Drive refs never become fabricated valid state', () => {
  assert.throws(
    () => projectFromSnapshot({
      id: 'project-a',
      data: () => ({
        name: 'Proyecto A',
        driveFolders: {
          applicationRootId: 'app-root',
          projectsRootId: 'projects-root',
        },
      }),
    }),
    /referencias Drive persistidas/,
  );

  assert.throws(
    () => projectFromSnapshot({
      id: 'project-a',
      data: () => ({
        name: 'Proyecto A',
        driveFolders: driveFolders({ analysisFolderId: '   ' }),
      }),
    }),
    /referencias Drive persistidas/,
  );
});

test('Firestore project source introduces no credential, owner override, or document-byte persistence', () => {
  const source = [
    '../src/services/firestore/types.ts',
    '../src/services/firestore/service.ts',
    '../src/services/firestore/authenticated.ts',
    '../src/services/firestore/firebase.ts',
  ]
    .map((path) => readFileSync(new URL(path, import.meta.url), 'utf8'))
    .join('\n');

  assert.doesNotMatch(source, /ownerUid|uidOverride/);
  assert.doesNotMatch(source, /accessToken|idToken|refreshToken/);
  assert.doesNotMatch(source, /documentBytes|fileBytes|fileBody/);
  assert.doesNotMatch(source, /localStorage|sessionStorage/);
});
