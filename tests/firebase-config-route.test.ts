import test from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createServerApp } from '../server.js';

async function withFirebaseConfigServer(
  env: Record<string, string | undefined>,
  run: (root: string) => Promise<void>,
) {
  const server: Server = createServerApp({ env }).listen(0);
  try {
    const port = (server.address() as AddressInfo).port;
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

test('GET /api/firebase-config returns only complete public Firebase Web config', async () => {
  await withFirebaseConfigServer(
    {
      VITE_FIREBASE_API_KEY: 'fake-public-api-key',
      VITE_FIREBASE_AUTH_DOMAIN: 'fake-project.firebaseapp.test',
      VITE_FIREBASE_PROJECT_ID: 'fake-project',
      VITE_FIREBASE_APP_ID: 'fake-app-id',
      GEMINI_API_KEY: 'must-not-be-exposed',
      GEMINI_ALIAS_ACCESS_TOKEN: 'must-not-be-exposed-either',
    },
    async (root) => {
      const response = await fetch(`${root}/api/firebase-config`);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('cache-control'), 'no-store');

      const body = (await response.json()) as Record<string, unknown>;
      assert.deepEqual(body, {
        apiKey: 'fake-public-api-key',
        authDomain: 'fake-project.firebaseapp.test',
        projectId: 'fake-project',
        appId: 'fake-app-id',
      });
      assert.equal('GEMINI_API_KEY' in body, false);
      assert.equal('GEMINI_ALIAS_ACCESS_TOKEN' in body, false);
    },
  );
});

test('GET /api/firebase-config fails closed when server runtime config is incomplete', async () => {
  await withFirebaseConfigServer(
    {
      VITE_FIREBASE_API_KEY: 'fake-public-api-key',
      VITE_FIREBASE_PROJECT_ID: 'fake-project',
      GEMINI_API_KEY: 'must-not-be-exposed',
    },
    async (root) => {
      const response = await fetch(`${root}/api/firebase-config`);
      assert.equal(response.status, 503);
      assert.equal(response.headers.get('cache-control'), 'no-store');

      const body = (await response.json()) as Record<string, unknown>;
      assert.deepEqual(body, { error: 'Firebase Authentication no está configurado.' });
      assert.equal('apiKey' in body, false);
      assert.equal('projectId' in body, false);
      assert.equal('GEMINI_API_KEY' in body, false);
    },
  );
});
