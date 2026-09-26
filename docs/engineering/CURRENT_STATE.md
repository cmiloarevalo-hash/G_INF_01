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

### AI_STUDIO_OPERATOR — INTEGRADO

El workflow canónico integra `AI_STUDIO_OPERATOR` como operador externo de Google AI Studio.

Puede operar sólo en modos autorizados:

```text
OBSERVE
PREVIEW
TEST
DIAGNOSE
PUBLISH
SPIKE_READ_ONLY
```

No es el Agente implementador y no tiene autoridad para:

- editar código/archivos;
- aplicar `Fix`;
- commit, branch, PR, push o merge;
- cambiar dependencias, schema, prompts, workflow o repository secrets.

GitHub sigue siendo la fuente persistente de verdad. La evidencia útil de AI Studio vuelve al Supervisor mediante `AI_STUDIO_REPORT` y debe persistirse en GitHub.

## 2. M2 · Publicación comprobada del piloto — ACTIVA

Issue #20 está activo. **V-036 permanece `PENDING`**: no existe todavía evidencia de publicación pública válida ni smoke test público real correspondiente al SHA que finalmente se seleccione.

### M2.1 · Preparar la versión — EN CURSO

PR #21 mantiene el objetivo documental de preparar una versión trazable para AI Studio.

Secuencia vigente después de integrar este PR:

```text
merge PR #21
→ Supervisor vuelve a leer main
→ registra el nuevo main SHA en Issue #20 como EXPECTED SHA
→ emite AI_STUDIO_REQUEST
→ AI Studio import/sync desde GitHub
→ registra OBSERVED SHA
→ EXPECTED SHA == OBSERVED SHA
→ sólo entonces PREVIEW / TEST / intervención M2 dependiente del código
→ AI_STUDIO_REPORT
→ evidencia persistida en Issue #20 / PR correspondiente
```

Reglas:

1. **No existe aún SHA definitivo de publicación.** El `main` previo a PR #21 no debe fijarse como target final.
2. El SHA definitivo para la siguiente intervención M2 se selecciona **después del merge de PR #21**, leyendo nuevamente el HEAD real de `main`.
3. Para operaciones dependientes del código, `EXPECTED SHA` debe coincidir literalmente con `OBSERVED SHA`. Si no coincide: `BLOCKED`.
4. AI Studio puede importar/sincronizar desde GitHub para observar, ejecutar o publicar el SHA autorizado, pero no puede escribir código ni estado del repositorio.
5. `Fix` está prohibido.
6. Toda intervención termina con `AI_STUDIO_REPORT`; el control vuelve al Supervisor.
7. **Live preview no equivale a publicación pública.**
8. M2.1 no declara `V-036 PASS`.

### M2.2–M2.4 — PENDIENTES

- **M2.2 · Configurar acceso seguro:** pendiente de Work Item/scope específico. No registrar valores de Secrets en GitHub.
- **M2.3 · Publicar y probar:** pendiente. Debe usar el SHA autorizado por el Supervisor y producir una URL pública efectiva distinta del preview.
- **M2.4 · Registrar y decidir:** pendiente. Debe persistir evidencia saneada y decisión del Supervisor.

### Condición de V-036

`V-036` sólo puede pasar con evidencia desplegada real, incluyendo como mínimo:

- SHA autorizado e identificado;
- entorno/publicación correspondiente;
- **URL pública efectiva**;
- acceso real al cliente publicado;
- smoke test público de las rutas/funciones exigidas por el Work Item;
- evidencia persistida en GitHub.

Un preview, una URL privada, un 404/302 o una comprobación exclusivamente local **no** constituyen `V-036 PASS`.

## 3. Capacidades futuras no integradas

Continúan fuera del estado integrado actual y requieren Work Items propios:

- autenticación Google y sesiones persistentes;
- proyectos/persistencia en Firestore;
- Google Drive / Picker y persistencia documental en Drive;
- configuración completa de proveedores/modelos adicionales;
- demás capacidades de M4;
- integración end-to-end completa de M5.

La existencia de botones, documentación o capacidades visibles en Google AI Studio no autoriza su adopción. Para integraciones Google aplica `SPIKE_READ_ONLY → Supervisor review → Human decision → Issue → implementación canónica`.

## 4. Resumen de verificación

| Verificación | Estado actual | Evidencia / límite |
|---|---|---|
| V-026 | **PASS** | M3.3/M3.4 integradas |
| V-027 | **PASS** | M3.3/M3.4 integradas |
| V-028 | **PASS** | revisión humana final M3.4 |
| V-036 | **PENDING** | falta publicación pública + smoke test real del SHA M2 autorizado |

**Estado operativo:** M1 integrada; M3 cerrada; CI y AI_STUDIO_OPERATOR integrados; M2 activa; V-036 pendiente.
