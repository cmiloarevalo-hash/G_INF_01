# Workflow simplificado — Chat Web GPT + GitHub + Agente Gemini 3.8

## 1. Objetivo

Este workflow organiza el trabajo colaborativo entre:

- **Chat Web GPT**: planificación, arquitectura, definición de tareas y revisión.
- **Agente Gemini 3.8**: implementación y escritura técnica dentro de IA Studio.
- **GitHub**: memoria persistente, tareas, código, evidencia y coordinación.
- **Humano**: intención del producto, prioridades, permisos y decisiones excepcionales.

No utiliza GoFlow ni una mini aplicación auxiliar.

La idea principal es:

```text
Chat Web GPT
    ↓ define trabajo
GitHub Issue
    ↓
Agente Gemini 3.8
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

Ni Chat Web GPT ni Agente Gemini 3.8 deben depender de recordar conversaciones anteriores.

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

# 4. Agente Gemini 3.8

Es el **desarrollador**.

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

Debe ser suficientemente pequeño para que el Agente Gemini pueda ejecutarlo sin reconstruir todo el proyecto.

Idealmente:

```text
1 Issue
→ 1 objetivo
→ 1 branch
→ 1 PR
```

Es un default, no una obligación absoluta.

---

# 10. Inicio del Agente Gemini 3.8

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

# 11. Bootstrap del Agente Gemini 3.8

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

Agente Gemini 3.8 no debe leer todo el repositorio automáticamente.

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

Si Gemini encuentra otro problema:

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

# 17. Handoff de Gemini

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

Chat Web GPT no debe aceptar simplemente porque Gemini diga que terminó.

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

Gemini:

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

# 25. Cambio de sesión de Gemini

Si desaparece la sesión del Agente Gemini:

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

entre Chat Web GPT y Gemini.

Un mensaje humano ideal puede ser simplemente:

```text
Gemini: trabaja Issue #123.
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
4. Gemini implementa; Chat Web GPT revisa.
5. Gemini no se autoaprueba.
6. Scope significa comportamiento autorizado + rutas autorizadas.
7. Una decisión de review sólo vale para el SHA revisado.
8. Tests/CI son evidencia, no aprobación.
9. REWORK del mismo objetivo permanece en el mismo Issue/PR.
10. Una sesión nueva reconstruye desde GitHub; no desde el transcript anterior.

---


# 29. AI_STUDIO_OPERATOR — protocolo subordinado de operación externa

Esta sección **añade** un rol operativo externo al workflow vigente. No reemplaza, simplifica ni modifica la autoridad definida en las secciones anteriores.

Principios de no regresión:

- GitHub sigue siendo la memoria persistente y fuente de verdad del código y de la evidencia.
- El GitHub Issue sigue siendo la unidad formal de trabajo.
- `Semantic Scope` y `Path Scope` siguen siendo obligatorios.
- Chat Web GPT sigue siendo el Supervisor técnico.
- El agente implementador/Codespaces sigue siendo el canal normal de implementación.
- La revisión y las decisiones siguen ligadas al SHA exacto revisado.
- `SEMANTIC_ACCEPTED`, `REWORK`, `HOLD`, `ESCALATE`, `CI`, `MERGE_ELIGIBLE` y merge conservan exactamente su significado.
- `SEMANTIC_ACCEPTED` no equivale a merge.
- El implementador no se autoaprueba ni ejecuta merge.
- El Humano conserva intención, permisos y decisiones excepcionales.

## 29.1 Rol y regla de subordinación

`AI_STUDIO_OPERATOR` usa Google AI Studio como entorno externo para observación, preview, prueba, diagnóstico, experimentación read-only y publicación autorizada.

> **AI Studio es un entorno operativo externo. No es una segunda fuente de verdad del código.**

Su autoridad está subordinada al workflow:

```text
Humano
↓
Chat Web GPT — Supervisor
↓
GitHub — fuente de verdad
↓
Agente implementador / Codespaces
↓
AI_STUDIO_OPERATOR — observe/preview/test/diagnose/publish/spike read-only
```

El diagrama no concede a AI Studio autoridad sobre el Supervisor, el Issue, el scope, la revisión por SHA ni el repositorio.

Toda intervención es una subrutina temporal:

```text
workflow normal
→ Supervisor solicita intervención AI Studio
→ AI Studio ejecuta sólo el modo autorizado
→ AI Studio devuelve evidencia
→ control vuelve obligatoriamente al Supervisor
→ Supervisor decide el siguiente estado del workflow
```

AI Studio no emite ni sustituye:

- `SEMANTIC_ACCEPTED`;
- `REWORK`;
- `HOLD`;
- `ESCALATE`;
- `MERGE_ELIGIBLE`;
- `MERGED`.

Sólo puede devolver resultados operativos `PASS / FAIL / BLOCKED`, clasificación y evidencia.

## 29.2 Permission Matrix

| Capacidad | AI_STUDIO_OPERATOR |
|---|---|
| READ / OBSERVE | YES |
| PULL / SYNC FROM GITHUB | YES, sólo para consumir una versión identificada |
| PREVIEW | YES |
| TEST | YES |
| DIAGNOSE | YES |
| PUBLISH | YES, sólo bajo protocolo de publicación |
| SPIKE_READ_ONLY | YES |
| WRITE CODE / FILES | NO |
| WRITE CANONICAL | NO |
| PUSH | NO |
| CREATE / MODIFY BRANCH | NO |
| CREATE / MODIFY PR | NO |
| MERGE | NO |
| FIX / APPLY FIX | NO |
| CHANGE DEPENDENCIES | NO |
| CHANGE SCHEMA | NO |
| CHANGE PROMPTS | NO |
| CHANGE WORKFLOW | NO |
| CHANGE REPOSITORY SECRETS | NO |
| ADOPT INTEGRATION | NO, salvo decisión humana + Issue + implementación canónica posterior |

`PULL / SYNC FROM GITHUB` significa cargar o sincronizar una versión para observarla o ejecutarla. No autoriza cambios de vuelta hacia GitHub.

## 29.3 Inicio: AI_STUDIO_REQUEST

Toda intervención que pretenda producir evidencia para el workflow comienza por una orden explícita del Supervisor asociada a un Work Item existente.

Formato mínimo:

```text
AI_STUDIO_REQUEST

WORK ITEM: #<issue>
MODE: OBSERVE | PREVIEW | TEST | DIAGNOSE | PUBLISH | SPIKE_READ_ONLY
EXPECTED SHA: <sha>
TARGET: <preview / route / deployment / integration capability>
TASK: <una sola operación concreta>

FORBIDDEN:
- edit code/files
- Fix
- commit
- branch
- PR
- push
- merge
- dependency changes
- schema changes
- prompt changes
- workflow changes
- repository secret changes

RETURN:
- OBSERVED SHA
- RESULT: PASS | FAIL | BLOCKED
- CLASSIFICATION
- EVIDENCE
- ERROR exacto si existe
```

Sin `WORK ITEM`, `MODE` y `EXPECTED SHA`, AI Studio no produce evidencia válida para una decisión del workflow, salvo una consulta puramente informativa que no pretenda verificar una versión concreta.

## 29.4 Modos autorizados

- `OBSERVE`: inspeccionar estado visible sin modificarlo.
- `PREVIEW`: abrir/ejecutar preview del SHA autorizado.
- `TEST`: ejecutar una comprobación concreta contra el SHA autorizado.
- `DIAGNOSE`: reproducir y aislar un fallo sin aplicar corrección.
- `PUBLISH`: publicar exclusivamente un SHA autorizado por el Supervisor.
- `SPIKE_READ_ONLY`: estudiar una capacidad o integración sin adoptar cambios.

Cada prompt debe contener **una sola operación concreta**. No se admiten instrucciones abiertas como “arregla todo”, “actualiza la interfaz” o equivalentes. `Fix` permanece prohibido.

Plantillas mínimas:

```text
AI_STUDIO_REQUEST
WORK ITEM: #<issue>
MODE: TEST
EXPECTED SHA: <sha>
TARGET: <route/preview>
TASK: ejecutar una prueba concreta y reportar resultado/evidencia; no modificar archivos.
```

```text
AI_STUDIO_REQUEST
WORK ITEM: #<issue>
MODE: DIAGNOSE
EXPECTED SHA: <sha>
TARGET: <fallo concreto>
TASK: reproducir, capturar error exacto, clasificar y reportar; no aplicar Fix.
```

```text
AI_STUDIO_REQUEST
WORK ITEM: #<issue>
MODE: PUBLISH
EXPECTED SHA: <approved-sha>
TARGET: <deployment target>
TASK: sincronizar ese SHA, confirmar SHA, ejecutar smoke preview, publicar y ejecutar smoke público; no modificar código.
```

## 29.5 SHA Gate obligatorio

Antes de `PREVIEW`, `TEST`, `DIAGNOSE` sobre código o `PUBLISH`:

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

No se continúa la operación, no se declara defecto de código y no se usa `Fix`.

La evidencia de una intervención sólo puede atribuirse al SHA observado cuando el gate ha sido satisfecho.

## 29.6 Ventanas de intervención

### A. Antes o durante implementación

Permitido:

- `OBSERVE`;
- `SPIKE_READ_ONLY`;
- `DIAGNOSE` de plataforma o capacidad.

Objetivo: resolver dudas de AI Studio o producir información para el Supervisor. AI Studio no implementa la solución.

Si el hallazgo requiere cambiar producto, arquitectura, permisos o scope:

```text
STOP → ESCALATE → decisión humana
```

### B. Sobre branch/PR en desarrollo

Sólo por solicitud explícita del Supervisor:

- `PREVIEW`;
- `TEST`;
- `DIAGNOSE`.

`EXPECTED SHA` debe ser el HEAD exacto del PR.

Un `PASS` de AI Studio no sustituye CI ni revisión semántica.

### C. Durante revisión del Supervisor

AI Studio puede aportar evidencia adicional de `PREVIEW` o `TEST`.

No puede convertir:

- `PASS` en `SEMANTIC_ACCEPTED`;
- `FAIL` en `REWORK`.

La decisión sigue perteneciendo al Supervisor para el SHA revisado.

### D. Post-merge / publicación

`PUBLISH` sólo comienza cuando el Supervisor identifica explícitamente el SHA autorizado a publicar.

Publicar puede modificar el estado operativo del entorno externo, pero nunca concede autoridad de escritura sobre código o repositorio.

## 29.7 Clasificación y protocolo de diagnóstico

Toda falla reportada por AI Studio se clasifica provisionalmente como una de:

```text
CODE
AI_STUDIO_ENVIRONMENT
DEPLOYMENT
EXTERNAL_SERVICE
UNKNOWN
```

Definiciones:

- `CODE`: evidencia razonable de que el mismo SHA contiene un defecto del producto.
- `AI_STUDIO_ENVIRONMENT`: sync, instalación, preview, runtime o estado interno de AI Studio no demostrado fuera de ese entorno.
- `DEPLOYMENT`: fallo en preparación/publicación/serving cuyo origen aún requiere determinación.
- `EXTERNAL_SERVICE`: proveedor/API/servicio externo indisponible, limitado o rechazando la operación.
- `UNKNOWN`: evidencia insuficiente.

Protocolo:

```text
confirm SHA
→ reproduce
→ capture exact error
→ classify
→ report
→ no automatic fix
```

La clasificación es evidencia provisional; el Supervisor puede reclasificarla.

Tratamiento orientativo:

```text
CODE + defecto dentro del objetivo
→ Supervisor puede emitir REWORK

CODE + requiere ampliar scope
→ ESCALATE

AI_STUDIO_ENVIRONMENT
→ HOLD o continuar por otro entorno; no REWORK automático

EXTERNAL_SERVICE
→ HOLD normalmente

DEPLOYMENT
→ Supervisor determina origen antes de REWORK

UNKNOWN
→ DIAGNOSE adicional, HOLD o ESCALATE
```

Problemas de plataforma, cuenta, cuota o Starter Tier no se convierten automáticamente en `REWORK` de código.

## 29.8 Protocolo PUBLISH

Secuencia obligatoria:

```text
approved GitHub SHA
→ AI_STUDIO_REQUEST MODE=PUBLISH
→ pull/sync/import desde GitHub
→ EXPECTED SHA / OBSERVED SHA gate
→ preview smoke test
→ publish
→ public smoke test
→ AI_STUDIO_REPORT
→ evidencia persistida en GitHub
→ control vuelve al Supervisor
```

No se pide a AI Studio “arreglar” código durante el publish. Si publicar requiere una modificación de archivos o repositorio:

```text
STOP → ESCALATE → decisión humana → nuevo Work Item
```

## 29.9 Protocolo SPIKE_READ_ONLY para integraciones Google

Ver una capacidad o botón de integración no autoriza adoptarlo.

Secuencia:

```text
SPIKE_READ_ONLY
→ inspeccionar capacidad/documentación/configuración visible
→ AI_STUDIO_REPORT
→ Supervisor review
→ Human decision
→ Issue
→ implementación canónica por el implementador normal
```

AI Studio puede reportar:

- OAuth/scopes esperados;
- configuración visible;
- secretos que previsiblemente serían necesarios, **sin leer ni copiar valores secretos**;
- archivos que previsiblemente requerirían cambios;
- limitaciones de despliegue;
- comportamiento observado de la plataforma.

No puede incorporar la integración al proyecto.

Las credenciales o secrets no pueden migrarse automáticamente al patrón de AI Studio si eso contradice el contrato vigente del producto. Cualquier cambio de ese contrato requiere decisión humana y Work Item propio.

## 29.10 Regla absoluta de no escritura

Dentro de `AI_STUDIO_OPERATOR`:

```text
AI Studio may read, run, test, diagnose and publish.
AI Studio may not write product code or repository state.
```

Queda expresamente prohibido:

- editar código o archivos del proyecto;
- usar, aceptar o aplicar `Fix`;
- generar cambios para adoptarlos directamente en el repositorio;
- commit;
- crear o modificar branch;
- crear o modificar PR;
- push;
- merge;
- modificar dependencias;
- modificar schema;
- modificar prompts;
- modificar workflow;
- modificar repository secrets;
- editar Issues como autoridad del workflow.

La preparación efímera interna que AI Studio necesite para ejecutar preview no constituye autoridad sobre el repositorio **únicamente si no altera ni sincroniza archivos de vuelta a GitHub**.

### WRITE_SANDBOX

`WRITE_SANDBOX: NO AUTORIZADO`.

No existe excepción de escritura en esta versión, ni siquiera en remix/sandbox.

Si cualquier intervención requiere escritura:

```text
STOP
→ ESCALATE
→ decisión humana explícita
→ nuevo Work Item de modificación del workflow
→ sólo después puede evaluarse esa capacidad
```

## 29.11 Fin: AI_STUDIO_REPORT y retorno de control

Toda intervención termina con:

```text
AI_STUDIO_REPORT

WORK ITEM: #<issue>
MODE: <mode>
EXPECTED SHA: <sha>
OBSERVED SHA: <sha>
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

El Supervisor decide qué ocurre a continuación. AI Studio no modifica el estado formal del workflow por sí mismo.

## 29.12 Persistencia de evidencia

La evidencia de AI Studio es temporal hasta persistirse en GitHub.

Toda evidencia usada por el workflow debe quedar asociada como mínimo a:

- Work Item;
- modo;
- `EXPECTED SHA`;
- `OBSERVED SHA`;
- `RESULT`;
- `CLASSIFICATION`;
- evidencia concreta;
- error exacto cuando exista.

Debe persistirse en el Issue o PR correspondiente antes de utilizarla como base de una decisión.

Capturas pueden complementar la evidencia, pero no sustituyen la identificación de SHA cuando la operación depende del código.

## 29.13 Ruta canónica preservada

La incorporación de `AI_STUDIO_OPERATOR` no crea la ruta:

```text
AI Studio → code → GitHub
```

Esa ruta permanece prohibida.

La ruta válida de cambios canónicos continúa siendo:

```text
Human intent
→ Supervisor
→ Issue
→ implementer
→ branch
→ commit
→ PR
→ CI/evidence
→ Supervisor review
→ decision by SHA
→ merge when eligible
```

AI Studio se inserta únicamente como proveedor de evidencia operacional o como ejecutor de publicación autorizada.

M2 permanece pausada hasta que este protocolo sea revisado e integrado.

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
Agente Gemini 3.8
     ↓
Branch + code + tests + PR
     ↓
GitHub
     ↓
Chat Web GPT
     ↓
SEMANTIC_ACCEPTED / REWORK / HOLD / ESCALATE
```

Es menos robusto mecánicamente que el workflow completo porque **scope, selección de contexto y verificación ya no están reforzados por software determinista**. Pero para probar colaboración **Chat Web GPT + Gemini en IA Studio + GitHub**, mantiene las partes más importantes sin introducir infraestructura adicional.
