import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import http from 'node:http';
import test from 'node:test';
import {
  sanitizePortableEnvironment,
} from '../scripts/local/package-windows.mjs';
import {
  LOOPBACK_HOST,
  startPortableApp,
} from '../scripts/local/portable-launcher.mjs';

interface RawRequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

function rawRequest(url: string, options: RawRequestOptions = {}) {
  const target = new URL(url);
  return new Promise<{ status: number; headers: http.IncomingHttpHeaders; body: string }>(
    (resolve, reject) => {
      const request = http.request(
        {
          hostname: target.hostname,
          port: Number(target.port),
          path: target.pathname + target.search,
          method: options.method ?? 'GET',
          headers: options.headers,
        },
        (response) => {
          const chunks: Buffer[] = [];
          response.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
          response.on('end', () => {
            resolve({
              status: response.statusCode ?? 0,
              headers: response.headers,
              body: Buffer.concat(chunks).toString('utf8'),
            });
          });
        },
      );
      request.on('error', reject);
      if (options.body) request.write(options.body);
      request.end();
    },
  );
}

test('portable environment removes authenticated provider/owner configuration', () => {
  const clean = sanitizePortableEnvironment({
    SAFE_SETTING: 'ok',
    VITE_FIREBASE_API_KEY: 'firebase-secret-like-value',
    VITE_FIREBASE_PROJECT_ID: 'project',
    VITE_GOOGLE_OAUTH_CLIENT_ID: 'google-client',
    VITE_GOOGLE_PICKER_DEVELOPER_KEY: 'picker-key',
    GEMINI_TEST_KEY_1: 'owner-key',
    GEMINI_ALIAS_ACCESS_TOKEN: 'owner-token',
    GEMINI_ALIAS_MODE: 'owner-only',
  });

  assert.equal(clean.SAFE_SETTING, 'ok');
  assert.equal(clean.VITE_FIREBASE_API_KEY, undefined);
  assert.equal(clean.VITE_FIREBASE_PROJECT_ID, undefined);
  assert.equal(clean.VITE_GOOGLE_OAUTH_CLIENT_ID, undefined);
  assert.equal(clean.VITE_GOOGLE_PICKER_DEVELOPER_KEY, undefined);
  assert.equal(clean.GEMINI_TEST_KEY_1, undefined);
  assert.equal(clean.GEMINI_ALIAS_ACCESS_TOKEN, undefined);
  assert.equal(clean.GEMINI_ALIAS_MODE, undefined);
});

test('portable launcher uses loopback dynamic port, health gate, guards and clean shutdown', async () => {
  const events: string[] = [];
  const logs: string[] = [];
  let browserUrl = '';
  const logger = {
    log(...values: unknown[]) {
      logs.push(values.map(String).join(' '));
    },
    error(...values: unknown[]) {
      logs.push(values.map(String).join(' '));
    },
  };

  const runtime = await startPortableApp({
    installSignalHandlers: false,
    logger,
    fetchImpl: async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
      events.push('health');
      return fetch(input, init);
    },
    openBrowser: async (url: string) => {
      events.push('browser');
      browserUrl = url;
    },
  });

  try {
    assert.equal(runtime.host, LOOPBACK_HOST);
    assert.ok(runtime.port > 0);
    assert.equal(runtime.origin, `http://${LOOPBACK_HOST}:${runtime.port}`);
    assert.equal(browserUrl, runtime.origin);
    assert.deepEqual(events, ['health', 'browser']);

    const health = await fetch(`${runtime.origin}/api/health`);
    assert.equal(health.status, 200);
    assert.equal(health.headers.get('access-control-allow-origin'), null);
    assert.equal((await health.json() as { status?: string }).status, 'ok');

    const badHost = await rawRequest(`${runtime.origin}/api/health`, {
      headers: { Host: `localhost:${runtime.port}` },
    });
    assert.equal(badHost.status, 403);

    const missingOrigin = await rawRequest(`${runtime.origin}/api/guest/report-docx`, {
      method: 'POST',
      headers: {
        Host: `${LOOPBACK_HOST}:${runtime.port}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ report: null }),
    });
    assert.equal(missingOrigin.status, 403);

    const wrongOrigin = await rawRequest(`${runtime.origin}/api/guest/report-docx`, {
      method: 'POST',
      headers: {
        Host: `${LOOPBACK_HOST}:${runtime.port}`,
        Origin: 'https://example.invalid',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ report: null }),
    });
    assert.equal(wrongOrigin.status, 403);

    const allowedOrigin = await rawRequest(`${runtime.origin}/api/guest/report-docx`, {
      method: 'POST',
      headers: {
        Host: `${LOOPBACK_HOST}:${runtime.port}`,
        Origin: runtime.origin,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ report: null }),
    });
    assert.equal(allowedOrigin.status, 400);

    const firebase = await fetch(`${runtime.origin}/api/firebase-config`);
    assert.equal(firebase.status, 503);
    await firebase.text();

    const temporaryKey = 'AIzaPortableTestKey012345678901234';
    const analyze = await rawRequest(`${runtime.origin}/api/guest/analyze`, {
      method: 'POST',
      headers: {
        Host: `${LOOPBACK_HOST}:${runtime.port}`,
        Origin: runtime.origin,
        'Content-Type': 'application/json',
        'x-gemini-api-key': temporaryKey,
      },
      body: JSON.stringify({
        files: [{
          id: 'doc-1',
          name: 'unsupported.csv',
          mimeType: 'text/csv',
          size: 1,
          data: '',
        }],
      }),
    });
    assert.equal(analyze.status, 422);
    assert.doesNotMatch(analyze.body, new RegExp(temporaryKey));
    assert.doesNotMatch(logs.join('\n'), new RegExp(temporaryKey));
  } finally {
    await runtime.close();
  }

  assert.equal(runtime.server.listening, false);
});

test('portable launcher contains no key persistence or CORS mechanism', () => {
  const source = readFileSync(
    new URL('../scripts/local/portable-launcher.mjs', import.meta.url),
    'utf8',
  );

  assert.doesNotMatch(source, /localStorage|sessionStorage|writeFile|appendFile/);
  assert.doesNotMatch(source, /access-control-allow-origin/i);
  assert.doesNotMatch(source, /x-gemini-api-key/i);
});
