import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  createDrivePickerService,
  type DrivePickerConfiguration,
  type DrivePickerGateway,
} from '../src/services/drive/index.js';

const configuration: DrivePickerConfiguration = {
  accessToken: 'transient-request-value',
  apiKey: 'test-api-key-value',
  appId: 'test-app-id',
};

test('Picker opens only on explicit service operation and receives transient configuration', async () => {
  const calls: DrivePickerConfiguration[] = [];
  const gateway: DrivePickerGateway = {
    async open(input) {
      calls.push(input);
      return {
        status: 'selected',
        file: { id: 'drive-1', name: 'Documento.pdf', mimeType: 'application/pdf' },
      };
    },
  };
  const service = createDrivePickerService(gateway);

  assert.equal(calls.length, 0);
  const result = await service.openPicker(configuration);

  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], configuration);
  assert.deepEqual(result, {
    status: 'selected',
    file: { id: 'drive-1', name: 'Documento.pdf', mimeType: 'application/pdf' },
  });
});

test('Picker cancellation is distinct from error', async () => {
  const service = createDrivePickerService({
    async open() {
      return { status: 'cancelled' };
    },
  });
  assert.deepEqual(await service.openPicker(configuration), { status: 'cancelled' });
});

test('Picker gateway error becomes controlled DrivePickerError', async () => {
  const service = createDrivePickerService({
    async open() {
      throw new Error('picker unavailable');
    },
  });
  await assert.rejects(service.openPicker(configuration), /Google Picker falló: picker unavailable/);
});

test('Picker rejects selected file without confirmed Drive ID/name', async () => {
  const service = createDrivePickerService({
    async open() {
      return { status: 'selected', file: { id: '', name: 'Documento' } };
    },
  });
  await assert.rejects(service.openPicker(configuration), /ID de archivo/);
});

test('Picker boundary contains no storage or global Google script loader', () => {
  const source = readFileSync(
    new URL('../src/services/drive/picker.ts', import.meta.url),
    'utf8',
  );
  assert.doesNotMatch(source, /localStorage|sessionStorage|indexedDB/);
  assert.doesNotMatch(source, /google\.picker|gapi|script\.src|createElement\(['"]script/);
});
