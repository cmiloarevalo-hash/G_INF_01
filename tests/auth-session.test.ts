import assert from 'node:assert/strict';
import test from 'node:test';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AuthSessionControl, createAuthRuntime } from '../src/components/AuthSessionControl.js';
import {
  FIREBASE_ENVIRONMENT_KEYS,
  resolveFirebaseWebConfig,
} from '../src/services/auth/config.js';
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

  const signedInUser: FirebaseUserLike = {
    uid: 'firebase-uid-123',
    displayName: 'Usuario Prueba',
    email: 'usuario@example.com',
    photoURL: 'https://example.com/photo.png',
  };

  const driver: AuthDriver = {
    observe(listener) {
      observer = listener;
      return () => {
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

test('missing Firebase config never constructs a Firebase driver', () => {
  let factoryCalls = 0;
  const runtime = createAuthRuntime(
    {
      available: false,
      missing: Object.values(FIREBASE_ENVIRONMENT_KEYS),
    },
    () => {
      factoryCalls += 1;
      throw new Error('driver should not be created');
    },
  );

  assert.equal(runtime.available, false);
  assert.equal(runtime.service, null);
  assert.equal(factoryCalls, 0);
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

test('guest entry remains rendered when Firebase browser config is absent', () => {
  const runtimeGlobal = globalThis as typeof globalThis & { React?: typeof React };
  const previousReact = runtimeGlobal.React;
  runtimeGlobal.React = React;

  try {
    const html = renderToStaticMarkup(
      React.createElement(
        React.Fragment,
        null,
        React.createElement(AuthSessionControl),
        React.createElement(HomePage, { onOpenGuestDocuments: () => undefined }),
      ),
    );

    assert.match(html, /Modo invitado/);
    assert.match(html, /Google no configurado/);
    assert.match(html, /Disponible sin iniciar sesión/);
    assert.match(html, /Abrir documentos del invitado/);
  } finally {
    if (previousReact === undefined) {
      delete runtimeGlobal.React;
    } else {
      runtimeGlobal.React = previousReact;
    }
  }
});
