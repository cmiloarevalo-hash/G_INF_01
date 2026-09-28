import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  createDriveLocalFileUploadService,
  DriveUploadError,
} from '../src/services/drive/upload.js';
import type {
  DriveAuthorizationService,
  DriveTransport,
} from '../src/services/drive/types.js';

function authorizedService(token = 'memory-token'): DriveAuthorizationService {
  return {
    getState: () => ({ status: 'authorized' }),
    authorize: async () => undefined,
    getAccessToken: () => token,
    clear: () => undefined,
    requireReauthorization: () => undefined,
  };
}

function uploadInput(overrides: Partial<{
  name: string;
  mimeType: string;
  byteLength: number;
  body: BodyInit;
  documentsFolderId: string;
}> = {}) {
  return {
    name: 'documento.pdf',
    mimeType: 'application/pdf',
    byteLength: 3,
    body: new Blob(['pdf'], { type: 'application/pdf' }),
    documentsFolderId: 'documents-folder-1',
    ...overrides,
  };
}

test('upload does nothing without a current in-memory Drive access token', async () => {
  let transportCalls = 0;
  const service = createDriveLocalFileUploadService(
    { ...authorizedService(), getAccessToken: () => null },
    async () => {
      transportCalls += 1;
      throw new Error('transport must not run');
    },
  );

  await assert.rejects(
    service.upload(uploadInput()),
    (error) => error instanceof DriveUploadError && error.stage === 'authorization',
  );
  assert.equal(transportCalls, 0);
});

test('resumable initiation sends exact metadata, one Documents parent, and media headers', async () => {
  const calls: Array<{ input: string; init?: RequestInit }> = [];
  const transport: DriveTransport = async (input, init) => {
    calls.push({ input: String(input), init });
    if (calls.length === 1) {
      return new Response(null, {
        status: 200,
        headers: { Location: 'https://upload.example/session-1' },
      });
    }
    return Response.json({
      id: 'drive-file-1',
      name: ' exact name.pdf ',
      mimeType: 'application/pdf',
    });
  };
  const body = new Blob(['pdf'], { type: 'application/pdf' });
  const service = createDriveLocalFileUploadService(authorizedService(), transport);

  await service.upload(uploadInput({
    name: ' exact name.pdf ',
    body,
  }));

  assert.equal(calls.length, 2);
  assert.equal(
    calls[0].input,
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id%2Cname%2CmimeType',
  );
  assert.equal(calls[0].init?.method, 'POST');
  const headers = new Headers(calls[0].init?.headers);
  assert.equal(headers.get('Authorization'), 'Bearer memory-token');
  assert.equal(headers.get('Content-Type'), 'application/json');
  assert.equal(headers.get('X-Upload-Content-Type'), 'application/pdf');
  assert.equal(headers.get('X-Upload-Content-Length'), '3');
  assert.deepEqual(JSON.parse(String(calls[0].init?.body)), {
    name: ' exact name.pdf ',
    mimeType: 'application/pdf',
    parents: ['documents-folder-1'],
  });
});

test('upload introduces no arbitrary 5 MB application limit', async () => {
  const largeByteLength = 6 * 1024 * 1024;
  let observedLength: string | null = null;
  let calls = 0;
  const service = createDriveLocalFileUploadService(
    authorizedService(),
    async (_input, init) => {
      calls += 1;
      if (calls === 1) {
        observedLength = new Headers(init?.headers).get('X-Upload-Content-Length');
        return new Response(null, {
          status: 200,
          headers: { Location: 'https://upload.example/large' },
        });
      }
      return Response.json({ id: 'large-file' });
    },
  );

  const largeBody = new Blob([new Uint8Array(largeByteLength)]);
  const result = await service.upload(uploadInput({
    byteLength: largeBody.size,
    body: largeBody,
  }));

  assert.equal(observedLength, String(largeByteLength));
  assert.equal(result.id, 'large-file');
});

test('initiation transport failure is a controlled failure', async () => {
  const service = createDriveLocalFileUploadService(
    authorizedService(),
    async () => {
      throw new Error('network unavailable');
    },
  );

  await assert.rejects(
    service.upload(uploadInput()),
    (error) => error instanceof DriveUploadError && error.stage === 'initiation',
  );
});

test('non-successful resumable initiation fails explicitly', async () => {
  const service = createDriveLocalFileUploadService(
    authorizedService(),
    async () => new Response('denied', { status: 403 }),
  );

  await assert.rejects(
    service.upload(uploadInput()),
    (error) => (
      error instanceof DriveUploadError &&
      error.stage === 'initiation' &&
      error.status === 403
    ),
  );
});

test('successful initiation without Location fails before content upload', async () => {
  let calls = 0;
  const service = createDriveLocalFileUploadService(
    authorizedService(),
    async () => {
      calls += 1;
      return new Response(null, { status: 200 });
    },
  );

  await assert.rejects(
    service.upload(uploadInput()),
    (error) => error instanceof DriveUploadError && error.stage === 'initiation',
  );
  assert.equal(calls, 1);
});

test('final PUT uses exactly the returned session URL and original file body', async () => {
  const body = new Blob(['original-body'], { type: 'text/plain' });
  const sessionUrl = 'https://upload.example/session-exact';
  const calls: Array<{ input: string; init?: RequestInit }> = [];
  const service = createDriveLocalFileUploadService(
    authorizedService(),
    async (input, init) => {
      calls.push({ input: String(input), init });
      if (calls.length === 1) {
        return new Response(null, {
          status: 200,
          headers: { Location: sessionUrl },
        });
      }
      return Response.json({ id: 'confirmed-1' });
    },
  );

  await service.upload(uploadInput({
    mimeType: 'text/plain',
    byteLength: body.size,
    body,
  }));

  assert.equal(calls[1].input, sessionUrl);
  assert.equal(calls[1].init?.method, 'PUT');
  assert.equal(new Headers(calls[1].init?.headers).get('Content-Type'), 'text/plain');
  assert.strictEqual(calls[1].init?.body, body);
});

test('final PUT transport failure is a controlled content failure', async () => {
  let calls = 0;
  const service = createDriveLocalFileUploadService(
    authorizedService(),
    async () => {
      calls += 1;
      if (calls === 1) {
        return new Response(null, {
          status: 200,
          headers: { Location: 'https://upload.example/session' },
        });
      }
      throw new Error('upload connection lost');
    },
  );

  await assert.rejects(
    service.upload(uploadInput()),
    (error) => error instanceof DriveUploadError && error.stage === 'content',
  );
});

test('final non-success response never becomes upload success', async () => {
  let calls = 0;
  const service = createDriveLocalFileUploadService(
    authorizedService(),
    async () => {
      calls += 1;
      if (calls === 1) {
        return new Response(null, {
          status: 200,
          headers: { Location: 'https://upload.example/session' },
        });
      }
      return new Response('quota exceeded', { status: 507 });
    },
  );

  await assert.rejects(
    service.upload(uploadInput()),
    (error) => (
      error instanceof DriveUploadError &&
      error.stage === 'content' &&
      error.status === 507 &&
      error.kind === 'storage'
    ),
  );
});

test('invalid final JSON response fails explicitly', async () => {
  let calls = 0;
  const service = createDriveLocalFileUploadService(
    authorizedService(),
    async () => {
      calls += 1;
      if (calls === 1) {
        return new Response(null, {
          status: 200,
          headers: { Location: 'https://upload.example/session' },
        });
      }
      return new Response('not-json', { status: 200 });
    },
  );

  await assert.rejects(
    service.upload(uploadInput()),
    (error) => error instanceof DriveUploadError && error.stage === 'content',
  );
});

test('missing confirmed Drive file ID fails explicitly', async () => {
  let calls = 0;
  const service = createDriveLocalFileUploadService(
    authorizedService(),
    async () => {
      calls += 1;
      if (calls === 1) {
        return new Response(null, {
          status: 200,
          headers: { Location: 'https://upload.example/session' },
        });
      }
      return Response.json({ name: 'documento.pdf', mimeType: 'application/pdf' });
    },
  );

  await assert.rejects(
    service.upload(uploadInput()),
    (error) => error instanceof DriveUploadError && error.stage === 'content',
  );
});

test('confirmed Drive ID and confirmed optional metadata are returned on success', async () => {
  let calls = 0;
  const service = createDriveLocalFileUploadService(
    authorizedService(),
    async () => {
      calls += 1;
      if (calls === 1) {
        return new Response(null, {
          status: 200,
          headers: { Location: 'https://upload.example/session' },
        });
      }
      return Response.json({
        id: 'drive-file-42',
        name: 'documento.pdf',
        mimeType: 'application/pdf',
      });
    },
  );

  assert.deepEqual(await service.upload(uploadInput()), {
    id: 'drive-file-42',
    name: 'documento.pdf',
    mimeType: 'application/pdf',
  });
});

test('Drive upload source persists no token/session URL and logs no credentials', () => {
  const source = [
    'src/services/drive/upload.ts',
    'src/services/drive/types.ts',
  ]
    .map((path) => readFileSync(path, 'utf8'))
    .join('\n');

  assert.doesNotMatch(source, /localStorage|sessionStorage/i);
  assert.doesNotMatch(source, /refresh[_-]?token|refreshToken/i);
  assert.doesNotMatch(source, /indexedDB|document\.cookie/i);
  assert.doesNotMatch(source, /console\.(?:log|info|debug|warn|error)/);
});

test('focused upload verification uses injected transport and fake authorization only', async () => {
  let transportCalls = 0;
  const service = createDriveLocalFileUploadService(
    authorizedService('fake-token'),
    async () => {
      transportCalls += 1;
      if (transportCalls === 1) {
        return new Response(null, {
          status: 200,
          headers: { Location: 'https://fake.invalid/session' },
        });
      }
      return Response.json({ id: 'fake-id' });
    },
  );

  const result = await service.upload(uploadInput());
  assert.equal(result.id, 'fake-id');
  assert.equal(transportCalls, 2);
});


test('Drive upload exposes quota and authorization failure kinds explicitly', async () => {
  const quota = createDriveLocalFileUploadService(
    authorizedService(),
    async () => new Response('quota', { status: 429 }),
  );
  await assert.rejects(
    quota.upload(uploadInput()),
    (error) =>
      error instanceof DriveUploadError &&
      error.kind === 'quota' &&
      error.status === 429,
  );

  const authorizationFailure = createDriveLocalFileUploadService(
    authorizedService(),
    async () => new Response('unauthorized', { status: 401 }),
  );
  await assert.rejects(
    authorizationFailure.upload(uploadInput()),
    (error) =>
      error instanceof DriveUploadError &&
      error.kind === 'authorization' &&
      error.status === 401,
  );
});
