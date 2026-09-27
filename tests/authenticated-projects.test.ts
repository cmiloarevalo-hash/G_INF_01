import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import type { AuthSessionState } from '../src/services/auth/types.js';
import type { ProjectDriveFolders } from '../src/services/drive/types.js';
import {
  AuthenticatedProjectSessionError,
  createAuthenticatedProjectService,
} from '../src/services/firestore/authenticated.js';
import type {
  ProjectMetadata,
  ProjectRepository,
} from '../src/services/firestore/types.js';

function driveFolders(): ProjectDriveFolders {
  return {
    applicationRootId: 'app-root',
    projectsRootId: 'projects-root',
    projectFolderId: 'project-folder',
    documentsFolderId: 'documents-folder',
    analysisFolderId: 'analysis-folder',
    reportsFolderId: 'reports-folder',
  };
}

function project(id: string, name: string): ProjectMetadata {
  return {
    id,
    name,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
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

function createFakeRepository() {
  const calls: Array<{
    operation: 'create' | 'list' | 'get' | 'updateDriveFolders';
    uid: string;
    value?: string;
    driveFolders?: ProjectDriveFolders;
  }> = [];
  const created = project('created-project', 'Created');
  const listed = [project('listed-project', 'Listed')];

  const repository: ProjectRepository = {
    async create(uid, name) {
      calls.push({ operation: 'create', uid, value: name });
      return { ...created, name };
    },

    async list(uid) {
      calls.push({ operation: 'list', uid });
      return listed;
    },

    async get(uid, projectId) {
      calls.push({ operation: 'get', uid, value: projectId });
      return projectId === 'missing' ? null : project(projectId, 'Found');
    },

    async updateDriveFolders(uid, projectId, folders) {
      calls.push({
        operation: 'updateDriveFolders',
        uid,
        value: projectId,
        driveFolders: folders,
      });
      return {
        ...project(projectId, 'Updated'),
        driveFolders: folders,
      };
    },
  };

  return { repository, calls, listed };
}

test('checking session fails closed before repository access', async () => {
  const fake = createFakeRepository();
  const service = createAuthenticatedProjectService(fake.repository);

  await assert.rejects(
    service.list({ status: 'checking' }),
    (error) => error instanceof AuthenticatedProjectSessionError,
  );
  assert.deepEqual(fake.calls, []);
});

test('unauthenticated session fails closed before repository access', async () => {
  const fake = createFakeRepository();
  const service = createAuthenticatedProjectService(fake.repository);

  await assert.rejects(
    service.list({ status: 'unauthenticated' }),
    (error) => error instanceof AuthenticatedProjectSessionError,
  );
  assert.deepEqual(fake.calls, []);
});

test('authenticated create uses exactly the session UID and delegates name unchanged', async () => {
  const fake = createFakeRepository();
  const service = createAuthenticatedProjectService(fake.repository);

  const result = await service.create(authenticated('uid-from-session'), '  Proyecto sin normalizar  ');

  assert.equal(result.name, '  Proyecto sin normalizar  ');
  assert.deepEqual(fake.calls, [
    {
      operation: 'create',
      uid: 'uid-from-session',
      value: '  Proyecto sin normalizar  ',
    },
  ]);
});

test('authenticated list uses exactly the session UID', async () => {
  const fake = createFakeRepository();
  const service = createAuthenticatedProjectService(fake.repository);

  const result = await service.list(authenticated('uid-for-list'));

  assert.deepEqual(result, fake.listed);
  assert.deepEqual(fake.calls, [
    { operation: 'list', uid: 'uid-for-list' },
  ]);
});

test('authenticated get uses exactly session UID plus projectId and delegates projectId unchanged', async () => {
  const fake = createFakeRepository();
  const service = createAuthenticatedProjectService(fake.repository);

  const result = await service.get(authenticated('uid-for-get'), '  project-id  ');

  assert.equal(result?.id, '  project-id  ');
  assert.deepEqual(fake.calls, [
    {
      operation: 'get',
      uid: 'uid-for-get',
      value: '  project-id  ',
    },
  ]);
});

test('authenticated Drive-folder update derives UID only from session', async () => {
  const fake = createFakeRepository();
  const service = createAuthenticatedProjectService(fake.repository);
  const folders = driveFolders();

  const result = await service.updateDriveFolders(
    authenticated('uid-from-session'),
    'project-a',
    folders,
  );

  assert.deepEqual(result?.driveFolders, folders);
  assert.deepEqual(fake.calls, [{
    operation: 'updateDriveFolders',
    uid: 'uid-from-session',
    value: 'project-a',
    driveFolders: folders,
  }]);
});

test('checking and unauthenticated Drive-folder updates fail before repository access', async () => {
  for (const session of [
    { status: 'checking' } as const,
    { status: 'unauthenticated' } as const,
  ]) {
    const fake = createFakeRepository();
    const service = createAuthenticatedProjectService(fake.repository);

    await assert.rejects(
      service.updateDriveFolders(session, 'project-a', driveFolders()),
      (error) => error instanceof AuthenticatedProjectSessionError,
    );
    assert.deepEqual(fake.calls, []);
  }
});

test('repository not-found remains null', async () => {
  const fake = createFakeRepository();
  const service = createAuthenticatedProjectService(fake.repository);

  assert.equal(await service.get(authenticated(), 'missing'), null);
});

test('repository failures propagate as errors', async () => {
  const repository: ProjectRepository = {
    async create() {
      throw new Error('repository unavailable');
    },
    async list() {
      throw new Error('repository unavailable');
    },
    async get() {
      throw new Error('repository unavailable');
    },
    async updateDriveFolders() {
      throw new Error('repository unavailable');
    },
  };
  const service = createAuthenticatedProjectService(repository);

  await assert.rejects(
    service.updateDriveFolders(authenticated(), 'project-id', driveFolders()),
    /repository unavailable/,
  );
});

test('application-facing project API exposes no owner or UID override parameter', () => {
  const source = readFileSync(
    new URL('../src/services/firestore/authenticated.ts', import.meta.url),
    'utf8',
  );

  assert.match(
    source,
    /create\(session: AuthSessionState, name: string\)/,
  );
  assert.match(
    source,
    /list\(session: AuthSessionState\)/,
  );
  assert.match(
    source,
    /get\(session: AuthSessionState, projectId: string\)/,
  );
  assert.match(
    source,
    /updateDriveFolders\(\s*session: AuthSessionState,\s*projectId: string,\s*driveFolders: ProjectDriveFolders,/,
  );
  assert.doesNotMatch(source, /ownerUid/);
  assert.doesNotMatch(source, /uidOverride/);
  assert.doesNotMatch(source, /accessToken|idToken|refreshToken/);
  assert.doesNotMatch(source, /localStorage|sessionStorage/);
});
