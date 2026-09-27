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
| **M2 · Publicación comprobada del piloto** | **CERRADA** — Issue #20 cerrado; M2.1–M2.4 completadas; V-036 `PASS`. | **20 / 20** |
| **M3 · Resultado e informe para invitado** | **CERRADA** — M3.1–M3.4 completadas. | **20 / 20** |
| **M4 · Trabajo persistente y capacidades completas** | **EN CURSO / ACTIVA** — Issue #45; M4.1 implementada en repositorio por Issue #46; V-004 desplegada permanece pendiente. | **0 / 20** |
| **M5 · Integración del producto completo** | **PENDIENTE** — sin Work Item canónico activo. | **0 / 20** |

**Total administrativo actual: 60/100 puntos = 60%.**

## M2 · Estado de subtareas

M2 está **CERRADA** y conserva 20 puntos totales. Sus cuatro subtareas canónicas valen 5 puntos cada una y están completadas según Issue #20.

### M2.1 · Preparar la versión — COMPLETADA

Issue #20 mantiene M2.1 marcada como completada. Aporta **5 puntos**.

### M2.2 · Configurar acceso seguro — COMPLETADA

Issue #34 está cerrado y Issue #20 mantiene M2.2 marcada como completada. Aporta **5 puntos**.

### M2.3 · Publicar y probar — COMPLETADA

Issue #37 está cerrado y Issue #20 registra M2.3 como completada. Aporta **5 puntos**.

### M2.4 · Registrar y decidir — COMPLETADA

Issue #20 mantiene M2.4 marcada como completada y registra la evidencia/decisión final. Aporta **5 puntos**.

**V-036 = PASS** según la decisión formal del Supervisor persistida en Issue #20. La limitación aceptada sobre no observar un Git SHA exacto en el hosting no revierte ese cierre ni implica que el `main` actual esté desplegado.

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

### M4.2 · Proyectos persistentes y aislamiento — PENDIENTE

Issue #58 completó únicamente el slice **M4.2a · base de repositorio Firestore para proyectos aislados por UID**. Esa base de repositorio no completa M4.2, no aporta puntos administrativos a M4 y no constituye V-006/V-007 PASS.

Siguen pendientes los Work Items necesarios para completar M4.2, incluidas Security Rules, configuración/provisión de Firestore, UI/ciclo persistente y verificación desplegada según el scope que se autorice.

### M4.3–M4.5 — PENDIENTES

- M4.3 · Google Drive y persistencia documental;
- M4.4 · Historial de análisis e informes;
- M4.5 · APIs, modelos y preferencias del modo autenticado.

## Pendientes posteriores

M4 está activa mediante Issue #45 y permanece en **0/20**. M4.1 sigue con V-004 PENDING. M4.2 dispone sólo de la base de repositorio integrada por Issue #58 y sigue incompleta; M4.3–M4.5 siguen pendientes. M5 permanece pendiente.

Entre las capacidades aún no completadas se incluyen, según sus futuros Work Items:

- completar Firestore/proyectos persistentes más allá de la base de repositorio de #58;
- Google Drive/Picker y persistencia documental;
- configuración completa de proveedores/modelos adicionales;
- integración end-to-end del producto completo.

La visibilidad de una capacidad en AI Studio no autoriza su adopción. La ruta técnica normal es el Implementador. AI Studio sólo puede intervenir después de `Implementer attempt → intrinsic blocker → Supervisor verification → no reasonable Implementer path → one minimal AI_STUDIO_REQUEST → AI_STUDIO_REPORT → STOP`; `SPIKE_READ_ONLY` no es una fase rutinaria de investigación.

## Estado resumido

```text
M1  CERRADA      20
M2  CERRADA      20
M3  CERRADA      20
M4  EN CURSO      0
M5  PENDIENTE     0
--------------------
TOTAL             60 / 100
```
