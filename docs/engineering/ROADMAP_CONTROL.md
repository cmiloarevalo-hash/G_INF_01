# Metas de seguimiento y ponderación administrativa — G_INF_01

**Estado:** control administrativo vigente. Complementa el [Development Plan](DEVELOPMENT_PLAN.md) y la [propuesta V2](DEVELOPMENT_PLAN_PROPOSAL.md); no modifica requisitos, arquitectura ni workflow.

**Base documental de este REWORK:** la branch de PR #21 fue actualizada sobre `main` `d2325a23232e72599ffecc96a354c41490b5f527`. Ese SHA es sólo la base previa al merge de este PR y **no** queda fijado como SHA definitivo de intervención/publicación M2.

## Regla del porcentaje

Las cinco metas conservan **20 puntos cada una (5 × 20 = 100)**.

La métrica administrativa vigente es incremental dentro de cada meta:

- si una meta tiene subtareas canónicas, sus 20 puntos se dividen en partes iguales entre esas subtareas;
- cada subtarea canónica completada aporta su fracción;
- una meta sin subtareas canónicas aporta 20 puntos sólo cuando su Work Item canónico está cerrado;
- estados y puntos se derivan del estado canónico de GitHub, no de mensajes de commit;
- Issue #43 es sólo el snapshot machine generado para la UI; no reemplaza a los Work Items/Issues fuente.

| Meta | Estado canónico actual | Puntos actuales |
|---|---|---:|
| **M1 · Análisis invitado de una llamada** | **CERRADA** — mapping histórico autorizado a Issue #12. | **20 / 20** |
| **M2 · Publicación comprobada del piloto** | **EN CURSO / ACTIVA** — M2.1 y M2.2 completadas; M2.3 en proceso; M2.4 pendiente. V-036 `PENDING`. | **10 / 20** |
| **M3 · Resultado e informe para invitado** | **CERRADA** — M3.1–M3.4 completadas. | **20 / 20** |
| **M4 · Trabajo persistente y capacidades completas** | **EN CURSO / ACTIVA** — Issue #45; M4.1 implementada en repositorio por Issue #46; V-004 desplegada permanece pendiente. | **0 / 20** |
| **M5 · Integración del producto completo** | **PENDIENTE** — sin Work Item canónico activo. | **0 / 20** |

**Total administrativo actual: 50/100 puntos = 50%.**

## M2 · Estado de subtareas

M2 conserva 20 puntos totales. Sus cuatro subtareas canónicas valen 5 puntos cada una.

### M2.1 · Preparar la versión — COMPLETADA

Issue #20 mantiene M2.1 marcada como completada. Aporta **5 puntos**.

### M2.2 · Configurar acceso seguro — COMPLETADA

Issue #34 está cerrado y Issue #20 mantiene M2.2 marcada como completada. Aporta **5 puntos**.

### M2.3 · Publicar y probar — EN PROCESO

Issue #37 es el Work Item canónico abierto. Aporta **0 puntos** hasta cerrarse.

### M2.4 · Registrar y decidir — PENDIENTE

Issue #20 mantiene M2.4 pendiente y no existe un Work Item hijo completado que la cierre. Aporta **0 puntos**.

V-036 permanece `PENDING` hasta la decisión formal correspondiente. El cierre parcial de M2 no convierte la meta completa en `OK`; sólo aporta las fracciones de subtareas cerradas.

## M3 · Cierre

M3 quedó completamente integrada:

- M3.1 — contrato de presentación;
- M3.2 — vista web enriquecida `TITLE_STUDY`;
- M3.3 — renderer y descarga DOCX;
- M3.4 — verificación integrada y revisión humana.

Verificaciones:

- V-026: **PASS**;
- V-027: **PASS**;
- V-028: **PASS**.

## M4 · Estado de subtareas

M4 conserva 20 puntos totales. Sus cinco subtareas canónicas valen 4 puntos cada una.

### M4.1 · Identidad y sesión Google — IMPLEMENTADA EN REPOSITORIO / V-004 PENDING

Issue #46 contiene la implementación de Firebase Authentication / Google Sign-In, sesión mínima y sign-out preservando el modo invitado.

M4.1 permanece **EN PROCESO** y aporta **0 puntos** hasta completar la verificación real desplegada V-004 y cerrar el Work Item. El merge del código por sí solo no equivale a V-004 PASS.

### M4.2–M4.5 — PENDIENTES

- M4.2 · Proyectos persistentes y aislamiento;
- M4.3 · Google Drive y persistencia documental;
- M4.4 · Historial de análisis e informes;
- M4.5 · APIs, modelos y preferencias del modo autenticado.

## Pendientes posteriores

M4 está activa mediante Issue #45; M4.2–M4.5 siguen pendientes. M5 permanece pendiente. Entre las capacidades aún no integradas se incluyen, según sus futuros Work Items:

- Firestore/proyectos persistentes;
- Google Drive/Picker y persistencia documental;
- configuración completa de proveedores/modelos adicionales;
- integración end-to-end del producto completo.

La visibilidad de una capacidad en AI Studio no autoriza su adopción. Las integraciones Google deben seguir el protocolo `SPIKE_READ_ONLY` y, si se decide adoptarlas, pasar por decisión humana + Issue + implementación canónica.

## Estado resumido

```text
M1  CERRADA      20
M2  EN CURSO      10
M3  CERRADA      20
M4  EN CURSO       0
M5  PENDIENTE      0
--------------------
TOTAL             50 / 100
```
