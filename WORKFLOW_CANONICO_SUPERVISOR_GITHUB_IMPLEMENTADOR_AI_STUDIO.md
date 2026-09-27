# Workflow canónico — Supervisor + GitHub + Agente implementador + AI_STUDIO_OPERATOR

> **Estado:** workflow canónico activo del proyecto desde la integración de Issue #47 mediante PR #49 en `main@866d7aaa793cb9d1a2675965f911c6ddb37275e9`.
>
> **Baseline:** `WORKFLOW_SIMPLIFICADO_CHAT_WEB_GPT_GEMINI_3_8.md` en `main@ff1a7d46c3f9992adbcc41b933cc13c3501fc617` (blob `d6fd666d5be7659784f6f20021ba4a3515d45f14`).
>
> **Base de consolidación validada:** historial aceptado por el Supervisor en Issue #47, comentario `issuecomment-5851766362`.
>
> **Regla de consolidación:** preservar la función y significado del baseline; incorporar únicamente mejoras ya canónicas o reglas operativas verificadas y persistidas. No importar recomendaciones no adoptadas.

## Estado de procedencia

Ya están integradas en el baseline y se preservan sin reimplementarlas:

- Issue #4 / PR #5 — autoridad de merge del Supervisor;
- Issue #26 / PR #27 — GitHub Actions como CI persistente y CI como evidencia;
- Issue #32 / PR #33 — `AI_STUDIO_OPERATOR` subordinado y no-write;
- Issue #36 / PR #38 — contrato residente, bootstrap/recovery, `CANONICAL_GIT_CHECKOUT`, `MANAGED_PREVIEW_ROOT`, materialización one-way, cwd/process safety, SHA Gate y reporting. Su antigua autoridad AI Studio `PUBLISH` queda explícitamente SUPERSEDED por Issue #60.

Reglas operativas verificadas que estaban pendientes de integración canónica antes de la consolidación de Issue #47:

- Issue #35 — `RESEARCH_GATE + STRATEGIC_RATIONALE`;
- Issue #39 — `TECHNICAL PERMISSION != WORKFLOW AUTHORITY` y `AI_STUDIO_ALLOWED_REPOSITORY_WRITES = NONE`.

Issue #35 y Issue #39 permanecen OPEN. Antes de PR #49 sus reglas eran operativamente vigentes pero todavía no estaban integradas canónicamente; quedaron incorporadas a este workflow mediante la integración de Issue #47. Su estado OPEN no equivale a ausencia de esa integración y su cierre conserva su propio lifecycle.

El registro `recomendaciones/MEJORAS_WORKFLOW.md` es provenance de recomendaciones. Según la revisión histórica validada en #47, sólo la recomendación de CI fue adoptada mediante #26; las restantes recomendaciones no se importan por el solo hecho de estar documentadas.

## 1. Objetivo

Este workflow organiza el trabajo colaborativo entre:

- **Chat Web GPT**: planificación, arquitectura, definición de tareas y revisión.
- **Agente implementador**: implementación y escritura técnica mediante Codespaces/terminal u otro canal de implementación expresamente autorizado.
- **AI_STUDIO_OPERATOR**: fallback excepcional de Google AI Studio, sólo tras bloqueo técnico intrínseco demostrado por el Implementador y verificado por el Supervisor; nunca implementa código, nunca escribe repositorio y nunca publica.
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
autenticación y permisos
trade-offs importantes
publicación operacional aprobada
```

Regla de publicación:

```text
PUBLISH = HUMAN ACTION
```

Cuando exista una publicación, el Supervisor debe haber confirmado previamente el estado/SHA aprobado y las precondiciones aplicables. La acción de publicar corresponde al Humano.

Esta autoridad de publicación **no convierte al Humano en implementador de código**. El Humano no edita producto, no prepara parches y no sustituye al Agente implementador. Tampoco transfiere autoridad de publicación al Agente implementador ni a AI Studio.

No debería tener que copiar diffs, código, contexto técnico ni resultados extensos entre Chat Web GPT y el Agente implementador.

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


# 29. AI_STUDIO_OPERATOR — fallback excepcional por escalamiento verificado

AI Studio no es una ruta paralela de implementación, revisión rutinaria ni publicación.

Ruta técnica normal:

```text
Human intent/decision
→ Supervisor
→ Work Item
→ Web Implementer / Agente implementador
→ implementación o ejecución técnica
→ tests/evidence
→ branch/commit/PR cuando existen cambios de repositorio
→ Supervisor review
```

Reglas absolutas:

```text
AI Studio is never the code implementer.
AI Studio is never a routine reviewer.
AI Studio never writes repository/product code.
AI Studio has no PUBLISH authority.
```

El contrato residente `AI_STUDIO_OPERATOR.md` es subordinado a este workflow y no puede ampliar autoridad.

## 29.1 Permission Matrix

| Capacidad | AI_STUDIO_OPERATOR |
|---|---|
| READ / OBSERVE | CONDITIONAL — sólo tras §29.2 |
| PULL / SYNC FROM GITHUB | CONDITIONAL — read-only, sólo tras §29.2 |
| PREVIEW | CONDITIONAL — sólo tras §29.2 |
| TEST | CONDITIONAL — sólo tras §29.2 |
| DIAGNOSE | CONDITIONAL — sólo tras §29.2 |
| SPIKE_READ_ONLY | CONDITIONAL — sólo tras §29.2 |
| EXTERNAL PLATFORM MUTATION | CONDITIONAL — sólo tras §29.2 y scope explícito |
| PUBLISH external operational state | NO — HUMAN ONLY |
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

Los nombres de capacidades técnicas no conceden autoridad. Incluso una operación read-only requiere primero el gate de escalamiento.

`PULL / SYNC` sólo consume/importa desde GitHub; nunca autoriza sync-back.

## 29.2 Gate universal de escalamiento AI Studio

**Toda** intervención AI Studio, incluyendo `OBSERVE`, `PREVIEW`, `TEST`, `DIAGNOSE`, `SPIKE_READ_ONLY` y `PLATFORM_MUTATE`, requiere que todas estas condiciones sean verdaderas:

1. existe un Work Item explícito;
2. el Web Implementer / Agente implementador intentó primero la tarea u operación por un canal autorizado;
3. existe evidencia concreta y persistida de un bloqueo técnico intrínseco del canal implementador;
4. el Supervisor verificó independientemente esa evidencia;
5. el Supervisor determinó que no existe una vía razonable en el canal implementador;
6. el Supervisor emitió un `AI_STUDIO_REQUEST` explícito;
7. el request autoriza una sola operación mínima y acotada que únicamente busca despejar el bloqueo;
8. la operación termina en `AI_STUDIO_REPORT` y `STOP → Supervisor`.

Si falta una condición:

```text
AI Studio: DO NOT EXECUTE
RESULT: BLOCKED
control → Supervisor
```

No existe continuación automática entre operaciones AI Studio.

Regla mínima:

```text
observe/attempt through Implementer
→ verified intrinsic blocker
→ AI Studio gets the smallest operation that only clears that blocker
→ verify
→ report
→ STOP
```

No asignar tareas amplias como diagnose + mutate + verify + publish, materialize + preview + publish, varias mutaciones independientes, revisión general del producto o implementación de una feature.

## 29.3 Inicio: AI_STUDIO_REQUEST y modos técnicos

Los modos son descriptores técnicos, no autorización autónoma:

```text
OBSERVE
PREVIEW
TEST
DIAGNOSE
SPIKE_READ_ONLY
PLATFORM_MUTATE
```

`PUBLISH` no es un modo AI Studio.

Cada `AI_STUDIO_REQUEST` debe incluir como mínimo:

```text
WORK ITEM: #<issue>
ESCALATION VERIFIED: YES
IMPLEMENTER BLOCKER EVIDENCE: <persisted reference>
MODE: OBSERVE | PREVIEW | TEST | DIAGNOSE | SPIKE_READ_ONLY | PLATFORM_MUTATE
EXPECTED SHA: <sha> | N/A (platform-only)
TARGET: <exact target>
TASK: <una sola operación mínima>
PRECONDITIONS: <observable conditions>
STOP CONDITIONS: <conditions that force BLOCKED/return>
EVIDENCE REQUIRED: <minimal evidence>
ROLLBACK: <plan | N/A + justification, when mutation applies>
FORBIDDEN: code/repository write; Fix; dependency/schema/prompt/workflow/repository-secret changes; publish/share
RETURN: RESULT + CLASSIFICATION + EVIDENCE + ERROR + STOP → Supervisor
```

`EXPECTED SHA: N/A (platform-only)` sólo se admite cuando la operación no depende de una versión del código.

`PLATFORM_MUTATE` requiere evidencia before/after saneada y rollback para acciones reversibles, o `ROLLBACK: N/A` justificado.

## 29.4 SHA Gate y evidencia

Toda escalación dependiente del código requiere:

1. origin esperado;
2. `EXPECTED SHA == OBSERVED SHA`;
3. checkout canónico limpio;
4. lectura de `AI_STUDIO_OPERATOR.md` desde el mismo SHA;
5. `CANONICAL_GIT_CHECKOUT` identificado;
6. `MANAGED_PREVIEW_ROOT` identificado cuando la operación dependa de Preview/runtime;
7. evidencia de que el árbol aprobado es el observado/ejecutado cuando aplique.

Mismatch material:

```text
STOP
RESULT: BLOCKED
CLASSIFICATION: AI_STUDIO_ENVIRONMENT
```

Un clone exacto no prueba por sí solo el Preview. La materialización one-way, cuando sea necesaria, debe usar una vía soportada sin inventar/reconstruir archivos ni sincronizar de vuelta a GitHub.

`PASS` no equivale a `SEMANTIC_ACCEPTED`; `FAIL` no equivale automáticamente a `REWORK`.

## 29.5 Ventana única de intervención

AI Studio no tiene ventanas rutinarias antes/durante implementación, PR review o post-merge.

Su única ventana válida es:

```text
Implementer attempted
→ intrinsic blocker persisted
→ Supervisor verified
→ no reasonable Implementer path
→ one minimal AI_STUDIO_REQUEST
→ one operation
→ AI_STUDIO_REPORT
→ STOP → Supervisor
```

Esto aplica también a asistencia read-only. AI Studio no es segundo revisor, smoke-test rutinario, checker post-merge ni canal normal de Preview.

## 29.6 Clasificación, seguridad operacional y recuperación

Clasificaciones válidas: `CODE`, `AI_STUDIO_ENVIRONMENT`, `DEPLOYMENT`, `EXTERNAL_SERVICE`, `UNKNOWN`.

`CODE` exige evidencia en el mismo SHA y no autoriza a AI Studio a corregirlo.

Reglas preservadas:

- cwd exacto/path absoluto; mismatch → STOP/BLOCKED;
- process safety con PID/comando/cwd exactos, cierre graceful, sin kill amplio ni loops de takeover;
- recovery transitorio con chequeos mínimos, sin loops de retry;
- secret safety: no imprimir/copiar tokens, credenciales, API keys, support emails u otros valores sensibles;
- scope safety: no ampliar target/operación;
- billing/security: billing/Blaze, servicio pagado, producción no autorizada, permiso material nuevo o credencial fuera del contexto autorizado → STOP.

## 29.7 Publicación — exclusiva del Humano

```text
PUBLISH = HUMAN ACTION
AI_STUDIO_PUBLISH_AUTHORITY = NONE
```

El Supervisor puede confirmar el SHA/estado aprobado y las precondiciones. La acción operacional de publicar/compartir corresponde al Humano.

AI Studio no pulsa Publish, no ejecuta comandos equivalentes y no convierte Preview/TEST/DIAGNOSE/PLATFORM_MUTATE en publicación.

El Web Implementer tampoco adquiere autoridad humana de publicación por esta regla.

## 29.8 RESEARCH_GATE y SPIKE_READ_ONLY

`RESEARCH_GATE` permanece vigente conforme a §30.

La investigación ordinaria se realiza por Supervisor o Agente implementador. `SPIKE_READ_ONLY` en AI Studio no es una fase rutinaria del Research Gate y sólo puede usarse después de satisfacer §29.2 para una única observación mínima.

La investigación produce evidencia, no decisión ni implementación.

## 29.9 Regla absoluta de no escritura de repositorio/product-code

```text
AI_STUDIO_ALLOWED_REPOSITORY_WRITES = NONE
ALLOWED WRITE PATHS = NONE
repository/product-code write = NO
```

AI Studio nunca puede implementar features/fixes, editar archivos, aplicar Fix, cambiar dependencias/schema/prompts/workflow, commit/push/branch/PR/merge, escribir `main`, cambiar repository secrets ni sincronizar hacia GitHub.

Preparación efímera sólo se admite cuando sea estrictamente necesaria para la única operación escalada y no cambie repositorio.

Necesidad de escritura de repositorio:

```text
STOP → Supervisor → Agente implementador / nuevo Work Item según corresponda
```

## 29.10 AI_STUDIO_REPORT y STOP obligatorio

```text
AI_STUDIO_REPORT
WORK ITEM: #<issue>
MODE: <OBSERVE | PREVIEW | TEST | DIAGNOSE | SPIKE_READ_ONLY | PLATFORM_MUTATE>
EXPECTED SHA: <sha> | N/A (platform-only)
OBSERVED SHA: <sha> | N/A (platform-only)
RESULT: PASS | FAIL | BLOCKED
CLASSIFICATION: CODE | AI_STUDIO_ENVIRONMENT | DEPLOYMENT | EXTERNAL_SERVICE | UNKNOWN
EVIDENCE:
- ESCALATION VERIFIED: YES | NO
- IMPLEMENTER BLOCKER: <persisted reference>
- ORIGIN: <origin or N/A>
- CANONICAL_GIT_CHECKOUT: <path or N/A>
- MANAGED_PREVIEW_ROOT: <path or N/A>
- MATERIALIZATION: <evidence or N/A>
- COMMAND/ACTION: <single action>
- GIT_STATUS: <clean/output/N/A>
- HTTP: <status/endpoint or N/A>
- PLATFORM BEFORE: <sanitized state or N/A>
- PLATFORM AFTER: <sanitized state or N/A>
- ROLLBACK: <performed/available/N/A + reason>
ERROR: <sanitized exact error or none>
CODE/REPOSITORY MODIFIED: NO
PLATFORM MODIFIED: YES | NO
STOP → Supervisor
```

No incluir razonamiento interno ni valores secretos.

## 29.11 Fallback de mutación externa de plataforma

`PLATFORM_MUTATE` es un caso particular de §29.2, no una ruta alternativa.

Además requiere target/scope exactos, baseline observable, evidencia before/after, rollback cuando corresponda y STOP CONDITIONS específicas.

Puede abarcar sólo estado externo estrictamente requerido por el Work Item. No autoriza código/producto/repositorio, repository secrets, dependencias/schema/prompts/workflow, billing/Blaze/servicios pagados, producción no autorizada ni publicación.

Si baseline/rollback no son verificables de forma segura, aparece permiso/credencial nuevo, cambia el scope o surge comportamiento inesperado que aumente riesgo:

```text
STOP → BLOCKED → Supervisor
```

`TECHNICAL PERMISSION != WORKFLOW AUTHORITY` permanece vigente antes, durante y después de toda escalación.

---

# 30. RESEARCH_GATE + STRATEGIC_RATIONALE

**Provenance:** Issue #35. Antes de la integración de PR #49, Issue #35 permanecía OPEN y esta regla existía como decisión humana operativamente vigente, todavía no integrada canónicamente. La regla quedó consolidada en el workflow canónico mediante Issue #47 / PR #49. Issue #35 permanece OPEN.

## 30.1 Cuándo se activa RESEARCH_GATE

Antes de proponer o implementar una decisión técnica o estratégica material cuya validez dependa de información externa susceptible de cambio, el agente debe activar `RESEARCH_GATE`.

Incluye, como mínimo, decisiones dependientes de:

- versiones de SDK, API o runtime;
- librerías, frameworks o herramientas;
- estrategia de despliegue;
- integración con proveedores o plataformas;
- autenticación o seguridad dependiente de servicios externos;
- formatos o protocolos externos;
- límites, cuotas, planes o condiciones vigentes;
- alternativas de arquitectura o ingeniería cuya conveniencia dependa del estado actual del ecosistema.

No se activa automáticamente para decisiones locales, mecánicas o completamente determinadas por la documentación y el código vigentes, por ejemplo nombres, formato, refactors triviales autorizados o implementación directa sin dependencia de información externa mutable.

## 30.2 Investigación y evidencia

Cuando el gate se activa, el agente debe:

1. identificar explícitamente el punto de decisión;
2. explicar qué dato externo actual necesita confirmar;
3. investigar fuentes vigentes, priorizando fuentes primarias/oficiales;
4. separar hechos del proyecto, hechos externos verificados, inferencias e incertidumbres;
5. registrar la propuesta y evidencia en el Issue del Work Item;
6. devolver control al Supervisor antes de aplicar una estrategia no determinada ya por el Work Item.

Fuentes prioritarias:

- documentación oficial del proveedor;
- especificaciones;
- release notes;
- repositorios oficiales;
- documentación técnica oficial.

Blogs, foros y comunidad pueden aportar contexto o descubrimiento, pero no deben ser la única base cuando existe una fuente primaria relevante.

La investigación produce evidencia y propuesta. **No equivale a decisión aprobada.**

## 30.3 Verificación del Supervisor

El Supervisor contrasta de forma independiente las afirmaciones estratégicas relevantes antes de autorizar su aplicación y las evalúa contra:

- Objective;
- Acceptance Criteria;
- Authorized Scope;
- arquitectura;
- especificaciones;
- workflow;
- estado actual del repositorio y SHA.

Si la conclusión exige cambiar intención de producto, ampliar scope, adoptar una integración no autorizada, introducir credenciales o costes, cambiar el workflow fuera del Work Item o tomar una decisión reservada al Humano, el Supervisor usa `ESCALATE` en vez de aplicarla unilateralmente.

## 30.4 STRATEGIC_RATIONALE

La justificación se persiste en el Issue del Work Item para decisiones estratégicas/materiales, no para actividad mecánica como “copié”, “leí” o “ejecuté”.

Plantilla mínima:

```text
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
```

`Rationale Status` no crea estados formales nuevos. Los estados formales del Supervisor permanecen exactamente:

```text
SEMANTIC_ACCEPTED
REWORK
HOLD
ESCALATE
```

Si una decisión estratégica cambia, se conserva el razonamiento histórico y la decisión anterior se marca `SUPERSEDED` cuando corresponda; no se borra la evidencia previa.

## 30.5 Aplicación por rol y límites de autoridad

**Agente implementador**

- no inventa versiones, APIs o prácticas actuales;
- investiga antes de escoger una estrategia técnica material no determinada;
- registra propuesta y evidencia;
- no amplía scope;
- implementa sólo después de la autorización del Supervisor cuando la estrategia no esté ya determinada.

**AI_STUDIO_OPERATOR**

No es una vía rutinaria del Research Gate. Sólo participa si primero se satisface el gate universal de §29.2: intento del Implementador, bloqueo técnico intrínseco persistido, verificación del Supervisor y ausencia de vía razonable en el canal implementador. En esa única operación mínima separa observación directa, documentación actual, inferencia y desconocido; devuelve evidencia al Supervisor, no convierte su recomendación en decisión canónica y termina en STOP.

**Supervisor**

- decide si el Research Gate está satisfecho;
- contrasta evidencia de forma independiente;
- decide únicamente dentro de la autoridad ya existente;
- usa `ESCALATE` cuando corresponda.

Este protocolo no concede nueva autoridad de escritura, merge, scope o decisión al Agente implementador ni a AI Studio.


---

# 31. TECHNICAL PERMISSION != WORKFLOW AUTHORITY

**Provenance:** Issue #39. La regla quedó consolidada mediante Issue #47 / PR #49 y permanece vigente.

```text
TECHNICAL PERMISSION != WORKFLOW AUTHORITY
AI_STUDIO_ALLOWED_REPOSITORY_WRITES = NONE
ALLOWED WRITE PATHS = NONE
AI_STUDIO_EXTERNAL_PLATFORM_WRITES = CONDITIONAL_ESCALATION_ONLY
AI_STUDIO_PUBLISH_AUTHORITY = NONE
```

Scopes técnicos de lectura, escritura, Preview, entorno o publicación no conceden autoridad operacional.

La ruta normal es el Web Implementer / Agente implementador. Cualquier uso de AI Studio exige primero §29.2.

La única escritura externa posible desde AI Studio es una mutación de plataforma mínima expresamente autorizada después del gate; nunca repositorio/product-code y nunca publicación.

AI Studio no puede usar capacidad técnica disponible para Push Changes, stage/commit, branch/PR, workflow edits, escritura a main, modificación de archivos, sync-back o publicación.

La instalación GitHub App permanece restringida a `cmiloarevalo-hash/G_INF_01` salvo decisión humana explícita.

Una allowlist documental no constituye enforcement técnico suficiente.

## 31.1 Escritura de repositorio/product-code

No existe excepción activa.

```text
AI_STUDIO_ALLOWED_REPOSITORY_WRITES = NONE
ALLOWED WRITE PATHS = NONE
repository/product-code write = NO
```

El namespace histórico `docs/ai-studio-evidence/**` permanece `NOT AUTHORIZED / NOT ACTIVE`.

Cualquier excepción futura requiere decisión humana explícita, Work Item separado, control GitHub-side verificable y actualización canónica previa.

## 31.2 Escalación AI Studio

Issue #60 generaliza el fallback a toda intervención AI Studio:

```text
normal path:
Web Implementer / Agente implementador

fallback:
AI_STUDIO_OPERATOR
sólo ante bloqueo técnico intrínseco demostrado
+ Supervisor verification
+ no reasonable Implementer path
+ one minimal AI_STUDIO_REQUEST
+ one operation
+ STOP → Supervisor
```

Los modos read-only no omiten el gate. `PLATFORM_MUTATE` añade baseline, before/after, rollback y STOP CONDITIONS.

Publicación:

```text
PUBLISH = HUMAN ACTION
AI_STUDIO_PUBLISH_AUTHORITY = NONE
```

Blaze/billing, servicios pagados y producción siguen requiriendo decisión humana independiente.

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

# Apéndice A — Provenance de mejoras consolidadas

| Fuente | Estado antes de la consolidación de #47 | Evidencia de integración / estado actual | Tratamiento en este documento |
|---|---|---|---|
| Issue #4 / PR #5 | CANONICAL | PR #5 merged; merge `7ceb98e7cff1621f21b3d9b5929acc7a264af739` | PRESERVED en §24 |
| Issue #26 / PR #27 | CANONICAL | PR #27 merged; merge `3fa731a13fd2a77531392fd5b22fd240c9091ba6` | PRESERVED en §22 |
| Issue #32 / PR #33 | CANONICAL | PR #33 merged; merge `d2325a23232e72599ffecc96a354c41490b5f527` | PRESERVED en §29 |
| Issue #36 / PR #38 | CANONICAL | PR #38 merged; merge `1a4167c1e29b46efaf09662b8fb11919bfac44cf` | PRESERVED en §29 + `AI_STUDIO_OPERATOR.md` |
| Issue #35 | OPERATIONAL_PENDING | Regla integrada canónicamente por Issue #47 / PR #49; Issue permanece OPEN | NEW §30, consolidado canónicamente por PR #49 |
| Issue #39 | OPERATIONAL_PENDING | Regla integrada canónicamente por Issue #47 / PR #49; Issue permanece OPEN; PR #40 siguió closed/not merged | NEW §31, consolidado canónicamente por PR #49 |
| PR #40 | SUPERSEDED as implementation evidence | Persisted #39 handoff invalidates reuse after role-separation violation | Excluded as canonical integration evidence |
| PR #49 | PROPOSED antes del merge | MERGED; merge `866d7aaa793cb9d1a2675965f911c6ddb37275e9` | Vehículo de integración canónica de Issue #47 |


---

# Apéndice B — Handover canónico

Desde la integración de PR #49 en `main@866d7aaa793cb9d1a2675965f911c6ddb37275e9`, la fuente normativa vigente es:

`WORKFLOW_CANONICO_SUPERVISOR_GITHUB_IMPLEMENTADOR_AI_STUDIO.md` en `main`.

El handover canónico quedó aplicado así:

- `WORKFLOW_CANONICO_SUPERVISOR_GITHUB_IMPLEMENTADOR_AI_STUDIO.md` es la fuente canónica activa del workflow;
- `WORKFLOW_SIMPLIFICADO_CHAT_WEB_GPT_GEMINI_3_8.md` queda retenido únicamente para trazabilidad histórica y contiene una referencia explícita al nuevo archivo;
- no deben tratarse ambos archivos como workflows canónicos simultáneamente;
- el merge de #47 no cierra automáticamente Issues #35 o #39; su cierre requiere evidencia y decisión conforme a su estado real.

La autoridad canónica descrita aquí proviene del estado integrado en `main`, no de la antigua branch o PR de trabajo.


---

# Apéndice C — Matriz completa de trazabilidad del baseline

Criterios:

- `PRESERVED`: contenido operativo del baseline se conserva semánticamente.
- `MOVED`: contenido trasladado sin pérdida semántica.
- `EXPANDED`: contenido existente conservado y ampliado por una regla ya autorizada.
- `NEW`: contenido sin sección equivalente en el baseline, sustentado por evidencia autorizada.
- `REMOVED`: eliminación propuesta; requiere justificación y autorización expresa.

Para las 49 secciones/subsecciones estructurales del baseline, `PRESERVED` es el resultado. No se propone `MOVED`, `EXPANDED` ni `REMOVED` sobre contenido del baseline; las reglas operativas validadas se incorporan como secciones nuevas para evitar reescritura silenciosa del material vigente.

| Sección/subsección del baseline | Clasificación | Ubicación nueva | Nota |
|---|---|---|---|
| 1. Objetivo | PRESERVED | 1. Objetivo | Contenido operativo del baseline conservado; sin cambio silencioso de autoridad o lifecycle. |
| 2. Principio fundamental | PRESERVED | 2. Principio fundamental | Contenido operativo del baseline conservado; sin cambio silencioso de autoridad o lifecycle. |
| 3. Responsabilidades | PRESERVED | 3. Responsabilidades | Contenido operativo del baseline conservado; sin cambio silencioso de autoridad o lifecycle. |
| 3.1 Chat Web GPT | PRESERVED | 3.1 Chat Web GPT | Contenido operativo del baseline conservado; sin cambio silencioso de autoridad o lifecycle. |
| 4. Agente implementador | PRESERVED | 4. Agente implementador | Contenido operativo del baseline conservado; sin cambio silencioso de autoridad o lifecycle. |
| 5. GitHub | PRESERVED | 5. GitHub | Contenido operativo del baseline conservado; sin cambio silencioso de autoridad o lifecycle. |
| 6. Documentación del proyecto | PRESERVED | 6. Documentación del proyecto | Contenido operativo del baseline conservado; sin cambio silencioso de autoridad o lifecycle. |
| 7. Unidad de trabajo: GitHub Issue | PRESERVED | 7. Unidad de trabajo: GitHub Issue | Contenido operativo del baseline conservado; sin cambio silencioso de autoridad o lifecycle. |
| 8. Dos tipos de scope | PRESERVED | 8. Dos tipos de scope | Contenido operativo del baseline conservado; sin cambio silencioso de autoridad o lifecycle. |
| Semantic Scope | PRESERVED | Semantic Scope | Contenido operativo del baseline conservado; sin cambio silencioso de autoridad o lifecycle. |
| Path Scope | PRESERVED | Path Scope | Contenido operativo del baseline conservado; sin cambio silencioso de autoridad o lifecycle. |
| 9. Flujo completo | PRESERVED | 9. Flujo completo | Contenido operativo del baseline conservado; sin cambio silencioso de autoridad o lifecycle. |
| Fase A — intención | PRESERVED | Fase A — intención | Contenido operativo del baseline conservado; sin cambio silencioso de autoridad o lifecycle. |
| Fase B — creación del Work Item | PRESERVED | Fase B — creación del Work Item | Contenido operativo del baseline conservado; sin cambio silencioso de autoridad o lifecycle. |
| 10. Inicio del Agente implementador | PRESERVED | 10. Inicio del Agente implementador | Contenido operativo del baseline conservado; sin cambio silencioso de autoridad o lifecycle. |
| 11. Bootstrap del Agente implementador | PRESERVED | 11. Bootstrap del Agente implementador | Contenido operativo del baseline conservado; sin cambio silencioso de autoridad o lifecycle. |
| 12. Política de lectura | PRESERVED | 12. Política de lectura | Contenido operativo del baseline conservado; sin cambio silencioso de autoridad o lifecycle. |
| 13. Implementación | PRESERVED | 13. Implementación | Contenido operativo del baseline conservado; sin cambio silencioso de autoridad o lifecycle. |
| 14. Problemas descubiertos durante el trabajo | PRESERVED | 14. Problemas descubiertos durante el trabajo | Contenido operativo del baseline conservado; sin cambio silencioso de autoridad o lifecycle. |
| 15. Verificación local | PRESERVED | 15. Verificación local | Contenido operativo del baseline conservado; sin cambio silencioso de autoridad o lifecycle. |
| 16. Publicación | PRESERVED | 16. Publicación | Contenido operativo del baseline conservado; sin cambio silencioso de autoridad o lifecycle. |
| 17. Handoff del Agente implementador | PRESERVED | 17. Handoff del Agente implementador | Contenido operativo del baseline conservado; sin cambio silencioso de autoridad o lifecycle. |
| 18. Revisión de Chat Web GPT | PRESERVED | 18. Revisión de Chat Web GPT | Contenido operativo del baseline conservado; sin cambio silencioso de autoridad o lifecycle. |
| 19. Significado de las decisiones | PRESERVED | 19. Significado de las decisiones | Contenido operativo del baseline conservado; sin cambio silencioso de autoridad o lifecycle. |
| SEMANTIC_ACCEPTED | PRESERVED | SEMANTIC_ACCEPTED | Contenido operativo del baseline conservado; sin cambio silencioso de autoridad o lifecycle. |
| REWORK | PRESERVED | REWORK | Contenido operativo del baseline conservado; sin cambio silencioso de autoridad o lifecycle. |
| HOLD | PRESERVED | HOLD | Contenido operativo del baseline conservado; sin cambio silencioso de autoridad o lifecycle. |
| ESCALATE | PRESERVED | ESCALATE | Contenido operativo del baseline conservado; sin cambio silencioso de autoridad o lifecycle. |
| 20. REWORK | PRESERVED | 20. REWORK | Contenido operativo del baseline conservado; sin cambio silencioso de autoridad o lifecycle. |
| 21. Decisión vigente | PRESERVED | 21. Decisión vigente | Contenido operativo del baseline conservado; sin cambio silencioso de autoridad o lifecycle. |
| 22. CI | PRESERVED | 22. CI | Contenido operativo del baseline conservado; sin cambio silencioso de autoridad o lifecycle. |
| 23. Integración | PRESERVED | 23. Integración | Contenido operativo del baseline conservado; sin cambio silencioso de autoridad o lifecycle. |
| 24. Merge | PRESERVED | 24. Merge | Contenido operativo del baseline conservado; sin cambio silencioso de autoridad o lifecycle. |
| 25. Cambio de sesión del Agente implementador | PRESERVED | 25. Cambio de sesión del Agente implementador | Contenido operativo del baseline conservado; sin cambio silencioso de autoridad o lifecycle. |
| 26. Cambio de sesión de Chat Web GPT | PRESERVED | 26. Cambio de sesión de Chat Web GPT | Contenido operativo del baseline conservado; sin cambio silencioso de autoridad o lifecycle. |
| 27. Rol del humano | PRESERVED | 27. Rol del humano | Contenido operativo del baseline conservado; sin cambio silencioso de autoridad o lifecycle. |
| 28. Reglas esenciales | PRESERVED | 28. Reglas esenciales | Contenido operativo del baseline conservado; sin cambio silencioso de autoridad o lifecycle. |
| 29. AI_STUDIO_OPERATOR — protocolo subordinado de operación externa | PRESERVED | 29. AI_STUDIO_OPERATOR — protocolo subordinado de operación externa | Contenido operativo del baseline conservado; sin cambio silencioso de autoridad o lifecycle. |
| 29.1 Permission Matrix | PRESERVED | 29.1 Permission Matrix | Contenido operativo del baseline conservado; sin cambio silencioso de autoridad o lifecycle. |
| 29.2 Inicio: AI_STUDIO_REQUEST | PRESERVED | 29.2 Inicio: AI_STUDIO_REQUEST | Contenido operativo del baseline conservado; sin cambio silencioso de autoridad o lifecycle. |
| 29.3 Modos y disciplina de prompts | PRESERVED | 29.3 Modos y disciplina de prompts | Contenido operativo del baseline conservado; sin cambio silencioso de autoridad o lifecycle. |
| 29.4 SHA Gate | PRESERVED | 29.4 SHA Gate | Contenido operativo del baseline conservado; sin cambio silencioso de autoridad o lifecycle. |
| 29.5 Ventanas de intervención | PRESERVED | 29.5 Ventanas de intervención | Contenido operativo del baseline conservado; sin cambio silencioso de autoridad o lifecycle. |
| 29.6 Clasificación y diagnóstico | PRESERVED | 29.6 Clasificación y diagnóstico | Contenido operativo del baseline conservado; sin cambio silencioso de autoridad o lifecycle. |
| 29.7 Protocolo PUBLISH | SUPERSEDED | 29.7 Publicación — exclusiva del Humano | Issue #60 elimina autoridad PUBLISH de AI Studio; `PUBLISH = HUMAN ACTION`. |
| 29.8 SPIKE_READ_ONLY para integraciones Google | PRESERVED | 29.8 SPIKE_READ_ONLY para integraciones Google | Contenido operativo del baseline conservado; sin cambio silencioso de autoridad o lifecycle. |
| 29.9 Regla absoluta de no escritura | PRESERVED | 29.9 Regla absoluta de no escritura | Contenido operativo del baseline conservado; sin cambio silencioso de autoridad o lifecycle. |
| 29.10 Fin: AI_STUDIO_REPORT y evidencia | PRESERVED | 29.10 Fin: AI_STUDIO_REPORT y evidencia | Contenido operativo del baseline conservado; sin cambio silencioso de autoridad o lifecycle. |
| Resultado | PRESERVED | Resultado | Contenido operativo del baseline conservado; sin cambio silencioso de autoridad o lifecycle. |
| Issue #35 — RESEARCH_GATE + STRATEGIC_RATIONALE | NEW | §30 | Regla operativa humana validada; OPEN antes de PR #49; integrada canónicamente vía Issue #47 / PR #49; Issue permanece OPEN. |
| Issue #39 — TECHNICAL PERMISSION != WORKFLOW AUTHORITY | NEW | §31 | Regla operativa humana validada; OPEN antes de PR #49; integrada canónicamente vía Issue #47 / PR #49; PR #40 no se usa como integración canónica; Issue permanece OPEN. |
| Provenance histórica validada | NEW | Apéndice A | Metadato de trazabilidad; no crea autoridad nueva. |
| Handover old → new | NEW | Apéndice B | Mecánica de reemplazo ejecutada mediante el merge de PR #49; evita dos fuentes aparentemente canónicas. |

Resumen:

- baseline estructural: **49/49 representado**;
- `PRESERVED`: 49;
- `MOVED`: 0;
- `EXPANDED`: 0;
- `REMOVED`: 0;
- reglas operativas nuevas respecto del baseline: 2, ambas respaldadas por decisiones humanas persistidas (#35 y #39);
- recomendaciones no adoptadas importadas: 0.
