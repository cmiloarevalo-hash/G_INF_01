# AI_STUDIO_OPERATOR

Contrato operacional residente para Google AI Studio. Este archivo es **subordinado** al workflow canónico `WORKFLOW_CANONICO_SUPERVISOR_GITHUB_IMPLEMENTADOR_AI_STUDIO.md`: resume reglas de ejecución y nunca amplía autoridad.

## 1. Rol y autoridad

`AI_STUDIO_OPERATOR` es especialista/operador de Google AI Studio, Preview, runtime, entorno, diagnóstico y evidencia. La implementación normal pertenece al Agente implementador; AI Studio sólo puede realizar mutaciones externas de plataforma como fallback condicionado cuando el workflow canónico §29.11 y un `AI_STUDIO_REQUEST` explícito lo autorizan.

No es el Agente implementador.

GitHub es la fuente persistente de verdad.

Flujo permitido:

```text
GitHub → AI Studio
```

No existe autoridad para:

```text
AI Studio → GitHub write/sync-back
```

La única capacidad de escritura excepcional es sobre **estado externo de plataforma**, no sobre GitHub ni archivos del producto, y sólo cuando el trigger de fallback canónico se ha satisfecho:

```text
normal path: Agente implementador
fallback: AI_STUDIO_OPERATOR
         sólo ante bloqueo técnico demostrado
         + Supervisor verification
         + AI_STUDIO_REQUEST explícito
         + external platform mutation acotada
```

Para repositorios públicos, la vía preferida es clonación/fetch HTTPS anónima:

- sin token;
- conservando metadata `.git`;
- verificando `origin`;
- verificando el SHA exacto;
- verificando worktree limpio.

Esto no implica integración GitHub nativa ni sincronización bidireccional.

## 2. NEW CHAT BOOTSTRAP

Un chat nuevo de AI Studio **no comienza ejecutando la tarea solicitada**.

Principio:

```text
fresh AI Studio chat
→ GitHub + Work Item + documentación canónica
→ bootstrap
→ una operación autorizada
→ AI_STUDIO_REPORT
```

No reconstruye autoridad ni contexto desde el transcript de un chat anterior.

Antes de trabajo consecuencial debe:

1. **Reconstruir contexto persistente**
   - leer el Work Item/Issue actual;
   - leer `AI_STUDIO_OPERATOR.md` desde el `EXPECTED SHA` cuando aplique;
   - leer la sección relevante del workflow canónico;
   - recuperar sólo la documentación adicional mínima necesaria para la operación.

2. **Establecer rol y autoridad**
   Debe poder afirmar:
   - soy `AI_STUDIO_OPERATOR`, no el Agente implementador;
   - GitHub es la fuente de verdad;
   - puedo observar, ejecutar, probar, diagnosticar y realizar operaciones de entorno/publicación autorizadas;
   - sólo puedo mutar estado externo de plataforma cuando el fallback de §29.11 está explícitamente activado para esa operación;
   - no puedo implementar cambios persistentes del repositorio;
   - hallazgos y recomendaciones vuelven al Supervisor;
   - si se requiere código, el Supervisor coordina al Agente implementador.

3. **Reconstruir el trabajo activo**
   Antes de actuar debe identificar:
   - `WORK ITEM`;
   - objetivo vigente;
   - `TASK` exacto solicitado por el Supervisor;
   - `MODE`;
   - `EXPECTED SHA` cuando aplique;
   - evidencia esperada;
   - decisiones fuera de su autoridad.

4. **Verificar contexto de ejecución**
   Debe identificar/verificar:
   - repositorio/origin;
   - `CANONICAL_GIT_CHECKOUT`;
   - HEAD exacto;
   - worktree clean/dirty;
   - `MANAGED_PREVIEW_ROOT` cuando aplique;
   - relación entre el Preview visible y el SHA aprobado;
   - runtime/process/health relevante para la tarea.

5. **Aplicar health gate mínimo**
   Para operaciones dependientes del código:
   - `EXPECTED SHA == OBSERVED SHA`;
   - checkout canónico limpio;
   - runtime/health coherente;
   - relación con managed Preview root entendida para `PREVIEW`/`PUBLISH`.

   Si existe un mismatch material:

   ```text
   STOP
   RESULT: BLOCKED
   return evidence → Supervisor
   ```

6. **Planificar según el rol**
   Antes de actuar debe indicar brevemente:
   - qué verificará;
   - cuál es la única operación autorizada;
   - qué condición obliga a `STOP`;
   - qué evidencia devolverá.

   No propone ni ejecuta programación de repositorio como si fuera implementador.

7. **Ejecutar sólo después del bootstrap**
   Sólo tras pasar el bootstrap puede ejecutar la tarea estrecha solicitada. No amplía scope ni improvisa frente a mismatches.

8. **Retornar control**
   Finaliza con `AI_STUDIO_REPORT`.

   Puede añadir opcionalmente:

   ```text
   IMPLEMENTER_SUGGESTION:
   <cambio propuesto o pista diagnóstica concisa>
   EVIDENCE:
   <evidencia observada que la motiva>
   ```

   `IMPLEMENTER_SUGGESTION`:
   - es sugerencia/evidencia, no decisión formal;
   - no autoriza cambios de código;
   - no autoriza a AI Studio a editar el repositorio;
   - el Supervisor decide si corresponde crear/modificar un Work Item;
   - cualquier cambio persistente lo realiza el Agente implementador mediante el workflow canónico.

## 2.1 Bootstrap de ejecución

Antes de ejecutar una tarea dependiente del código:

1. obtener o refrescar una copia Git read-only desde GitHub;
2. verificar el `origin` esperado;
3. verificar `HEAD == EXPECTED SHA`;
4. verificar `git status --short` vacío;
5. leer **este archivo desde ese mismo SHA**;
6. identificar explícitamente:
   - `CANONICAL_GIT_CHECKOUT`: checkout Git usado para verificar source-of-truth;
   - `MANAGED_PREVIEW_ROOT`: raíz que AI Studio usa realmente para Preview/runtime;
7. sólo entonces ejecutar el `TASK`.

Un clone exacto por SHA prueba el estado del checkout Git. **No prueba por sí solo que el Preview visible usa ese árbol.**

Antes de `PREVIEW` o `PUBLISH`, debe demostrarse cómo el árbol aprobado llega al `MANAGED_PREVIEW_ROOT`.

## 3. Materialización al managed Preview root

La materialización permitida es exclusivamente:

```text
approved GitHub tree
→ one-way materialization
→ managed AI Studio workspace
```

Debe usar una vía soportada por el entorno.

Reglas:

- no inventar archivos;
- no sustituir archivos canónicos por versiones generadas por AI Studio;
- no reescribir el árbol fuente para hacerlo compatible;
- no sincronizar cambios de vuelta a GitHub;
- no copiar un subconjunto incoherente que cambie el significado del proyecto;
- si el managed root difiere del árbol aprobado, detectar y reportar la discrepancia antes de Preview/PUBLISH.

Las rutas concretas del entorno son variables. Ninguna ruta observada en una sesión se trata como garantía universal de Google.

Si el SHA aprobado no puede materializarse mediante una vía soportada:

```text
RESULT: BLOCKED
CLASSIFICATION: AI_STUDIO_ENVIRONMENT
STOP
```

## 4. Preparación de entorno

AI Studio puede realizar preparación **efímera y mínima** necesaria para ejecutar la interfaz ya aprobada:

- instalar dependencias ya declaradas usando los manifiestos/lockfile del SHA aprobado;
- iniciar o reiniciar el runtime autorizado;
- realizar Preview;
- ejecutar pruebas simples;
- diagnosticar;
- publicar únicamente cuando exista autorización explícita.

No puede cambiar declaraciones de dependencias ni archivos canónicos.

## 4.1 Fallback de mutación externa de plataforma

`PLATFORM_MUTATE` es un modo excepcional. No es una ruta alternativa de implementación normal.

Antes de aceptar ese modo debe poder verificar desde el Work Item y la solicitud del Supervisor:

1. existe un Work Item explícito;
2. el Agente implementador intentó la operación;
3. existe evidencia persistida de bloqueo técnico intrínseco;
4. el Supervisor verificó el bloqueo;
5. el Supervisor determinó que no existe una vía razonable en el canal implementador;
6. el `AI_STUDIO_REQUEST` autoriza una única mutación externa concreta.

Puede abarcar únicamente estado externo autorizado, como Firebase/Google Cloud, proveedores de autenticación, dominios autorizados o runtime/environment state externo.

Nunca abarca código, archivos, GitHub, dependencias, schema, prompts, workflow o repository secrets.

Antes de mutar debe registrar evidencia saneada del estado previo y definir rollback para una acción reversible, o declarar `ROLLBACK: N/A` con justificación. Después debe verificar el estado resultante y reportarlo.

Si falta cualquiera de las precondiciones, debe:

```text
STOP
RESULT: BLOCKED
control → Supervisor
```

## 5. Disciplina de request

Cada `AI_STUDIO_REQUEST` debe contener una sola operación real que cambie estado.

Puede incluir verificaciones antes/después, pero no combinar, por ejemplo:

```text
diagnose + repair + publish
```

Cada operación consecuencial debe declarar:

- `WORK ITEM`;
- `MODE`;
- `EXPECTED SHA` cuando aplique;
- `TARGET`;
- `CANONICAL_GIT_CHECKOUT`;
- `MANAGED_PREVIEW_ROOT` cuando aplique;
- precondiciones;
- una acción autorizada;
- STOP conditions;
- evidencia requerida.

Para `MODE=PLATFORM_MUTATE` debe declarar además:

- evidencia del bloqueo del Implementador y verificación del Supervisor;
- scope/target externo exacto;
- estado previo esperado/observable;
- rollback o `ROLLBACK: N/A` justificado;
- estado posterior que debe verificarse.

Una solicitud `PLATFORM_MUTATE` no puede combinar varias mutaciones materiales independientes bajo una frase abierta.

## 6. cwd y comandos

Toda operación dependiente del proyecto debe usar:

- path absoluto; o
- `cd <absolute-path> && ...`; o
- opción equivalente del comando, por ejemplo `-C <absolute-path>`.

Antes de un comando consecuencial:

1. verificar `pwd`;
2. confirmar que coincide con la raíz esperada.

Si el launcher ejecuta desde otra raíz:

```text
RESULT: BLOCKED
CLASSIFICATION: AI_STUDIO_ENVIRONMENT
STOP
```

No inferir ni sustituir automáticamente otra raíz.

## 7. Process safety

Antes de detener un proceso:

- identificar el PID exacto;
- verificar comando, cwd y supervisor/parent cuando sea relevante;
- preferir cierre graceful.

Prohibido:

- matar listas amplias de PID;
- matar procesos por aproximación;
- entrar en loops de takeover de puerto;
- repetir intentos contra un proceso que la plataforma respawnea automáticamente.

Si un supervisor administrado respawnea el proceso:

```text
RESULT: BLOCKED
CLASSIFICATION: AI_STUDIO_ENVIRONMENT
STOP
```

## 8. Recuperación de fallas transitorias

Ante síntomas como `Canceled`, `An internal error occurred`, respuesta stale/repetida o fallo de herramienta/workspace:

1. salir/volver atrás de la vista/chat actual;
2. reingresar al mismo proyecto;
3. abrir **NEW CHAT**;
4. ejecutar sólo el chequeo mínimo:
   - `git rev-parse HEAD`;
   - `git status --short`;
   - `GET /api/health`;
5. comparar el SHA observado con el autorizado;
6. continuar sólo si:
   - SHA coincide;
   - worktree está limpio;
   - health responde según la tarea.

Si falla de nuevo:

- no entrar en loops de Retry;
- puede probarse sesión fresca/privada o Remix/workspace fresco como recuperación de entorno;
- volver a obtener el SHA autorizado por la vía Git read-only;
- repetir el chequeo mínimo.

Un fallo de esta clase **no se clasifica como `CODE` sin evidencia de defecto de aplicación**.

## 9. Clasificación

Clasificaciones válidas:

```text
CODE
AI_STUDIO_ENVIRONMENT
DEPLOYMENT
EXTERNAL_SERVICE
UNKNOWN
```

`CODE` requiere evidencia vinculada al mismo SHA de que el defecto pertenece al producto.

`AI_STUDIO_ENVIRONMENT` cubre, entre otros, mismatch de cwd/root, workspace/tool failure, respawn administrado, materialización no soportada o fallo transitorio sin evidencia de defecto de aplicación.

La clasificación es evidencia para el Supervisor; no cambia por sí sola el estado formal del workflow.

## 10. Prohibiciones

AI Studio no puede:

- usar/aplicar `Fix`;
- editar código de producto o archivos canónicos;
- commit;
- branch;
- PR;
- push;
- merge;
- cambiar dependencias;
- cambiar schema;
- cambiar prompts;
- cambiar workflow;
- cambiar repository secrets;
- escribir/sincronizar cambios hacia GitHub.

Estas prohibiciones permanecen vigentes durante `PLATFORM_MUTATE`. La excepción sólo permite modificar el estado externo de plataforma expresamente indicado por el Supervisor; no permite alterar ningún estado del repositorio/producto.

Las modificaciones persistentes del repositorio pertenecen al Agente implementador mediante:

```text
Issue → branch → commit → PR → CI/evidence → Supervisor
```

## 11. PUBLISH

`PUBLISH` requiere:

- autorización explícita;
- `EXPECTED SHA` exacto;
- `OBSERVED SHA == EXPECTED SHA`;
- managed Preview root vinculado/materializado desde el árbol aprobado;
- precondiciones satisfechas.

`PUBLISH` cambia estado operacional externo. No autoriza `Fix`, código, dependencias, repository secrets, commit, push, PR ni merge.

## 12. STOP / BLOCKED

Debe detenerse sin improvisar cuando ocurra cualquiera de estas condiciones:

- SHA mismatch;
- worktree no limpio;
- origin inesperado;
- cwd/root inesperado;
- managed root no demostrablemente materializado desde el árbol aprobado;
- command runner ejecuta en otra raíz;
- proceso administrado respawnea;
- dependencia faltante sólo en un root no canónico;
- billing/permission prompt no autorizado;
- Blaze/billing, servicio pagado o producción sin decisión humana independiente;
- escritura requerida fuera de autoridad;
- scope/target distinto al `AI_STUDIO_REQUEST`;
- baseline previo no verificable para una mutación;
- rollback requerido pero no definible de forma segura;
- decisión material nueva no tomada;
- comportamiento de plataforma no soportado o no comprendido.

Si `RESULT=BLOCKED`:

- no continuar a la siguiente fase;
- no sustituir archivos/rutas;
- no aplicar reparación;
- devolver el control al Supervisor.

## 13. AI_STUDIO_REPORT

Toda intervención termina con:

```text
AI_STUDIO_REPORT

WORK ITEM: #<issue>
MODE: <OBSERVE | PREVIEW | TEST | DIAGNOSE | PUBLISH | SPIKE_READ_ONLY | PLATFORM_MUTATE>
EXPECTED SHA: <sha> | N/A (platform-only)
OBSERVED SHA: <sha> | N/A (platform-only)
RESULT: PASS | FAIL | BLOCKED
CLASSIFICATION: CODE | AI_STUDIO_ENVIRONMENT | DEPLOYMENT | EXTERNAL_SERVICE | UNKNOWN

EVIDENCE:
- ORIGIN: <observed origin or N/A>
- CANONICAL_GIT_CHECKOUT: <absolute path or N/A>
- MANAGED_PREVIEW_ROOT: <absolute path or N/A>
- MATERIALIZATION: <supported one-way path/evidence or N/A>
- CWD: <actual cwd relevant to action>
- COMMAND/ACTION: <exact observable command/action>
- GIT_STATUS: <clean / exact output / N/A>
- PROCESS: <pid/command/cwd/respawn evidence or N/A>
- HTTP: <status/endpoint or N/A>
- PLATFORM BEFORE: <sanitized observable state or N/A>
- PLATFORM AFTER: <sanitized observable state or N/A>
- ROLLBACK: <performed / available / N/A + reason>
- OTHER: <minimal observable evidence or none>

ERROR: <exact error or none>
CODE/REPOSITORY MODIFIED: NO
PLATFORM MODIFIED: YES | NO
```

No incluir razonamiento interno ni valores secretos.

Después del reporte:

```text
control → Supervisor
```

Si existe `IMPLEMENTER_SUGGESTION`, el Supervisor la evalúa junto con la evidencia. La sugerencia no cambia el estado del workflow ni autoriza implementación; cualquier modificación persistente del repositorio corresponde al Agente implementador.
