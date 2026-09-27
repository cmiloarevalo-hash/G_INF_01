import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DRIVE_MULTIPART_UPLOAD_URL,
  uploadLocalDocument,
  type DriveRequest,
  type DriveTransport,
} from '../src/services/drive/index.js';

function fakeTransport(response: { status: number; json: unknown }) {
  const requests: DriveRequest[] = [];
  const transport: DriveTransport = {
    async send(request) {
      requests.push(request);
      return response;
    },
  };
  return { transport, requests };
}

test('local upload uses Drive v3 multipart URL and returns confirmed metadata', async () => {
  const fake = fakeTransport({
    status: 200,
    json: { id: 'drive-id', name: 'doc.pdf', mimeType: 'application/pdf' },
  });

  const result = await uploadLocalDocument(
    fake.transport,
    'request-only-value',
    'documents-folder',
    {
      name: 'doc.pdf',
      mimeType: 'application/pdf',
      data: new TextEncoder().encode('PDF bytes'),
    },
  );

  assert.equal(
    DRIVE_MULTIPART_UPLOAD_URL.includes('/upload/drive/v3/files?uploadType=multipart'),
    true,
  );
  assert.equal(fake.requests[0]?.url, DRIVE_MULTIPART_UPLOAD_URL);
  assert.deepEqual(result, {
    id: 'drive-id',
    name: 'doc.pdf',
    mimeType: 'application/pdf',
  });
});

test('multipart body puts metadata before media with one parent and preserves MIME/bytes', async () => {
  const fake = fakeTransport({
    status: 200,
    json: { id: 'confirmed', name: 'document.txt', mimeType: 'text/plain' },
  });

  await uploadLocalDocument(
    fake.transport,
    'request-only-value',
    'documents-folder',
    {
      name: 'document.txt',
      mimeType: 'text/plain',
      data: new TextEncoder().encode('HELLO_DRIVE_BYTES'),
    },
  );

  const request = fake.requests[0];
  assert.match(request?.headers['Content-Type'] ?? '', /^multipart\/related; boundary=/);
  assert.equal(request?.headers.Authorization, 'Bearer request-only-value');
  const body = new TextDecoder().decode(request?.body as Uint8Array);
  const metadataIndex = body.indexOf('{"name":"document.txt","parents":["documents-folder"]}');
  const mediaHeaderIndex = body.indexOf('Content-Type: text/plain');
  const bytesIndex = body.indexOf('HELLO_DRIVE_BYTES');
  assert.ok(metadataIndex >= 0);
  assert.ok(mediaHeaderIndex > metadataIndex);
  assert.ok(bytesIndex > mediaHeaderIndex);
});

test('non-2xx upload response rejects', async () => {
  const fake = fakeTransport({ status: 503, json: { error: 'down' } });
  await assert.rejects(
    uploadLocalDocument(fake.transport, 'request-only-value', 'folder', {
      name: 'a.txt',
      mimeType: 'text/plain',
      data: new Uint8Array([1]),
    }),
    /HTTP 503/,
  );
});

test('upload response without confirmed ID rejects instead of inventing fallback ID', async () => {
  const fake = fakeTransport({
    status: 200,
    json: { name: 'a.txt', mimeType: 'text/plain' },
  });
  await assert.rejects(
    uploadLocalDocument(fake.transport, 'request-only-value', 'folder', {
      name: 'a.txt',
      mimeType: 'text/plain',
      data: new Uint8Array([1]),
    }),
    /no confirmó el identificador/,
  );
});

test('Blob input stays transport-injected with no real network', async () => {
  let sends = 0;
  const transport: DriveTransport = {
    async send() {
      sends += 1;
      return {
        status: 200,
        json: { id: 'id', name: 'a.txt', mimeType: 'text/plain' },
      };
    },
  };
  await uploadLocalDocument(transport, 'request-only-value', 'folder', {
    name: 'a.txt',
    mimeType: 'text/plain',
    data: new Blob(['blob-body'], { type: 'text/plain' }),
  });
  assert.equal(sends, 1);
});
