import test from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { createServerApp } from '../server.js';

const access = 'test-owner-capability-of-at-least-thirty-two-characters';
const secret = 'fake-provider-key-never-disclose';
const env = {
  GEMINI_ALIAS_MODE: 'owner-only', GEMINI_ALIAS_ACCESS_TOKEN: access,
  GEMINI_TEST_KEY_1: secret, GEMINI_API_KEY: 'auto-injected-key-must-not-be-used',
};
const extract = { id: 'doc-1', name: 'nota.txt', mimeType: 'text/plain', size: 5, data: Buffer.from('texto').toString('base64') };
const synthesis = { extractions: [{ documentId: 'doc-1', name: 'nota.txt', extraction: { documentType: 'texto', findings: [] } }] };

test('public routes cannot list or spend owner secrets without authorization, even with a known alias', async () => {
  let calls = 0;
  const app = createServerApp({ env, fetchImpl: async () => { calls++; return Response.json({}); } });
  const server = app.listen(0);
  const root = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    for (const url of ['/api/guest/key-aliases', '/api/guest/extract', '/api/guest/synthesize']) {
      for (const provided of ['', 'wrong-access-token']) {
        const response = await fetch(root + url, {
          method: url.endsWith('key-aliases') ? 'GET' : 'POST',
          headers: { 'content-type': 'application/json', 'x-gemini-key-alias': 'test-1', ...(provided ? { 'x-gemini-alias-access-token': provided } : {}) },
          ...(url.endsWith('key-aliases') ? {} : { body: JSON.stringify(url.endsWith('extract') ? extract : synthesis) }),
        });
        assert.equal(response.status, 403, url);
        assert.equal(response.headers.get('cache-control'), 'no-store');
        assert.equal(JSON.stringify(await response.json()).includes(secret), false);
      }
    }
    assert.equal(calls, 0);
  } finally { await new Promise<void>((resolve) => server.close(() => resolve())); }
});

test('alias requires explicit enabled mode and strong owner capability, with no automatic GEMINI_API_KEY fallback', async () => {
  for (const disabled of [{ ...env, GEMINI_ALIAS_MODE: '' }, { ...env, GEMINI_ALIAS_ACCESS_TOKEN: 'weak' }, { GEMINI_API_KEY: 'auto-injected-key-must-not-be-used' }]) {
    let called = false;
    const server = createServerApp({ env: disabled, fetchImpl: async () => { called = true; return Response.json({}); } }).listen(0);
    try {
      const root = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
      const response = await fetch(root + '/api/guest/extract', {
        method: 'POST', headers: { 'content-type': 'application/json', 'x-gemini-key-alias': 'test-1', 'x-gemini-alias-access-token': access }, body: JSON.stringify(extract),
      });
      assert.equal(response.status, 403);
      assert.equal(called, false);
    } finally { await new Promise<void>((resolve) => server.close(() => resolve())); }
  }
});

test('authorized alias lists names alone, resolves explicit secret server-side, and rejects ambiguous or unknown sources', async () => {
  const upstream: string[] = [];
  const server = createServerApp({ env, fetchImpl: async (_input, init) => {
    upstream.push(new Headers(init?.headers).get('x-goog-api-key') ?? '');
    return Response.json({ status: 'completed', output_text: JSON.stringify({ documentType: 'texto', findings: [] }) });
  } }).listen(0);
  const root = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    const listed = await fetch(root + '/api/guest/key-aliases', { headers: { 'x-gemini-alias-access-token': access } });
    assert.deepEqual(await listed.json(), { aliases: [{ id: 'test-1', label: 'Prueba 1' }] });
    const send = (headers: Record<string, string>) => fetch(root + '/api/guest/extract', { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(extract) });
    const authorized = await send({ 'x-gemini-key-alias': 'test-1', 'x-gemini-alias-access-token': access });
    assert.equal(authorized.status, 200);
    assert.equal(JSON.stringify(await authorized.json()).includes(secret), false);
    assert.deepEqual(upstream, [secret]);
    assert.equal((await send({ 'x-gemini-key-alias': 'test-4', 'x-gemini-alias-access-token': access })).status, 400);
    assert.equal((await send({ 'x-gemini-key-alias': 'test-1', 'x-gemini-alias-access-token': access, 'x-gemini-api-key': 'fake-session-key' })).status, 400);
    assert.deepEqual(upstream, [secret]);
    const temporary = await send({ 'x-gemini-api-key': 'fake-session-key' });
    assert.equal(temporary.status, 200);
    assert.deepEqual(upstream, [secret, 'fake-session-key']);
  } finally { await new Promise<void>((resolve) => server.close(() => resolve())); }
});
