import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { NAV_ITEMS } from '../src/components/Sidebar.js';

test('M5.1-2 enables only implemented authenticated top-level product entries', () => {
  const available = new Map(NAV_ITEMS.map((item) => [item.id, item.isAvailable]));
  assert.equal(available.get('mis-informes'), true);
  assert.equal(available.get('apis-modelos'), true);
  assert.equal(available.get('google-drive'), false);
  assert.equal(available.get('configuracion'), false);
});

test('M5.1-2 app connects project creation/reopen to the authenticated workspace', () => {
  const source = readFileSync(
    new URL('../src/app/App.tsx', import.meta.url),
    'utf8',
  );
  assert.match(source, /onCreated=\{\(project\)/);
  assert.match(source, /onOpenProject=\{\(project\)/);
  assert.match(source, /setCurrentSection\('workspace-proyecto'\)/);
  assert.match(source, /<ReportsPage\b/);
  assert.match(source, /<ApisModelsPage\b/);
});

test('M5.2 workspace exposes canonical product areas and contextual navigation', () => {
  const source = readFileSync(
    new URL('../src/pages/ProjectWorkspacePage.tsx', import.meta.url),
    'utf8',
  );
  for (const label of ['Resumen', 'Documentos', 'Resultado', 'Informe']) {
    assert.match(source, new RegExp(`'${label}'`));
  }
  assert.match(source, /Mis informes/);
  assert.match(source, /APIs y modelos/);
});
