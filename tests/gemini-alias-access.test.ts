import test from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { createServerApp } from '../server.js';

const access = 'test-owner-capability-of-at-least-thirty-two-characters';
const secret = 'fake-provider-key-never-disclose';
const env = { GEMINI_ALIAS_MODE: 'owner-only', GEMINI_ALIAS_ACCESS_TOKEN: access, GEMINI_TEST_KEY_1: secret, GEMINI_API_KEY: 'auto-injected-key-must-not-be-used' };
const selected = { files: [{ id: 'doc-1', name: 'nota.txt', mimeType: 'text/plain', size: 5, data: Buffer.from('texto').toString('base64') }] };
const report = { reportType: 'TITLE_STUDY', sourceDocuments: [{ id: 'doc-1', name: 'nota.txt', documentType: 'texto' }], findings: [], comparisons: [] };
const completed = () => Response.json({ status: 'completed', output_text: JSON.stringify(report) });
const rootOf = (server: ReturnType<ReturnType<typeof createServerApp>['listen']>) => `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
const send = (root: string, headers: Record<string, string>) => fetch(root + '/api/guest/analyze', { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(selected) });

test('public requests cannot list or use owner alias, even when alias is known', async () => {
  let calls = 0;
  const server = createServerApp({ env, fetchImpl: async () => { calls++; return completed(); } }).listen(0);
  try {
    const root = rootOf(server);
    for (const token of ['', 'wrong-access-token']) {
      const headers = { 'x-gemini-key-alias': 'test-1', ...(token ? { 'x-gemini-alias-access-token': token } : {}) };
      for (const response of [await fetch(root + '/api/guest/key-aliases', { headers }), await send(root, headers)]) {
        assert.equal(response.status, 403);
        assert.equal(response.headers.get('cache-control'), 'no-store');
        assert.equal(JSON.stringify(await response.json()).includes(secret), false);
      }
    }
    assert.equal(calls, 0);
  } finally { await new Promise<void>((resolve) => server.close(() => resolve())); }
});

test('alias requires explicit owner mode and capability, without automatic key fallback', async () => {
  for (const disabled of [{ ...env, GEMINI_ALIAS_MODE: '' }, { ...env, GEMINI_ALIAS_ACCESS_TOKEN: 'weak' }, { GEMINI_API_KEY: 'auto-injected-key-must-not-be-used' }]) {
    let calls = 0;
    const server = createServerApp({ env: disabled, fetchImpl: async () => { calls++; return completed(); } }).listen(0);
    try { assert.equal((await send(rootOf(server), { 'x-gemini-key-alias': 'test-1', 'x-gemini-alias-access-token': access })).status, 403); assert.equal(calls, 0); }
    finally { await new Promise<void>((resolve) => server.close(() => resolve())); }
  }
});

test('authorized alias returns names only; temporary key remains independent', async () => {
  const keys: string[] = [];
  const server = createServerApp({ env, fetchImpl: async (_url, init) => { keys.push(new Headers(init?.headers).get('x-goog-api-key') ?? ''); return completed(); } }).listen(0);
  try {
    const root = rootOf(server);
    const listed = await fetch(root + '/api/guest/key-aliases', { headers: { 'x-gemini-alias-access-token': access } });
    assert.deepEqual(await listed.json(), { aliases: [{ id: 'test-1', label: 'Prueba 1' }] });
    const authorized = await send(root, { 'x-gemini-key-alias': 'test-1', 'x-gemini-alias-access-token': access });
    assert.equal(authorized.status, 200);
    assert.equal(JSON.stringify(await authorized.json()).includes(secret), false);
    assert.deepEqual(keys, [secret]);
    assert.equal((await send(root, { 'x-gemini-key-alias': 'test-4', 'x-gemini-alias-access-token': access })).status, 400);
    assert.equal((await send(root, { 'x-gemini-key-alias': 'test-1', 'x-gemini-alias-access-token': access, 'x-gemini-api-key': 'session-only' })).status, 400);
    assert.equal((await send(root, { 'x-gemini-api-key': 'session-only' })).status, 200);
    assert.deepEqual(keys, [secret, 'session-only']);
  } finally { await new Promise<void>((resolve) => server.close(() => resolve())); }
});
