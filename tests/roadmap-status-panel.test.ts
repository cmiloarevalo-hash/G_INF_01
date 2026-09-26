import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { RoadmapStatusView } from '../src/components/RoadmapStatusPanel.js';
import {
  FALLBACK_ROADMAP_SNAPSHOT,
  ROADMAP_MACHINE_ISSUE_URL,
  ROADMAP_STATUS_END,
  ROADMAP_STATUS_START,
  loadRoadmapSnapshot,
} from '../src/shared/roadmapStatus.js';

test('renders the weighted roadmap snapshot and live source marker', () => {
  const html = renderToStaticMarkup(createElement(RoadmapStatusView, {
    snapshot: FALLBACK_ROADMAP_SNAPSHOT,
    live: true,
  }));

  assert.match(html, /Avance acumulado/);
  assert.match(html, />50%</);
  assert.match(html, /50% ponderado: M1 20 \+ M2 10 \+ M3 20/);
  assert.match(html, /GitHub · live/);
  assert.match(html, /M1.*Análisis invitado de una llamada.*20\/20 pts.*OK/s);
  assert.match(html, /M2.*Publicación comprobada del piloto.*10\/20 pts.*EN PROCESO/s);
  assert.match(html, /M2\.1.*Preparar la versión.*OK/s);
  assert.match(html, /M2\.2.*Configurar acceso seguro.*OK/s);
  assert.match(html, /M2\.3.*Publicar y probar.*EN PROCESO/s);
  assert.match(html, /M2\.4.*Registrar y decidir.*PENDIENTE/s);
  assert.match(html, /M3.*Resultado e informe para invitado.*20\/20 pts.*OK/s);
  assert.match(html, /M4.*PENDIENTE/s);
  assert.match(html, /M5.*PENDIENTE/s);
  assert.match(html, /aria-valuenow="50"/);
});

test('marks the bundled fallback explicitly as stale/no-live', () => {
  const html = renderToStaticMarkup(createElement(RoadmapStatusView, {
    snapshot: FALLBACK_ROADMAP_SNAPSHOT,
    live: false,
  }));

  assert.match(html, /Fallback · stale\/no-live/);
});

test('loads Issue #43 read-only without a browser GitHub token', async () => {
  let calls = 0;
  let capturedUrl = '';
  let capturedInit: RequestInit | undefined;
  const body = [
    ROADMAP_STATUS_START,
    JSON.stringify(FALLBACK_ROADMAP_SNAPSHOT),
    ROADMAP_STATUS_END,
  ].join('\n');

  const fetchImpl: typeof fetch = async (input, init) => {
    calls += 1;
    capturedUrl = String(input);
    capturedInit = init;
    return Response.json({ body });
  };

  const result = await loadRoadmapSnapshot(fetchImpl);
  const headers = new Headers(capturedInit?.headers);

  assert.equal(calls, 1);
  assert.equal(capturedUrl, ROADMAP_MACHINE_ISSUE_URL);
  assert.equal(headers.has('authorization'), false);
  assert.equal(result.live, true);
  assert.equal(result.snapshot.overallPercent, 50);
});

test('returns the visibly stale bundled fallback when GitHub is unavailable', async () => {
  const result = await loadRoadmapSnapshot(async () => new Response(null, { status: 429 }));

  assert.equal(result.live, false);
  assert.equal(result.snapshot, FALLBACK_ROADMAP_SNAPSHOT);
  assert.match(result.error ?? '', /HTTP 429/);
});
