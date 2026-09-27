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
  issue(
    22,
    'M3: resultado e informe para invitado',
    'closed',
    [
      '- [x] M3.1 · Contrato de presentación',
      '- [x] M3.2 · Vista web enriquecida TITLE_STUDY',
      '- [x] M3.3 · Renderer y descarga DOCX',
      '- [x] M3.4 · Verificación integrada y revisión humana',
    ].join('\n'),
  ),
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
  assert.equal(m2?.children?.[0]?.source?.kind, 'checklist');
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

test('discovers future M4 checklist children generically and raises current 50% baseline to 60%', () => {
  const fixture = [
    ...currentFixture,
    issue(
      50,
      'M4: trabajo persistente y capacidades completas',
      'open',
      [
        '- [x] M4.1 · Persistencia inicial',
        '- [ ] M4.2 · Integración persistente',
      ].join('\n'),
    ),
    issue(51, 'M4.1: persistencia inicial', 'closed'),
    issue(52, 'M4.2: integración persistente', 'open'),
  ];

  const snapshot = computeRoadmapSnapshot(fixture, 'source-sha', '2026-09-26T23:00:00.000Z');
  const m4 = snapshot.metas.find((meta) => meta.id === 'M4');

  assert.equal(snapshot.overallPercent, 60);
  assert.equal(m4?.pointsEarned, 10);
  assert.equal(m4?.pointsMax, 20);
  assert.equal(m4?.status, 'EN PROCESO');
  assert.deepEqual(
    m4?.children?.map((child) => [child.id, child.label, child.status]),
    [
      ['M4.1', 'Persistencia inicial', 'OK'],
      ['M4.2', 'Integración persistente', 'EN PROCESO'],
    ],
  );
  assert.equal(m4?.children?.[0]?.source?.issueNumber, 51);
  assert.equal(m4?.children?.[1]?.source?.issueNumber, 52);
});

test('parent checklist remains the complete planned denominator when dedicated child Issues exist', () => {
  const fixture = [
    ...currentFixture,
    issue(
      50,
      'M4: trabajo persistente y capacidades completas',
      'open',
      [
        '- [x] M4.1 · Persistencia inicial',
        '- [ ] M4.2 · Integración persistente',
      ].join('\n'),
    ),
    issue(51, 'M4.1: persistencia inicial', 'closed'),
    issue(52, 'M4.2: integración persistente', 'open'),
    issue(53, 'M4.3: issue aún no incorporado al plan padre', 'closed'),
  ];

  const snapshot = computeRoadmapSnapshot(fixture, 'source-sha', '2026-09-26T23:00:00.000Z');
  const m4 = snapshot.metas.find((meta) => meta.id === 'M4');

  assert.equal(m4?.pointsEarned, 10);
  assert.deepEqual(m4?.children?.map((child) => child.id), ['M4.1', 'M4.2']);
});

test('discovers dedicated future child Issues when a parent has no canonical checklist plan', () => {
  const fixture = [
    ...currentFixture,
    issue(60, 'M5: integración del producto completo', 'open'),
    issue(61, 'M5.1: primer bloque end-to-end', 'closed'),
    issue(62, 'M5.2: segundo bloque end-to-end', 'open'),
  ];

  const snapshot = computeRoadmapSnapshot(fixture, 'source-sha', '2026-09-26T23:00:00.000Z');
  const m5 = snapshot.metas.find((meta) => meta.id === 'M5');

  assert.equal(m5?.pointsEarned, 10);
  assert.deepEqual(
    m5?.children?.map((child) => [child.id, child.status]),
    [
      ['M5.1', 'OK'],
      ['M5.2', 'EN PROCESO'],
    ],
  );
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
