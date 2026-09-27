# Workflow canónico — Supervisor + GitHub + Agente implementador + AI_STUDIO_OPERATOR

> **Estado de esta versión:** propuesta completa de reemplazo. No sustituye el workflow vigente hasta revisión del Supervisor y merge autorizado.
>
> **Fuente normativa base:** `WORKFLOW_SIMPLIFICADO_CHAT_WEB_GPT_GEMINI_3_8.md` en `main@ff1a7d46c3f9992adbcc41b933cc13c3501fc617`.
>
> **Regla de migración:** la fuente base se conserva íntegramente en contenido operativo salvo el cambio nominal solicitado de “workflow simplificado” a “workflow canónico”; las ampliaciones se añaden sin eliminar reglas, ejemplos, gates, estados, protocolos, recovery, bootstrap, CI, merge, REWORK, SHA Gate, process safety ni reglas AI Studio.

## Estado de integración respecto de la fuente base

### Reglas ya integradas en la fuente base

Ya estaban integradas antes de esta propuesta y se preservan:

- autoridad de merge del Supervisor;
- GitHub Actions / CI persistente;
- `AI_STUDIO_OPERATOR`;
- SHA Gate;
- NEW CHAT bootstrap de AI Studio;
- `CANONICAL_GIT_CHECKOUT`;
- `MANAGED_PREVIEW_ROOT`;
- materialización one-way;
- disciplina de `cwd`;
- process safety;
- recovery;
- clasificación de fallos;
- protocolo `PUBLISH`;
- `SPIKE_READ_ONLY`;
- `AI_STUDIO_REPORT`;
- prohibición de escritura de producto/repositorio por AI Studio.

### Reglas operativas vigentes pendientes de integración canónica en la fuente base

A la fecha del baseline:

- **Issue #35 está OPEN.** Su decisión humana hace operativos `RESEARCH_GATE` y `STRATEGIC_RATIONALE` mientras la integración canónica sigue pendiente. Esta propuesta los incorpora en §31 sin afirmar que el Issue ya estuviera integrado o cerrado.
- **Issue #39 está OPEN.** Su decisión humana hace operativas `TECHNICAL PERMISSION != WORKFLOW AUTHORITY` y `AI_STUDIO_ALLOWED_REPOSITORY_WRITES = NONE` mientras la integración canónica sigue pendiente. El PR #40 fue cerrado sin merge y no constituye integración canónica. Esta propuesta incorpora esas reglas en §32 sin afirmar que el Issue ya estuviera integrado o cerrado.

### Reglas propuestas para Issue #47, todavía no canónicas

Esta propuesta añade:

- separación estricta Supervisor / Agente implementador;
- política explícita de invocación de AI Studio;
- `DEFERRED VERIFICATION`;
- `HUMAN_EXCEPTION / WAIVER`;
- `Repository state != Preview state != Published state`;
- protocolo reforzado `NEW CHAT Supervisor`.

Estas formulaciones pertenecen al candidato de Issue #47. Salvo una decisión humana independiente y persistida que les otorgue efecto operativo antes del merge, **no deben tratarse como reglas ya canónicas ni como autoridad ya integrada**. Adquieren autoridad canónica sólo después de revisión independiente y merge autorizado.

No cambian silenciosamente la autoridad ya asignada: el Humano conserva decisiones excepcionales, de producto, cambios materiales de scope, permisos, credenciales y trade-offs importantes; el Supervisor delimita, coordina, revisa y decide dentro de la autoridad ya existente; el Agente implementador implementa por branch/commit/PR; AI Studio continúa subordinado y sin autoridad de escritura de repositorio.


## 1. Objetivo

Este workflow organiza el trabajo colaborativo entre:

- **Chat Web GPT**: planificación, arquitectura, definición de tareas y revisión.
- **Agente implementador**: implementación y escritura técnica mediante Codespaces/terminal u otro canal de implementación expresamente autorizado.
- **AI_STUDIO_OPERATOR**: Google AI Studio web para operación externa read/test/publish, sin escritura de código ni repositorio.
- **GitHub**: memoria persistente, tareas, código, evidencia y coordinación.
- **Humano**: intención del producto, prioridades, permisos y decisiones excepcionales.

No utiliza GoFlow ni una mini aplicación auxiliar.

La idea principal es:

```text
Chat Web GPT
    ↓ define trabajo
GitHub Issue
    ↓
Agente implementador
    ↓ implementa + verifica
GitHub Branch / Commit / PR
    ↓
Chat Web GPT
    ↓ revisión
ACCEPT / REWORK / ESCALATE
```

GitHub reemplaza el chat como memoria compartida.

---

# 2. Principio fundamental

> **Las conversaciones son temporales. GitHub y los documentos del proyecto son persistentes.**

Ni Chat Web GPT ni Agente implementador deben depender de recordar conversaciones anteriores.

Una sesión nueva debe poder reconstruir el trabajo con:

```text
Repositorio
+ Issue
+ branch / PR
+ documentación técnica
```

No necesita recibir todo el transcript anterior.

---

# 3. Responsabilidades

## 3.1 Chat Web GPT

Es el **Supervisor técnico**.

Responsabilidades:

- entender la intención del humano;
- estudiar el proyecto completo cuando sea necesario;
- razonar sobre arquitectura;
- identificar impacto;
- dividir trabajo en tareas pequeñas;
- crear o definir el Work Item;
- indicar documentación relevante;
- revisar PR, diff y evidencia;
- detectar cambios fuera de alcance;
- detectar sobreingeniería;
- solicitar REWORK;
- aceptar semánticamente el cambio.

No implementa normalmente el código de la tarea que posteriormente revisará.

Su foco es:

```text
pensar
planificar
delimitar
revisar
decidir
```

---

# 4. Agente implementador

Es el **desarrollador** del workflow canónico. Implementa mediante Codespaces/terminal u otro canal de implementación expresamente autorizado; conserva las responsabilidades de branch, commit y PR definidas en esta sección.

No es `AI_STUDIO_OPERATOR` y Google AI Studio web no ejerce el rol implementador bajo este protocolo.

Responsabilidades:

- leer el Issue;
- recuperar únicamente el contexto necesario;
- revisar la documentación relevante;
- comprobar el estado del repositorio;
- crear o utilizar la branch indicada;
- implementar únicamente el alcance autorizado;
- ejecutar las pruebas correspondientes;
- revisar su propio diff;
- commit;
- push;
- abrir o actualizar PR;
- informar resultados.

Su foco es:

```text
leer contexto acotado
implementar
probar
revisar diff
publicar evidencia
```

No debe:

- redefinir arquitectura por iniciativa propia;
- ampliar el alcance silenciosamente;
- corregir problemas no relacionados;
- declarar su propio trabajo aprobado;
- hacer merge sólo porque los tests pasaron.

---

# 5. GitHub

GitHub es el centro del sistema.

Guarda:

```text
Issue
→ intención concreta y alcance

Branch
→ trabajo aislado

Commit
→ estado exacto del código

Pull Request
→ propuesta de integración

Diff
→ evidencia del cambio

CI
→ evidencia automatizada, cuando exista

Comentarios de review
→ REWORK / aceptación / decisiones

Git history
→ historial
```

Regla:

> **Lo dicho por un modelo es un reporte. El repositorio es la evidencia.**

---

# 6. Documentación del proyecto

El workflow canónico utiliza la documentación normal del producto:

```text
README.md

docs/engineering/
├── SOFTWARE_REQUIREMENTS_SPECIFICATION.md
├── SOFTWARE_ARCHITECTURE.md
├── TECHNICAL_SPECIFICATION.md
├── VERIFICATION_SPECIFICATION.md
└── adr/
```

El workflow no se copia dentro de esos documentos.

La documentación describe la aplicación.

El workflow describe cómo trabajan las personas y modelos sobre ella.

---

# 7. Unidad de trabajo: GitHub Issue

Cada tarea suficientemente importante debe existir como un Issue.

Formato simplificado:

```markdown
## Objective

Qué debe conseguir esta tarea.

## Acceptance Criteria

Qué condiciones deben cumplirse.

## Authorized Scope

Qué archivos o módulos puede modificar.

## Relevant Sources

Qué documentación debe leer.

## Verification

Qué pruebas o comprobaciones debe realizar.

## Base

Branch o commit desde el que comienza el trabajo.
```

No necesitamos la gramática rígida utilizada por GoFlow.

Pero sí necesitamos que estas seis partes sean claras.

---

# 8. Dos tipos de scope

Aunque no exista GoFlow, seguimos utilizando dos límites.

## Semantic Scope

Proviene de:

```text
Objective
+
Acceptance Criteria
```

Define:

> qué comportamiento está autorizado a cambiar.

## Path Scope

Proviene de:

```text
Authorized Scope
```

Define:

> qué archivos o módulos puede modificar.

Para que un cambio sea válido debe cumplir ambos.

Ejemplo:

```text
Authorized Scope:
src/auth/**
```

no significa:

```text
puede cambiar cualquier regla de autenticación.
```

El comportamiento también debe estar autorizado por Objective y Acceptance Criteria.

---

# 9. Flujo completo

## Fase A — intención

El humano explica qué quiere conseguir.

```text
Humano
↓
Chat Web GPT
```

Chat Web GPT analiza:

- objetivo;
- arquitectura;
- módulos afectados;
- riesgos;
- alcance;
- verificación necesaria.

---

## Fase B — creación del Work Item

Chat Web GPT prepara el Issue.

Debe ser suficientemente pequeño para que el Agente implementador pueda ejecutarlo sin reconstruir todo el proyecto.

Idealmente:

```text
1 Issue
→ 1 objetivo
→ 1 branch
→ 1 PR
```

Es un default, no una obligación absoluta.

---

# 10. Inicio del Agente implementador

El mensaje inicial puede ser extremadamente corto:

```text
Repositorio: <owner/repo>
Work Item: #123

Ejecuta la tarea según el Issue y la documentación canónica.
No amplíes el alcance.
Publica el PR y la evidencia cuando esté listo para revisión.
```

El prompt no transporta la especificación completa.

---

# 11. Bootstrap del Agente implementador

Antes de modificar código debe responder internamente estas preguntas:

1. ¿Cuál es el objetivo del Issue?
2. ¿Cuáles son los Acceptance Criteria?
3. ¿Qué comportamiento está autorizado a cambiar?
4. ¿Qué rutas están autorizadas?
5. ¿Qué documentos debo leer?
6. ¿Qué módulo es responsable de este comportamiento?
7. ¿Qué interfaces podría afectar?
8. ¿Qué pruebas debo ejecutar?
9. ¿Cuál es la branch/base correcta?
10. ¿Existen cambios previos que no pertenecen a esta tarea?

Si no puede responder una pregunta material, debe detenerse y pedir aclaración.

Antes de escribir debe asumir además esta regla de autoridad:

> **Su función es implementar, no gobernar el proyecto.**
>
> Puede tomar decisiones locales necesarias para cumplir el Issue dentro de Objective, Acceptance Criteria, Semantic Scope, Path Scope y arquitectura vigentes.
>
> No puede redefinir arquitectura, ampliar scope, cambiar intención del producto, adoptar integraciones no autorizadas, modificar workflow o autoridad, ni convertir una propuesta en decisión aprobada.
>
> Ante una decisión técnica material no determinada, debe presentar la propuesta y devolver control al Supervisor cuando la elección requiera autorización.
>
> Ante cambio material de arquitectura, scope, permisos, credenciales, costes, integración o excepción, debe detenerse: corresponde Supervisor → `ESCALATE` → decisión humana.
>
> Tests y CI son evidencia, no aprobación. No se autoaprueba ni hace merge.

---

# 12. Política de lectura

Agente implementador no debe leer todo el repositorio automáticamente.

Orden recomendado:

```text
Issue
↓
README si necesita orientación
↓
secciones relevantes de SRS
↓
Architecture del módulo
↓
Technical Specification pertinente
↓
Verification Plan pertinente
↓
código y tests afectados
```

Sólo amplía contexto cuando encuentra una dependencia real.

---

# 13. Implementación

Durante la implementación:

- modificar únicamente lo necesario;
- mantener comportamiento no relacionado;
- no realizar refactors oportunistas;
- no introducir frameworks o dependencias sin necesidad;
- no crear infraestructura futura;
- respetar contratos existentes;
- mantener el cambio fácil de revisar.

Para prototipos:

> **La solución más simple que cumple correctamente el requisito normalmente es preferible.**

---

# 14. Problemas descubiertos durante el trabajo

Si el Agente implementador encuentra otro problema:

```text
Problema relacionado directamente
→ puede corregirse si está dentro del scope.

Problema no relacionado
→ se reporta.

Problema que requiere ampliar scope
→ se detiene y solicita decisión.
```

No debe existir:

```text
“Ya que estoy aquí también arreglé…”
```

---

# 15. Verificación local

Antes de publicar:

```text
implementar
↓
ejecutar tests relevantes
↓
corregir
↓
volver a ejecutar
↓
revisar diff completo
```

Debe comprobar:

- tests;
- archivos cambiados;
- archivos nuevos;
- cambios accidentales;
- contratos afectados;
- documentación que realmente deba cambiar.

---

# 16. Publicación

Cuando el cambio esté listo:

```text
commit
↓
push
↓
PR
```

El PR debe permitir identificar:

```text
Issue
branch
commit SHA
qué cambió
qué pruebas se ejecutaron
limitaciones conocidas
```

---

# 17. Handoff del Agente implementador

El mensaje final debe ser breve.

Ejemplo:

```text
WORK ITEM: #123
PR: #145
COMMIT: abc1234
VERIFICATION: PASS
CI: PASS / NOT CONFIGURED / PENDING
STATE: READY_FOR_REVIEW
UNEXPECTED FINDING: none
```

No necesita escribir una explicación extensa de todo el desarrollo.

Chat Web GPT puede reconstruir el detalle desde GitHub.

---

# 18. Revisión de Chat Web GPT

Chat Web GPT no debe aceptar simplemente porque el Agente implementador diga que terminó.

Debe revisar independientemente:

- Issue;
- Objective;
- Acceptance Criteria;
- diff;
- archivos cambiados;
- arquitectura;
- interfaces;
- dependencias;
- tests;
- documentación;
- PR;
- SHA;
- CI cuando exista.

Y responder una de estas decisiones:

```text
SEMANTIC_ACCEPTED
REWORK
HOLD
ESCALATE
```

---

# 19. Significado de las decisiones

## SEMANTIC_ACCEPTED

El cambio satisface la intención del Work Item para el SHA revisado.

No significa automáticamente merge.

## REWORK

Existe una corrección necesaria dentro del mismo objetivo.

Normalmente continúa:

```text
mismo Issue
misma branch
mismo PR
```

## HOLD

Existe un impedimento objetivo que no puede resolverse actualmente.

Ejemplo:

```text
dependencia externa caída
credencial técnica no disponible
conflicto que impide continuar
```

## ESCALATE

Se requiere una decisión humana.

Ejemplos:

```text
cambio de alcance
decisión de producto
permiso
credencial
trade-off material
excepción importante
```

---

# 20. REWORK

Chat Web GPT debe escribir en el PR:

```text
Problema observado:
...

Resultado requerido:
...

Evidencia:
...

Scope:
permanece / cambia
```

Agente implementador:

```text
lee comentario
↓
corrige
↓
verifica
↓
nuevo commit
↓
push
↓
nuevo handoff
```

Un nuevo commit invalida cualquier aceptación anterior correspondiente a otro SHA.

---

# 21. Decisión vigente

Cuando existan varios comentarios antiguos:

> **La decisión vigente es la última decisión de Chat Web GPT asociada explícitamente al HEAD actual.**

Ejemplo:

```text
SHA A → REWORK
SHA B → REWORK
SHA C → SEMANTIC_ACCEPTED
SHA D → nuevo commit
```

La aceptación de C no autoriza D.

D debe revisarse nuevamente.

---

# 22. CI

El proyecto adopta **GitHub Actions como CI mínimo persistente** mediante Issue #26. El workflow canónico está en:

```text
.github/workflows/ci.yml
```

Su objetivo es producir evidencia mecánica reproducible asociada al SHA verificado. Ejecuta los comandos canónicos del repositorio:

```text
npm ci
npm run build
npm test
git diff --check <base>...<HEAD>
```

El workflow se ejecuta automáticamente para Pull Requests cuyo target es `main`. Para PR, la verificación debe corresponder al **HEAD exacto del PR** y usar como base la revisión de `main` indicada por el evento.

También define `workflow_dispatch` para verificación manual por `ref`/SHA y base de comparación, con `main` como base por defecto. GitHub sólo permite recibir `workflow_dispatch` cuando el archivo de workflow existe en la rama por defecto; por ello esta capacidad manual queda disponible después de integrar el workflow en `main`. Una ejecución manual contra otro PR no modifica el HEAD de ese PR.

El CI mínimo usa únicamente un runner GitHub-hosted Linux estándar, sin secrets del proyecto, caché, artefactos, deploy ni larger runners. Cualquier ampliación requiere un Work Item separado.

Estados de CI:

```text
PASS
FAIL
PENDING
NOT CONFIGURED
```

`PASS` es evidencia automática para el SHA indicado.

No significa aprobación ni equivale a `SEMANTIC_ACCEPTED`.

Si el proyecto requiere CI y está:

```text
FAIL
PENDING
```

el cambio todavía no está listo para integración.

---

# 23. Integración

Secuencia conceptual:

```text
READY_FOR_REVIEW
↓
SEMANTIC_ACCEPTED
↓
verificar estado actual de target branch
↓
MERGE_ELIGIBLE
↓
MERGED
↓
CLOSED
```

Antes del merge se confirma que:

- HEAD sigue siendo el revisado;
- no apareció un conflicto relevante;
- CI requerido sigue válido;
- no existe un blocker nuevo.

---

# 24. Merge

En este proyecto, **Chat Web GPT, como Supervisor técnico, ejecuta el merge del PR mediante la integración disponible**. La decisión humana vigente asigna esa autoridad a Chat Web GPT; no queda como una lista de actores posibles.

Antes de ejecutar el merge, Chat Web GPT verifica que:

- el HEAD del PR sigue siendo exactamente el SHA con `SEMANTIC_ACCEPTED`;
- la rama destino está vigente y el PR no tiene conflictos;
- no hay impedimentos ni blockers nuevos;
- el CI requerido, cuando exista, está válido para ese SHA.

`SEMANTIC_ACCEPTED` confirma que el cambio satisface el Work Item para el SHA revisado, pero no declara por sí solo que el PR está `MERGE_ELIGIBLE` ni autoriza al Agente implementador a ejecutarlo. `MERGE_ELIGIBLE` registra que se comprobaron las condiciones de integración. La decisión humana registrada en este workflow autoriza a Chat Web GPT a ejecutar el merge únicamente después de esas comprobaciones.

El Agente implementador no se autoaprueba ni ejecuta el merge.

---

# 25. Cambio de sesión del Agente implementador

Si desaparece la sesión del Agente implementador:

La nueva sesión recibe solamente:

```text
Repositorio
Issue
```

y reconstruye:

```text
Issue
↓
branch
↓
HEAD
↓
PR
↓
últimos comentarios
↓
documentación relevante
↓
código
↓
tests
```

No necesita transcript anterior.

Debe responder nuevamente las diez preguntas de bootstrap antes de continuar.

---

# 26. Cambio de sesión de Chat Web GPT

Una sesión nueva de Chat Web GPT debe reconstruir:

1. ¿Qué producto se está desarrollando?
2. ¿Cuál es la arquitectura relevante?
3. ¿Qué Work Item está activo?
4. ¿Cuál es el objetivo?
5. ¿Qué scope fue autorizado?
6. ¿Cuál es el HEAD actual?
7. ¿Qué cambió realmente?
8. ¿Qué evidencia corresponde a ese SHA?
9. ¿Cuál es la última decisión válida para ese SHA?
10. ¿Qué decisión debe tomar ahora el Supervisor?

Tampoco necesita transcript anterior.

---

# 27. Rol del humano

El humano interviene principalmente para:

```text
intención
prioridades
decisiones de producto
cambio material de scope
credenciales
permisos
trade-offs importantes
```

No debería tener que copiar:

- diffs;
- código;
- contexto técnico;
- resultados extensos;

entre Chat Web GPT y el Agente implementador.

Un mensaje humano ideal puede ser simplemente:

```text
Agente implementador: trabaja Issue #123.
```

o:

```text
Chat Web GPT: revisa PR #145.
```

---

# 28. Reglas esenciales

El workflow canónico puede resumirse en diez reglas:

1. GitHub es la memoria compartida.
2. El Issue define la tarea.
3. La documentación define el producto y su ingeniería.
4. El Agente implementador implementa; Chat Web GPT revisa.
5. El Agente implementador no se autoaprueba.
6. Scope significa comportamiento autorizado + rutas autorizadas.
7. Una decisión de review sólo vale para el SHA revisado.
8. Tests/CI son evidencia, no aprobación.
9. REWORK del mismo objetivo permanece en el mismo Issue/PR.
10. Una sesión nueva reconstruye desde GitHub; no desde el transcript anterior.

---


# 29. AI_STUDIO_OPERATOR — protocolo subordinado de operación externa

Esta sección añade un rol operativo externo sin sustituir las reglas generales ya definidas para Issue, scopes, implementador, revisión por SHA, decisiones del Supervisor, CI, integración, merge y Humano.

> **AI_STUDIO_OPERATOR no es el Agente implementador y Google AI Studio web no puede ejercer el rol implementador bajo este protocolo.**

El Agente implementador conserva la escritura canónica por branch/commit/PR. `AI_STUDIO_OPERATOR` es invocado por el Supervisor para producir evidencia operacional o ejecutar una publicación autorizada.

```text
                         ┌→ Agente implementador → branch/commit/PR → GitHub
Humano → Supervisor → GitHub
                         └→ AI_STUDIO_OPERATOR → evidencia/publicación → Supervisor/GitHub
```

GitHub continúa siendo la fuente persistente de verdad. AI Studio no crea una ruta paralela `AI Studio → code → GitHub`.

El contrato de ejecución residente es [`AI_STUDIO_OPERATOR.md`](AI_STUDIO_OPERATOR.md). AI Studio debe leerlo desde el mismo SHA que está verificando antes de ejecutar una tarea dependiente del código. Ese archivo es subordinado a este workflow: no puede ampliar permisos, scope, autoridad ni estados formales. Ante contradicción, prevalece este workflow.

**NEW CHAT BOOTSTRAP:** un chat nuevo de AI Studio reconstruye contexto desde GitHub + Work Item + documentación canónica, no desde el transcript previo. Antes de trabajo consecuencial debe completar el bootstrap residente: establecer rol/autoridad, objetivo, TASK, MODE, EXPECTED SHA, evidencia esperada y límites; verificar checkout/HEAD/worktree y managed Preview root/runtime cuando aplique; y declarar la única operación, STOP conditions y evidencia a retornar. Sólo después puede actuar.

## 29.1 Permission Matrix

| Capacidad | AI_STUDIO_OPERATOR |
|---|---|
| READ / OBSERVE | YES |
| PULL / SYNC FROM GITHUB | YES, sólo para consumir/importar una versión |
| PREVIEW | YES |
| TEST | YES |
| DIAGNOSE | YES |
| PUBLISH external operational state | YES, sólo bajo protocolo PUBLISH |
| SPIKE_READ_ONLY | YES |
| repository/product-code write | NO |
| WRITE CANONICAL | NO |
| Fix / APPLY FIX | NO |
| COMMIT / PUSH | NO |
| CREATE / MODIFY BRANCH OR PR | NO |
| MERGE | NO |
| CHANGE DEPENDENCIES | NO |
| CHANGE SCHEMA / PROMPTS / WORKFLOW | NO |
| CHANGE REPOSITORY SECRETS | NO |
| ADOPT INTEGRATION | NO sin decisión humana + Issue |

`PULL / SYNC` nunca autoriza sincronización de cambios de vuelta al repositorio. Para repositorios públicos, la vía preferida es clone/fetch HTTPS anónimo, sin token, preservando `.git` y verificando `origin`, HEAD exacto y worktree limpio. Esto no exige integración GitHub nativa ni sync bidireccional.

## 29.2 Inicio: AI_STUDIO_REQUEST

Toda intervención usada como evidencia del workflow comienza por solicitud explícita del Supervisor y un Work Item existente.

Antes de una tarea dependiente del código, AI Studio debe obtener/refrescar la copia Git read-only, verificar `origin`, `EXPECTED SHA`, worktree limpio, leer `AI_STUDIO_OPERATOR.md` desde ese mismo SHA e identificar explícitamente `CANONICAL_GIT_CHECKOUT` y, cuando aplique, `MANAGED_PREVIEW_ROOT`. Sólo entonces puede ejecutar el `TASK`.

El checkout Git usado para verificar SHA y la raíz administrada que alimenta el Preview pueden ser distintos. Verificar un clone exacto **no prueba** que el Preview visible use ese árbol.

```text
AI_STUDIO_REQUEST

WORK ITEM: #<issue>
MODE: OBSERVE | PREVIEW | TEST | DIAGNOSE | PUBLISH | SPIKE_READ_ONLY
EXPECTED SHA: <sha> | N/A (platform-only)
TARGET: <preview / route / deployment / platform capability>
CANONICAL_GIT_CHECKOUT: <absolute path when code-dependent>
MANAGED_PREVIEW_ROOT: <absolute path when Preview/Publish-dependent>
TASK: <una sola operación concreta>
PRECONDITIONS: <observable conditions>
STOP CONDITIONS: <conditions that force BLOCKED/return>

FORBIDDEN:
- edit code/files
- Fix
- commit / branch / PR / push / merge
- dependency / schema / prompt / workflow changes
- repository secret changes

RETURN:
- OBSERVED SHA
- RESULT: PASS | FAIL | BLOCKED
- CLASSIFICATION
- EVIDENCE
- ERROR exacto si existe
```

`EXPECTED SHA: N/A (platform-only)` sólo se usa para `SPIKE_READ_ONLY` puramente de plataforma que no dependa de una versión del código.

## 29.3 Modos y disciplina de prompts

- `OBSERVE`: inspeccionar estado visible sin modificarlo.
- `PREVIEW`: ejecutar preview del SHA autorizado.
- `TEST`: ejecutar una comprobación concreta.
- `DIAGNOSE`: reproducir y aislar un fallo sin aplicar corrección.
- `PUBLISH`: publicar exclusivamente el SHA autorizado por el Supervisor.
- `SPIKE_READ_ONLY`: estudiar una capacidad/integración sin adoptarla.

Una operación real que cambie estado por prompt. Puede incluir verificación antes/después, pero no combinar diagnose + repair + publish. No usar tareas abiertas como “arregla todo” o “actualiza la interfaz”. `Fix` permanece prohibido.

Plantillas mínimas:

```text
MODE: TEST
EXPECTED SHA: <sha>
TASK: ejecutar <prueba concreta>; reportar resultado/evidencia; no modificar archivos.
```

```text
MODE: DIAGNOSE
EXPECTED SHA: <sha>
TASK: reproducir <fallo concreto>; capturar error exacto; clasificar; no aplicar Fix.
```

```text
MODE: PUBLISH
EXPECTED SHA: <approved-sha>
TASK: importar/sincronizar ese SHA; confirmar SHA; smoke preview; publish; smoke público; no modificar código.
```

## 29.4 SHA Gate

Es obligatorio antes de:

- `PREVIEW`;
- `TEST`;
- `DIAGNOSE` sobre código;
- `PUBLISH`.

```text
EXPECTED SHA == OBSERVED SHA
```

Si no coincide:

```text
STOP
RESULT: BLOCKED
CLASSIFICATION: AI_STUDIO_ENVIRONMENT
REASON: SHA_MISMATCH
```

No se continúa la operación ni se declara defecto de código.

Para `PREVIEW` y `PUBLISH`, el SHA Gate no termina en el checkout: también debe identificarse el `MANAGED_PREVIEW_ROOT` y demostrarse, por una vía soportada, que el árbol aprobado fue materializado unidireccionalmente allí. No se inventan/sustituyen archivos ni se sincroniza de vuelta a GitHub. Un HTTP 200 por sí solo no prueba que el Preview visible corresponda al SHA autorizado.

## 29.5 Ventanas de intervención

- **Antes/durante implementación:** `OBSERVE`, `SPIKE_READ_ONLY` o diagnóstico de plataforma/capacidad. AI Studio no implementa.
- **Branch/PR:** `PREVIEW`, `TEST` o `DIAGNOSE` sólo por solicitud del Supervisor y con el HEAD exacto como `EXPECTED SHA`.
- **Revisión:** puede aportar evidencia; `PASS` no equivale a `SEMANTIC_ACCEPTED` y `FAIL` no equivale por sí solo a `REWORK`.
- **Post-merge/publicación:** `PUBLISH` sólo para el SHA autorizado explícitamente por el Supervisor.

Las decisiones formales continúan bajo las reglas de revisión existentes; AI Studio sólo reporta `PASS / FAIL / BLOCKED`.

## 29.6 Clasificación y diagnóstico

Toda falla se clasifica provisionalmente como:

```text
CODE
AI_STUDIO_ENVIRONMENT
DEPLOYMENT
EXTERNAL_SERVICE
UNKNOWN
```

- `CODE`: evidencia de defecto en el mismo SHA.
- `AI_STUDIO_ENVIRONMENT`: sync, instalación, preview, runtime o estado interno de AI Studio.
- `DEPLOYMENT`: fallo durante preparación/publicación/serving con origen aún por determinar.
- `EXTERNAL_SERVICE`: servicio/proveedor externo indisponible, limitado o rechazando la operación.
- `UNKNOWN`: evidencia insuficiente.

```text
confirm SHA → reproduce → capture exact error → classify → report → no automatic fix
```

La clasificación es evidencia provisional. El Supervisor aplica las decisiones `REWORK / HOLD / ESCALATE` según las reglas generales ya existentes. Un problema de entorno/plataforma no se convierte automáticamente en `REWORK` de código.

Reglas operativas verificadas, detalladas en `AI_STUDIO_OPERATOR.md`:

- **cwd:** toda operación dependiente del proyecto usa path absoluto, `cd <absolute-path> && ...` o equivalente; si el launcher ejecuta desde otra raíz, `BLOCKED / AI_STUDIO_ENVIRONMENT`.
- **process safety:** identificar PID/comando/cwd exactos, preferir cierre graceful, no usar listas amplias de PID ni loops de takeover de puerto; respawn administrado implica `STOP / BLOCKED`.
- **recovery:** ante `Canceled`, `An internal error occurred`, respuesta stale/repetida o fallo de tool/workspace: salir/volver atrás → reingresar al proyecto → `NEW CHAT` → comprobar únicamente `git rev-parse HEAD`, `git status --short` y `GET /api/health`; continuar sólo con SHA correcto, worktree limpio y health válido.
- si la recuperación falla, puede probarse sesión fresca/privada o Remix/workspace fresco como recuperación de entorno; sin evidencia de defecto de aplicación no se clasifica automáticamente como `CODE`.
- `BLOCKED` significa detenerse, no improvisar y devolver control al Supervisor.

## 29.7 Protocolo PUBLISH

```text
approved GitHub SHA
→ AI_STUDIO_REQUEST MODE=PUBLISH
→ pull/sync/import desde GitHub
→ SHA Gate
→ identificar CANONICAL_GIT_CHECKOUT y MANAGED_PREVIEW_ROOT
→ demostrar materialización one-way del árbol aprobado en el managed root
→ preview smoke test
→ publish
→ public smoke test
→ AI_STUDIO_REPORT
→ evidencia persistida en GitHub
→ control vuelve al Supervisor
```

Distinción obligatoria:

```text
repository/product-code write: NO
authorized external PUBLISH: YES
```

`PUBLISH` nunca autoriza `Fix`, edición de código, dependencias, repository secrets, commit, push, PR o merge.

Si publicar exige escritura del proyecto:

```text
STOP → ESCALATE → decisión humana → nuevo Work Item
```

## 29.8 SPIKE_READ_ONLY para integraciones Google

```text
SPIKE_READ_ONLY
→ inspeccionar capacidad/documentación/configuración visible
→ AI_STUDIO_REPORT
→ Supervisor review
→ Human decision
→ Issue
→ implementación canónica por el Agente implementador
```

Puede reportar OAuth/scopes esperados, configuración visible, secretos previsiblemente necesarios **sin leer/copiar valores**, archivos potencialmente afectados y limitaciones de plataforma.

Ver o pulsar una capacidad de integración no autoriza su adopción. Si el spike requiere escribir/generar cambios del proyecto, se detiene y escala.

## 29.9 Regla absoluta de no escritura

```text
AI Studio may read, run, test, diagnose and publish.
AI Studio may not write product code or repository state.
```

Prohibido: editar archivos; aplicar `Fix`; commit; branch; PR; push; merge; cambiar dependencias, schema, prompts, workflow o repository secrets.

La preparación efímera interna para ejecutar Preview sólo es admisible si no modifica ni sincroniza archivos de vuelta a GitHub. Puede instalar dependencias ya declaradas desde el lockfile/manifiestos del SHA aprobado, iniciar/reiniciar servicios permitidos y materializar unidireccionalmente el árbol aprobado al workspace administrado por una vía soportada. Eso no concede autoridad para cambiar dependencias ni archivos canónicos.

`WRITE_SANDBOX: NO AUTORIZADO`.

Cualquier necesidad futura de escritura exige:

```text
STOP → ESCALATE → decisión humana explícita → nuevo Work Item
```

## 29.10 Fin: AI_STUDIO_REPORT y evidencia

Toda intervención termina con:

```text
AI_STUDIO_REPORT

WORK ITEM: #<issue>
MODE: <mode>
EXPECTED SHA: <sha> | N/A (platform-only)
OBSERVED SHA: <sha> | N/A (platform-only)
RESULT: PASS | FAIL | BLOCKED
CLASSIFICATION: CODE | AI_STUDIO_ENVIRONMENT | DEPLOYMENT | EXTERNAL_SERVICE | UNKNOWN
EVIDENCE: <mínima y verificable>
ERROR: <exacto o none>
CODE/REPOSITORY MODIFIED: NO
```

Después del reporte:

```text
control → Supervisor
```

La evidencia sólo adquiere persistencia para el workflow cuando se registra en el Issue o PR correspondiente, asociada al Work Item, modo, SHA aplicable, resultado, clasificación y evidencia concreta. Cuando sea relevante debe incluir cwd real, checkout Git, managed Preview root, evidencia de materialización, comando/acción exacta, proceso/respawn y estado HTTP observable.

AI Studio puede incluir una sección opcional `IMPLEMENTER_SUGGESTION` con una propuesta o pista diagnóstica sustentada en evidencia. Esa sugerencia no es una decisión formal ni autoriza código. El Supervisor decide si requiere un Work Item y coordina al Agente implementador, que sigue siendo la única autoridad de cambios persistentes de repositorio.

---

# Resultado

Este workflow elimina completamente:

```text
GoFlow
.workflow/index.json
.workflow/project.json
wf status
wf begin
wf context
wf scope
wf verify
wf ci
wf review
```

y conserva la parte esencial del sistema:

```text
Humano
     ↓
Chat Web GPT
     ↓
GitHub Issue
     ↓
Agente implementador
     ↓
Branch + code + tests + PR
     ↓
GitHub
     ↓
Chat Web GPT
     ↓
SEMANTIC_ACCEPTED / REWORK / HOLD / ESCALATE
```

Es menos robusto mecánicamente que el workflow completo porque **scope, selección de contexto y verificación ya no están reforzados por software determinista**. Pero para probar colaboración **Chat Web GPT + Agente implementador + AI_STUDIO_OPERATOR + GitHub**, mantiene las partes más importantes sin introducir infraestructura adicional.


---

# 30. Separación estricta Supervisor / Agente implementador

La separación de funciones es obligatoria para un mismo Work Item.

## 30.1 Supervisor

El Supervisor:

- interpreta la intención humana;
- delimita Objective, Acceptance Criteria, Semantic Scope y Path Scope;
- decide cuándo existe suficiente contexto;
- solicita investigación o evidencia cuando corresponda;
- revisa de forma independiente Issue, PR, diff, SHA, CI y evidencia;
- emite únicamente las decisiones formales ya definidas: `SEMANTIC_ACCEPTED`, `REWORK`, `HOLD` o `ESCALATE`;
- verifica `MERGE_ELIGIBLE`;
- ejecuta el merge cuando se cumplen las condiciones del §24.

El Supervisor **no debe producir la implementación sustantiva que luego pretende revisar como revisión independiente del mismo Work Item**.

## 30.2 Agente implementador

El Agente implementador:

- recibe el Work Item y su scope;
- crea o usa la branch autorizada;
- modifica únicamente rutas y comportamiento autorizados;
- verifica;
- revisa su propio diff;
- commit;
- push;
- abre o actualiza PR;
- entrega HEAD exacto y evidencia.

El Agente implementador:

- no emite `SEMANTIC_ACCEPTED` sobre su propio trabajo;
- no declara `MERGE_ELIGIBLE`;
- no ejecuta merge;
- no redefine silenciosamente arquitectura, producto, scope o workflow.

## 30.3 Independencia de revisión

Para un mismo cambio:

~~~text
Supervisor define/revisa/decide
!=
Implementador escribe/publica implementación
~~~

Una sesión o actor que haya producido implementación sustantiva no puede presentarse después como revisor independiente de esa misma implementación sin un handoff explícito y una decisión humana excepcional registrada.

Cambiar de herramienta, chat o interfaz no borra la autoría previa ni crea independencia por sí mismo.

Cualquier excepción requiere §35 `HUMAN_EXCEPTION / WAIVER`. La excepción no se presume.

## 30.4 Matriz de autoridad

| Actor | Puede decidir | No puede decidir unilateralmente |
|---|---|---|
| **Humano** | Intención, prioridades, decisiones de producto, cambios materiales de scope, permisos, credenciales, excepciones y trade-offs importantes. | La ejecución técnica no sustituye el proceso Issue → branch → PR → review. |
| **Supervisor** | Delimitar Work Items; interpretar requisitos; coordinar; verificar gates; autorizar una estrategia técnica dentro del scope y arquitectura ya aprobados; revisar PR; emitir `SEMANTIC_ACCEPTED / REWORK / HOLD / ESCALATE`; verificar `MERGE_ELIGIBLE`; ejecutar merge cuando corresponda. | No implementa normalmente aquello que después revisará. No cambia unilateralmente intención de producto, scope material, arquitectura aprobada o autoridad reservada al Humano. |
| **Agente implementador** | Decisiones locales o mecánicas necesarias para cumplir el Work Item dentro de Objective, Acceptance Criteria, scopes y arquitectura vigentes. | No redefine arquitectura, no amplía scope, no adopta integraciones nuevas, no cambia workflow, no se autoaprueba, no declara `SEMANTIC_ACCEPTED` ni hace merge. |
| **AI_STUDIO_OPERATOR** | Observar, Preview, Test, Diagnose, Publish autorizado y `SPIKE_READ_ONLY`; produce evidencia. | No implementa, no decide arquitectura, no adopta integraciones, no modifica repositorio y no hace Fix/commit/branch/PR/merge. |
| **CI** | Produce evidencia mecánica para un SHA. | No aprueba semánticamente. `PASS != SEMANTIC_ACCEPTED`. |

## 30.5 Gate de autoridad y arquitectura

Antes de entregar una acción material al Agente implementador, el Supervisor debe clasificar la necesidad, como mínimo, entre:

- ejecución directa de un requisito ya definido;
- decisión técnica material;
- cambio de scope;
- cambio arquitectónico;
- integración externa;
- operación AI Studio;
- excepción humana.

Luego aplica este gate:

**Decisión local de implementación.** Si está determinada por el Issue, la documentación y la arquitectura vigentes, y no altera responsabilidades, invariantes, integración autorizada ni scope, puede resolverla el Agente implementador.

**Estrategia técnica material dentro de arquitectura y scope ya aprobados.** El Agente implementador puede proponerla; el Supervisor puede autorizarla o verificarla dentro de su autoridad existente. Si depende de información externa mutable, aplica además el `RESEARCH_GATE` de §31, cuya fuente permanece en Issue #35 OPEN y operativamente vigente por decisión humana.

**Cambio durable de arquitectura.** Si cambia responsabilidades de componentes, introduce o sustituye capas/plataformas, altera almacenamiento o modelo de integración, modifica una invariante arquitectónica o contradice el diseño TARGET aprobado, el Agente implementador debe detenerse. El Supervisor tampoco lo decide unilateralmente.

Secuencia requerida:

~~~text
propuesta
→ análisis / RESEARCH_GATE si aplica
→ Supervisor
→ ESCALATE
→ decisión humana
→ Work Item específico
→ ADR/documentación cuando corresponda
→ Agente implementador
→ PR
→ revisión independiente
~~~

La fuente arquitectónica vigente es `docs/engineering/SOFTWARE_ARCHITECTURE.md`: declara el diseño como TARGET aprobado y establece que los cambios durables de arquitectura se documentan y aprueban antes de alterar ese diseño.

Una duda local no debe escalarse artificialmente; un cambio de arquitectura, scope o autoridad no debe ocultarse como elección de implementación.

---

# 31. RESEARCH_GATE y STRATEGIC_RATIONALE

Esta sección canoniza prospectivamente la decisión humana registrada en el Issue #35, que permanece OPEN en el baseline de esta propuesta.

## 31.1 Cuándo se activa RESEARCH_GATE

Antes de proponer o implementar una decisión técnica o estratégica material cuya validez dependa de información externa mutable, el agente debe activar `RESEARCH_GATE`.

Incluye, como mínimo, decisiones dependientes de:

- versiones de SDK, API o runtime;
- librerías, frameworks o herramientas;
- estrategia de despliegue;
- integración con proveedores o plataformas;
- autenticación o seguridad dependiente de servicios externos;
- formatos o protocolos externos;
- límites, cuotas, planes o condiciones vigentes;
- alternativas de arquitectura o ingeniería cuya conveniencia dependa del estado actual del ecosistema.

No se activa automáticamente para decisiones locales, mecánicas o ya determinadas por las especificaciones vigentes y el código actual, por ejemplo:

- nombres;
- formato;
- refactors triviales ya autorizados;
- implementación directa sin dependencia de información externa susceptible de cambio.

## 31.2 Secuencia RESEARCH_GATE

~~~text
identificar Decision Point
↓
explicar qué información externa actual debe confirmarse
↓
investigar fuentes vigentes
↓
priorizar fuentes primarias/oficiales
↓
separar hechos del proyecto / hechos externos / inferencias / incertidumbres
↓
registrar propuesta + evidencia en el Issue
↓
devolver control al Supervisor cuando la decisión no esté ya determinada
~~~

Fuentes prioritarias:

- documentación oficial del proveedor;
- especificaciones;
- release notes;
- repositorios oficiales;
- documentación técnica oficial.

Blogs, foros y comunidad pueden aportar contexto o descubrimiento, pero no deben ser la única base cuando existe una fuente primaria relevante.

La investigación produce **evidencia y propuesta**. No equivale a autorización, aprobación ni cambio de scope.

## 31.3 Verificación del Supervisor

El Supervisor contrasta de forma independiente las afirmaciones estratégicas relevantes antes de autorizar su aplicación.

Debe evaluar la propuesta contra:

- Objective;
- Acceptance Criteria;
- Authorized Scope;
- arquitectura;
- especificaciones;
- workflow;
- estado actual del repositorio y SHA.

Si la conclusión exige:

- cambiar intención de producto;
- ampliar scope;
- adoptar una integración no autorizada;
- introducir credenciales o costes;
- cambiar el workflow fuera del Work Item;
- tomar una decisión reservada al Humano;

el Supervisor usa `ESCALATE` en vez de aplicarla unilateralmente.

## 31.4 STRATEGIC_RATIONALE

Las decisiones estratégicas o materiales sujetas a `RESEARCH_GATE` se persisten en el Issue del Work Item.

No se usa para actividad mecánica como “copié”, “leí” o “ejecuté”.

Plantilla mínima:

~~~text
STRATEGIC_RATIONALE

WORK ITEM: #<issue>

DECISION POINT:
<decisión técnica/estratégica material>

WHY CURRENT RESEARCH IS REQUIRED:
<qué información externa susceptible de cambio debe verificarse>

PROJECT CONSTRAINTS:
<workflow, arquitectura, specs, scope, SHA>

CURRENT EXTERNAL EVIDENCE:
- <fuente primaria, fecha/versión, hecho relevante>
- <fuente adicional si corresponde>

OPTIONS CONSIDERED:
A. ...
B. ...
C. ...

PROPOSED APPROACH:
...

RATIONALE:
<por qué encaja con este proyecto>

RISKS / UNCERTAINTIES:
...

SUPERVISOR VERIFICATION:
PENDING | VERIFIED

RATIONALE STATUS:
DRAFT | VERIFIED | SUPERSEDED
~~~

`Rationale Status` no crea estados formales nuevos del workflow.

Los únicos estados formales del Supervisor continúan siendo:

~~~text
SEMANTIC_ACCEPTED
REWORK
HOLD
ESCALATE
~~~

Cuando una decisión estratégica cambie, el razonamiento histórico no se elimina. Se registra la nueva decisión y la anterior queda `SUPERSEDED` cuando corresponda.

## 31.5 Aplicación por rol

**Agente implementador**

- no inventa versiones, APIs o prácticas actuales;
- investiga antes de escoger una estrategia técnica material no determinada;
- registra propuesta y evidencia;
- no amplía scope;
- espera autorización del Supervisor cuando la estrategia no esté ya resuelta por el Work Item.

**AI_STUDIO_OPERATOR**

Aplica `RESEARCH_GATE` cuando propone arquitectura, configuración, estrategia Google, Build, Preview, Publish, capacidades de plataforma o cualquier otra decisión dependiente de información actual.

Debe separar:

- observación directa;
- documentación actual;
- inferencia;
- desconocido.

No convierte su recomendación en decisión canónica.

**Supervisor**

- decide si el gate está satisfecho;
- contrasta evidencia;
- decide dentro de autoridad ya existente;
- usa `ESCALATE` cuando corresponde.

El protocolo no concede nueva autoridad de escritura, merge, scope o decisión al Agente implementador ni a AI Studio.

---

# 32. TECHNICAL PERMISSION != WORKFLOW AUTHORITY

Esta sección canoniza prospectivamente la decisión humana registrada en el Issue #39, que permanece OPEN en el baseline de esta propuesta.

Regla:

~~~text
TECHNICAL PERMISSION != WORKFLOW AUTHORITY
~~~

Aunque una OAuth App, GitHub App, integración o herramienta tenga técnicamente scopes de escritura, esos scopes **no conceden autoridad operacional** si el workflow no la autoriza.

Para AI Studio:

~~~text
AI_STUDIO_ALLOWED_REPOSITORY_WRITES = NONE
ALLOWED WRITE PATHS = NONE
~~~

Por tanto, AI Studio no puede usar capacidad técnica disponible para:

- Push Changes;
- Stage and commit;
- commit directo;
- crear o modificar branch;
- crear o modificar PR;
- editar workflows;
- escribir directamente en `main`;
- modificar archivos de repositorio;
- sincronizar cambios desde AI Studio hacia GitHub;
- realizar cualquier otro write de estado del repositorio.

La instalación de la GitHub App debe permanecer restringida a `cmiloarevalo-hash/G_INF_01` salvo decisión humana explícita para otro repositorio.

Una allowlist descrita únicamente en prompt o documentación **no constituye enforcement técnico suficiente** cuando la integración conserva permisos más amplios.

No se debe afirmar que una prohibición está técnicamente garantizada sólo porque el prompt la declare.

## 32.1 Excepción futura de escritura

No existe excepción activa.

El namespace sugerido en Issue #39:

~~~text
docs/ai-studio-evidence/**
~~~

permanece:

~~~text
NOT AUTHORIZED
NOT ACTIVE
~~~

Cualquier excepción futura requeriría, como mínimo:

1. decisión humana explícita;
2. Work Item separado;
3. alcance y allowlist explícitos;
4. prohibición de escritura directa a `main`;
5. control GitHub-side verificable;
6. revisión de autoridad, seguridad y rollback;
7. actualización canónica del workflow antes de usarla como regla general.

Tener scopes técnicos amplios nunca activa implícitamente esa excepción.

---

# 33. Política de invocación de AI Studio

AI Studio no es un segundo revisor rutinario ni un canal alternativo de implementación.

`AI_STUDIO_OPERATOR` se invoca únicamente cuando la tarea necesita de forma material una operación o evidencia específica de la plataforma externa.

Ejemplos válidos:

- observar estado de Google AI Studio;
- Preview del SHA autorizado;
- test dependiente del runtime de AI Studio;
- diagnose de un fallo reproducible en esa plataforma;
- `PUBLISH` del SHA autorizado;
- `SPIKE_READ_ONLY` sobre capacidad Google actual.

No se invoca sólo para:

- repetir tests que CI/local ya puede ejecutar;
- “revisar por segunda vez” un PR sin necesidad de plataforma;
- editar o corregir código;
- producir commits, branches o PR;
- sustituir la revisión independiente del Supervisor;
- compensar falta de delimitación del Work Item.

La invocación usada como evidencia del workflow pertenece al Supervisor y requiere:

- Work Item existente;
- MODE;
- TASK única;
- EXPECTED SHA cuando dependa de código;
- TARGET;
- preconditions;
- stop conditions;
- evidencia esperada.

El Agente implementador puede reportar que necesita evidencia de plataforma, pero no convierte esa necesidad en autoridad de AI Studio ni en una operación consecuencial no solicitada por el Supervisor.

La disciplina de §29.2–29.10 sigue plenamente vigente.

---

# 34. DEFERRED VERIFICATION

`DEFERRED VERIFICATION` permite registrar una comprobación que **todavía no puede ejecutarse**, sin convertir esa ausencia de evidencia en `PASS`.

No es un nuevo estado formal del Supervisor.

Puede usarse cuando la verificación:

- depende de un entorno externo todavía no disponible;
- requiere una credencial o acción humana que no debe exponerse al agente;
- pertenece por diseño a una fase posterior claramente definida;
- está temporalmente bloqueada por una dependencia externa;
- no puede ejecutarse legítimamente desde la herramienta actual.

Registro mínimo:

~~~text
DEFERRED VERIFICATION

WORK ITEM: #<issue>
SHA: <sha o N/A si no depende de código>
VERIFICATION: <comprobación exacta pendiente>
WHY DEFERRED: <impedimento objetivo>
CURRENT EVIDENCE: <qué sí se comprobó>
TRIGGER TO RESUME: <condición observable>
RESPONSIBLE ROLE: <Humano | Supervisor | Implementador | AI_STUDIO_OPERATOR>
IMPACT: <qué decisión permanece bloqueada o limitada>
STATUS: PENDING
~~~

Reglas:

- `DEFERRED` no significa `PASS`;
- no debe ocultarse en un resumen como si la verificación hubiese ocurrido;
- la evidencia debe seguir asociada al SHA aplicable;
- si el HEAD cambia y la verificación depende del código, debe revalidarse su aplicabilidad;
- una verificación obligatoria para `SEMANTIC_ACCEPTED` o `MERGE_ELIGIBLE` no puede omitirse silenciosamente;
- si el workflow o Acceptance Criteria exigen esa prueba antes de integrar, el PR permanece no elegible salvo una §35 `HUMAN_EXCEPTION / WAIVER` explícita;
- cuando la verificación pertenece canónicamente a una fase posterior, el Work Item/roadmap debe conservar su condición pendiente con precisión, sin declarar completada la evidencia que falta.

---

# 35. HUMAN_EXCEPTION / WAIVER

Una desviación excepcional del workflow sólo puede existir por decisión explícita del Humano.

El Supervisor puede identificar la necesidad y usar `ESCALATE`, pero no puede auto-concederse una excepción humana.

El Agente implementador y AI Studio tampoco pueden concederla.

Registro mínimo persistente en Issue o PR:

~~~text
HUMAN_EXCEPTION / WAIVER

WORK ITEM: #<issue>
RULE OR CRITERION: <qué regla/criterio se exceptúa>
SCOPE: <alcance exacto>
SHA / STATE APPLICABILITY: <sha, entorno o estado aplicable>
REASON: <decisión humana>
RISK ACCEPTED: <riesgo reconocido>
COMPENSATING CONTROLS: <si existen>
EXPIRY / REVIEW TRIGGER: <si aplica>
HUMAN DECISION: GRANTED
~~~

Reglas:

- no existe waiver implícito;
- no se infiere de silencio, urgencia, permisos técnicos o acceso a una herramienta;
- no se aplica retroactivamente para convertir una acción no autorizada en autorizada;
- debe ser lo más estrecho posible;
- no cambia permanentemente el workflow salvo que exista un Work Item que modifique el documento canónico;
- no transfiere automáticamente autoridad entre Supervisor, Implementador y AI Studio;
- no crea un quinto estado formal del Supervisor.

Una excepción futura que pretendiera conceder escritura de repositorio a AI Studio debe cumplir además el §32 y un Work Item separado. Mientras eso no ocurra:

~~~text
AI_STUDIO_ALLOWED_REPOSITORY_WRITES = NONE
~~~

---

# 36. Repository state != Preview state != Published state

Estas tres realidades son distintas y no pueden inferirse unas de otras.

~~~text
Repository state
!=
Preview state
!=
Published state
~~~

## 36.1 Repository state

Es el estado versionado en GitHub:

- branch/ref;
- commit SHA;
- tree;
- diff;
- PR;
- CI asociado.

Se demuestra con evidencia Git/GitHub.

## 36.2 Preview state

Es el árbol, proceso, runtime y configuración que alimentan el Preview visible.

Puede usar un `MANAGED_PREVIEW_ROOT` distinto de `CANONICAL_GIT_CHECKOUT`.

Un checkout correcto no demuestra por sí solo que el Preview está sirviendo ese árbol.

La relación debe demostrarse mediante el SHA Gate y la materialización one-way ya definida.

Un HTTP 200 no prueba identidad con el SHA autorizado.

## 36.3 Published state

Es el deployment/revisión/URL/configuración externa que está efectivamente publicada.

No se demuestra únicamente porque:

- `main` apunte a un SHA;
- el Preview funcione;
- exista un botón o estado visual de Publish;
- un deployment anterior haya sido válido.

Para afirmar publicación deben existir evidencias específicas del estado publicado y, cuando dependa del código, su relación con el SHA autorizado.

## 36.4 Consecuencia operacional

Toda evidencia debe decir a cuál estado se refiere.

Nunca usar:

~~~text
repo correcto → por tanto preview correcto
preview correcto → por tanto published correcto
published accesible → por tanto corresponde al HEAD actual
~~~

sin evidencia explícita de la relación correspondiente.

---

# 37. NEW CHAT Supervisor — bootstrap reforzado

El §26 se mantiene íntegro y se amplía con este protocolo.

Una sesión nueva del Supervisor reconstruye el estado desde fuentes persistentes antes de decidir.

Regla de autoridad de la sesión:

> **La función del Supervisor es gobernar el trabajo técnico, no sustituir al Humano ni al Agente implementador.**
>
> Delimita, coordina, investiga o verifica cuando corresponde, revisa independientemente, decide por SHA y ejecuta el merge cuando es elegible.
>
> No implementa normalmente lo que después revisará.
>
> Puede autorizar estrategias dentro del scope y arquitectura ya aprobados.
>
> No cambia unilateralmente intención, scope material, arquitectura aprobada, permisos, credenciales, integraciones o autoridad reservada al Humano; en esos casos usa `ESCALATE`.

Antes de autorizar una acción material, además debe clasificarla conforme al gate de §30.5. La clasificación no sustituye el Work Item: sirve para determinar qué autoridad y qué evidencia son necesarias antes del handoff.

Orden mínimo:

1. declarar rol: `Supervisor`;
2. identificar repositorio y leer el workflow canónico vigente desde GitHub;
3. obtener el HEAD actual de `main`;
4. identificar Work Item activo y verificar su estado real en GitHub;
5. leer Objective, Acceptance Criteria, Authorized Scope, Relevant Sources, Verification y Base;
6. identificar branch y PR actuales;
7. obtener BASE y HEAD exactos del PR;
8. revisar diff completo y archivos cambiados;
9. leer comentarios/reviews relevantes y localizar la última decisión explícitamente asociada al HEAD actual;
10. verificar CI/evidencia mecánica contra ese mismo SHA;
11. revisar `STRATEGIC_RATIONALE` vigente si existe;
12. revisar `DEFERRED VERIFICATION` pendiente si existe;
13. revisar `HUMAN_EXCEPTION / WAIVER` aplicable si existe;
14. si intervino AI Studio, distinguir Repository state, Preview state y Published state y leer el `AI_STUDIO_REPORT` correspondiente;
15. declarar la única decisión o siguiente acción permitida por la evidencia actual.

Preguntas de cierre del bootstrap:

~~~text
¿Sé qué se pidió?
¿Sé qué estaba autorizado?
¿Sé qué cambió?
¿Sé cuál es el HEAD exacto?
¿Sé qué evidencia pertenece a ese HEAD?
¿Sé qué verificación está pendiente?
¿Sé qué excepciones humanas existen realmente?
¿Sé si hay estado externo distinto del repositorio?
¿Sé cuál es la última decisión válida para este HEAD?
¿Puedo decidir sin depender del transcript anterior?
~~~

Si alguna respuesta material es “no”, el Supervisor obtiene la evidencia faltante o usa `HOLD / ESCALATE` según corresponda. No rellena vacíos con memoria de otro chat.

Antes de merge debe volver a comprobar, en el momento de integración:

- HEAD del PR;
- target branch;
- conflictos;
- CI requerido;
- blockers;
- vigencia de la decisión asociada al SHA;
- cualquier waiver o verificación diferida que afecte `MERGE_ELIGIBLE`.



---

# Apéndice A — Inventario completo de secciones y subsecciones de la fuente base

El inventario se obtiene de los headings reales de `WORKFLOW_SIMPLIFICADO_CHAT_WEB_GPT_GEMINI_3_8.md` en `main@ff1a7d46c3f9992adbcc41b933cc13c3501fc617`, excluyendo headings que sólo aparecen dentro de ejemplos de código.

1. ## 1. Objetivo
2. # 2. Principio fundamental
3. # 3. Responsabilidades
4. ## 3.1 Chat Web GPT
5. # 4. Agente implementador
6. # 5. GitHub
7. # 6. Documentación del proyecto
8. # 7. Unidad de trabajo: GitHub Issue
9. # 8. Dos tipos de scope
10. ## Semantic Scope
11. ## Path Scope
12. # 9. Flujo completo
13. ## Fase A — intención
14. ## Fase B — creación del Work Item
15. # 10. Inicio del Agente implementador
16. # 11. Bootstrap del Agente implementador
17. # 12. Política de lectura
18. # 13. Implementación
19. # 14. Problemas descubiertos durante el trabajo
20. # 15. Verificación local
21. # 16. Publicación
22. # 17. Handoff del Agente implementador
23. # 18. Revisión de Chat Web GPT
24. # 19. Significado de las decisiones
25. ## SEMANTIC_ACCEPTED
26. ## REWORK
27. ## HOLD
28. ## ESCALATE
29. # 20. REWORK
30. # 21. Decisión vigente
31. # 22. CI
32. # 23. Integración
33. # 24. Merge
34. # 25. Cambio de sesión del Agente implementador
35. # 26. Cambio de sesión de Chat Web GPT
36. # 27. Rol del humano
37. # 28. Reglas esenciales
38. # 29. AI_STUDIO_OPERATOR — protocolo subordinado de operación externa
39. ## 29.1 Permission Matrix
40. ## 29.2 Inicio: AI_STUDIO_REQUEST
41. ## 29.3 Modos y disciplina de prompts
42. ## 29.4 SHA Gate
43. ## 29.5 Ventanas de intervención
44. ## 29.6 Clasificación y diagnóstico
45. ## 29.7 Protocolo PUBLISH
46. ## 29.8 SPIKE_READ_ONLY para integraciones Google
47. ## 29.9 Regla absoluta de no escritura
48. ## 29.10 Fin: AI_STUDIO_REPORT y evidencia
49. # Resultado

---

# Apéndice B — Matriz completa de trazabilidad

Criterios:

- `PRESERVED`: contenido operativo de la sección actual se conserva semánticamente.
- `EXPANDED`: contenido actual se conserva y recibe reglas adicionales explícitas.
- `MOVED`: contenido trasladado sin pérdida semántica.
- `NEW`: regla sin sección equivalente en la fuente base.
- `REMOVED`: eliminación propuesta. Requiere justificación explícita y autorización.

| Sección actual / fuente | Estado | Ubicación nueva | Observación |
|---|---|---|---|
| 1. Objetivo | PRESERVED | 1. Objetivo | Contenido operativo conservado; sin pérdida semántica. |
| 2. Principio fundamental | PRESERVED | 2. Principio fundamental | Contenido operativo conservado; sin pérdida semántica. |
| 3. Responsabilidades | EXPANDED | §3 + §30 | Se conserva la estructura original y se añade separación estricta de roles. |
| 3.1 Chat Web GPT | EXPANDED | §3.1 + §30.1/§30.3 | Responsabilidades originales preservadas; se formaliza independencia de revisión. |
| 4. Agente implementador | EXPANDED | §4 + §30.2/§30.3 | Responsabilidades originales preservadas; se formalizan límites de autoridad y auto-revisión. |
| 5. GitHub | PRESERVED | 5. GitHub | Contenido operativo conservado; sin pérdida semántica. |
| 6. Documentación del proyecto | PRESERVED | 6. Documentación del proyecto | Contenido operativo conservado; sin pérdida semántica. |
| 7. Unidad de trabajo: GitHub Issue | EXPANDED | §7 + §§31, 34, 35 | Formato base preservado; el Issue también persiste rationale, verificaciones diferidas y excepciones cuando apliquen. |
| 8. Dos tipos de scope | PRESERVED | 8. Dos tipos de scope | Contenido operativo conservado; sin pérdida semántica. |
| Semantic Scope | PRESERVED | Semantic Scope | Contenido operativo conservado; sin pérdida semántica. |
| Path Scope | PRESERVED | Path Scope | Contenido operativo conservado; sin pérdida semántica. |
| 9. Flujo completo | PRESERVED | 9. Flujo completo | Contenido operativo conservado; sin pérdida semántica. |
| Fase A — intención | PRESERVED | Fase A — intención | Contenido operativo conservado; sin pérdida semántica. |
| Fase B — creación del Work Item | PRESERVED | Fase B — creación del Work Item | Contenido operativo conservado; sin pérdida semántica. |
| 10. Inicio del Agente implementador | PRESERVED | 10. Inicio del Agente implementador | Contenido operativo conservado; sin pérdida semántica. |
| 11. Bootstrap del Agente implementador | EXPANDED | §11 + §30.5 | Las diez preguntas originales se conservan; se añade declaración explícita de autoridad y STOP/ESCALATE ante decisiones no autorizadas. |
| 12. Política de lectura | PRESERVED | 12. Política de lectura | Contenido operativo conservado; sin pérdida semántica. |
| 13. Implementación | PRESERVED | 13. Implementación | Contenido operativo conservado; sin pérdida semántica. |
| 14. Problemas descubiertos durante el trabajo | PRESERVED | 14. Problemas descubiertos durante el trabajo | Contenido operativo conservado; sin pérdida semántica. |
| 15. Verificación local | EXPANDED | §15 + §34 | Verificación original preservada; se define cómo registrar comprobaciones legítimamente diferidas sin fingir PASS. |
| 16. Publicación | PRESERVED | 16. Publicación | Contenido operativo conservado; sin pérdida semántica. |
| 17. Handoff del Agente implementador | PRESERVED | 17. Handoff del Agente implementador | Contenido operativo conservado; sin pérdida semántica. |
| 18. Revisión de Chat Web GPT | PRESERVED | 18. Revisión de Chat Web GPT | Contenido operativo conservado; sin pérdida semántica. |
| 19. Significado de las decisiones | PRESERVED | 19. Significado de las decisiones | Contenido operativo conservado; sin pérdida semántica. |
| SEMANTIC_ACCEPTED | PRESERVED | SEMANTIC_ACCEPTED | Contenido operativo conservado; sin pérdida semántica. |
| REWORK | PRESERVED | REWORK | Contenido operativo conservado; sin pérdida semántica. |
| HOLD | PRESERVED | HOLD | Contenido operativo conservado; sin pérdida semántica. |
| ESCALATE | PRESERVED | ESCALATE | Contenido operativo conservado; sin pérdida semántica. |
| 20. REWORK | PRESERVED | 20. REWORK | Contenido operativo conservado; sin pérdida semántica. |
| 21. Decisión vigente | PRESERVED | 21. Decisión vigente | Contenido operativo conservado; sin pérdida semántica. |
| 22. CI | PRESERVED | 22. CI | Contenido operativo conservado; sin pérdida semántica. |
| 23. Integración | PRESERVED | 23. Integración | Contenido operativo conservado; sin pérdida semántica. |
| 24. Merge | PRESERVED | 24. Merge | Contenido operativo conservado; sin pérdida semántica. |
| 25. Cambio de sesión del Agente implementador | PRESERVED | 25. Cambio de sesión del Agente implementador | Contenido operativo conservado; sin pérdida semántica. |
| 26. Cambio de sesión de Chat Web GPT | EXPANDED | §26 + §37 | Las diez preguntas originales se conservan y se añade bootstrap reforzado del Supervisor. |
| 27. Rol del humano | EXPANDED | §27 + §35 | Rol humano preservado; se formaliza HUMAN_EXCEPTION / WAIVER. |
| 28. Reglas esenciales | PRESERVED | 28. Reglas esenciales | Contenido operativo conservado; sin pérdida semántica. |
| 29. AI_STUDIO_OPERATOR — protocolo subordinado de operación externa | EXPANDED | §29 + §§32, 33, 36 | Protocolo íntegro preservado; se añaden autoridad técnica, invocación y separación de estados. |
| 29.1 Permission Matrix | EXPANDED | §29.1 + §32 | Matriz preservada; se explicita que scopes técnicos no otorgan autoridad y writes siguen en NONE. |
| 29.2 Inicio: AI_STUDIO_REQUEST | EXPANDED | §29.2 + §33 | Solicitud original preservada; se delimita cuándo AI Studio debe y no debe ser invocado. |
| 29.3 Modos y disciplina de prompts | PRESERVED | 29.3 Modos y disciplina de prompts | Contenido operativo conservado; sin pérdida semántica. |
| 29.4 SHA Gate | EXPANDED | §29.4 + §36 | SHA Gate preservado; se formaliza Repository state != Preview state != Published state. |
| 29.5 Ventanas de intervención | PRESERVED | 29.5 Ventanas de intervención | Contenido operativo conservado; sin pérdida semántica. |
| 29.6 Clasificación y diagnóstico | PRESERVED | 29.6 Clasificación y diagnóstico | Contenido operativo conservado; sin pérdida semántica. |
| 29.7 Protocolo PUBLISH | PRESERVED | 29.7 Protocolo PUBLISH | Contenido operativo conservado; sin pérdida semántica. |
| 29.8 SPIKE_READ_ONLY para integraciones Google | PRESERVED | 29.8 SPIKE_READ_ONLY para integraciones Google | Contenido operativo conservado; sin pérdida semántica. |
| 29.9 Regla absoluta de no escritura | EXPANDED | §29.9 + §32 | Prohibición original preservada y endurecida por TECHNICAL PERMISSION != WORKFLOW AUTHORITY. |
| 29.10 Fin: AI_STUDIO_REPORT y evidencia | PRESERVED | 29.10 Fin: AI_STUDIO_REPORT y evidencia | Contenido operativo conservado; sin pérdida semántica. |
| Resultado | PRESERVED | Resultado | Contenido operativo conservado; sin pérdida semántica. |
| — | NEW | §30 Separación estricta Supervisor / Agente implementador | Formaliza independencia de revisión, matriz de autoridad y gate de decisiones/arquitectura sin transferir autoridad entre roles. |
| Issue #35 OPEN | NEW | §31 RESEARCH_GATE y STRATEGIC_RATIONALE | Regla operativa humana pendiente de integración en la fuente base; se incorpora prospectivamente sin declarar Issue cerrado. |
| Issue #39 OPEN | NEW | §32 TECHNICAL PERMISSION != WORKFLOW AUTHORITY | Regla operativa humana pendiente de integración en la fuente base; PR #40 cerrado sin merge no se presenta como integración. |
| — | NEW | §33 Política de invocación de AI Studio | Formaliza que AI Studio sólo se usa cuando la evidencia/operación de plataforma es material. |
| — | NEW | §34 DEFERRED VERIFICATION | Anotación de evidencia pendiente; no crea estado formal ni PASS. |
| — | NEW | §35 HUMAN_EXCEPTION / WAIVER | Sólo el Humano puede conceder una excepción explícita y persistida. |
| — | NEW | §36 Repository state != Preview state != Published state | Prohíbe inferir equivalencia entre estados sin evidencia. |
| — | NEW | §37 NEW CHAT Supervisor — bootstrap reforzado | Amplía §26 sin depender del transcript previo. |

Resultado de la matriz:

- `MOVED`: ninguno.
- `REMOVED`: ninguno.
- Toda sección y subsección real de la fuente base aparece en la matriz.
- El cambio de nombre del workflow no elimina contenido operativo.
- Issues #35 y #39 se registran como OPEN en el baseline y sus reglas no se describen como previamente integradas.

---

# Apéndice C — Resumen de cambios

## Reglas nuevas

- §30: separación estricta Supervisor / Agente implementador, matriz de autoridad y gate de decisiones/arquitectura.
- §31: `RESEARCH_GATE` + `STRATEGIC_RATIONALE`, provenientes de decisión humana operativa del Issue #35 abierto.
- §32: `TECHNICAL PERMISSION != WORKFLOW AUTHORITY` + `AI_STUDIO_ALLOWED_REPOSITORY_WRITES = NONE`, provenientes de decisión humana operativa del Issue #39 abierto.
- §33: política de invocación de AI Studio.
- §34: `DEFERRED VERIFICATION`.
- §35: `HUMAN_EXCEPTION / WAIVER`.
- §36: `Repository state != Preview state != Published state`.
- §37: bootstrap reforzado `NEW CHAT Supervisor`.

## Reglas movidas

Ninguna.

## Reglas expandidas

Se expanden sin eliminar su contenido original:

- responsabilidades del Supervisor;
- responsabilidades del Agente implementador;
- uso del Issue como registro persistente;
- verificación;
- cambio de sesión del Supervisor;
- rol del Humano;
- protocolo `AI_STUDIO_OPERATOR`;
- Permission Matrix;
- `AI_STUDIO_REQUEST`;
- SHA Gate;
- prohibición de escritura de AI Studio.

## Eliminaciones propuestas

Ninguna.

---

# Apéndice D — Condiciones de reemplazo canónico

Este archivo sólo puede reemplazar la fuente vigente después de revisión del Supervisor y merge autorizado.

Antes de considerar el reemplazo:

- ningún contenido normativo de la fuente base debe haberse perdido;
- ningún cambio de autoridad puede quedar implícito;
- ningún Issue abierto puede presentarse como cerrado o previamente integrado;
- el diff debe pasar `git diff --check`;
- debe revisarse el diff completo;
- debe confirmarse que no existe modificación fuera del archivo nuevo;
- el HEAD exacto revisado debe coincidir con el HEAD que se pretenda integrar.

Hasta ese momento, la fuente normativa vigente continúa siendo `WORKFLOW_SIMPLIFICADO_CHAT_WEB_GPT_GEMINI_3_8.md` en `main`.
