import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createBrowserDrivePickerRuntime,
  BrowserDrivePickerRuntimeError,
} from '../src/services/drive/browser-picker.js';
import {
  createDriveReferenceReader,
  DriveReferenceError,
} from '../src/services/drive/reference.js';
import type {
  DriveAuthorizationService,
  DriveTransport,
} from '../src/services/drive/types.js';

function authorization(token: string | null = 'token') {
  let reauthorization = false;
  const service: DriveAuthorizationService = {
    getState: () => token ? ({ status: 'authorized' }) : ({ status: 'unauthorized' }),
    authorize: async () => undefined,
    getAccessToken: () => token,
    clear: () => undefined,
    requireReauthorization: () => {
      reauthorization = true;
    },
  };
  return {
    service,
    wasReauthorizationRequired: () => reauthorization,
  };
}

test('Drive reference reader returns controlled authorization-required without token', async () => {
  const auth = authorization(null);
  let calls = 0;
  const reader = createDriveReferenceReader(
    auth.service,
    async () => {
      calls += 1;
      return new Response();
    },
  );

  assert.deepEqual(await reader.read('file-1'), {
    status: 'authorization-required',
  });
  assert.equal(calls, 0);
});

test('Drive reference reader maps deleted/inaccessible references without fabricated content', async () => {
  for (const [status, expected] of [
    [404, 'not-found'],
    [403, 'unavailable'],
  ] as const) {
    const auth = authorization();
    const reader = createDriveReferenceReader(
      auth.service,
      async () => new Response('', { status }),
    );

    assert.deepEqual(await reader.read('file-1'), { status: expected });
  }
});

test('Drive reference reader maps revoked authorization and requests reauthorization', async () => {
  const auth = authorization();
  const reader = createDriveReferenceReader(
    auth.service,
    async () => new Response('', { status: 401 }),
  );

  assert.deepEqual(await reader.read('file-1'), {
    status: 'authorization-required',
  });
  assert.equal(auth.wasReauthorizationRequired(), true);
});

test('Drive reference reader returns confirmed metadata/content and enforces byte limit', async () => {
  const auth = authorization();
  let calls = 0;
  const transport: DriveTransport = async () => {
    calls += 1;
    if (calls === 1) {
      return Response.json({
        id: 'file-1',
        name: 'Documento.txt',
        mimeType: 'text/plain',
        trashed: false,
      });
    }
    return new Response('contenido', {
      headers: { 'Content-Length': '9' },
    });
  };
  const reader = createDriveReferenceReader(auth.service, transport, 32);

  const result = await reader.read('file-1');
  assert.equal(result.status, 'available');
  if (result.status === 'available') {
    assert.equal(result.file.id, 'file-1');
    assert.equal(result.file.name, 'Documento.txt');
    assert.equal(new TextDecoder().decode(result.file.content), 'contenido');
  }

  const limitedReader = createDriveReferenceReader(
    auth.service,
    async (input) => String(input).includes('fields=')
      ? Response.json({ id: 'file-1' })
      : new Response('12345', { headers: { 'Content-Length': '5' } }),
    4,
  );
  await assert.rejects(
    limitedReader.read('file-1'),
    (error) => error instanceof DriveReferenceError && error.kind === 'too-large',
  );
});


test('Drive reference reader rejects confirmed Content-Length above limit before consuming body', async () => {
  const auth = authorization();
  let calls = 0;
  let bodyReads = 0;
  let bodyCancelled = false;
  const reader = createDriveReferenceReader(
    auth.service,
    async () => {
      calls += 1;
      if (calls === 1) {
        return Response.json({ id: 'file-1' });
      }

      return {
        ok: true,
        status: 200,
        headers: new Headers({ 'Content-Length': '10' }),
        body: {
          async cancel() {
            bodyCancelled = true;
          },
          getReader() {
            bodyReads += 1;
            throw new Error('body must not be read');
          },
        },
      } as unknown as Response;
    },
    4,
  );

  await assert.rejects(
    reader.read('file-1'),
    (error) =>
      error instanceof DriveReferenceError &&
      error.kind === 'too-large',
  );
  assert.equal(bodyReads, 0);
  assert.equal(bodyCancelled, true);
});

test('Drive reference reader rejects oversized body during streaming without Content-Length', async () => {
  const auth = authorization();
  let calls = 0;
  let cancelled = false;
  const reader = createDriveReferenceReader(
    auth.service,
    async () => {
      calls += 1;
      if (calls === 1) return Response.json({ id: 'file-1' });

      return new Response(new ReadableStream<Uint8Array>({
        pull(controller) {
          controller.enqueue(new Uint8Array([1, 2, 3]));
        },
        cancel() {
          cancelled = true;
        },
      }));
    },
    4,
  );

  await assert.rejects(
    reader.read('file-1'),
    (error) =>
      error instanceof DriveReferenceError &&
      error.kind === 'too-large',
  );
  assert.equal(cancelled, true);
});

test('Drive reference reader rejects real body above limit even when Content-Length is falsely small', async () => {
  const auth = authorization();
  let calls = 0;
  let cancelled = false;
  const reader = createDriveReferenceReader(
    auth.service,
    async () => {
      calls += 1;
      if (calls === 1) return Response.json({ id: 'file-1' });

      let pulls = 0;
      return new Response(new ReadableStream<Uint8Array>({
        pull(controller) {
          pulls += 1;
          controller.enqueue(
            pulls === 1
              ? new Uint8Array([1, 2])
              : new Uint8Array([3, 4, 5]),
          );
        },
        cancel() {
          cancelled = true;
        },
      }), {
        headers: { 'Content-Length': '2' },
      });
    },
    4,
  );

  await assert.rejects(
    reader.read('file-1'),
    (error) =>
      error instanceof DriveReferenceError &&
      error.kind === 'too-large',
  );
  assert.equal(cancelled, true);
});

test('Drive reference reader streams valid content at or below the limit', async () => {
  const auth = authorization();
  let calls = 0;
  const reader = createDriveReferenceReader(
    auth.service,
    async () => {
      calls += 1;
      if (calls === 1) {
        return Response.json({
          id: 'file-1',
          name: 'small.bin',
          mimeType: 'application/octet-stream',
        });
      }

      const chunks = [
        new Uint8Array([1, 2]),
        new Uint8Array([3, 4]),
      ];
      let index = 0;
      return new Response(new ReadableStream<Uint8Array>({
        pull(controller) {
          const chunk = chunks[index++];
          if (chunk) controller.enqueue(chunk);
          else controller.close();
        },
      }));
    },
    4,
  );

  const result = await reader.read('file-1');
  assert.equal(result.status, 'available');
  if (result.status === 'available') {
    assert.deepEqual(
      Array.from(new Uint8Array(result.file.content)),
      [1, 2, 3, 4],
    );
  }
});

test('Drive reference reader exposes quota/network failures explicitly', async () => {
  const auth = authorization();
  const quota = createDriveReferenceReader(
    auth.service,
    async () => new Response('', { status: 429 }),
  );
  await assert.rejects(
    quota.read('file-1'),
    (error) => error instanceof DriveReferenceError && error.kind === 'quota',
  );

  const network = createDriveReferenceReader(
    auth.service,
    async () => {
      throw new Error('offline');
    },
  );
  await assert.rejects(
    network.read('file-1'),
    (error) => error instanceof DriveReferenceError && error.kind === 'network',
  );
});

class NativeBuilder {
  readonly calls: Array<{ operation: string; value?: unknown }>;
  callback: ((data: Record<string, unknown>) => void) | null = null;

  constructor(calls: Array<{ operation: string; value?: unknown }>) {
    this.calls = calls;
  }

  setDeveloperKey(value: string) {
    this.calls.push({ operation: 'developerKey', value });
    return this;
  }

  setAppId(value: string) {
    this.calls.push({ operation: 'appId', value });
    return this;
  }

  setOAuthToken(value: string) {
    this.calls.push({ operation: 'oauth', value });
    return this;
  }

  addView(value: unknown) {
    this.calls.push({ operation: 'view', value });
    return this;
  }

  enableFeature(value: unknown) {
    this.calls.push({ operation: 'feature', value });
    return this;
  }

  setCallback(callback: (data: Record<string, unknown>) => void) {
    this.callback = callback;
    return this;
  }

  build() {
    return {
      setVisible: (value: boolean) => {
        this.calls.push({ operation: 'visible', value });
      },
    };
  }
}

test('browser Picker runtime adapts injected Google Picker global without real keys', () => {
  const calls: Array<{ operation: string; value?: unknown }> = [];
  let native: NativeBuilder | null = null;
  class PickerBuilder extends NativeBuilder {
    constructor() {
      super(calls);
      native = this;
    }
  }

  const host = {
    google: {
      picker: {
        PickerBuilder,
        ViewId: { DOCS: 'DOCS' },
        Feature: { MULTISELECT_ENABLED: 'MULTI' },
        Action: { PICKED: 'picked', CANCEL: 'cancel' },
        Response: { ACTION: 'action', DOCUMENTS: 'docs' },
        Document: {
          ID: 'id',
          NAME: 'name',
          MIME_TYPE: 'mimeType',
          URL: 'url',
        },
      },
    },
  };

  const runtime = createBrowserDrivePickerRuntime(host);
  let callbackValue: unknown;
  const built = runtime.createBuilder()
    .setDeveloperKey('fake-key')
    .setAppId('fake-app')
    .setOAuthToken('memory-token')
    .addDriveDocumentsView()
    .enableMultiselect()
    .setCallback((value) => {
      callbackValue = value;
    })
    .build();

  built.setVisible(true);
  assert.ok(native);
  (native as NativeBuilder).callback?.({
    action: 'picked',
    docs: [{
      id: 'file-1',
      name: 'Uno',
      mimeType: 'application/pdf',
      url: 'https://example.invalid/file-1',
    }],
  });

  assert.deepEqual(callbackValue, {
    action: 'picked',
    documents: [{
      id: 'file-1',
      name: 'Uno',
      mimeType: 'application/pdf',
      url: 'https://example.invalid/file-1',
    }],
  });
  assert.deepEqual(calls, [
    { operation: 'developerKey', value: 'fake-key' },
    { operation: 'appId', value: 'fake-app' },
    { operation: 'oauth', value: 'memory-token' },
    { operation: 'view', value: 'DOCS' },
    { operation: 'feature', value: 'MULTI' },
    { operation: 'visible', value: true },
  ]);
});

test('browser Picker runtime maps cancellation and fails when Google Picker is unavailable', () => {
  const runtime = createBrowserDrivePickerRuntime({});
  assert.throws(
    () => runtime.createBuilder(),
    (error) => error instanceof BrowserDrivePickerRuntimeError,
  );
});
