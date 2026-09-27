import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createProjectRepository,
  ProjectRepositoryInputError,
} from '../src/services/firestore/service.js';
import type {
  ProjectDriver,
  ProjectMetadata,
} from '../src/services/firestore/types.js';

function project(id: string, name: string): ProjectMetadata {
  return {
    id,
    name,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  };
}

function createFakeDriver(recordsByUid: Record<string, ProjectMetadata[]> = {}) {
  const calls: Array<{ operation: string; uid: string; value?: string }> = [];
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
  };

  return { driver, calls };
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
  };
  const failingRepository = createProjectRepository(failingDriver);

  await assert.rejects(
    failingRepository.get('uid-a', 'project-a'),
    /firestore unavailable/,
  );
});
