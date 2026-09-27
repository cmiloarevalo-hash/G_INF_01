import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AuthSessionControl } from '../src/components/AuthSessionControl.js';
import {
  FIREBASE_ENVIRONMENT_KEYS,
  loadFirebaseWebConfig,
  resolveFirebaseWebConfig,
} from '../src/services/auth/config.js';
import { AuthSessionProvider } from '../src/services/auth/context.js';
import {
  createAuthSessionController,
  createAuthRuntime,
} from '../src/services/auth/session.js';
import {
  adaptFirebaseUser,
  authErrorMessage,
  createAuthService,
} from '../src/services/auth/service.js';
import type { AuthDriver, FirebaseUserLike } from '../src/services/auth/types.js';
import { HomePage } from '../src/pages/HomePage.js';

function createFakeDriver() {
  let observer: ((user: FirebaseUserLike | null) => void) | null = null;
  let signOutCalls = 0;
  let signInCalls = 0;
  let observeCalls = 0;
  let unsubscribeCalls = 0;

  const signedInUser: FirebaseUserLike = {
    uid: 'firebase-uid-123',
    displayName: 'Usuario Prueba',
    email: 'usuario@example.com',
    photoURL: 'https://example.com/photo.png',
  };

  const driver: AuthDriver = {
    observe(listener) {
      observeCalls += 1;
      observer = listener;
      return () => {
        unsubscribeCalls += 1;
        observer = null;
      };
    },

    async signInWithGoogle() {
      signInCalls += 1;
      return signedInUser;
    },

    async signOut() {
      signOutCalls += 1;
    },
  };

  return {
    driver,
    emit(user: FirebaseUserLike | null) {
      observer?.(user);
    },
    get signInCalls() {
      return signInCalls;
    },
    get signOutCalls() {
      return signOutCalls;
    },
    get observeCalls() {
      return observeCalls;
    },
    get unsubscribeCalls() {
      return unsubscribeCalls;
    },
  };
}

function completeResolution() {
  return {
    available: true as const,
    config: {
      apiKey: 'test-api-key',
      authDomain: 'test.firebaseapp.test',
      projectId: 'test-project',
      appId: 'test-app-id',
    },
  };
}

function missingResolution() {
  return {
    available: false as const,
    missing: Object.values(FIREBASE_ENVIRONMENT_KEYS),
  };
}

test('Firebase config is explicit and incomplete configuration disables authenticated mode', () => {
  const missing = resolveFirebaseWebConfig({
    VITE_FIREBASE_API_KEY: 'api-key',
    VITE_FIREBASE_PROJECT_ID: 'project-id',
  });

  assert.equal(missing.available, false);
  if (missing.available) return;

  assert.deepEqual(
    missing.missing.sort(),
    [
      FIREBASE_ENVIRONMENT_KEYS.appId,
      FIREBASE_ENVIRONMENT_KEYS.authDomain,
    ].sort(),
  );

  const complete = resolveFirebaseWebConfig({
    VITE_FIREBASE_API_KEY: 'api-key',
    VITE_FIREBASE_AUTH_DOMAIN: 'project.firebaseapp.com',
    VITE_FIREBASE_PROJECT_ID: 'project-id',
    VITE_FIREBASE_APP_ID: '1:123:web:abc',
  });

  assert.deepEqual(complete, {
    available: true,
    config: {
      apiKey: 'api-key',
      authDomain: 'project.firebaseapp.com',
      projectId: 'project-id',
      appId: '1:123:web:abc',
    },
  });
});

test('complete build-time Firebase config does not fetch runtime config', async () => {
  let fetchCalls = 0;
  const resolution = await loadFirebaseWebConfig(
    {
      VITE_FIREBASE_API_KEY: 'build-api-key',
      VITE_FIREBASE_AUTH_DOMAIN: 'build.firebaseapp.test',
      VITE_FIREBASE_PROJECT_ID: 'build-project',
      VITE_FIREBASE_APP_ID: 'build-app-id',
    },
    async () => {
      fetchCalls += 1;
      return Response.json({});
    },
  );

  assert.equal(resolution.available, true);
  assert.equal(fetchCalls, 0);
  if (!resolution.available) return;
  assert.equal(resolution.config.projectId, 'build-project');
});

test('missing build-time Firebase config falls back to same-origin runtime config', async () => {
  const requested: string[] = [];
  const resolution = await loadFirebaseWebConfig(
    {},
    async (input) => {
      requested.push(String(input));
      return Response.json({
        apiKey: 'runtime-api-key',
        authDomain: 'runtime.firebaseapp.test',
        projectId: 'runtime-project',
        appId: 'runtime-app-id',
        ignored: 'not-used',
      });
    },
  );

  assert.deepEqual(requested, ['/api/firebase-config']);
  assert.deepEqual(resolution, {
    available: true,
    config: {
      apiKey: 'runtime-api-key',
      authDomain: 'runtime.firebaseapp.test',
      projectId: 'runtime-project',
      appId: 'runtime-app-id',
    },
  });
});

test('failed runtime Firebase config fetch preserves unavailable guest-safe resolution', async () => {
  const resolution = await loadFirebaseWebConfig(
    {},
    async () => {
      throw new Error('runtime unavailable');
    },
  );

  assert.equal(resolution.available, false);
  if (resolution.available) return;
  assert.deepEqual(resolution.missing.sort(), Object.values(FIREBASE_ENVIRONMENT_KEYS).sort());
});

test('missing Firebase config never constructs a Firebase driver', () => {
  let factoryCalls = 0;
  const runtime = createAuthRuntime(
    missingResolution(),
    () => {
      factoryCalls += 1;
      throw new Error('driver should not be created');
    },
  );

  assert.equal(runtime.available, false);
  assert.equal(runtime.service, null);
  assert.equal(factoryCalls, 0);
});

test('shared session preserves checking until Auth observation resolves', async () => {
  const fake = createFakeDriver();
  const controller = createAuthSessionController({
    initialResolution: completeResolution(),
    loadResolution: async () => completeResolution(),
    driverFactory: () => fake.driver,
  });

  assert.deepEqual(controller.getSnapshot().session, { status: 'checking' });
  await controller.start();
  assert.deepEqual(controller.getSnapshot().session, { status: 'checking' });
  assert.equal(fake.observeCalls, 1);

  controller.stop();
});

test('shared session exposes unauthenticated distinctly from checking', async () => {
  const fake = createFakeDriver();
  const controller = createAuthSessionController({
    initialResolution: completeResolution(),
    loadResolution: async () => completeResolution(),
    driverFactory: () => fake.driver,
  });

  await controller.start();
  fake.emit(null);

  assert.deepEqual(controller.getSnapshot().session, { status: 'unauthenticated' });
  controller.stop();
});

test('shared authenticated session exposes UID and stable identity fields without token', async () => {
  const fake = createFakeDriver();
  const controller = createAuthSessionController({
    initialResolution: completeResolution(),
    loadResolution: async () => completeResolution(),
    driverFactory: () => fake.driver,
  });

  await controller.start();
  fake.emit({
    uid: 'shared-uid',
    displayName: 'Shared User',
    email: 'shared@example.com',
    photoURL: null,
  });

  const snapshot = controller.getSnapshot();
  assert.equal(snapshot.session.status, 'authenticated');
  if (snapshot.session.status !== 'authenticated') return;

  assert.deepEqual(snapshot.session.user, {
    uid: 'shared-uid',
    displayName: 'Shared User',
    email: 'shared@example.com',
    photoURL: null,
  });
  assert.equal('token' in snapshot.session.user, false);
  assert.equal('accessToken' in snapshot.session.user, false);

  controller.stop();
});

test('shared controller owns only one active Auth observer lifecycle', async () => {
  const fake = createFakeDriver();
  const controller = createAuthSessionController({
    initialResolution: completeResolution(),
    loadResolution: async () => completeResolution(),
    driverFactory: () => fake.driver,
  });

  await controller.start();
  await controller.start();
  assert.equal(fake.observeCalls, 1);

  controller.stop();
  assert.equal(fake.unsubscribeCalls, 1);

  await controller.start();
  assert.equal(fake.observeCalls, 2);
  controller.stop();
  assert.equal(fake.unsubscribeCalls, 2);
});

test('AuthSessionControl consumes shared auth state and contains no independent observer setup', () => {
  const source = readFileSync(
    new URL('../src/components/AuthSessionControl.tsx', import.meta.url),
    'utf8',
  );

  assert.match(source, /useAuthSession\(\)/);
  assert.doesNotMatch(source, /\.observe\s*\(/);
  assert.doesNotMatch(source, /createFirebaseAuthDriver/);
  assert.doesNotMatch(source, /loadBrowserFirebaseConfig/);
  assert.doesNotMatch(source, /resolveBrowserFirebaseConfig/);
});

test('shared sign-in and sign-out delegate through the existing Auth service contract', async () => {
  const fake = createFakeDriver();
  const controller = createAuthSessionController({
    initialResolution: completeResolution(),
    loadResolution: async () => completeResolution(),
    driverFactory: () => fake.driver,
  });

  await controller.start();
  await controller.signIn();
  assert.equal(fake.signInCalls, 1);
  assert.equal(controller.getSnapshot().session.status, 'authenticated');

  await controller.signOut();
  assert.equal(fake.signOutCalls, 1);
  assert.deepEqual(controller.getSnapshot().session, { status: 'unauthenticated' });

  controller.stop();
});

test('session adapter exposes only stable identity fields and no auth token', () => {
  const session = adaptFirebaseUser({
    uid: 'uid-1',
    displayName: 'Nombre',
    email: 'nombre@example.com',
    photoURL: null,
  });

  assert.deepEqual(session, {
    status: 'authenticated',
    user: {
      uid: 'uid-1',
      displayName: 'Nombre',
      email: 'nombre@example.com',
      photoURL: null,
    },
  });
  assert.equal('token' in (session.status === 'authenticated' ? session.user : {}), false);
  assert.deepEqual(adaptFirebaseUser(null), { status: 'unauthenticated' });
});

test('auth service observes session, signs in with Google and signs out through a fake driver', async () => {
  const fake = createFakeDriver();
  const service = createAuthService(fake.driver);
  const observed: unknown[] = [];

  const unsubscribe = service.observe((session) => observed.push(session));
  fake.emit(null);
  fake.emit({
    uid: 'observed-uid',
    email: 'observed@example.com',
  });

  const signedIn = await service.signInWithGoogle();
  await service.signOut();
  unsubscribe();

  assert.deepEqual(observed, [
    { status: 'unauthenticated' },
    {
      status: 'authenticated',
      user: {
        uid: 'observed-uid',
        displayName: null,
        email: 'observed@example.com',
        photoURL: null,
      },
    },
  ]);
  assert.equal(signedIn.status, 'authenticated');
  assert.equal(signedIn.status === 'authenticated' ? signedIn.user.uid : null, 'firebase-uid-123');
  assert.equal(fake.signInCalls, 1);
  assert.equal(fake.signOutCalls, 1);
});

test('popup cancellation and blocking are controlled auth errors', () => {
  assert.equal(
    authErrorMessage({ code: 'auth/popup-closed-by-user' }, 'sign-in'),
    'Inicio de sesión cancelado.',
  );
  assert.equal(
    authErrorMessage({ code: 'auth/popup-blocked' }, 'sign-in'),
    'El navegador bloqueó la ventana de inicio de sesión de Google.',
  );
  assert.equal(
    authErrorMessage({ code: 'auth/unauthorized-domain' }, 'sign-in'),
    'Este dominio todavía no está autorizado para iniciar sesión con Google.',
  );
});

test('guest entry remains rendered when Firebase config is unavailable', () => {
  const controller = createAuthSessionController({
    initialResolution: missingResolution(),
    loadResolution: async () => missingResolution(),
    driverFactory: () => {
      throw new Error('driver should not be created');
    },
  });

  const html = renderToStaticMarkup(
    React.createElement(
      AuthSessionProvider,
      { controller },
      React.createElement(
        React.Fragment,
        null,
        React.createElement(AuthSessionControl),
        React.createElement(HomePage, { onOpenGuestDocuments: () => undefined }),
      ),
    ),
  );

  assert.match(html, /Modo invitado/);
  assert.match(html, /Google no configurado/);
  assert.match(html, /Disponible sin iniciar sesión/);
  assert.match(html, /Abrir documentos del invitado/);
});
