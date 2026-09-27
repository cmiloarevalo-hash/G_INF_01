import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { NAV_ITEMS } from '../src/components/Sidebar.js';
import type { AuthSessionState } from '../src/services/auth/types.js';
import type {
  AuthenticatedProjectService,
} from '../src/services/firestore/authenticated.js';
import {
  loadProjectRuntime,
  resolveProjectRuntime,
  type ProjectRuntimeState,
} from '../src/services/firestore/runtime.js';
import type { ProjectMetadata } from '../src/services/firestore/types.js';
import { ProjectListContent } from '../src/pages/ProjectsPage.js';
import {
  createProjectForUi,
  createSingleFlightGate,
  listProjectsForUi,
  projectUiAvailability,
  reopenProjectForUi,
} from '../src/pages/projectFlow.js';

function project(id: string, name: string): ProjectMetadata {
  return { id, name, createdAt: null, updatedAt: null };
}

function authenticated(uid = 'session-uid'): AuthSessionState {
  return {
    status: 'authenticated',
    user: {
      uid,
      displayName: null,
      email: 'user@example.com',
      photoURL: null,
    },
  };
}

function fakeRuntime() {
  const calls: Array<{ operation: string; session: AuthSessionState; value?: string }> = [];
  let listResult: ProjectMetadata[] = [project('p-1', 'Proyecto Uno')];
  let getResult: ProjectMetadata | null = project('p-1', 'Proyecto Uno');
  let error: Error | null = null;

  const service: AuthenticatedProjectService = {
    async create(session, name) {
      calls.push({ operation: 'create', session, value: name });
      if (error) throw error;
      return project('created', name.trim());
    },
    async list(session) {
      calls.push({ operation: 'list', session });
      if (error) throw error;
      return listResult;
    },
    async get(session, projectId) {
      calls.push({ operation: 'get', session, value: projectId });
      if (error) throw error;
      return getResult;
    },
    async updateDriveFolders(session, projectId) {
      calls.push({ operation: 'updateDriveFolders', session, value: projectId });
      if (error) throw error;
      return getResult;
    },
  };

  return {
    runtime: { status: 'available', service } as ProjectRuntimeState,
    calls,
    setListResult(value: ProjectMetadata[]) {
      listResult = value;
    },
    setGetResult(value: ProjectMetadata | null) {
      getResult = value;
    },
    setError(value: Error | null) {
      error = value;
    },
  };
}

test('checking session does not trigger project calls', async () => {
  const fake = fakeRuntime();
  const session: AuthSessionState = { status: 'checking' };

  assert.deepEqual(projectUiAvailability(session, fake.runtime), { status: 'checking-session' });
  assert.deepEqual(await listProjectsForUi(session, fake.runtime), []);
  assert.deepEqual(fake.calls, []);
});

test('unauthenticated session does not trigger project calls', async () => {
  const fake = fakeRuntime();
  const session: AuthSessionState = { status: 'unauthenticated' };

  assert.deepEqual(projectUiAvailability(session, fake.runtime), { status: 'sign-in-required' });
  assert.deepEqual(await listProjectsForUi(session, fake.runtime), []);
  assert.deepEqual(fake.calls, []);
});

test('authenticated create delegates through authenticated project service', async () => {
  const fake = fakeRuntime();
  const session = authenticated('auth-uid');

  const created = await createProjectForUi(session, fake.runtime, ' Proyecto ');

  assert.equal(created.name, 'Proyecto');
  assert.equal(fake.calls.length, 1);
  assert.equal(fake.calls[0]?.operation, 'create');
  assert.equal(fake.calls[0]?.session, session);
  assert.equal(fake.calls[0]?.value, ' Proyecto ');
});

test('single-flight gate blocks duplicate create while pending', async () => {
  const gate = createSingleFlightGate();
  let calls = 0;
  let release!: () => void;
  const blocker = new Promise<void>((resolve) => {
    release = resolve;
  });

  const first = gate.run(async () => {
    calls += 1;
    await blocker;
    return 'created';
  });
  const second = await gate.run(async () => {
    calls += 1;
    return 'duplicate';
  });

  assert.deepEqual(second, { status: 'ignored-pending' });
  assert.equal(calls, 1);
  release();
  assert.deepEqual(await first, { status: 'completed', value: 'created' });
});

test('authenticated list renders persisted project metadata from fake service', async () => {
  const fake = fakeRuntime();
  const projects = await listProjectsForUi(authenticated(), fake.runtime);
  const runtimeGlobal = globalThis as typeof globalThis & { React?: typeof React };
  const previousReact = runtimeGlobal.React;
  runtimeGlobal.React = React;

  try {
    const html = renderToStaticMarkup(
      React.createElement(ProjectListContent, {
        state: { status: 'loaded', projects },
        onSelect: () => undefined,
      }),
    );

    assert.match(html, /Proyecto Uno/);
    assert.match(html, /p-1/);
    assert.match(html, /Reabrir proyecto/);
  } finally {
    if (previousReact === undefined) {
      delete runtimeGlobal.React;
    } else {
      runtimeGlobal.React = previousReact;
    }
  }
});

test('empty list is distinct from loaded metadata', () => {
  const html = renderToStaticMarkup(
    React.createElement(ProjectListContent, {
      state: { status: 'empty' },
      onSelect: () => undefined,
    }),
  );
  assert.match(html, /Todavía no hay proyectos persistidos/);
  assert.doesNotMatch(html, /Reabrir proyecto/);
});

test('list failure is distinct from empty state', () => {
  const html = renderToStaticMarkup(
    React.createElement(ProjectListContent, {
      state: { status: 'error', message: 'repository unavailable' },
      onSelect: () => undefined,
    }),
  );
  assert.match(html, /repository unavailable/);
  assert.doesNotMatch(html, /Todavía no hay proyectos persistidos/);
});

test('reopen uses the selected project id', async () => {
  const fake = fakeRuntime();
  await reopenProjectForUi(authenticated(), fake.runtime, 'selected-project');

  assert.equal(fake.calls.length, 1);
  assert.deepEqual(fake.calls[0], {
    operation: 'get',
    session: fake.calls[0]?.session,
    value: 'selected-project',
  });
});

test('not-found remains distinct from repository failure', async () => {
  const fake = fakeRuntime();
  fake.setGetResult(null);
  assert.equal(await reopenProjectForUi(authenticated(), fake.runtime, 'missing'), null);

  fake.setError(new Error('firestore unavailable'));
  await assert.rejects(
    reopenProjectForUi(authenticated(), fake.runtime, 'broken'),
    /firestore unavailable/,
  );
});

test('project runtime unavailable is controlled and does not construct a service', () => {
  let factoryCalls = 0;
  const runtime = resolveProjectRuntime(
    { available: false, missing: ['VITE_FIREBASE_PROJECT_ID'] },
    () => {
      factoryCalls += 1;
      throw new Error('must not construct');
    },
  );

  assert.equal(runtime.status, 'unavailable');
  assert.equal(factoryCalls, 0);
  assert.deepEqual(
    projectUiAvailability(authenticated(), runtime),
    {
      status: 'runtime-unavailable',
      reason: 'Falta configuración Firebase: VITE_FIREBASE_PROJECT_ID',
    },
  );
});

test('project runtime loader failure becomes controlled unavailable state', async () => {
  const runtime = await loadProjectRuntime(
    async () => {
      throw new Error('runtime config endpoint unavailable');
    },
    () => {
      throw new Error('service must not be constructed');
    },
  );

  assert.deepEqual(runtime, {
    status: 'unavailable',
    reason: 'No fue posible cargar la configuración Firebase para proyectos.',
  });
});

test('project navigation entries are available while unrelated future entries remain future', () => {
  const byId = new Map(NAV_ITEMS.map((item) => [item.id, item]));
  assert.equal(byId.get('nuevo-proyecto')?.isAvailable, true);
  assert.equal(byId.get('mis-proyectos')?.isAvailable, true);
  assert.equal(byId.get('mis-informes')?.isAvailable, false);
  assert.equal(byId.get('google-drive')?.isAvailable, false);
});

test('project UI introduces no owner UID override, token, or browser-storage persistence', () => {
  const files = [
    '../src/pages/NewProjectPage.tsx',
    '../src/pages/ProjectsPage.tsx',
    '../src/pages/projectFlow.ts',
    '../src/services/firestore/runtime.tsx',
  ];

  const source = files
    .map((file) => readFileSync(new URL(file, import.meta.url), 'utf8'))
    .join('\n');

  assert.doesNotMatch(source, /ownerUid|uidOverride/);
  assert.doesNotMatch(source, /accessToken|idToken|refreshToken/);
  assert.doesNotMatch(source, /localStorage|sessionStorage/);
  assert.doesNotMatch(source, /fake project|fallback project/i);
});
