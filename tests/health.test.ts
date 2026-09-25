import test from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createServerApp } from '../server.js';

test('GET /api/health responds with HTTP 200 and process status ok', async () => {
  const app = createServerApp();
  const server: Server = app.listen(0);
  const address = server.address() as AddressInfo;
  const port = address.port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/health`);
    assert.equal(res.status, 200, 'Health endpoint should return HTTP 200');

    const body = (await res.json()) as Record<string, unknown>;
    assert.equal(body.status, 'ok', 'Status property should be "ok"');
    assert.equal(typeof body.uptime, 'number', 'Uptime should be reported as a number');
    assert.ok(typeof body.timestamp === 'string', 'Timestamp should be reported as string');

    // NFR-024 & V-042: MUST NOT report, consult, or affirm state of external services
    assert.equal(body.drive, undefined, 'Must not report Google Drive status');
    assert.equal(body.firestore, undefined, 'Must not report Firestore status');
    assert.equal(body.llm, undefined, 'Must not report LLM provider status');
    assert.equal(body.gemini, undefined, 'Must not report Gemini status');
    assert.equal(body.openai, undefined, 'Must not report OpenAI status');
    assert.equal(body.auth, undefined, 'Must not report Auth status');
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
});
