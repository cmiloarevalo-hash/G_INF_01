import assert from 'node:assert/strict';
import test from 'node:test';
import type { AuthSessionState } from '../src/services/auth/types.js';
import {
  createAuthenticatedProjectArtifactService,
  createProjectArtifactRepository,
  type ProjectAnalysisMetadata,
  type ProjectReportMetadata,
} from '../src/services/firestore/artifacts.js';
import {
  artifactFromSnapshot,
  createProjectAnalysisDriverWithRuntime,
  createProjectReportDriverWithRuntime,
  type ProjectArtifactFirestoreRuntime,
} from '../src/services/firestore/firebase-artifacts.js';

function authenticated(uid = 'uid-a'): AuthSessionState {
  return {
    status: 'authenticated',
    user: {
      uid,
      displayName: null,
      email: null,
      photoURL: null,
    },
  };
}

function timestamp(value: string) {
  return { toDate: () => new Date(value) };
}

function createRuntime() {
  const calls: Array<{
    operation: 'create' | 'list' | 'get';
    path: string;
    data?: Record<string, unknown>;
  }> = [];
  const stamp = { server: true };
  let getExists = true;

  const runtime: ProjectArtifactFirestoreRuntime = {
    serverTimestamp() {
      return stamp;
    },
    async create(path, data) {
      calls.push({ operation: 'create', path, data });
      return { id: 'generated-id' };
    },
    async list(path) {
      calls.push({ operation: 'list', path });
      return [{
        id: 'artifact-1',
        data: () => ({
          driveFileId: 'drive-1',
          name: 'artifact.json',
          mimeType: 'application/json',
          createdAt: timestamp('2026-01-01T00:00:00.000Z'),
          updatedAt: timestamp('2026-01-02T00:00:00.000Z'),
        }),
      }];
    },
    async get(path) {
      calls.push({ operation: 'get', path });
      return {
        id: 'artifact-1',
        exists: () => getExists,
        data: () => getExists ? ({
          driveFileId: 'drive-1',
          createdAt: stamp,
          updatedAt: stamp,
        }) : undefined,
      };
    },
  };

  return {
    runtime,
    calls,
    stamp,
    setGetExists(value: boolean) {
      getExists = value;
    },
  };
}

test('analysis driver creates under exact authenticated project analyses path with metadata only', async () => {
  const fake = createRuntime();
  const driver = createProjectAnalysisDriverWithRuntime(fake.runtime);

  const result = await driver.create('uid-a', 'project-a', {
    driveFileId: 'drive-analysis-1',
    name: 'analisis.json',
    mimeType: 'application/json',
  });

  assert.equal(result.id, 'generated-id');
  assert.deepEqual(fake.calls[0], {
    operation: 'create',
    path: 'users/uid-a/projects/project-a/analyses',
    data: {
      driveFileId: 'drive-analysis-1',
      createdAt: fake.stamp,
      updatedAt: fake.stamp,
      name: 'analisis.json',
      mimeType: 'application/json',
    },
  });
});

test('report driver creates under exact authenticated project reports path with metadata only', async () => {
  const fake = createRuntime();
  const driver = createProjectReportDriverWithRuntime(fake.runtime);

  await driver.create('uid-a', 'project-a', {
    driveFileId: 'drive-report-1',
    name: 'informe.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });

  assert.equal(fake.calls[0]?.path, 'users/uid-a/projects/project-a/reports');
  assert.deepEqual(Object.keys(fake.calls[0]?.data ?? {}).sort(), [
    'createdAt',
    'driveFileId',
    'mimeType',
    'name',
    'updatedAt',
  ]);
});

test('analysis/report list and get remain scoped by UID and project', async () => {
  const analysisFake = createRuntime();
  const analysisDriver = createProjectAnalysisDriverWithRuntime(
    analysisFake.runtime,
  );
  await analysisDriver.list('uid-a', 'project-a');
  await analysisDriver.get('uid-a', 'project-a', 'analysis-a');
  assert.deepEqual(
    analysisFake.calls.map(({ operation, path }) => ({ operation, path })),
    [
      {
        operation: 'list',
        path: 'users/uid-a/projects/project-a/analyses',
      },
      {
        operation: 'get',
        path: 'users/uid-a/projects/project-a/analyses/analysis-a',
      },
    ],
  );

  const reportFake = createRuntime();
  const reportDriver = createProjectReportDriverWithRuntime(reportFake.runtime);
  await reportDriver.list('uid-r', 'project-r');
  await reportDriver.get('uid-r', 'project-r', 'report-r');
  assert.deepEqual(
    reportFake.calls.map(({ operation, path }) => ({ operation, path })),
    [
      {
        operation: 'list',
        path: 'users/uid-r/projects/project-r/reports',
      },
      {
        operation: 'get',
        path: 'users/uid-r/projects/project-r/reports/report-r',
      },
    ],
  );
});

test('missing analysis/report metadata returns null', async () => {
  const analysisFake = createRuntime();
  analysisFake.setGetExists(false);
  const reportFake = createRuntime();
  reportFake.setGetExists(false);

  assert.equal(
    await createProjectAnalysisDriverWithRuntime(analysisFake.runtime)
      .get('uid-a', 'project-a', 'missing'),
    null,
  );
  assert.equal(
    await createProjectReportDriverWithRuntime(reportFake.runtime)
      .get('uid-a', 'project-a', 'missing'),
    null,
  );
});

test('persisted artifact metadata maps timestamps and rejects invalid references', () => {
  const mapped = artifactFromSnapshot({
    id: 'artifact-1',
    data: () => ({
      driveFileId: ' drive-1 ',
      name: ' Informe ',
      createdAt: timestamp('2026-01-01T00:00:00.000Z'),
      updatedAt: timestamp('2026-01-02T00:00:00.000Z'),
    }),
  });

  assert.equal(mapped.driveFileId, 'drive-1');
  assert.equal(mapped.name, 'Informe');
  assert.equal(mapped.updatedAt?.toISOString(), '2026-01-02T00:00:00.000Z');

  assert.throws(
    () => artifactFromSnapshot({
      id: 'bad',
      data: () => ({ driveFileId: '   ' }),
    }),
    /no son válidos/,
  );
});

test('repository validates confirmed Drive reference before driver access', async () => {
  let calls = 0;
  const repository = createProjectArtifactRepository<ProjectAnalysisMetadata>({
    async create() {
      calls += 1;
      throw new Error('unexpected');
    },
    async list() {
      return [];
    },
    async get() {
      return null;
    },
  });

  await assert.rejects(
    repository.create('uid-a', 'project-a', { driveFileId: '   ' }),
    /no puede estar vacío/,
  );
  assert.equal(calls, 0);
});

test('authenticated artifact service derives UID only from session', async () => {
  const calls: string[] = [];
  const repository = createProjectArtifactRepository<ProjectReportMetadata>({
    async create(uid) {
      calls.push(uid);
      return {
        id: 'report-1',
        driveFileId: 'drive-1',
        createdAt: null,
        updatedAt: null,
      };
    },
    async list(uid) {
      calls.push(uid);
      return [];
    },
    async get(uid) {
      calls.push(uid);
      return null;
    },
  });
  const service = createAuthenticatedProjectArtifactService(repository);

  await service.create(authenticated('session-uid'), 'project-a', {
    driveFileId: 'drive-1',
  });
  await service.list(authenticated('session-uid'), 'project-a');
  await service.get(authenticated('session-uid'), 'project-a', 'report-1');

  assert.deepEqual(calls, ['session-uid', 'session-uid', 'session-uid']);
});

test('checking/unauthenticated sessions fail before artifact repository access', async () => {
  let calls = 0;
  const service = createAuthenticatedProjectArtifactService<ProjectAnalysisMetadata>({
    async create() {
      calls += 1;
      throw new Error('unexpected');
    },
    async list() {
      calls += 1;
      return [];
    },
    async get() {
      calls += 1;
      return null;
    },
  });

  for (const session of [
    { status: 'checking' } as const,
    { status: 'unauthenticated' } as const,
  ]) {
    await assert.rejects(service.list(session, 'project-a'));
  }
  assert.equal(calls, 0);
});
