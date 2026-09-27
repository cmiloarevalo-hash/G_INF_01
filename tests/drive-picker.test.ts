import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  createDrivePickerService,
  DrivePickerError,
} from '../src/services/drive/picker.js';
import type {
  DriveAuthorizationService,
  DrivePickerBuilder,
  DrivePickerBuiltInstance,
  DrivePickerRuntime,
  DrivePickerRuntimeCallback,
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

class FakePickerRuntime implements DrivePickerRuntime {
  readonly calls: Array<{ operation: string; value?: string | boolean }> = [];
  callback: DrivePickerRuntimeCallback | null = null;
  failAt: 'create' | 'build' | 'visible' | null = null;

  createBuilder(): DrivePickerBuilder {
    this.calls.push({ operation: 'createBuilder' });
    if (this.failAt === 'create') throw new Error('create failed');

    const runtime = this;
    const built: DrivePickerBuiltInstance = {
      setVisible(visible) {
        runtime.calls.push({ operation: 'setVisible', value: visible });
        if (runtime.failAt === 'visible') throw new Error('visible failed');
      },
    };

    const builder: DrivePickerBuilder = {
      setDeveloperKey(value) {
        runtime.calls.push({ operation: 'setDeveloperKey', value });
        return builder;
      },
      setAppId(value) {
        runtime.calls.push({ operation: 'setAppId', value });
        return builder;
      },
      setOAuthToken(value) {
        runtime.calls.push({ operation: 'setOAuthToken', value });
        return builder;
      },
      addDriveDocumentsView() {
        runtime.calls.push({ operation: 'addDriveDocumentsView' });
        return builder;
      },
      enableMultiselect() {
        runtime.calls.push({ operation: 'enableMultiselect' });
        return builder;
      },
      setCallback(callback) {
        runtime.calls.push({ operation: 'setCallback' });
        runtime.callback = callback;
        return builder;
      },
      build() {
        runtime.calls.push({ operation: 'build' });
        if (runtime.failAt === 'build') throw new Error('build failed');
        return built;
      },
    };

    return builder;
  }

  emit(data: Parameters<DrivePickerRuntimeCallback>[0]) {
    assert.ok(this.callback, 'callback should be registered before emitting');
    this.callback(data);
  }
}

test('missing access token fails before Picker runtime invocation', async () => {
  const runtime = new FakePickerRuntime();
  const service = createDrivePickerService(
    { ...authorizedService(), getAccessToken: () => null },
    { developerKey: 'developer-key', appId: '123456' },
    runtime,
  );

  await assert.rejects(
    service.open(),
    (error) => error instanceof DrivePickerError && error.stage === 'authorization',
  );
  assert.deepEqual(runtime.calls, []);
});

test('blank developer key fails before Picker runtime invocation', async () => {
  const runtime = new FakePickerRuntime();
  const service = createDrivePickerService(
    authorizedService(),
    { developerKey: '   ', appId: '123456' },
    runtime,
  );

  await assert.rejects(
    service.open(),
    (error) => error instanceof DrivePickerError && error.stage === 'configuration',
  );
  assert.deepEqual(runtime.calls, []);
});

test('blank App ID fails before Picker runtime invocation', async () => {
  const runtime = new FakePickerRuntime();
  const service = createDrivePickerService(
    authorizedService(),
    { developerKey: 'developer-key', appId: '   ' },
    runtime,
  );

  await assert.rejects(
    service.open(),
    (error) => error instanceof DrivePickerError && error.stage === 'configuration',
  );
  assert.deepEqual(runtime.calls, []);
});

test('Picker receives injected config and transient current token, uses Drive documents, multiselect, and explicit visibility', async () => {
  const runtime = new FakePickerRuntime();
  const service = createDrivePickerService(
    authorizedService('current-memory-token'),
    { developerKey: '  developer-key  ', appId: '  123456  ' },
    runtime,
  );

  const pending = service.open();

  assert.deepEqual(runtime.calls, [
    { operation: 'createBuilder' },
    { operation: 'setDeveloperKey', value: 'developer-key' },
    { operation: 'setAppId', value: '123456' },
    { operation: 'setOAuthToken', value: 'current-memory-token' },
    { operation: 'addDriveDocumentsView' },
    { operation: 'enableMultiselect' },
    { operation: 'setCallback' },
    { operation: 'build' },
    { operation: 'setVisible', value: true },
  ]);

  runtime.emit({ action: 'cancelled' });
  assert.deepEqual(await pending, { status: 'cancelled' });
});

test('PICKED callback maps multiple confirmed file IDs in original order', async () => {
  const runtime = new FakePickerRuntime();
  const service = createDrivePickerService(
    authorizedService(),
    { developerKey: 'developer-key', appId: '123456' },
    runtime,
  );
  const pending = service.open();

  runtime.emit({
    action: 'picked',
    documents: [
      { id: 'file-1', name: 'Uno' },
      { id: 'file-2', mimeType: 'application/pdf' },
      { id: 'file-3', url: 'https://drive.example/file-3' },
    ],
  });

  assert.deepEqual(await pending, {
    status: 'picked',
    documents: [
      { id: 'file-1', name: 'Uno' },
      { id: 'file-2', mimeType: 'application/pdf' },
      { id: 'file-3', url: 'https://drive.example/file-3' },
    ],
  });
});

test('optional metadata is included only when Picker confirms non-empty strings', async () => {
  const runtime = new FakePickerRuntime();
  const service = createDrivePickerService(
    authorizedService(),
    { developerKey: 'developer-key', appId: '123456' },
    runtime,
  );
  const pending = service.open();

  runtime.emit({
    action: 'picked',
    documents: [{
      id: '  file-1  ',
      name: '   ',
      mimeType: 123,
      url: '  https://drive.example/file-1  ',
    }],
  });

  assert.deepEqual(await pending, {
    status: 'picked',
    documents: [{
      id: 'file-1',
      url: 'https://drive.example/file-1',
    }],
  });
});

test('blank or missing ID in PICKED payload fails explicitly', async () => {
  for (const document of [{ name: 'Missing' }, { id: '   ', name: 'Blank' }]) {
    const runtime = new FakePickerRuntime();
    const service = createDrivePickerService(
      authorizedService(),
      { developerKey: 'developer-key', appId: '123456' },
      runtime,
    );
    const pending = service.open();

    runtime.emit({ action: 'picked', documents: [document] });

    await assert.rejects(
      pending,
      (error) => error instanceof DrivePickerError && error.stage === 'callback',
    );
  }
});

test('empty PICKED documents payload fails explicitly', async () => {
  for (const documents of [undefined, []]) {
    const runtime = new FakePickerRuntime();
    const service = createDrivePickerService(
      authorizedService(),
      { developerKey: 'developer-key', appId: '123456' },
      runtime,
    );
    const pending = service.open();

    runtime.emit({ action: 'picked', documents });

    await assert.rejects(
      pending,
      (error) => error instanceof DrivePickerError && error.stage === 'callback',
    );
  }
});

test('cancellation is an explicit non-success non-error outcome', async () => {
  const runtime = new FakePickerRuntime();
  const service = createDrivePickerService(
    authorizedService(),
    { developerKey: 'developer-key', appId: '123456' },
    runtime,
  );
  const pending = service.open();

  runtime.emit({ action: 'cancelled' });

  assert.deepEqual(await pending, { status: 'cancelled' });
});

test('unsupported or malformed callback action is a controlled failure', async () => {
  const runtime = new FakePickerRuntime();
  const service = createDrivePickerService(
    authorizedService(),
    { developerKey: 'developer-key', appId: '123456' },
    runtime,
  );
  const pending = service.open();

  runtime.emit({ action: 'unexpected' });

  await assert.rejects(
    pending,
    (error) => error instanceof DrivePickerError && error.stage === 'callback',
  );
});

test('runtime create, build, and visibility failures are controlled', async () => {
  for (const failAt of ['create', 'build', 'visible'] as const) {
    const runtime = new FakePickerRuntime();
    runtime.failAt = failAt;
    const service = createDrivePickerService(
      authorizedService(),
      { developerKey: 'developer-key', appId: '123456' },
      runtime,
    );

    await assert.rejects(
      service.open(),
      (error) => error instanceof DrivePickerError && error.stage === 'runtime',
    );
  }
});

test('Picker source adds no upload view, rigid MIME filter, browser persistence, or credential logging', () => {
  const source = [
    'src/services/drive/picker.ts',
    'src/services/drive/types.ts',
  ]
    .map((path) => readFileSync(path, 'utf8'))
    .join('\n');

  assert.doesNotMatch(source, /DocsUploadView|uploadView/i);
  assert.doesNotMatch(source, /setMimeTypes|mimeAllowlist|allowedMime/i);
  assert.doesNotMatch(source, /localStorage|sessionStorage|indexedDB|document\.cookie/i);
  assert.doesNotMatch(source, /console\.(?:log|info|debug|warn|error)/);
  assert.doesNotMatch(source, /refresh[_-]?token|refreshToken/i);
});

test('focused Picker tests require no Google scripts, real credentials, or network', async () => {
  const runtime = new FakePickerRuntime();
  const service = createDrivePickerService(
    authorizedService('fake-memory-token'),
    { developerKey: 'fake-developer-key', appId: 'fake-app-id' },
    runtime,
  );
  const pending = service.open();

  runtime.emit({
    action: 'picked',
    documents: [{ id: 'fake-drive-file' }],
  });

  assert.deepEqual(await pending, {
    status: 'picked',
    documents: [{ id: 'fake-drive-file' }],
  });
});
