# Current State

**Corte documental de este REWORK:** la branch `docs/issue-20-m2-1-aistudio-import` fue actualizada sobre `main` `d2325a23232e72599ffecc96a354c41490b5f527` antes de modificar estos documentos.

Ese SHA es la **base previa al merge de PR #21**, no el SHA definitivo de intervención/publicación M2. Al integrar este PR, `main` cambiará; el Supervisor debe volver a leer `main` y registrar el nuevo SHA como `EXPECTED SHA` antes de cualquier intervención dependiente del código en Google AI Studio.

## 1. Estado integrado

### M1 · Análisis invitado de una llamada — INTEGRADA

M1 quedó integrada mediante PR #13, merge commit `be4f0dd274d3e71dd1f4561afce1ae1dcfd701e4`.

La aplicación dispone del flujo invitado con análisis Gemini en una llamada por acción válida, validación del resultado contra `TITLE_STUDY`, manejo de errores, límites de selección y mecanismos de clave temporal/alias definidos para el piloto. La evidencia histórica de M1 sigue asociada a sus SHA de ejecución e integración; no se reutiliza como evidencia de publicación M2.

### M3 · Resultado e informe para invitado — INTEGRADA / CERRADA

M3.1–M3.4 están integradas y Issue #22 quedó cerrado.

Capacidades integradas:

- **Vista web enriquecida de `TITLE_STUDY`:** documentos fuente, hallazgos, referencias legibles, valores originales/normalizados, comparaciones, estados, explicaciones y conclusiones con trazabilidad.
- **Renderer DOCX determinista:** transforma únicamente `TITLE_STUDY` validado; no realiza una nueva llamada LLM ni inventa hechos/conclusiones.
- **Descarga DOCX para invitado:** ruta y acción de descarga integradas.
- **Verificación integrada UI ↔ DOCX:** fixture sintético, coherencia de contenido y generación de DOCX de revisión.

Estado de verificaciones de M3:

- **V-026 — DOCX desde JSON validado:** `PASS`.
- **V-027 — entrada inválida no produce informe válido:** `PASS`.
- **V-028 — presentación del documento:** `PASS`, incluida revisión humana final de M3.4.

### CI — CONFIGURADO

Existe CI persistente en GitHub Actions mediante `.github/workflows/ci.yml`.

Para Pull Requests contra `main`, el workflow ejecuta:

```text
npm ci
npm run build
npm test
git diff --check <base>...<HEAD>
```

El resultado de CI es evidencia automática ligada al SHA; no sustituye la revisión semántica ni la decisión del Supervisor.

### AI_STUDIO_OPERATOR — FALLBACK POR ESCALAMIENTO VERIFICADO

El **Implementador Web / Agente implementador es la ruta técnica normal**. `AI_STUDIO_OPERATOR` no es un canal paralelo ni un revisor rutinario.

Toda intervención AI Studio, incluso read-only, requiere previamente:

1. Work Item explícito;
2. intento de la operación por el Implementador;
3. bloqueo técnico intrínseco persistido con evidencia;
4. verificación independiente del Supervisor;
5. ausencia de una vía razonable en el canal implementador;
6. `AI_STUDIO_REQUEST` explícito para **una sola operación mínima**.

Sólo dentro de ese escalamiento pueden usarse capacidades técnicas como `OBSERVE`, `PREVIEW`, `TEST`, `DIAGNOSE`, `SPIKE_READ_ONLY` o `PLATFORM_MUTATE`. Cada intervención termina en `AI_STUDIO_REPORT` y `STOP → Supervisor`; no existe continuación automática.

`PUBLISH` **no es un modo AI Studio**:

```text
PUBLISH = HUMAN ACTION
```

AI Studio nunca implementa código ni tiene autoridad para editar archivos, aplicar `Fix`, commit, branch, PR, push, merge, cambiar dependencias/schema/prompts/workflow/repository secrets o escribir/sincronizar estado del repositorio.

GitHub sigue siendo la fuente persistente de verdad.

## 2. M2 · Publicación comprobada del piloto — CERRADA

Issue #20 está **CLOSED**. Sus cuatro subtareas canónicas están completadas:

- **M2.1 · Preparar la versión — COMPLETADA**;
- **M2.2 · Configurar acceso seguro — COMPLETADA**;
- **M2.3 · Publicar y probar — COMPLETADA** mediante Issue #37;
- **M2.4 · Registrar y decidir — COMPLETADA**.

**V-036 = PASS** según la decisión formal del Supervisor persistida en Issue #20. La evidencia saneada de publicación pública y servicio operativo quedó registrada allí y en Issue #37.

La aceptación humana de que el hosting no exponga un Git SHA exacto fue tratada como limitación no bloqueante para cerrar M2. Esa decisión **no implica que el `main` actual esté desplegado** ni permite reutilizar evidencia antigua como prueba de un despliegue posterior.

Con M1, M2 y M3 cerradas, el avance administrativo canónico vigente es **60/100 = 60%**.

## 3. M4 · Trabajo persistente y capacidades completas — ACTIVA

Issue #45 abrió M4 con cinco subtareas canónicas. El primer Work Item activo es Issue #46 / M4.1.

### M4.1 · Identidad y sesión Google — IMPLEMENTADA EN REPOSITORIO / V-004 PENDING

La implementación de M4.1 incorpora la base de identidad autenticada mediante Firebase Authentication:

- Firebase Web SDK como dependencia de producción;
- Google Sign-In mediante popup;
- sign-out;
- estado mínimo de sesión con UID estable y nombre/email/foto sólo cuando Firebase los entrega;
- servicio acotado bajo `src/services/auth/**`;
- configuración cliente explícita mediante `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID` y `VITE_FIREBASE_APP_ID`; una configuración build-time completa se usa directamente y, si falta, el cliente puede obtener la misma configuración pública desde `GET /api/firebase-config`, resuelta por el servidor desde su entorno de runtime;
- ausencia/incompletitud tanto en build-time como en runtime, o fallo del endpoint, deshabilita únicamente el modo autenticado y conserva el modo invitado;
- no se persisten manualmente tokens de autenticación ni credenciales LLM;
- no se incorporan Firestore, Drive, Picker ni scopes Drive en M4.1.

El código de repositorio no constituye `V-004 PASS`. Después del merge, la verificación controlada de plataforma debe confirmar proveedor Google habilitado, dominio autorizado, login real, persistencia esperada de sesión, sign-out y guest flow en el despliegue efectivo. Hasta entonces Issue #46 permanece abierto y M4.1 no suma sus 4 puntos administrativos.

### M4.2a · Base de repositorio Firestore — BASE DE REPOSITORIO INTEGRADA / M4.2 PENDIENTE

El primer slice de M4.2 establece la base de persistencia de metadata de proyectos bajo `src/services/firestore/` con rutas `users/{uid}/projects/{projectId}`, reutilizando la misma Firebase App que Authentication. El contrato cubre crear, listar y obtener metadata mínima de proyecto para un UID autenticado y no introduce UI, documentos, análisis, informes ni Drive.

Issue #58 completó únicamente esta base de repositorio. No demuestra aislamiento desplegado ni ciclo persistente real entre sesiones, no completa M4.2 y no aporta puntos administrativos a M4. Firestore todavía requiere Work Items separados para Security Rules, provisión/configuración, UI/ciclo persistente y verificación real. **V-006 y V-007 permanecen PENDING; M4.2 no está completa.**

### M4.2b–M4.2d · Sesión compartida, servicio autenticado y UI de proyectos — INTEGRADOS EN REPOSITORIO / VERIFICACIÓN DESPLEGADA PENDIENTE

Los slices #64, #66 y #68 conectan la sesión Auth compartida con la capa application-facing de proyectos y añaden UI autenticada para crear, listar y reabrir metadata de proyectos. La UI deriva el propietario exclusivamente desde la sesión, usa el servicio autenticado y mantiene estados controlados cuando la sesión o el runtime Firebase no están disponibles.

Este avance sigue siendo evidencia de repositorio/CI: no despliega Firestore, no añade Security Rules y no demuestra persistencia real entre sesiones ni aislamiento cross-user. **V-006 y V-007 permanecen PENDING; M4 permanece 0/20 y M4.2 no está completa.**

## 4. Capacidades futuras no integradas

Continúan fuera del estado integrado actual y requieren Work Items propios:

- completar proyectos/persistencia en Firestore con UI, Security Rules y verificación desplegada;
- Google Drive / Picker y persistencia documental en Drive;
- configuración completa de proveedores/modelos adicionales;
- demás capacidades de M4;
- integración end-to-end completa de M5.

La existencia de botones, documentación o capacidades visibles en Google AI Studio no autoriza su adopción. La ruta técnica normal sigue siendo el Implementador. AI Studio sólo puede intervenir tras `Implementer attempt → intrinsic blocker → Supervisor verification → no reasonable Implementer path → one minimal AI_STUDIO_REQUEST → AI_STUDIO_REPORT → STOP`.

## 5. Resumen de verificación

| Verificación | Estado actual | Evidencia / límite |
|---|---|---|
| V-026 | **PASS** | M3.3/M3.4 integradas |
| V-027 | **PASS** | M3.3/M3.4 integradas |
| V-028 | **PASS** | revisión humana final M3.4 |
| V-036 | **PASS** | Issue #20 cerrado; M2.1–M2.4 completadas y decisión formal del Supervisor persistida |

**Estado operativo:** M1 cerrada; M2 cerrada con V-036 PASS; M3 cerrada; avance administrativo total 60/100 = 60%; M4 activa en 0/20, con M4.1 implementada en repositorio y V-004 PENDING; #58 integró sólo la base de repositorio M4.2a y M4.2 sigue incompleta.
