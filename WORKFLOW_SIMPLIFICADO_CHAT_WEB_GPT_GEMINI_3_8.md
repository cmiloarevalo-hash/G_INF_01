# Workflow simplificado — Chat Web GPT + GitHub + Agente implementador + AI_STUDIO_OPERATOR

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

El workflow simplificado utiliza la documentación normal del producto:

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

El workflow simplificado puede resumirse en diez reglas:

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

`PULL / SYNC` nunca autoriza sincronización de cambios de vuelta al repositorio.

## 29.2 Inicio: AI_STUDIO_REQUEST

Toda intervención usada como evidencia del workflow comienza por solicitud explícita del Supervisor y un Work Item existente:

```text
AI_STUDIO_REQUEST

WORK ITEM: #<issue>
MODE: OBSERVE | PREVIEW | TEST | DIAGNOSE | PUBLISH | SPIKE_READ_ONLY
EXPECTED SHA: <sha> | N/A (platform-only)
TARGET: <preview / route / deployment / platform capability>
TASK: <una sola operación concreta>

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

Una operación por prompt. No usar tareas abiertas como “arregla todo” o “actualiza la interfaz”. `Fix` permanece prohibido.

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

## 29.7 Protocolo PUBLISH

```text
approved GitHub SHA
→ AI_STUDIO_REQUEST MODE=PUBLISH
→ pull/sync/import desde GitHub
→ SHA Gate
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

La preparación efímera interna para ejecutar Preview sólo es admisible si no modifica ni sincroniza archivos de vuelta a GitHub.

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

La evidencia sólo adquiere persistencia para el workflow cuando se registra en el Issue o PR correspondiente, asociada al Work Item, modo, SHA aplicable, resultado, clasificación y evidencia concreta.

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
