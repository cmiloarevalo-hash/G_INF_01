import assert from 'node:assert/strict';
import test from 'node:test';
import {
  computeRoadmapSnapshot,
  renderMachineIssueBody,
  type GitHubRoadmapIssue,
} from '../scripts/roadmap-status-generator.js';
import { parseRoadmapSnapshotIssueBody } from '../src/shared/roadmapStatus.js';

function issue(
  number: number,
  title: string,
  state: 'open' | 'closed',
  body: string | null = null,
): GitHubRoadmapIssue {
  return {
    number,
    title,
    state,
    body,
    html_url: 'https://github.com/cmiloarevalo-hash/G_INF_01/issues/' + number,
  };
}

const currentFixture: GitHubRoadmapIssue[] = [
  issue(12, 'Piloto real de análisis invitado con Gemini y JSON TITLE_STUDY', 'closed'),
  issue(
    20,
    'M2: publicar y comprobar el piloto en Google AI Studio Starter Tier',
    'open',
    [
      '- [x] **M2.1 · Preparar la versión.**',
      '- [x] **M2.2 · Configurar acceso seguro.**',
      '- [ ] **M2.3 · Publicar y probar.**',
      '- [ ] **M2.4 · Registrar y decidir.**',
    ].join('\n'),
  ),
  issue(34, 'M2.2: configurar y verificar acceso seguro en AI Studio', 'closed'),
  issue(37, 'M2.3: publicar y probar el piloto en AI Studio Starter Tier', 'open'),
  issue(22, 'M3: resultado e informe para invitado', 'closed'),
  issue(10, 'M3.1: contrato de presentación', 'closed'),
  issue(24, 'M3.2: vista web enriquecida TITLE_STUDY', 'closed'),
  issue(28, 'M3.3: renderer y descarga DOCX', 'closed'),
  issue(30, 'M3.4: verificación integrada UI/DOCX y revisión humana', 'closed'),
];

test('computes the current weighted roadmap as 50% from canonical Issue state', () => {
  const snapshot = computeRoadmapSnapshot(
    currentFixture,
    'source-sha',
    '2026-09-26T23:00:00.000Z',
  );

  assert.equal(snapshot.overallPercent, 50);
  assert.equal(snapshot.summary, '50% ponderado: M1 20 + M2 10 + M3 20');

  const [m1, m2, m3, m4, m5] = snapshot.metas;
  assert.deepEqual(
    [m1?.status, m1?.pointsEarned, m2?.status, m2?.pointsEarned, m3?.status, m3?.pointsEarned],
    ['OK', 20, 'EN PROCESO', 10, 'OK', 20],
  );
  assert.deepEqual(
    m2?.children?.map((child) => [child.id, child.status]),
    [
      ['M2.1', 'OK'],
      ['M2.2', 'OK'],
      ['M2.3', 'EN PROCESO'],
      ['M2.4', 'PENDIENTE'],
    ],
  );
  assert.deepEqual([m4?.status, m4?.pointsEarned, m5?.status, m5?.pointsEarned], [
    'PENDIENTE',
    0,
    'PENDIENTE',
    0,
  ]);
});

test('a newly closed canonical subtask contributes its equal share without changing meta weight', () => {
  const fixture = currentFixture.map((entry) => (
    entry.number === 37 ? { ...entry, state: 'closed' as const } : entry
  ));
  const snapshot = computeRoadmapSnapshot(fixture, 'source-sha', '2026-09-26T23:00:00.000Z');
  const m2 = snapshot.metas.find((meta) => meta.id === 'M2');

  assert.equal(m2?.pointsMax, 20);
  assert.equal(m2?.pointsEarned, 15);
  assert.equal(snapshot.overallPercent, 55);
});

test('machine Issue body round-trips the generated snapshot through the delimited JSON payload', () => {
  const snapshot = computeRoadmapSnapshot(
    currentFixture,
    'source-sha',
    '2026-09-26T23:00:00.000Z',
  );
  const body = renderMachineIssueBody(snapshot);

  assert.match(body, /ROADMAP_STATUS_JSON_START/);
  assert.match(body, /ROADMAP_STATUS_JSON_END/);
  assert.deepEqual(parseRoadmapSnapshotIssueBody(body), snapshot);
});
