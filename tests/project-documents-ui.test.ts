import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { AuthSessionState } from '../src/services/auth/types.js';
import {
  createDriveAuthorizationService,
  createDrivePickerService,
  type DriveTransport,
} from '../src/services/drive/index.js';
import type { ProjectMetadata } from '../src/services/firestore/types.js';
import { ProjectDocumentsPanel } from '../src/pages/ProjectDocumentsPanel.js';
import {
  authorizeDriveForUi,
  pickProjectDocumentForUi,
  projectDocumentsAvailability,
  uploadProjectDocumentForUi,
  type ProjectDocumentsRuntime,
} from '../src/pages/documentsFlow.js';
import { createSingleFlightGate } from '../src/pages/projectFlow.js';

function authenticated(): AuthSessionState {
  return {
    status: 'authenticated',
    user: { uid: 'session-uid', displayName: null, email: null, photoURL: null },
  };
}

const project: ProjectMetadata = {
  id: 'project-1',
  name: 'Proyecto',
  createdAt: null,
  updatedAt: null,
  driveFolders: {
    applicationRootFolderId: 'root',
    projectsRootFolderId: 'projects',
    projectFolderId: 'project-folder',
    documentsFolderId: 'documents',
    analysisFolderId: 'analysis',
    reportsFolderId: 'reports',
  },
};

function createRuntime() {
  let authCalls = 0;
  const authorization = createDriveAuthorizationService({
    async authorize() {
      authCalls += 1;
      return { accessToken: 'transient-test-value' };
    },
  });
  const requests: unknown[] = [];
  const transport: DriveTransport = {
    async send(request) {
      requests.push(request);
      return {
        status: 200,
        json: { id: 'drive-confirmed', name: 'doc.txt', mimeType: 'text/plain' },
      };
    },
  };
  const picker = createDrivePickerService({
    async open() {
      return { status: 'selected', file: { id: 'picker-id', name: 'picked.pdf' } };
    },
  });
  const runtime: ProjectDocumentsRuntime = {
    status: 'available',
    authorization,
    transport,
    picker,
    pickerConfiguration: { apiKey: 'runtime-test-key', appId: 'runtime-test-app' },
  };
  return { runtime, requests, authCalls: () => authCalls };
}

test('unauthenticated/checking state does not call Drive authorization', async () => {
  const fake = createRuntime();
  const session: AuthSessionState = { status: 'unauthenticated' };
  assert.deepEqual(
    projectDocumentsAvailability(session, fake.runtime, project),
    { status: 'sign-in-required' },
  );
  await assert.rejects(authorizeDriveForUi(session, fake.runtime), /sesión autenticada/);
  assert.equal(fake.authCalls(), 0);
});

test('authorization is explicit and user-triggered', async () => {
  const fake = createRuntime();
  assert.equal(fake.authCalls(), 0);
  assert.equal(
    projectDocumentsAvailability(authenticated(), fake.runtime, project).status,
    'unauthorized',
  );
  await authorizeDriveForUi(authenticated(), fake.runtime);
  assert.equal(fake.authCalls(), 1);
  assert.equal(
    projectDocumentsAvailability(authenticated(), fake.runtime, project).status,
    'authorized',
  );
});

test('pending operation gate prevents duplicate submission', async () => {
  const gate = createSingleFlightGate();
  let calls = 0;
  let release!: () => void;
  const blocker = new Promise<void>((resolve) => { release = resolve; });
  const first = gate.run(async () => {
    calls += 1;
    await blocker;
    return 'done';
  });
  const duplicate = await gate.run(async () => {
    calls += 1;
    return 'duplicate';
  });
  assert.deepEqual(duplicate, { status: 'ignored-pending' });
  assert.equal(calls, 1);
  release();
  await first;
});

test('local upload returns metadata only after confirmed Drive ID', async () => {
  const fake = createRuntime();
  await authorizeDriveForUi(authenticated(), fake.runtime);
  const confirmed = await uploadProjectDocumentForUi(
    authenticated(),
    fake.runtime,
    project,
    {
      name: 'doc.txt',
      mimeType: 'text/plain',
      data: new TextEncoder().encode('content'),
    },
  );
  assert.equal(confirmed.id, 'drive-confirmed');
  assert.equal(fake.requests.length, 1);
});

test('failed upload rejects instead of producing confirmed document metadata', async () => {
  const fake = createRuntime();
  await authorizeDriveForUi(authenticated(), fake.runtime);
  if (fake.runtime.status !== 'available') throw new Error('unreachable');
  fake.runtime.transport = {
    async send() {
      return { status: 500, json: { error: 'down' } };
    },
  };
  await assert.rejects(
    uploadProjectDocumentForUi(authenticated(), fake.runtime, project, {
      name: 'doc.txt',
      mimeType: 'text/plain',
      data: new Uint8Array([1]),
    }),
    /HTTP 500/,
  );
});

test('Picker cancel differs from Picker error and selected metadata comes from success', async () => {
  const fake = createRuntime();
  await authorizeDriveForUi(authenticated(), fake.runtime);
  if (fake.runtime.status !== 'available') throw new Error('unreachable');

  fake.runtime.picker = createDrivePickerService({
    async open() {
      return { status: 'cancelled' };
    },
  });
  assert.deepEqual(
    await pickProjectDocumentForUi(authenticated(), fake.runtime, project),
    { status: 'cancelled' },
  );

  fake.runtime.picker = createDrivePickerService({
    async open() {
      throw new Error('picker error');
    },
  });
  await assert.rejects(
    pickProjectDocumentForUi(authenticated(), fake.runtime, project),
    /picker error/,
  );
});

test('unavailable Google runtime is represented explicitly in the Documents surface', () => {
  const html = renderToStaticMarkup(
    React.createElement(ProjectDocumentsPanel, {
      session: authenticated(),
      project,
      runtime: { status: 'unavailable', reason: 'Sin configuración Google' },
    }),
  );
  assert.match(html, /Google Drive no disponible/);
  assert.match(html, /Sin configuración Google/);
  assert.doesNotMatch(html, /documento confirmado/i);
});

test('Documents UI has no raw UID, direct Firestore or browser credential persistence', () => {
  const source = [
    '../src/pages/ProjectDocumentsPanel.tsx',
    '../src/pages/documentsFlow.ts',
  ]
    .map((file) => readFileSync(new URL(file, import.meta.url), 'utf8'))
    .join('\n');
  assert.doesNotMatch(source, /ownerUid|uidOverride/);
  assert.doesNotMatch(source, /firebase\/firestore/);
  assert.doesNotMatch(source, /localStorage|sessionStorage|indexedDB/);
});
