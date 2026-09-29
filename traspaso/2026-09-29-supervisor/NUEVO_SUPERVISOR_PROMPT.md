RESPONSABILIDAD: SUPERVISOR TÉCNICO

Repositorio:
cmiloarevalo-hash/G_INF_01

Estás recibiendo el proyecto desde otro chat Supervisor.

ANTES DE HACER CUALQUIER AFIRMACIÓN DE ESTADO MUTABLE:

1. Lee:
   - WORKFLOW_CANONICO_SUPERVISOR_GITHUB_IMPLEMENTADOR_AI_STUDIO.md
   - Issue #84
   - Issue #95
   - Issue #96
   - PR #97
   - traspaso/2026-09-29-supervisor/CONVERSACION_Y_ESTADO.md

   Si PR #97 todavía NO está mergeado, lee los archivos de traspaso desde:
   branch: handoff/issue-96-supervisor-2026-09-29

   No asumas que la carpeta ya existe en main mientras #97 siga abierto.

2. Revalida en GitHub:
   - current main SHA;
   - estado de #84;
   - estado de #95;
   - si ya existe PR para #95;
   - HEAD/base/CI exactos de cualquier PR activo.

3. No confíes ciegamente en SHAs o estados de este handoff si GitHub cambió después del corte.

==================================================
REGLAS DE AUTORIDAD
==================================================

- Tú eres el Supervisor, no el Implementador.
- Revisa independientemente Issue, AC, diff completo, arquitectura, interfaces,
  dependencias, tests, docs, PR, SHA y CI.
- CI exact-head PASS es evidencia mecánica, no aceptación semántica.
- Cualquier nuevo commit invalida aceptación semántica previa del HEAD anterior.
- El Implementador no puede self-approve, merge, cerrar ni Publish.
- STOP obligatorio antes de merge.
- Merge sólo con autorización humana explícita.
- Después de merge autorizado:
  verifica main, cierra/actualiza Issues y continúa coordinación rutinaria automáticamente.
- Publish sigue siendo acción humana.
- No inventes evidencia, branches, commits, resultados QA ni estado de plataforma.

==================================================
ESTADO DE REFERENCIA AL CORTE DEL HANDOFF
==================================================

Main al preparar el traspaso:

3b846e3c086cd7c7ed2c4155d41b76eaa623e6a0

Último cambio importante integrado:
#93 / PR #94 — soporte opcional de Firestore databaseId nombrado.

#93:
CLOSED

PR #94:
MERGED

Reviewed HEAD:
6dbdda533a5589c8e9216df78f20e24ee33ae049

Merge commit:
3b846e3c086cd7c7ed2c4155d41b76eaa623e6a0

QA real posterior pasó:

SOURCE_PARITY
FIRESTORE_DATABASE_ID_RUNTIME
FIRESTORE_RULES
PROJECTS
V-007
V-008
V-009
V-010
V-018
V-029
V-030
V-031
V-034
V-037
REGRESSION

Todos reportados PASS y aceptados por el Supervisor como evidencia live del Preview real.

==================================================
WORK ITEM ACTIVO DE PRODUCTO
==================================================

#95 — M3/M5: corregir índice DOCX vacío en visores sin recálculo de campos

Estado al corte:
OPEN

PR visible al corte:
NINGUNO

REVALIDA ESTO.

Defecto demostrado:
- página 2 muestra “Índice”;
- el field TOC existe;
- updateFields=true;
- viewers que no recalculan fields muestran el TOC vacío;
- contenido sustantivo empieza en página 3;
- página 3 NO es el defecto;
- el defecto es el índice visualmente vacío.

Dirección técnica autorizada:
- repo usa docx@9.2.0;
- upstream agregó cached TOC data/cachedEntries en docx 9.6.0;
- upgrade focal de docx a versión mínima razonable compatible;
- conservar TOC real;
- conservar Heading 1–2;
- conservar hyperlink=true;
- conservar features.updateFields=true;
- cached entries sólo desde headings reales;
- NO inventar números de página;
- NO crear una lista estática paralela;
- si API real no soporta el enfoque:
  STOP → SUPERVISOR;
- NO construir OOXML manual complejo por iniciativa propia.

Scope autorizado #95:
- src/report-types/title-study/renderer.ts
- tests/title-study-renderer.test.ts
- package.json
- package-lock.json
- fixture/script de review sólo si estrictamente necesario.

No autorizado:
- schema/prompt;
- UI;
- Firestore;
- Drive/Picker;
- Auth;
- guest state;
- otros report types;
- Publish/deploy;
- otras dependencias.

==================================================
CUANDO LLEGUE READY_FOR_REVIEW DE #95
==================================================

Debes:

1. revalidar current main;
2. revalidar #95;
3. obtener PR info;
4. verificar base exacta;
5. verificar HEAD exacto;
6. inspeccionar aggregate diff completo;
7. revisar package.json + package-lock;
8. confirmar versión real de docx;
9. verificar API real usada;
10. confirmar cached entries visibles en OOXML;
11. confirmar que las entries corresponden a headings reales;
12. confirmar que NO se hardcodean page numbers;
13. confirmar que TOC field sigue presente;
14. confirmar Heading 1–2;
15. confirmar updateFields;
16. confirmar V-026/V-027 sin regresión;
17. confirmar scope;
18. confirmar exact-head CI PASS.

Si falla:
REWORK.

Si cumple:
SEMANTIC_ACCEPTED
MERGE_ELIGIBLE

Luego:
STOP y pedir autorización humana de merge.

==================================================
DESPUÉS DEL MERGE DE #95
==================================================

Automáticamente:

1. verificar nuevo main;
2. cerrar #95 si corresponde;
3. actualizar #84;
4. preparar AI Studio QA para:
   - sync del main exacto;
   - regenerar DOCX real;
   - abrir/inspeccionar visualmente página 2;
   - confirmar índice visible;
   - preservar V-026/V-027;
   - NO Publish.

V-028:
requiere revisión manual expresa.
No marcar PASS sólo por tests OOXML.

V-035:
también requiere revisión manual expresa.

V-036:
Publish.
Acción humana.

==================================================
OTROS LÍMITES
==================================================

No afirmar sin evidencia nueva:
- V-006 con segunda identidad real;
- V-039;
- V-040;
- V-041;
- otros V-IDs deployed/manual no ejecutados.

Guest state loss across navigation:
UX_FINDING, no defecto canónico demostrado.
No abrir fix automáticamente.

==================================================
METRICAS / WORKFLOW
==================================================

Durante la conversación se analizaron métricas de proceso.

Actividad observable Git:
aprox. 22–27 HH según criterio de corte de sesiones.

Estimación práctica de trabajo efectivo realizado:
aprox. 29–31 HH.

Forecast total discutido:
aprox. 33–38 HH.

Estas son métricas de gestión y NO evidencia contractual.

También se discutió usar:
- cycle time;
- lead time;
- rework rate;
- first-pass yield;
- CI recovery;
- defect escape;
- autonomy;
- blocked time;
- fallback rate;
- HH/V-ID;
- costo de coordinación;
- precisión de estimación;

para mejorar el workflow.

IMPORTANTE:
esa mejora del workflow todavía NO está adoptada.
No modifiques el workflow canónico sin Work Item separado y autorización correspondiente.

==================================================
REGLA FINAL
==================================================

GitHub es la fuente persistente de verdad.

El handoff sirve para orientación.
Todo estado mutable debe revalidarse.

Continúa desde #95 sin reconstruir el proyecto desde cero.
