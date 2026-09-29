# Metas de seguimiento y ponderación administrativa — G_INF_01

**Estado:** control administrativo vigente. Complementa el Development Plan y el plan canónico #84; no modifica requisitos, arquitectura ni workflow.

**Base de #91:** `main@7a8808e55574038efa5f14dd5bddbbaead7d1ad5`.

## 1. Regla de porcentaje

Las cinco metas conservan 20 puntos cada una.

Los puntos se derivan del estado canónico de GitHub. Una branch o PR del Implementador no cierra una meta, no modifica por sí sola el porcentaje y no autoriza marcar verificaciones deployed/manual como `PASS`.

El snapshot machine más reciente de Issue #43 para la base de #91 registra:

| Meta | Snapshot machine | Puntos |
|---|---|---:|
| M1 · Análisis invitado de una llamada | OK | 20 / 20 |
| M2 · Publicación comprobada del piloto | OK | 20 / 20 |
| M3 · Resultado e informe para invitado | OK | 20 / 20 |
| M4 · Trabajo persistente y capacidades completas | EN PROCESO | 4 / 20 |
| M5 · Integración del producto completo | PENDIENTE | 0 / 20 |

**Total machine vigente: 64 / 100 = 64%.**

Este porcentaje no se adelanta desde PR #92. El Supervisor debe reconciliar Issues/checklists canónicos después de review/merge y de las verificaciones que correspondan.

## 2. Estado de ingeniería canónico M4

Issue #84 registra:

- M4.1 — completado; V-004 completada mediante #53;
- M4.2 — completado;
- M4.3a-e — completadas;
- servicios base de M4.4 y M4.5a-b — integrados por #89 / PR #90;
- #91 — bloque final activo para M4.3f, M4.4a-c y M4.5c.

### #91 / PR #92

En la branch de #91 están implementados:

- **M4.3f** — integración documental autenticada + UI Documentos;
- **M4.4a** — Resultado + persistencia de análisis;
- **M4.4b** — Informe + persistencia DOCX;
- **M4.4c** — historial / reapertura / Mis informes;
- **M4.5c** — APIs y modelos + aplicación de configuración.

Estas capacidades permanecen **pendientes de revisión/merge** mientras #91 siga abierto. No se contabilizan aquí como puntos administrativos anticipados.

## 3. Estado de ingeniería M5

#91 integra en repositorio:

- **M5.1** — flujo autenticado E2E a nivel de código;
- **M5.2** — workspace/navegación integrada;
- **M5.3** — regresión y resilience;
- **M5.4** — auditoría final de repositorio/documentación.

M5 no se declara cerrada desde la branch del Implementador. El cierre requiere review/merge y las verificaciones reales/finales que el Supervisor determine según VERIFICATION_SPECIFICATION.

## 4. Evidencia y límites

La evidencia automatizada de #91 puede demostrar build, tests, Firestore Rules en emulador, diff-check y conductas deterministas con fakes.

No demuestra automáticamente:

- Firebase/Google/Drive/Picker reales del despliegue actual;
- OAuth revocado en una cuenta real;
- compatibilidad del HEAD actual con AI Studio Publish;
- verificaciones que la especificación reserva para deployed/manual;
- que el SHA de #91 esté publicado.

No se modifican V-IDs deployed/manual a `PASS` sin esa evidencia.

## 5. Continuidad

La nomenclatura canónica de cierre es:

`M4.3f / M4.4a-c / M4.5c / M5.1-4`.

No se crean subdivisiones adicionales sin decisión humana explícita.

Después de #91 sólo quedan verificaciones reales/finales, reconciliación administrativa y cierre de ingeniería, salvo que review descubra un defecto o el Humano cambie el alcance.
