import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  DRIVE_FILE_SCOPE,
  DRIVE_FOLDER_MIME,
  createDriveAuthorizationService,
  createDriveFolderClient,
  provisionProjectFolders,
  type DriveRequest,
  type DriveTransport,
} from '../src/services/drive/index.js';

test('Drive authorization uses the exact drive.file scope and starts unauthorized', async () => {
  const scopes: string[] = [];
  const service = createDriveAuthorizationService({
    async authorize({ scope }) {
      scopes.push(scope);
      return { accessToken: 'test-value' };
    },
  });

  assert.deepEqual(service.getState(), { status: 'unauthorized' });
  await service.authorize();
  assert.deepEqual(scopes, [DRIVE_FILE_SCOPE]);
  assert.deepEqual(service.getState(), { status: 'authorized' });
  assert.equal(service.getAccessToken(), 'test-value');
});

test('Drive authorization errors remain non-authorized', async () => {
  const service = createDriveAuthorizationService({
    async authorize() {
      throw new Error('consent denied');
    },
  });

  await assert.rejects(service.authorize(), /consent denied/);
  assert.equal(service.getState().status, 'error');
  assert.throws(() => service.getAccessToken(), /no está autorizado/);
});

test('clear removes the transient authorization value', async () => {
  const service = createDriveAuthorizationService({
    async authorize() {
      return { accessToken: 'ephemeral-value' };
    },
  });
  await service.authorize();
  service.clear();
  assert.deepEqual(service.getState(), { status: 'unauthorized' });
  assert.throws(() => service.getAccessToken());
});

test('authorization source does not use browser storage or logging', () => {
  const source = readFileSync(
    new URL('../src/services/drive/authorization.ts', import.meta.url),
    'utf8',
  );
  assert.doesNotMatch(source, /localStorage|sessionStorage|indexedDB/);
  assert.doesNotMatch(source, /console\.(log|info|warn|error)/);
});

function fakeTransport(options: { failAt?: number; omitIdAt?: number } = {}) {
  const requests: DriveRequest[] = [];
  let count = 0;
  const transport: DriveTransport = {
    async send(request) {
      requests.push(request);
      count += 1;
      const metadata = JSON.parse(String(request.body)) as { name: string };
      if (options.failAt === count) return { status: 503, json: { error: 'down' } };
      return {
        status: 200,
        json: options.omitIdAt === count
          ? { name: metadata.name }
          : { id: `folder-${count}`, name: metadata.name, mimeType: DRIVE_FOLDER_MIME },
      };
    },
  };
  return { transport, requests };
}

test('folder request uses folder MIME, transient authorization header and one parent', async () => {
  const fake = fakeTransport();
  const client = createDriveFolderClient(fake.transport);
  const folder = await client.createFolder('request-value', 'Documentos', 'project-folder');

  assert.equal(folder.id, 'folder-1');
  const request = fake.requests[0];
  assert.equal(request?.method, 'POST');
  assert.match(request?.url ?? '', /drive\/v3\/files/);
  const metadata = JSON.parse(String(request?.body)) as Record<string, unknown>;
  assert.equal(metadata.mimeType, DRIVE_FOLDER_MIME);
  assert.deepEqual(metadata.parents, ['project-folder']);
  assert.equal(request?.headers.Authorization, 'Bearer request-value');
});

test('project provisioning creates root, Proyectos, project and three children in order', async () => {
  const fake = fakeTransport();
  const client = createDriveFolderClient(fake.transport);

  const result = await provisionProjectFolders(
    'request-value',
    { applicationRootName: 'Aplicación', projectName: 'Proyecto Uno', projectId: 'p-1' },
    client,
  );

  const metadata = fake.requests.map(
    (request) => JSON.parse(String(request.body)) as {
      name: string;
      mimeType: string;
      parents?: string[];
    },
  );
  assert.deepEqual(metadata, [
    { name: 'Aplicación', mimeType: DRIVE_FOLDER_MIME },
    { name: 'Proyectos', mimeType: DRIVE_FOLDER_MIME, parents: ['folder-1'] },
    { name: 'Proyecto Uno [p-1]', mimeType: DRIVE_FOLDER_MIME, parents: ['folder-2'] },
    { name: 'Documentos', mimeType: DRIVE_FOLDER_MIME, parents: ['folder-3'] },
    { name: 'Analisis', mimeType: DRIVE_FOLDER_MIME, parents: ['folder-3'] },
    { name: 'Informes', mimeType: DRIVE_FOLDER_MIME, parents: ['folder-3'] },
  ]);
  assert.deepEqual(result, {
    applicationRootFolderId: 'folder-1',
    projectsRootFolderId: 'folder-2',
    projectFolderId: 'folder-3',
    documentsFolderId: 'folder-4',
    analysisFolderId: 'folder-5',
    reportsFolderId: 'folder-6',
  });
});

test('partial failure rejects without returning a fabricated hierarchy', async () => {
  const fake = fakeTransport({ failAt: 4 });
  const client = createDriveFolderClient(fake.transport);

  await assert.rejects(
    provisionProjectFolders(
      'request-value',
      { applicationRootName: 'Aplicación', projectName: 'Proyecto', projectId: 'p-2' },
      client,
    ),
    /HTTP 503/,
  );
  assert.equal(fake.requests.length, 4);
});

test('folder response without confirmed ID is rejected', async () => {
  const fake = fakeTransport({ omitIdAt: 1 });
  const client = createDriveFolderClient(fake.transport);
  await assert.rejects(client.createFolder('request-value', 'Root'), /no confirmó el identificador/);
});
