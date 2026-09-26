# Metas de seguimiento y ponderación administrativa — G_INF_01

**Estado:** control administrativo vigente. Complementa el [Development Plan](DEVELOPMENT_PLAN.md) y la [propuesta V2](DEVELOPMENT_PLAN_PROPOSAL.md); no modifica requisitos, arquitectura ni workflow.

**Base documental de este REWORK:** la branch de PR #21 fue actualizada sobre `main` `d2325a23232e72599ffecc96a354c41490b5f527`. Ese SHA es sólo la base previa al merge de este PR y **no** queda fijado como SHA definitivo de intervención/publicación M2.

## Regla del porcentaje

Las cinco metas tienen **20 puntos cada una (5 × 20 = 100)**.

Sólo una meta completamente cerrada, con evidencia registrada en GitHub, suma sus 20 puntos. Un estado `EN CURSO`, `ACTIVA`, `PENDIENTE` o `PAUSADA` suma **0 puntos cerrados**, aunque exista avance técnico real.

| Meta | Condición de cierre | Estado actual | Puntos cerrados |
|---|---|---|---:|
| **M1 · Análisis invitado de una llamada** | Flujo invitado integrado y evidencia funcional/revisión por SHA completadas. | **CERRADA** — integrada mediante PR #13. | **20** |
| **M2 · Publicación comprobada del piloto** | Publicación real del SHA autorizado, URL pública, smoke test real y V-036 decidido con evidencia persistida. | **EN CURSO / ACTIVA** — Issue #20; M2.1 en REWORK documental. V-036 `PENDING`. | **0** |
| **M3 · Resultado e informe para invitado** | Vista web enriquecida + DOCX determinista + coherencia integrada + revisión humana V-028. | **CERRADA** — M3.1–M3.4 integradas; V-026/V-027/V-028 `PASS`. | **20** |
| **M4 · Trabajo persistente y capacidades completas** | Identidad, persistencia de proyectos/documentos e integraciones funcionales según Work Items específicos. | **PENDIENTE**. | **0** |
| **M5 · Integración del producto completo** | Verificación end-to-end del conjunto relevante de capacidades integradas. | **PENDIENTE**. | **0** |

**Total administrativo actual:** **2 metas cerradas = 40/100 puntos**.

El avance parcial de M2 no suma puntos hasta su cierre completo. La ponderación no representa esfuerzo, costo ni duración.

## M2 · Estado de subtareas

### M2.1 · Preparar la versión — EN CURSO

Objetivo vigente: dejar trazable la versión que continuará hacia AI Studio bajo el protocolo `AI_STUDIO_OPERATOR`.

Secuencia obligatoria:

```text
merge PR #21
→ Supervisor relee main
→ registra el nuevo main SHA como EXPECTED SHA en Issue #20
→ AI_STUDIO_REQUEST
→ AI Studio import/sync desde GitHub
→ OBSERVED SHA
→ EXPECTED SHA == OBSERVED SHA
→ PREVIEW / TEST / intervención M2 dependiente del código
→ AI_STUDIO_REPORT
→ evidencia persistida en GitHub
```

Reglas de M2.1:

- el SHA actual de `main` previo a PR #21 **no** se fija como target definitivo de publicación;
- el `EXPECTED SHA` se registra después del merge de PR #21;
- si `EXPECTED SHA != OBSERVED SHA`: `BLOCKED`;
- AI Studio no puede usar `Fix`;
- AI Studio no puede escribir código ni estado del repositorio;
- preview y live preview **no equivalen** a publicación;
- M2.1 no declara V-036 PASS.

### M2.2 · Configurar acceso seguro — PENDIENTE

Requiere Work Item y alcance específico. Mantener Secrets bajo control autorizado y no persistir valores sensibles en GitHub.

### M2.3 · Publicar y probar — PENDIENTE

Debe publicar exclusivamente el SHA autorizado por el Supervisor bajo `AI_STUDIO_REQUEST MODE=PUBLISH`.

Condiciones mínimas:

- SHA Gate satisfecho;
- publicación efectiva;
- URL pública;
- smoke test público real;
- `AI_STUDIO_REPORT` con evidencia no sensible.

### M2.4 · Registrar y decidir — PENDIENTE

Persistir evidencia saneada en GitHub y obtener decisión del Supervisor sobre V-036 y cierre de M2.

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

## Pendientes posteriores

M4 y M5 permanecen pendientes. Entre las capacidades aún no integradas se incluyen, según sus futuros Work Items:

- autenticación Google;
- Firestore/proyectos persistentes;
- Google Drive/Picker y persistencia documental;
- configuración completa de proveedores/modelos adicionales;
- integración end-to-end del producto completo.

La visibilidad de una capacidad en AI Studio no autoriza su adopción. Las integraciones Google deben seguir el protocolo `SPIKE_READ_ONLY` y, si se decide adoptarlas, pasar por decisión humana + Issue + implementación canónica.

## Estado resumido

```text
M1  CERRADA      20
M2  EN CURSO      0
M3  CERRADA      20
M4  PENDIENTE     0
M5  PENDIENTE     0
-------------------
TOTAL             40 / 100
```
