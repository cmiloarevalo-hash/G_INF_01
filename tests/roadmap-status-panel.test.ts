import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { RoadmapStatusPanel } from '../src/components/RoadmapStatusPanel.js';

test('renders the canonical roadmap status and administrative progress', () => {
  const html = renderToStaticMarkup(createElement(RoadmapStatusPanel));

  assert.match(html, /Avance acumulado/);
  assert.match(html, />40%</);
  assert.match(html, /2 metas cerradas de 5/);

  assert.match(html, /M1.*Análisis invitado de una llamada.*OK/s);
  assert.match(html, /M2.*Publicación comprobada del piloto.*EN PROCESO/s);
  assert.match(html, /M2\.1.*Preparar la versión.*EN PROCESO/s);
  assert.match(html, /M2\.2.*Configurar acceso seguro.*PENDIENTE/s);
  assert.match(html, /M2\.3.*Publicar y probar.*PENDIENTE/s);
  assert.match(html, /M2\.4.*Registrar y decidir.*PENDIENTE/s);
  assert.match(html, /M3.*Resultado e informe para invitado.*OK/s);
  assert.match(html, /M3\.1.*OK/s);
  assert.match(html, /M3\.2.*OK/s);
  assert.match(html, /M3\.3.*OK/s);
  assert.match(html, /M3\.4.*OK/s);
  assert.match(html, /M4.*Trabajo persistente y capacidades completas.*PENDIENTE/s);
  assert.match(html, /M5.*Integración del producto completo.*PENDIENTE/s);
});

test('uses the fixed five-meta administrative metric instead of subtask progress', () => {
  const html = renderToStaticMarkup(createElement(RoadmapStatusPanel));

  assert.match(html, /aria-valuenow="40"/);
  assert.match(html, /La métrica suma sólo metas completamente cerradas/);
});
