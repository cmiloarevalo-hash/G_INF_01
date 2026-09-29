import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { driveReferenceStateLabel } from '../src/pages/ProjectWorkspacePage.js';
import { resolveBrowserGoogleDriveConfig } from '../src/services/drive/browser-google.js';

test('M4.3f document reference states expose controlled labels', () => {
  assert.equal(driveReferenceStateLabel('available'), 'Disponible');
  assert.equal(
    driveReferenceStateLabel('authorization-required'),
    'Requiere autorización',
  );
  assert.equal(driveReferenceStateLabel('unavailable'), 'No disponible');
  assert.equal(driveReferenceStateLabel('stale'), 'Referencia obsoleta');
  assert.equal(driveReferenceStateLabel('error'), 'Error de verificación');
});

test('M4.3f Google Drive browser config fails closed without real config', () => {
  const resolution = resolveBrowserGoogleDriveConfig({});
  assert.equal(resolution.available, false);
  if (!resolution.available) {
    assert.deepEqual(resolution.missing.sort(), [
      'VITE_GOOGLE_OAUTH_CLIENT_ID',
      'VITE_GOOGLE_PICKER_APP_ID',
      'VITE_GOOGLE_PICKER_DEVELOPER_KEY',
    ].sort());
  }
});

test('M4.3f UI contains no embedded Google keys or fake-success wording', () => {
  const source = [
    '../src/pages/ProjectWorkspacePage.tsx',
    '../src/services/drive/browser-google.ts',
    '../src/services/application/product-runtime.tsx',
  ].map((path) => readFileSync(new URL(path, import.meta.url), 'utf8')).join('\n');

  assert.doesNotMatch(source, /AIza[\w-]{20,}/);
  assert.doesNotMatch(source, /localStorage|sessionStorage/);
  assert.match(source, /no se informará como exitosa/);
  assert.match(source, /cancelada; no se persistió metadata/);
});
