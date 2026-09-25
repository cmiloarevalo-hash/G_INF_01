import test from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createServerApp } from '../server.js';

test('Server creates Express instance with health endpoint defined', async () => {
  const app = createServerApp();
  assert.ok(app, 'createServerApp should return Express instance');

  const server: Server = app.listen(0);
  const address = server.address() as AddressInfo;
  const port = address.port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/health`);
    assert.equal(res.status, 200);
    const data = (await res.json()) as { status: string };
    assert.equal(data.status, 'ok');
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
});

test('Server responds with 404 for unknown API routes', async () => {
  const app = createServerApp();
  const server: Server = app.listen(0);
  const address = server.address() as AddressInfo;
  const port = address.port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/nonexistent`);
    assert.equal(res.status, 404, 'Unknown API route should return HTTP 404');
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
});
