import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  createDriveAuthorizationService,
  DriveAuthorizationError,
} from '../src/services/drive/authorization.js';
import { createDriveClient, DriveApiError } from '../src/services/drive/client.js';
import {
  createProjectDriveFolderService,
  DriveAuthorizationRequiredError,
  ProjectDriveProvisioningError,
} from '../src/services/drive/project-folders.js';
import {
  DRIVE_FILE_SCOPE,
  DRIVE_FOLDER_MIME_TYPE,
  type DriveAuthorizationAdapter,
  type DriveAuthorizationService,
  type DriveClient,
  type DriveTransport,
} from '../src/services/drive/types.js';

function authorizedService(token = 'memory-token'): DriveAuthorizationService {
  return {
    getState: () => ({ status: 'authorized' }),
    authorize: async () => undefined,
    getAccessToken: () => token,
    clear: () => undefined,
    requireReauthorization: () => undefined,
  };
}

test('Drive authorization starts unauthorized and requests exactly drive.file only on explicit authorize', async () => {
  const scopes: string[] = [];
  const adapter: DriveAuthorizationAdapter = {
    async requestAccessToken(scope) {
      scopes.push(scope);
      return { accessToken: 'token-123' };
    },
  };
  const authorization = createDriveAuthorizationService(adapter);

  assert.deepEqual(authorization.getState(), { status: 'unauthorized' });
  assert.equal(authorization.getAccessToken(), null);
  assert.deepEqual(scopes, []);

  await authorization.authorize();

  assert.equal(DRIVE_FILE_SCOPE, 'https://www.googleapis.com/auth/drive.file');
  assert.deepEqual(scopes, [DRIVE_FILE_SCOPE]);
  assert.deepEqual(authorization.getState(), { status: 'authorized' });
  assert.equal(authorization.getAccessToken(), 'token-123');
});

test('authorization failure never creates authorized state or retains a token', async () => {
  const authorization = createDriveAuthorizationService({
    async requestAccessToken() {
      throw new Error('popup denied');
    },
  });

  await assert.rejects(
    authorization.authorize(),
    (error) => error instanceof DriveAuthorizationError,
  );
  assert.deepEqual(authorization.getState(), { status: 'authorization-error' });
  assert.equal(authorization.getAccessToken(), null);
});

test('clear and reauthorization-required states remove the in-memory access token', async () => {
  const authorization = createDriveAuthorizationService({
    async requestAccessToken() {
      return { accessToken: 'short-lived-token' };
    },
  });

  await authorization.authorize();
  authorization.requireReauthorization();
  assert.deepEqual(authorization.getState(), { status: 'reauthorization-required' });
  assert.equal(authorization.getAccessToken(), null);

  await authorization.authorize();
  authorization.clear();
  assert.deepEqual(authorization.getState(), { status: 'unauthorized' });
  assert.equal(authorization.getAccessToken(), null);
});

test('Drive foundation contains no browser token persistence, refresh-token handling, or token logging', () => {
  const files = [
    '../src/services/drive/authorization.ts',
    '../src/services/drive/client.ts',
    '../src/services/drive/project-folders.ts',
    '../src/services/drive/types.ts',
  ];
  const source = files
    .map((path) => readFileSync(path.replace('../', ''), 'utf8'))
    .join('\n');

  assert.doesNotMatch(source, /localStorage|sessionStorage/i);
  assert.doesNotMatch(source, /refresh[_-]?token|refreshToken/i);
  assert.doesNotMatch(source, /console\.(?:log|info|debug|warn|error)/);
});

test('Drive client creates a metadata-only folder with parent through injected transport', async () => {
  const calls: Array<{ input: string; init?: RequestInit }> = [];
  const transport: DriveTransport = async (input, init) => {
    calls.push({ input: String(input), init });
    return Response.json({ id: 'folder-123' }, { status: 200 });
  };
  const client = createDriveClient(transport);

  const result = await client.createFolder('transient-token', {
    name: 'Documentos',
    parentId: 'parent-1',
  });

  assert.deepEqual(result, { id: 'folder-123' });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].input, 'https://www.googleapis.com/drive/v3/files?fields=id');
  assert.equal(calls[0].init?.method, 'POST');
  assert.deepEqual(JSON.parse(String(calls[0].init?.body)), {
    name: 'Documentos',
    mimeType: DRIVE_FOLDER_MIME_TYPE,
    parents: ['parent-1'],
  });
  assert.equal(
    new Headers(calls[0].init?.headers).get('Authorization'),
    'Bearer transient-token',
  );
});

test('Drive client creates an application root without fabricating a parent', async () => {
  let body: unknown;
  const client = createDriveClient(async (_input, init) => {
    body = JSON.parse(String(init?.body));
    return Response.json({ id: 'root-1' });
  });

  await client.createFolder('token', { name: 'G_INF_01' });

  assert.deepEqual(body, {
    name: 'G_INF_01',
    mimeType: DRIVE_FOLDER_MIME_TYPE,
  });
});

test('Drive client propagates non-confirmed responses and missing IDs as explicit errors', async () => {
  const rejected = createDriveClient(async () => new Response('denied', { status: 403 }));
  await assert.rejects(
    rejected.createFolder('token', { name: 'X' }),
    (error) => error instanceof DriveApiError && error.status === 403,
  );

  const missingId = createDriveClient(async () => Response.json({ name: 'X' }));
  await assert.rejects(
    missingId.createFolder('token', { name: 'X' }),
    (error) => error instanceof DriveApiError,
  );
});

test('project folder service creates the canonical six folders in order and returns confirmed IDs', async () => {
  const calls: Array<{ token: string; name: string; parentId?: string }> = [];
  const ids = ['app-1', 'projects-1', 'project-1', 'docs-1', 'analysis-1', 'reports-1'];
  const client: DriveClient = {
    async createFolder(token, input) {
      calls.push({ token, ...input });
      const id = ids[calls.length - 1];
      if (!id) throw new Error('unexpected call');
      return { id };
    },
  };
  const service = createProjectDriveFolderService(authorizedService(), client);

  const result = await service.provision({
    applicationRootName: 'Aplicacion',
    projectId: 'project-42',
    projectName: 'Proyecto Norte',
  });

  assert.deepEqual(calls, [
    { token: 'memory-token', name: 'Aplicacion' },
    { token: 'memory-token', name: 'Proyectos', parentId: 'app-1' },
    { token: 'memory-token', name: 'Proyecto Norte [project-42]', parentId: 'projects-1' },
    { token: 'memory-token', name: 'Documentos', parentId: 'project-1' },
    { token: 'memory-token', name: 'Analisis', parentId: 'project-1' },
    { token: 'memory-token', name: 'Informes', parentId: 'project-1' },
  ]);
  assert.deepEqual(result, {
    applicationRootId: 'app-1',
    projectsRootId: 'projects-1',
    projectFolderId: 'project-1',
    documentsFolderId: 'docs-1',
    analysisFolderId: 'analysis-1',
    reportsFolderId: 'reports-1',
  });
});

test('project folder provisioning requires transient authorization before any Drive operation', async () => {
  let calls = 0;
  const client: DriveClient = {
    async createFolder() {
      calls += 1;
      return { id: 'unexpected' };
    },
  };
  const service = createProjectDriveFolderService(
    { ...authorizedService(), getAccessToken: () => null },
    client,
  );

  await assert.rejects(
    service.provision({
      applicationRootName: 'Aplicacion',
      projectId: 'project-1',
      projectName: 'Proyecto',
    }),
    (error) => error instanceof DriveAuthorizationRequiredError,
  );
  assert.equal(calls, 0);
});

test('intermediate Drive failure rejects at its stage and never returns complete success', async () => {
  let calls = 0;
  const client: DriveClient = {
    async createFolder() {
      calls += 1;
      if (calls === 4) throw new Error('Drive unavailable');
      return { id: `confirmed-${calls}` };
    },
  };
  const service = createProjectDriveFolderService(authorizedService(), client);
  let completedResult: unknown;

  try {
    completedResult = await service.provision({
      applicationRootName: 'Aplicacion',
      projectId: 'project-1',
      projectName: 'Proyecto',
    });
    assert.fail('provisioning should have rejected');
  } catch (error) {
    assert.equal(error instanceof ProjectDriveProvisioningError, true);
    if (error instanceof ProjectDriveProvisioningError) {
      assert.equal(error.stage, 'documents-folder');
    }
  }

  assert.equal(completedResult, undefined);
  assert.equal(calls, 4);
});

test('tests use injected fakes only and never require real Google credentials or network', async () => {
  let adapterCalls = 0;
  let transportCalls = 0;
  const authorization = createDriveAuthorizationService({
    async requestAccessToken() {
      adapterCalls += 1;
      return { accessToken: 'fake-token' };
    },
  });
  const client = createDriveClient(async () => {
    transportCalls += 1;
    return Response.json({ id: `fake-${transportCalls}` });
  });

  await authorization.authorize();
  await client.createFolder(authorization.getAccessToken() ?? '', { name: 'Fake' });

  assert.equal(adapterCalls, 1);
  assert.equal(transportCalls, 1);
});
