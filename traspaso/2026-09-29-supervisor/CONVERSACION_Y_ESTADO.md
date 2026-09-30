# Traspaso de conversación y estado — Supervisor → nuevo chat

**Repositorio:** `cmiloarevalo-hash/G_INF_01`
**Work Item de traspaso:** #96
**Corte del traspaso:** 2026-09-29 11:43 CLST (UTC-03:00)
**Main revalidado al preparar el traspaso:** `3b846e3c086cd7c7ed2c4155d41b76eaa623e6a0`

> Este archivo es una **reconstrucción estructurada de la conversación y de las decisiones relevantes**, preparada para continuidad operativa. **No es una transcripción literal palabra por palabra** del chat. Cuando un dato es mutable, el nuevo Supervisor debe revalidarlo en GitHub antes de usarlo como estado actual.

---

## 1. Objetivo del proyecto y forma de trabajo

El Humano dirige el producto y usa ChatGPT como **Supervisor técnico**, un **Agente Implementador** para cambios de repositorio y **AI Studio QA** para pruebas reales/autónomas del Preview y servicios Google.

Preferencias operativas expresas del Humano:

- rigor y trazabilidad por sobre afirmaciones no verificadas;
- no inventar hechos, resultados, SHAs, ramas ni evidencia;
- evitar que el Humano tenga que decir repetidamente “continúa”;
- detenerse únicamente en gates materiales;
- **merge requiere autorización humana explícita**;
- después de un merge autorizado, el Supervisor ejecuta automáticamente verificación post-merge, cierre/actualización administrativa y siguiente coordinación;
- el Supervisor revisa independientemente Issue, AC, diff, arquitectura, interfaces, tests, documentación, CI y SHA exacto;
- un nuevo commit invalida la aceptación semántica del HEAD anterior;
- CI verde es evidencia mecánica, no sustituye review semántico;
- AI Studio debe hacer QA real/autónomo; el Humano no debe convertirse en tester repetitivo;
- tareas de programación entregadas a AI Studio deben ser microtareas muy pequeñas por restricciones de cuota;
- prompts operativos normalmente comienzan con `RESPONSABILIDAD: ...`;
- publicación/Publish sigue siendo decisión/acción humana.

Workflow canónico:
`WORKFLOW_CANONICO_SUPERVISOR_GITHUB_IMPLEMENTADOR_AI_STUDIO.md`.

---

## 2. Reglas de autoridad que el nuevo Supervisor debe preservar

### Supervisor

Puede, dentro del Work Item activo:

- inspeccionar GitHub;
- crear/actualizar Issues de coordinación;
- entregar prompts;
- declarar READY_FOR_REVIEW / REWORK / SEMANTIC_ACCEPTED / MERGE_ELIGIBLE;
- coordinar rework;
- realizar acciones rutinarias post-merge;
- activar un fallback estrecho después de un bloqueo verificado cuando el Humano ya lo haya autorizado para ese caso/clase.

Debe detenerse antes del merge y obtener un **sí humano explícito**.

### Implementador

Puede:

- implementar sólo el scope del Issue;
- branch/commit/push/PR;
- ejecutar pruebas;
- corregir rework dentro del mismo Work Item.

No puede:

- autoaprobar;
- hacer merge;
- cerrar producto por su cuenta;
- Publish/deploy;
- ampliar scope silenciosamente.

### AI Studio QA

Modo normal actual para cierre:

- sincronizar/materializar Preview desde el `main` canónico;
- probar UI, Network, Console y servicios reales;
- Firebase/Auth/Firestore/Drive/Picker/Gemini en dev/pre-publish cuando estén autorizados;
- producir evidencia observable;
- diagnosticar;
- **no escribir código de producto** durante QA.

Microtareas de código en AI Studio sólo con autorización explícita del Supervisor, una causa conocida, un fix mínimo y STOP/REPORT inmediato.

### Humano

Conserva:

- intención/prioridades;
- decisiones materiales;
- credenciales/permisos;
- autorizaciones destructivas;
- merge;
- Publish;
- billing/Blaze/recursos pagados;
- decisiones irreversibles de plataforma.

---

## 3. Roadmap canónico

Taxonomía obligatoria:

- M1
- M2
- M3
- M4
- M5

No revivir nomenclaturas A/B/C/D, WI2-xx u otras taxonomías paralelas.

Issue de coordinación principal:
**#84 — Plan de cierre canónico M4/M5**.

Situación arquitectónica consolidada:

- M1: completado.
- M2: completado.
- M3: completado a nivel de implementación histórica, aunque actualmente existe un defecto real de presentación DOCX que reabre una corrección focal (#95).
- M4.1: identidad/sesión Google completada.
- M4.2: proyectos persistentes/aislamiento completado.
- M4.3a-f: integrado.
- M4.4a-c: integrado.
- M4.5a-c: integrado.
- M5.1-4: integrado a nivel de repositorio.

La implementación principal M4/M5 fue cerrada por #89/#90 y #91/#92. La fase actual es **pre-publish QA, correcciones focales demostradas y gates manuales finales**.

---

## 4. Hitos GitHub relevantes

### #89 / PR #90

Servicios/capacidades autenticadas base restantes.

- Reviewed HEAD: `da55795187a6334ccc23bf6a33d61e5db4a986e6`
- Merge commit: `7a8808e55574038efa5f14dd5bddbbaead7d1ad5`
- #89: CLOSED.

### #91 / PR #92 — integración final M4/M5

Base:
`7a8808e55574038efa5f14dd5bddbbaead7d1ad5`

Incluyó:
- M4.3f;
- M4.4a-c;
- M4.5c;
- M5.1-4.

Durante review el Supervisor detectó bloqueos reales:
1. aislamiento de estado efímero entre UID/sesiones;
2. posible duplicación de carpetas Drive en retry después de éxito externo + fallo Firestore;
3. tests demasiado estructurales.

Rework integrado en commits posteriores, terminando en:

- reviewed HEAD: `a5b95be12e5b4a0dbf995b43950b5ca18bb50eea`
- CI exact-head: PASS;
- merge commit: `5772695bcc850530314b3a620819b66b4fd931b6`
- #91: CLOSED.

### QA pre-publish posterior a #91

El Preview reveló:

- Firebase Google Login real funcionaba después de autorizar el dominio temporal;
- modo invitado real funcionaba;
- Firestore estaba inicialmente bloqueado por configuración/plataforma;
- Drive/Picker requería variables de entorno;
- DOCX real mostraba un índice vacío;
- Mis proyectos llegó a bloquearse por Firestore.

### Firestore named database — #93 / PR #94

Se descubrió un mismatch real:

- el código usaba `getFirestore(app)`, por lo que apuntaba a `(default)`;
- el proyecto dev tenía una base Firestore nombrada;
- crear otra `(default)` podía implicar billing, y la base existente no se confirmó disposable.

Se decidió corregir el repositorio para soportar un `databaseId` opcional.

Issue:
**#93 — M4/M5: soportar Firestore databaseId nombrado en runtime**

Primera entrega:
- PR #94;
- HEAD `aa98f66513158cee8c6f92b7a9ee3f71a1966b75`;
- CI PASS;
- Supervisor pidió REWORK porque README quedó obsoleto y recomendó probar el runtime fallback real.

Rework:
- HEAD `6dbdda533a5589c8e9216df78f20e24ee33ae049`;
- exact-head CI #109 PASS;
- SEMANTIC_ACCEPTED / MERGE_ELIGIBLE;
- Humano autorizó merge explícitamente.

Merge:
- merge commit / nuevo main:
  `3b846e3c086cd7c7ed2c4155d41b76eaa623e6a0`
- #93: CLOSED.

Comportamiento integrado:

- `VITE_FIREBASE_DATABASE_ID` opcional;
- ausencia mantiene `(default)`;
- `/api/firebase-config` puede devolver `databaseId`;
- todos los drivers Firestore relevantes usan base nombrada cuando se configura;
- no se hardcodeó el valor real del entorno.

---

## 5. Último ciclo QA real aceptado

Después de #93/#94, AI Studio QA ejecutó Preview real y reportó:

```text
SOURCE_PARITY: PASS
FIRESTORE_DATABASE_ID_RUNTIME: PASS
FIRESTORE_RULES: PASS
PROJECTS: PASS
V-007: PASS
V-008: PASS
V-009: PASS
V-010: PASS
V-018: PASS
V-029: PASS
V-030: PASS
V-031: PASS
V-034: PASS
V-037: PASS
REGRESSION: PASS
HUMAN_ACTION_REQUIRED: none
PUBLISH: NO
```

El Supervisor aceptó esos resultados como evidencia live del Preview real sobre el `main` actual.

Evidencia live acumulada aceptada durante la campaña incluye:

- V-003 — health real;
- V-004 — Google auth real;
- V-005 — guest analysis real;
- V-007 — lifecycle proyecto;
- V-008 — carpeta Drive automática;
- V-009 — documento local a Drive;
- V-010 — Picker real;
- V-017 — API key válida / comportamiento controlado;
- V-018 — modelo seleccionado;
- V-024 — additionalInstruction;
- V-026 — DOCX generado desde JSON validado (la presentación sigue con defecto separado);
- V-029 — persistencia análisis;
- V-030 — persistencia informe;
- V-031 — aislamiento/no persistencia indebida de credencial;
- V-033 — navegación principal;
- V-034 — navegación proyecto;
- V-037 — E2E autenticado completo;
- V-038 — E2E invitado;
- V-042 — health process-only.

No convertir esta lista en una afirmación de que **todos** los V-001..V-045 están cerrados.

---

## 6. Defecto activo: #95 — índice DOCX vacío

Issue activo:
**#95 — M3/M5: corregir índice DOCX vacío en visores sin recálculo de campos**

Base declarada:
`main@3b846e3c086cd7c7ed2c4155d41b76eaa623e6a0`

Hallazgo real:

- página 2 contiene título “Índice”;
- existe un campo Word TOC dinámico;
- `features.updateFields: true`;
- visores que no recalculan fields muestran el TOC vacío;
- el contenido sustantivo comienza en página 3;
- página 3 **no es el defecto**: el contrato reserva una página propia para el índice;
- el defecto es que la página de índice queda visualmente vacía.

Dirección técnica ya investigada/autorizada:

- repo usa `docx@9.2.0`;
- upstream agregó soporte para cached TOC data/cached entries en 9.6.0;
- preferir upgrade focal de `docx` a versión mínima razonable con esa capacidad;
- conservar TOC real, Heading 1–2, hyperlinks y `updateFields`;
- generar cached entries sólo desde headings reales;
- **no inventar números de página**;
- no crear una lista estática paralela;
- si la API real no soporta el enfoque esperado: STOP → Supervisor;
- no construir OOXML manual complejo por iniciativa propia.

Scope #95:

Permitido:
- `src/report-types/title-study/renderer.ts`
- `tests/title-study-renderer.test.ts`
- `package.json`
- `package-lock.json`
- fixture/script de review sólo si estrictamente necesario.

Prohibido:
- schema/prompt;
- UI;
- Firestore;
- Drive/Picker;
- Auth;
- guest state;
- otros report types;
- Publish/deploy;
- dependencia distinta de `docx`.

**Estado revalidado al preparar este traspaso:**
- Issue #95: OPEN;
- PR asociado visible: **ninguno todavía**.

Ya se entregó al Implementador el prompt de ejecución de #95. El nuevo Supervisor debe revalidar antes de asumir que sigue sin PR.

---

## 7. Gates que siguen abiertos después de #95

### V-028 — presentación DOCX

Requiere **revisión manual expresa** según `VERIFICATION_SPECIFICATION.md`.

Después del eventual merge de #95:

1. AI Studio QA sincroniza el nuevo main.
2. Regenera un DOCX real.
3. Verifica visualmente que página 2 contiene el índice.
4. Se realiza/reconcilia la revisión manual V-028.

No marcar V-028 PASS sólo por tests OOXML.

### V-035 — responsive

También exige revisión manual expresa.

### V-036 — Publish

Publish continúa siendo **acción humana**.
No ejecutar Publish por inferencia, por haber terminado QA ni por tener CI verde.

### Otras verificaciones no universalmente cerradas

No afirmar sin nueva evidencia:

- V-006 con segunda identidad real si no se ejecutó;
- V-039/V-040 si no se autorizó/ejecutó el escenario destructivo o sensible;
- V-041 si no existe evidencia real del caso específico;
- otros V-IDs que sólo tengan evidencia local cuando la especificación exija deployed/manual.

---

## 8. Hallazgo UX invitado

AI Studio observó:

- al salir de la sección de documentos/resultados invitados y volver, el estado local puede perderse.

Clasificación vigente:
**UX_FINDING**, no defecto canónico demostrado.

No abrir/corregir automáticamente salvo:
- requisito explícito encontrado;
- defecto demostrable;
- decisión humana de alcance.

---

## 9. Configuración/plataforma Google ya resuelta durante la campaña

Durante QA se resolvieron, bajo autorizaciones humanas específicas:

- dominio temporal autorizado para Firebase Auth;
- Cloud Firestore API en dev;
- decisión humana de región Firestore: `southamerica-west1` (Santiago);
- se evitó crear una segunda base `(default)` sin justificar billing;
- se corrigió el código para usar la base nombrada existente;
- Preview real posteriormente pasó Firestore runtime/rules/projects y E2E.

No reutilizar estas autorizaciones como permiso general para:
- billing;
- Blaze;
- producción;
- borrar datos;
- desplegar Rules;
- crear/borrar bases;
- Publish.

---

## 10. Evidencia QA y Git

AI Studio en ciclos anteriores afirmó branches/commits QA que no estaban visibles remotamente.

Regla establecida:

- no inventar ni aceptar evidencia Git de AI Studio si no puede revalidarse;
- GitHub es la fuente versionada;
- para QA pre-publish se acepta evidencia observable del Preview real (Network/Console/UI/servicios), registrada por el Supervisor en Issues;
- no perder tiempo intentando producir un commit QA si el canal no soporta persistencia remota verificable.

---

## 11. Estado de Issues abiertos al corte

Revalidado al preparar el traspaso:

- #45 — M4: trabajo persistente y capacidades completas — OPEN administrativamente;
- #84 — Plan de cierre canónico M4/M5 — OPEN;
- #95 — defecto índice DOCX — OPEN;
- #96 — este traspaso — OPEN.

#45/#84 pueden estar administrativamente desfasados respecto del avance técnico. No usar su porcentaje histórico como representación automática del estado real sin reconciliación.

---

## 12. Métricas de tiempo discutidas en esta conversación

Estas cifras son **estimaciones de gestión**, no evidencia contractual del producto.

Se inspeccionó el historial de `main`:

- 194 commits/guardados entre primer y último guardado considerados;
- ventana calendario total aproximada:
  **95,86 horas**;
- esa cifra NO representa trabajo efectivo.

Se propuso eliminar ventanas largas sin guardados.

### Criterio de corte de sesión > 2 horas

Tiempo observable dentro de sesiones:
**≈27,11 h**

Ventanas largas excluidas:
**≈68,75 h**

Principales pausas detectadas incluyeron aproximadamente:
- 28,22 h;
- 12,97 h;
- 9,85 h;
- 7,10 h;
- 4,72 h;
- 3,35 h;
- 2,54 h;
más otras menores según criterio.

### Criterio estricto > 1 hora

Tiempo observable:
**≈21,93 h**

Por eso se acordó usar como rango de **actividad observable**:
**≈22–27 HH**

Dado que Git no captura lectura/razonamiento antes del primer commit ni después del último de una sesión, se propuso como estimación práctica:

- trabajo efectivo realizado: **≈29–31 HH**;
- total efectivo proyectado para el proyecto: **≈33–38 HH**;
- punto central de gestión: **≈35 HH**;
- restante estimado al momento de esa conversación: **≈3,5–7 HH**.

Estas cifras deben recalibrarse si #95 o los gates finales revelan rework importante.

### Comparación con estimación tradicional

La propuesta histórica de planificación había manejado rangos muy amplios (hasta 132–300 HH comparables según alcance).

Con la evidencia real del proyecto se discutió un **factor de compresión aproximado ~5–6x** como cifra de gestión, no como benchmark científico.

---

## 13. Métricas potenciales identificadas para mejorar el workflow

Se discutió que el historial permitiría calcular en el futuro:

- tiempo efectivo vs calendario;
- duración de sesiones;
- throughput;
- lead/cycle time;
- latencia de review;
- tiempo MERGE_ELIGIBLE → merge;
- tasa y costo de rework;
- first-pass yield;
- CI pass rate;
- defect escape rate;
- tiempo hasta recuperar CI verde;
- tamaño de PR y correlación con rework;
- velocidad por tipo de tarea;
- HH por hito/V-ID/defecto;
- costo de coordinación;
- tiempo bloqueado;
- fallback rate;
- autonomía;
- intervención humana necesaria vs evitable;
- precisión/sesgo de estimación;
- deuda de verificación;
- tiempo repo-ready → evidencia deployed.

Se discutió usar estas métricas para hacer un workflow adaptativo:
- preautorizar fallbacks recurrentes y seguros;
- paralelizar review con CI cuando no se comprometa el SHA gate;
- reducir handoffs que no agregan evidencia;
- calibrar tamaño de Issues por historia real;
- minimizar intervención humana evitable.

**Importante:** esta conversación fue exploratoria. **No se ha modificado todavía el workflow canónico para incorporar esas métricas.** Cualquier cambio debe tratarse como tarea separada y revisada.

---

## 14. Siguiente acción operativa recomendada

Primero revalidar GitHub.

Si #95 sigue sin PR:
- esperar/recibir el handoff del Implementador;
- no duplicar implementación.

Si llega:
```text
WORK ITEM: #95
PR: #...
HEAD: ...
VERIFICATION: PASS
CI: PASS
STATE: READY_FOR_REVIEW
```

el Supervisor debe:

1. revalidar `main`;
2. revalidar Issue #95;
3. obtener PR, base/head, aggregate diff y exact-head CI;
4. verificar API real de `docx`, versión instalada y lockfile;
5. comprobar que cached entries pertenecen a headings reales;
6. comprobar que no hay page numbers inventados;
7. comprobar que TOC field/updateFields siguen presentes;
8. revisar V-026/V-027 regresión;
9. si hay nuevo commit, repetir review del nuevo HEAD;
10. si cumple: SEMANTIC_ACCEPTED + MERGE_ELIGIBLE;
11. **STOP y pedir autorización humana de merge**.

Después de “sí” humano:
- ejecutar merge;
- verificar nuevo `main`;
- cerrar #95 si corresponde;
- actualizar #84;
- enviar prompt AI Studio QA para regenerar DOCX real;
- completar/reconciliar V-028 y V-035;
- dejar Publish para decisión humana.

---

## 15. Estado del traspaso documental

Este archivo y el prompt del nuevo Supervisor se crean en la branch:

`handoff/issue-96-supervisor-2026-09-29`

hasta que el Humano autorice el merge del PR de traspaso.

Mientras no esté mergeado:
- el nuevo Supervisor puede leer #96 y el PR asociado;
- no asumir que estos archivos están en `main`.

