# Propuesta Inicial de Plan de Trabajo Integral y Estimación HH por Módulo

**Estado del documento:** Propuesta inicial sujeta a revisión y aprobación humana. No modifica por sí misma la arquitectura canónica ni sustituye el documento normativo [`DEVELOPMENT_PLAN.md`](DEVELOPMENT_PLAN.md).

---

## 1. Identificación, Objetivo y Origen de la Propuesta

### 1.1 Título y Propósito
El presente documento constituye la **Propuesta Inicial de Plan de Trabajo Integral y Estimación de Esfuerzo (HH) por Módulo** para el producto **G_INF_01** (herramienta web ligera para organización de antecedentes inmobiliarios y análisis documental asistido por LLM, con el Estudio de Títulos como primer tipo de informe).

Su objetivo es proveer una hoja de ruta estructurada, transparente y técnicamente fundamentada que:
1. Enumere las actividades principales de todo el producto aprobado, agrupadas por módulo y orientadas a entregables verificables.
2. Distinga con precisión lo que ya está integrado en la rama principal (`main`), lo propuesto en pull requests abiertos y lo pendiente de desarrollo.
3. Identifique el camino mínimo necesario para alcanzar una versión operativa publicable y comprobable en Google AI Studio que ejecute el análisis con **a lo sumo una llamada Gemini por análisis** (conforme a los límites humanos vigentes), sin convertir las capacidades persistentes restantes en bloqueantes obligatorios de dicho hito.
4. Establezca dependencias lógicas y un orden secuencial propuesto, diferenciando la única regla de precedencia formalmente establecida de las sugerencias técnicas elaboradas a partir de los requisitos.
5. Asigne rangos de estimación de horas de trabajo para **un solo programador (HH)** a las actividades pendientes, detallando supuestos, inclusiones, exclusiones y niveles de incertidumbre, sin inventar calendarios, métricas retrospectivas ni fechas de entrega.

### 1.2 Origen de la Propuesta
Esta propuesta se deriva directamente de las siguientes fuentes y decisiones:
- **Fuentes Canónicas del Repositorio:**
  - [`DEVELOPMENT_PLAN.md`](DEVELOPMENT_PLAN.md): Define la estrategia objetivo, la prioridad central de la interfaz y la única precedencia obligatoria.
  - [`SOFTWARE_ARCHITECTURE.md`](SOFTWARE_ARCHITECTURE.md): Define la descomposición en componentes (`CMP-WEB`, `CMP-SERVER`, `CMP-IDENTITY`, `CMP-PROJECTS`, `CMP-DRIVE`, `CMP-AI`, `CMP-REPORTS`), invariantes arquitectónicas, división de almacenamiento y mitigación de fallas externas.
  - [`SOFTWARE_REQUIREMENTS_SPECIFICATION.md`](SOFTWARE_REQUIREMENTS_SPECIFICATION.md): Requisitos funcionales (`FR-*`), de interfaz (`UIR-*`), no funcionales (`NFR-*`), criterios de aceptación (`AC-*`) y catálogo conceptual de antecedentes inmobiliarios.
  - [`TECHNICAL_SPECIFICATION.md`](TECHNICAL_SPECIFICATION.md): Parámetros técnicos del stack (Node.js, Express, React, Vite, Zod, docx, Firebase, Drive API), comandos canónicos y restricciones de seguridad.
  - [`VERIFICATION_SPECIFICATION.md`](VERIFICATION_SPECIFICATION.md): Matriz de procedimientos de verificación (`V-*`).
  - [`CURRENT_STATE.md`](CURRENT_STATE.md): Estado factual de la línea base integrada en `main` y registro de evidencias verificadas.
  - [`README.md`](../../README.md): Visión general del repositorio y lineamientos de operación.
- **Decisiones Humanas y Aprendizajes Empíricos:**
  - *Decisión en Issue #6:* Admisión de documentos locales en sesión invitada basada en validación de cabecera `%PDF-`, retención en memoria y descarte seguro al recargar.
  - *Decisión en Issue #9:* Adopción del contrato estructurado ejecutable `TITLE_STUDY` con schema Zod 4 ejecutable y derivación de JSON Schema Draft 2020-12.
  - *Decisión en Issue #12 y Discusión de PR #13:* Necesidad operativa demostrada de transicionar el motor analítico de invitado desde un esquema multi-llamada hacia **una sola llamada Gemini por análisis**, reduciendo latencia, evitando bloqueos por límites de cuota/tasa del Free Tier (HTTP 429/503) y acotando los límites de entrada a **hasta 20 archivos y 50 MB totales**.
  - *Mandato de Issue #14:* Elaborar una propuesta integral y legible para un solo programador, manteniendo intacto el documento canónico actual.

### 1.3 Para Qué Servirá y Cómo se Usará
- **Para qué servirá:** Funciona como herramienta de gobierno y priorización para el propietario y el desarrollador. Permite contrastar de manera anticipada el costo relativo de cada módulo, evitando el desarrollo accidental de funcionalidades complejas que no aportan al objetivo inmediato.
- **Cómo se usará:** El propietario podrá seleccionar los bloques de trabajo a autorizar en los siguientes Work Items según sus prioridades estratégicas (por ejemplo, validar primero la experiencia en AI Studio antes de configurar infraestructura cloud). El desarrollador utilizará los entregables e inclusiones como especificación de alcance para cada nuevo PR.
- **Mantenimiento:** El documento se actualizará de forma puntual cuando se completen hitos verificables (merge de PRs en `main`), cuando se adopte formalmente una decisión de arquitectura durable mediante un ADR en `docs/engineering/adr/`, o cuando mediciones empíricas modifiquen los supuestos de incertidumbre.

---

## 2. Principios de Orden y Precedencia

### 2.1 La Única Precedencia Formalmente Normativa
[`DEVELOPMENT_PLAN.md`](DEVELOPMENT_PLAN.md) §3 establece una única regla de precedencia vinculante de producto:
> *"La única relación de precedencia de producto expresamente definida es definir la interfaz antes de completar el motor. El Estudio de Títulos es el primer tipo de informe. El orden restante de implementación no está determinado por las fuentes y no altera el alcance aprobado."*

Esto implica que:
1. La experiencia de usuario, las pantallas y los flujos visuales deben estar conceptual y funcionalmente claros antes de dar por cerrado el desarrollo de la lógica de procesamiento en el backend.
2. No se debe construir un motor analítico aislado ni un subsistema de persistencia desconectado sin una interfaz que permita operar y verificar su comportamiento.

### 2.2 Dependencias Lógicas Propuestas vs. Ausencia de Orden Total en la Arquitectura
La arquitectura aprobada ([`SOFTWARE_ARCHITECTURE.md`](SOFTWARE_ARCHITECTURE.md)) no impone una secuencia temporal rígida para la construcción de los componentes; define responsabilidades, invariantes y mapeos de requisitos, pero no un orden total unívoco.

Por lo tanto, el orden de trabajo propuesto en este documento representa una **propuesta técnica razonada**, estructurada sobre dependencias técnicas indispensables de entrada/salida:
- **Dependencia Estructural Ineludible:** Para que un componente consumidor procese datos válidos, su contrato upstream debe estar definido e implementado. Ejemplo: la generación de DOCX (`CMP-REPORTS`) requiere un JSON validado bajo el schema de `TITLE_STUDY` (`CMP-AI`), por lo que el contrato debe preceder a la generación del documento descargable.
- **Independencia del Modo Invitado vs. Modo Autenticado:** El producto comprende tanto el acceso libre para invitados (`FR-002`, `AC-001`) como la persistencia para usuarios autenticados con cuenta Google (`FR-001`, `FR-010`, `AC-002`, `CON-004`). La arquitectura permite que el flujo de análisis de documentos para invitados se complete y pruebe de manera autónoma, sin depender de la inicialización de Firebase Authentication, Firestore o Google Drive.
- **No Exclusión del Alcance Aprobado:** El desacoplamiento temporal no degrada ni reclasifica las capacidades persistentes (Google Drive, proyectos en Firestore, gestión de cuentas); estas forman parte indisoluble del producto completo y se abordarán según la secuencia aquí propuesta una vez consolidado el núcleo analítico.

---

## 3. Estado de la Línea Base: Integrado vs. Propuesto en PR vs. Pendiente

Para garantizar total transparencia técnica y evitar confusiones entre el código activo y las propuestas en evaluación, el producto se clasifica estrictamente en tres categorías:

### 3.1 Integrado en `main` (Línea Base Canónica: `c372817c0d5db541686c1ab91a8a9ce5f02f78ba`)
Las siguientes capacidades están formalmente aprobadas, fusionadas y respaldadas por la suite de pruebas automatizadas:
- **Servidor de Aplicación (`CMP-SERVER`):** Servidor HTTP con Node.js y Express 5 (`server.ts`). Escucha en `0.0.0.0` mediante variable `PORT`. Maneja integración dual: Vite como middleware en desarrollo y servicio de bundle estático desde `dist/client` en producción.
- **Salud del Proceso (`NFR-024`, `AC-012`, `V-003`, `V-042`):** Endpoint `GET /api/health` que responde HTTP 200 informando exclusivamente la disponibilidad del proceso local, sin emitir aseveraciones sobre servicios externos.
- **Interfaz Web Inicial (`CMP-WEB`):** Aplicación React en tema oscuro profesional (UIR-001, UIR-002, UIR-007) con barra lateral plegable. Implementa la regla de honestidad de interfaz (`UIR-008`): las secciones aún no desarrolladas se declaran explícitamente no disponibles, sin formularios ni controles simulados.
- **Selección Local de Documentos PDF para Invitado (`FR-020` parcial, Issue #6 / PR #7):** Permite seleccionar múltiples archivos PDF, valida extensión y firma `%PDF-` en los primeros 1 KiB, gestiona listas sin duplicados y retiene las referencias en memoria del navegador durante la sesión.
- **Contrato Ejecutable `TITLE_STUDY` (`FR-050` parcial, Issue #9 / PR #11):** Schema Zod 4 en `src/report-types/title-study/schema.ts`, tipos TypeScript asociados y función de derivación a JSON Schema Draft 2020-12. Aplica reglas de integridad referencial entre documentos, hallazgos, comparaciones y conclusiones.
- **Toolchain de Ingeniería:** Configuración canónica y reproducible mediante `npm ci`, `npm run dev`, `npm run build`, `npm start` y `npm test` (suite de 14 pruebas en `main`).

### 3.2 Propuesto en PR Abierto (NO integrado en `main`)
- **PR #13 (Issue #12, Rama `feat/issue-12-gemini-guest-analysis`, HEAD `9b86ded`):**
  - Propone un adaptador REST para Gemini Interactions (`gemini-3.6-flash`) consumiendo salidas de tipo `model_output` y excluyendo `thought`.
  - Propone endpoints en servidor: `/api/guest/extract` (extracción individual) y `/api/guest/synthesize` (síntesis global en dos llamadas), con soporte de resolución de `prompt.md` en modo compilado `dist/` y protección de Secrets/Alias de prueba.
  - Incrementa la suite automatizada a 33 pruebas.
  - **Estado Actual:** En **HOLD**. No se encuentra fusionado en `main`, no ha sido autoaprobado y está pendiente de prueba humana en Codespaces con archivos reales para contrastar el comportamiento del análisis preliminar y sus discrepancias.

### 3.3 Capacidades Pendientes de Desarrollo
- Pipeline de análisis con **una única llamada LLM** que unifique extracción y cotejo para sesión invitada.
- Componente de visualización web rica del informe `TITLE_STUDY` validado (`CMP-WEB` / `CMP-REPORTS`).
- Generador de informe descargable en formato DOCX profesional a partir del JSON validado (`CMP-REPORTS`).
- Autenticación Google e inicio de sesión persistente con Firebase Auth (`CMP-IDENTITY`).
- Gestión de proyectos, persistencia de análisis y metadatos en Cloud Firestore (`CMP-PROJECTS`).
- Almacenamiento documental y selección mediante Google Picker en Google Drive (`CMP-DRIVE`).
- Panel unificado de configuración de APIs y modelos para múltiples proveedores: OpenAI, Anthropic, OpenRouter (`CMP-AI`).
- Publicación formal y verificación de disponibilidad en Google AI Studio Starter Tier / Cloud Run (`V-036`).

---

## 4. El Camino Hacia la Aplicación Operativa en AI Studio (Hito Piloto de 1 Llamada Gemini)

### 4.1 Definición y Racionalidad del Hito Piloto
El **Hito Piloto en AI Studio** consiste en lograr una aplicación web desplegada y plenamente operativa para usuarios invitados que permita:
1. Cargar antecedentes inmobiliarios locales en PDF (respetando los límites humanos vigentes de hasta 20 archivos y 50 MB totales).
2. Procesar el análisis completo mediante **una sola llamada a Gemini** que devuelva directamente el objeto estructurado `TITLE_STUDY`.
3. Validar de forma determinista la salida contra el schema Zod ejecutable.
4. Renderizar en la pantalla del navegador los antecedentes, hallazgos, diferencias documentales y conclusiones.
5. Descargar el informe profesional en formato DOCX generado fielmente a partir del JSON validado.

**Racionalidad Técnica:**
- *Superación de Límites de Cuota (HTTP 429/503):* La experiencia empírica demostró que ejecutar 1 llamada por archivo más 1 llamada de síntesis agota inmediatamente la cuota del Free Tier de Gemini (`gemini-3.6-flash`: 5 peticiones/minuto, 20 peticiones/día), provocando interrupciones tempranas.
- *Aprovechamiento de la Ventana de Contexto:* Las capacidades multimodales y la amplia ventana de contexto de Gemini permiten incluir el conjunto completo de antecedentes del caso en un único prompt estructurado, resolviendo la extracción, el cotejo cruzado y la formulación de conclusiones en una sola transacción atómica de inferencia.
- *Reducción de Latencia y Costos:* Disminuye el tiempo total de espera del usuario final de varios minutos a un solo intervalo de inferencia y elimina la necesidad de orquestadores de estado intermedio complejos en el servidor.

### 4.2 Desacoplamiento de Capacidades Restantes
Para alcanzar este hito no se requiere implementar previamente:
- Inicio de sesión con cuenta Google (`CMP-IDENTITY`).
- Almacenamiento en Google Drive ni selector Google Picker (`CMP-DRIVE`).
- Base de datos Cloud Firestore para proyectos (`CMP-PROJECTS`).
- Proveedores LLM alternativos (OpenAI, Anthropic, OpenRouter).

Estas capacidades se mantienen intactas en la planificación del producto completo, pero no forman parte de la ruta crítica técnica para tener el piloto demostrable en AI Studio.

---

## 5. Catálogo de Actividades Principales por Módulo y Estimación de Esfuerzo (HH)

Las estimaciones se presentan en rangos de horas-hombre `[Mínimo - Máximo] HH` para **un solo desarrollador**, considerando diseño, implementación de código, pruebas automatizadas y documentación técnica.

---

### Módulo 1: Motor Analítico y Contrato de Informe (`CMP-AI` / `TITLE_STUDY`)

#### Actividad ACT-01: Contrato Ejecutable Zod y JSON Schema de `TITLE_STUDY`
- **Componente:** `CMP-AI` / `src/report-types/title-study/schema.ts`
- **Entregable Verificable:** Schema Zod 4 ejecutable con tipos TypeScript derivados y exportación a JSON Schema Draft 2020-12, validando integridad referencial entre documentos, hallazgos, comparaciones y conclusiones.
- **Requisitos y Verificación:** `FR-048`, `FR-050`, `NFR-020`, `AC-005`, `V-020`.
- **Estado:** **Integrado en `main`** (Issue #9 / PR #11).
- **Estimación HH:** *Integrado* (0 HH pendientes).

#### Actividad ACT-02: Pipeline de Análisis Gemini de Una Sola Llamada para Invitado (Camino Piloto)
- **Componente:** `CMP-AI` / `src/services/ai/gemini.ts`, `server.ts`
- **Entregable Verificable:** Endpoint `POST /api/guest/analyze` que recibe hasta 20 archivos (PDF o texto plano, hasta 50 MB en total) y la clave API de Gemini del usuario, construye un prompt consolidado con los documentos adjuntos en una única interacción REST/SDK, invoca `gemini-3.6-flash`, extrae el JSON del paso `model_output`, lo valida contra `titleStudySchema` y retorna el reporte validado o un error descriptivo sanitizado.
- **Requisitos y Verificación:** `FR-002`, `FR-024`, `FR-025`, `FR-030`, `FR-040`–`FR-048`, `NFR-003`, `NFR-010`, `NFR-020`–`NFR-023`, `AC-001`, `AC-005`, `AC-006`, `AC-010`, `AC-013`, `V-005`, `V-011`, `V-013`, `V-020`–`V-023`, `V-038`.
- **Estado:** **Pendiente** (Reemplaza y simplifica el flujo de dos fases de PR #13, capitalizando las rutinas de sanitización y manejo de errores de dicho PR).
- **Estimación HH:** **12 – 18 HH**
- **Premisas y Supuestos:**
  - El usuario aporta su propia clave API de Gemini válida en la cabecera `x-gemini-api-key`.
  - Se utiliza la API REST o SDK de Google GenAI con el modelo `gemini-3.6-flash`.
  - La ventana de contexto de Gemini procesa holísticamente los 50 MB de antecedentes sin truncamiento silencioso.
- **Tareas Incluidas:**
  - Diseño y redacción del prompt unificado de análisis en `src/report-types/title-study/prompt.md`.
  - Adaptador de llamada única que serializa las partes de los documentos (inline data base64 para PDFs y texto plano) y exige JSON estructurado.
  - Validación del output con Zod `titleStudySchema`; rechazo estricto si no cumple el contrato.
  - Pruebas unitarias y de integración mockeadas simulando respuestas exitosas, respuestas malformadas y errores HTTP 429/503.
- **Exclusiones:** Autenticación de usuarios, persistencia en base de datos, llamadas a otros proveedores.
- **Incertidumbre:** **Media**. El principal factor de variabilidad radica en el comportamiento de Gemini al estructurar simultáneamente hallazgos, referencias cruzadas y conclusiones complejas bajo un único esquema estricto.

#### Actividad ACT-03: Adaptador Multimodelo y Proveedores Adicionales (OpenAI, Anthropic, OpenRouter)
- **Componente:** `CMP-AI` / `src/services/ai/providers/`
- **Entregable Verificable:** Módulo con interfaz unificada `AIProvider` que permite validar credenciales, consultar modelos disponibles y ejecutar el análisis de `TITLE_STUDY` contra las APIs oficiales de OpenAI, Anthropic y OpenRouter, manteniendo invariante la validación de salida con Zod.
- **Requisitos y Verificación:** `FR-030`–`FR-033`, `NFR-010`, `NFR-012`, `NFR-020`, `V-014`–`V-019`.
- **Estado:** **Pendiente** (Capacidad del producto completo, posterior al piloto).
- **Estimación HH:** **16 – 24 HH**
- **Premisas y Supuestos:**
  - Cada proveedor cuenta con soporte para salidas JSON estructuradas (Structured Outputs / Tool Calling).
  - El usuario introduce su propia API key por proveedor.
- **Tareas Incluidas:**
  - Definición de la interfaz común `AIProvider` en TypeScript.
  - Implementación de clientes HTTPS ligeros para OpenAI, Anthropic y OpenRouter sin introducir dependencias de SDKs pesadas redundantes.
  - Pruebas mockeadas por proveedor asegurando que la clave nunca se almacene ni se registre en logs.
- **Exclusiones:** Persistencia de claves de usuario; sustitución silenciosa de proveedores.
- **Incertidumbre:** **Baja**. Protocolos y formatos de salida estructurada bien estandarizados en la industria.

---

### Módulo 2: Interfaz de Usuario y Experiencia Web (`CMP-WEB`)

#### Actividad ACT-04: Navegación Lateral y Selección Local de PDFs para Invitado
- **Componente:** `CMP-WEB` / `src/app/`, `src/pages/GuestDocumentsPage.tsx`
- **Entregable Verificable:** Interfaz responsive en tema oscuro con barra lateral plegable, secciones honestas (UIR-008) y página de selección múltiple de PDFs locales con validación de cabecera y deduplicación en memoria.
- **Requisitos y Verificación:** `UIR-001`–`UIR-003`, `UIR-007`, `UIR-008`, `FR-020` parcial, `V-033`, `V-035`.
- **Estado:** **Integrado en `main`** (Baseline + Issue #6 / PR #7).
- **Estimación HH:** *Integrado* (0 HH pendientes).

#### Actividad ACT-05: Interfaz de Visualización Interactiva del Estudio de Títulos (Camino Piloto)
- **Componente:** `CMP-WEB` / `src/pages/TitleStudyResultPage.tsx`, `src/components/report/`
- **Entregable Verificable:** Vista web dinámica que recibe el objeto `TITLE_STUDY` validado y renderiza de forma clara y jerárquica:
  1. Antecedentes documentales identificados.
  2. Hallazgos jurídicos clasificados con referencias explícitas a los documentos fuente.
  3. Tabla/bloque de cotejo documental y discrepancias, destacando los 5 estados de comparación de SRS §10.7.
  4. Conclusiones jurídicas vinculadas a los hallazgos de respaldo.
  5. Controles para ingresar la clave API de Gemini de la sesión, botón de análisis con estado de carga claro y botón para descargar el informe en DOCX.
- **Requisitos y Verificación:** `UIR-004`, `UIR-007`, `FR-044`, `FR-045`, `FR-051`, `AC-006`, `V-024`, `V-025`.
- **Estado:** **Pendiente** (Esencial para cerrar la precedencia de `DEVELOPMENT_PLAN.md` y el hito piloto).
- **Estimación HH:** **14 – 20 HH**
- **Premisas y Supuestos:**
  - Consume directamente el contrato TypeScript inferido de `titleStudySchema`.
  - El diseño mantiene el tema oscuro profesional sin tablas sobrecargadas ni elementos técnicos forenses descartados en SRS §4.
- **Tareas Incluidas:**
  - Componentes React modulares: `DocumentSourcesList`, `FindingsGrid`, `DiscrepanciesComparisonTable`, `ConclusionsView`.
  - Manejo de estados de UI: selección de archivos → configuración de clave de sesión → análisis en progreso con indicador de actividad → vista de resultados o mensaje de error comprensible.
  - Pruebas de renderizado de componentes con datos mockeados representativos de `TITLE_STUDY`.
- **Exclusiones:** Gestión de proyectos persistentes, autenticación Google.
- **Incertidumbre:** **Baja**. Componentes frontend estándar basados en un esquema de datos completamente tipado.

#### Actividad ACT-06: Panel de Configuración de APIs y Modelos
- **Componente:** `CMP-WEB` / `src/pages/ApiModelsPage.tsx`
- **Entregable Verificable:** Vista unificada accesible desde la navegación principal (`UIR-003`, `UIR-006`) que permite al usuario seleccionar proveedor (Gemini, OpenAI, Anthropic, OpenRouter), ingresar su clave API temporal, consultar y elegir modelos disponibles mediante llamada de prueba, y guardar sus preferencias no sensibles (proveedor y modelo preferido) sin almacenar la clave en almacenamiento persistente inseguro.
- **Requisitos y Verificación:** `FR-030`–`FR-033`, `UIR-006`, `NFR-010`, `V-012`, `V-015`.
- **Estado:** **Pendiente** (Producto completo).
- **Estimación HH:** **8 – 12 HH**
- **Premisas y Supuestos:**
  - No almacena claves en `localStorage`, cookies desprotegidas ni en el repositorio.
  - La verificación de credenciales consulta el endpoint de prueba del proveedor upstream.
- **Tareas Incluidas:**
  - Formulario de configuración reactivo con feedback inmediato de conexión.
  - Pruebas de interfaz asegurando el cumplimiento de `NFR-010`.
- **Exclusiones:** Almacenamiento de claves en backend o base de datos.
- **Incertidumbre:** **Baja**.

#### Actividad ACT-07: Vistas de Gestión de Proyectos, Documentos e Informes Autenticados
- **Componente:** `CMP-WEB` / `src/pages/projects/`, `src/pages/reports/`
- **Entregable Verificable:** Conjunto de vistas para usuarios autenticados: "Mis Proyectos", "Nuevo Proyecto", detalle del proyecto con sus cuatro pestañas normativas (Resumen, Documentos, Resultado, Informe - `UIR-004`), y vista "Mis Informes".
- **Requisitos y Verificación:** `FR-010`–`FR-015`, `FR-054`, `FR-055`, `UIR-003`, `UIR-004`, `V-006`, `V-027`.
- **Estado:** **Pendiente** (Producto completo).
- **Estimación HH:** **16 – 24 HH**
- **Premisas y Supuestos:**
  - Se integra con los servicios de backend de Firestore y Google Drive una vez implementados.
- **Tareas Incluidas:**
  - Vistas CRUD de proyectos y navegación interna por pestañas.
  - Integración visual del estado del proyecto (documentos vinculados, análisis ejecutados e informes generados).
  - Pruebas automatizadas de renderizado de vistas.
- **Exclusiones:** Lógica de sincronización en bajo nivel con Drive (pertenece a `CMP-DRIVE`).
- **Incertidumbre:** **Media**. Depende de la estabilidad de las estructuras de datos de Firestore.

---

### Módulo 3: Generación Documental e Informes (`CMP-REPORTS`)

#### Actividad ACT-08: Renderizador DOCX Profesional para `TITLE_STUDY` (Camino Piloto)
- **Componente:** `CMP-REPORTS` / `src/report-types/title-study/renderer.ts`, endpoint de descarga
- **Entregable Verificable:** Módulo generador de archivos Microsoft Word (`.docx`) utilizando la librería `docx`, que recibe como única entrada el objeto `TITLE_STUDY` validado y produce un documento descargable profesional y estilizado, respetando las invariantes arquitectónicas (portada sobria, tipografía corporativa, márgenes estándar, tablas de cotejo con bordes limpios, numeración de páginas y títulos jerárquicos). El renderer no inventa conclusiones ni hechos no contenidos en el JSON.
- **Requisitos y Verificación:** `FR-050`, `FR-052`, `FR-053`, `NFR-020`, `AC-007`, `V-026`, `V-028`.
- **Estado:** **Pendiente** (Camino Piloto).
- **Estimación HH:** **14 – 20 HH**
- **Premisas y Supuestos:**
  - La generación se ejecuta de forma determinista en el servidor o cliente mediante la librería `docx` (npm).
  - No se utiliza LLM para redactar el DOCX; la LLM entrega el JSON estructurado y el código TypeScript ensambla el documento.
- **Tareas Incluidas:**
  - Estructuración del documento Word: estilos de párrafos, títulos H1/H2/H3, encabezados y pies de página.
  - Generación de tablas para los antecedentes documentales y las comparaciones/discrepancias.
  - Endpoint o helper de descarga directa en el navegador para sesión invitada (`GET/POST /api/guest/download-docx`).
  - Pruebas automatizadas que validen que el buffer DOCX generado se construye sin errores y contiene el texto clave del JSON sin omisiones estructurales.
- **Exclusiones:** Almacenamiento persistente en Drive (pertenece al módulo autenticado).
- **Incertidumbre:** **Media**. El ajuste fino de estilos visuales, saltos de página y tablas en `docx` suele requerir iteraciones de pulido visual.

---

### Módulo 4: Identidad y Sesión de Usuario (`CMP-IDENTITY`)

#### Actividad ACT-09: Autenticación Google con Firebase Authentication y Aislamiento de Datos
- **Componente:** `CMP-IDENTITY` / `src/services/auth/`
- **Entregable Verificable:** Flujo de inicio y cierre de sesión mediante Google Sign-In integrado con Firebase Authentication, emisión y verificación de tokens de sesión, y aislamiento estricto de recursos por usuario (`uid`).
- **Requisitos y Verificación:** `FR-001`, `FR-003`, `NFR-011`, `CON-005`, `AC-002`, `AC-008`, `V-004`.
- **Estado:** **Pendiente** (Producto completo).
- **Estimación HH:** **10 – 16 HH**
- **Premisas y Supuestos:**
  - Uso de Firebase Authentication en modo cliente web para Google OAuth, sin secretos de cliente almacenados en el código.
  - Verificación de tokens Bearer en middleware de Express para rutas protegidas.
- **Tareas Incluidas:**
  - Botón de Google Sign-In y manejo de sesión reactiva en frontend.
  - Middleware de autenticación en Express para validar tokens de Firebase.
  - Pruebas automatizadas de protección de rutas rechazando accesos no autenticados o con tokens adulterados.
- **Exclusiones:** Autorización de scopes extendidos de Drive (se manejan en `CMP-DRIVE`).
- **Incertidumbre:** **Baja**. Patrón estándar y documentado en Firebase / Google Identity.

---

### Módulo 5: Gestión y Persistencia de Proyectos (`CMP-PROJECTS`)

#### Actividad ACT-10: Persistencia de Proyectos, Metadata y Resultados en Cloud Firestore
- **Componente:** `CMP-PROJECTS` / `src/services/firestore/`
- **Entregable Verificable:** Servicio y reglas de seguridad de Firestore para almacenar y consultar proyectos por usuario (`/users/{uid}/projects/{projectId}`), metadatos de documentos asociados, historial de ejecuciones analíticas e informes generados, garantizando aislamiento total entre usuarios y prevención de corrupción de datos.
- **Requisitos y Verificación:** `FR-010`–`FR-015`, `FR-054`, `FR-055`, `NFR-011`, `NFR-023`, `AC-002`, `AC-008`, `AC-009`, `V-006`, `V-007`.
- **Estado:** **Pendiente** (Producto completo).
- **Estimación HH:** **14 – 22 HH**
- **Premisas y Supuestos:**
  - Firestore se utiliza exclusivamente para metadata estructurada y referencias lógicas, **nunca** para almacenar el contenido binario de archivos PDF ni DOCX (`SOFTWARE_ARCHITECTURE.md` §9).
  - Reglas de seguridad de Firestore (`firestore.rules`) que hacen cumplir `request.auth.uid == userId`.
- **Tareas Incluidas:**
  - Esquema de colecciones: `users`, `projects`, `documents_metadata`, `analyses`, `reports`.
  - Reglas de seguridad validadas con emulador o pruebas locales.
  - Rutas de API REST para proyectos (`/api/projects/*`).
  - Pruebas automatizadas de aislamiento multi-tenant y manejo de errores.
- **Exclusiones:** Almacenamiento de archivos binarios (pertenece a Drive).
- **Incertidumbre:** **Media**. Requiere diseño cuidadoso de reglas de seguridad y sincronización de índices.

---

### Módulo 6: Almacenamiento Documental en la Nube (`CMP-DRIVE`)

#### Actividad ACT-11: Integración con Google Drive API y Google Picker para Archivos Persistentes
- **Componente:** `CMP-DRIVE` / `src/services/drive/`
- **Entregable Verificable:** Módulo que interactúa con Google Drive bajo la cuenta autorizada del usuario:
  1. Creación automática de la estructura jerárquica de carpetas por proyecto (`Nombre Aplicación / Proyectos / [Nombre Proyecto] / (Documentos | Analisis | Informes)`).
  2. Almacenamiento de documentos originales cargados localmente en la subcarpeta `Documentos/`.
  3. Selección e incorporación de documentos existentes en el Drive del usuario mediante Google Picker (`FR-021`).
  4. Almacenamiento persistente de copias JSON en `Analisis/` y archivos DOCX en `Informes/`.
  5. Tratamiento controlado de contingencias de Drive (cuota insuficiente, token revocado, archivo eliminado externamente) como errores explícitos y recuperables, sin afirmar almacenamiento exitoso antes de confirmación externa (`AC-011`, `AC-014`).
- **Requisitos y Verificación:** `FR-021`, `FR-022`, `FR-023`, `FR-054`, `CON-004`, `AC-003`, `AC-004`, `AC-011`, `AC-014`, `V-008`–`V-010`, `V-029`, `V-030`.
- **Estado:** **Pendiente** (Producto completo).
- **Estimación HH:** **20 – 30 HH**
- **Premisas y Supuestos:**
  - El usuario otorga permisos OAuth de Google Drive al vincular su cuenta.
  - Se utilizan tokens de usuario delegados en el cliente o transmitidos vía HTTPS al backend.
- **Tareas Incluidas:**
  - Flujo de solicitud y refresco de tokens OAuth para Google Drive.
  - Integración de Google Picker API en el frontend para selección directa de archivos.
  - Servicio de backend para subida y descarga de archivos binarios mediante streaming acotado en memoria (`NFR-003`).
  - Lógica de verificación de carpetas y manejo resiliente de errores externos de Drive.
  - Pruebas automatizadas mockeadas de operaciones de Drive y escenarios de fallo (espacio insuficiente, 401, 404).
- **Exclusiones:** Almacenamiento local persistente en disco del servidor (el servidor permanece stateless).
- **Incertidumbre:** **Alta**. La interacción con OAuth de Google Drive, Google Picker, cuotas de usuario y gestión de permisos revocados concentra la mayor variabilidad de integración de terceros del producto.

---

### Módulo 7: Despliegue, Publicación y Operación en AI Studio (`CMP-SERVER` / Deployment)

#### Actividad ACT-12: Servidor Base HTTP Express y Healthcheck Semántico
- **Componente:** `CMP-SERVER` / `server.ts`
- **Entregable Verificable:** Proceso HTTP Express sirviendo API y frontend estático, con endpoint `/api/health` desacoplado de dependencias externas.
- **Requisitos y Verificación:** `NFR-024`, `CON-001`, `AC-012`, `V-001`–`V-003`, `V-042`.
- **Estado:** **Integrado en `main`** (Baseline).
- **Estimación HH:** *Integrado* (0 HH pendientes).

#### Actividad ACT-13: Verificación, Empaquetado y Publicación en Google AI Studio (Camino Piloto)
- **Componente:** Configuración de despliegue, contenedor y scripts en raíz del proyecto
- **Entregable Verificable:** Verificación empírica del build y la compatibilidad con el entorno de publicación de Google AI Studio / Cloud Run (`CON-001`, `CON-002`, `V-036`), asegurando que la URL compartida de publicación (`ais-pre-...`) responda correctamente y que la aplicación opere de forma idéntica en el entorno distribuido sin depender de variables de desarrollo ni generar regresiones en `npm start`.
- **Requisitos y Verificación:** `CON-001`, `CON-002`, `V-036`.
- **Estado:** **Pendiente** (Camino Piloto; actualmente V-036 permanece `PENDING / NOT RUN` debido a que la URL compartida responde HTTP 404 por falta de despliegue).
- **Estimación HH:** **6 – 10 HH**
- **Premisas y Supuestos:**
  - El entorno de AI Studio dispone del mecanismo de publicación a Cloud Run activo y configurado.
  - El contenedor se compila con `npm run build` y se inicia con `npm start` (`node dist/server.js`).
- **Tareas Incluidas:**
  - Auditoría de dependencias, scripts de build y empaquetado de assets para producción.
  - Comprobación de variables de entorno y puertos (`PORT`, `0.0.0.0`).
  - Pruebas de verificación de despliegue real en AI Studio verificando el healthcheck y la interfaz pública.
- **Exclusiones:** Infraestructura multicloud o Kubernetes complejo.
- **Incertidumbre:** **Media**. Depende de la estabilidad del mecanismo de publicación interno de la plataforma AI Studio.

---

## 6. Consolidación de Estimaciones y Análisis de Rangos

### 6.1 Tabla Resumen de Actividades del Producto Completo

| ID | Módulo / Componente | Entregable Verificable | Camino Piloto | Estado | Rango Estimado (HH) | Incertidumbre |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: |
| **ACT-01** | `CMP-AI` (Contrato) | Schema Zod y JSON Schema de `TITLE_STUDY` | Sí | **Integrado** | *Integrado* | N/A |
| **ACT-02** | `CMP-AI` (Motor) | Pipeline Gemini de 1 llamada para invitado | **Sí** | **Pendiente** | **12 – 18 HH** | Media |
| **ACT-03** | `CMP-AI` (Multi-proveedor) | Adaptador OpenAI, Anthropic y OpenRouter | No | **Pendiente** | **16 – 24 HH** | Baja |
| **ACT-04** | `CMP-WEB` (Navegación) | Barra lateral y selección de PDFs locales | Sí | **Integrado** | *Integrado* | N/A |
| **ACT-05** | `CMP-WEB` (Visualización) | Vista interactiva del `TITLE_STUDY` validado | **Sí** | **Pendiente** | **14 – 20 HH** | Baja |
| **ACT-06** | `CMP-WEB` (Configuración) | Panel unificado de APIs y modelos | No | **Pendiente** | **8 – 12 HH** | Baja |
| **ACT-07** | `CMP-WEB` (Proyectos) | Vistas de proyectos, documentos e informes | No | **Pendiente** | **16 – 24 HH** | Media |
| **ACT-08** | `CMP-REPORTS` (DOCX) | Renderizador DOCX profesional para invitado | **Sí** | **Pendiente** | **14 – 20 HH** | Media |
| **ACT-09** | `CMP-IDENTITY` (Auth) | Google Sign-In con Firebase Authentication | No | **Pendiente** | **10 – 16 HH** | Baja |
| **ACT-10** | `CMP-PROJECTS` (Persistencia) | Almacenamiento en Cloud Firestore | No | **Pendiente** | **14 – 22 HH** | Media |
| **ACT-11** | `CMP-DRIVE` (Archivos) | Integración Google Drive API y Picker | No | **Pendiente** | **20 – 30 HH** | Alta |
| **ACT-12** | `CMP-SERVER` (Servidor) | Servidor HTTP Express y `/api/health` | Sí | **Integrado** | *Integrado* | N/A |
| **ACT-13** | `Deployment` (Publicación) | Publicación y verificación en AI Studio (V-036) | **Sí** | **Pendiente** | **6 – 10 HH** | Media |

---

### 6.2 Subtotales por Subconjunto Estratégico

#### A. Camino Hacia el Piloto Operativo en AI Studio (1 Llamada Gemini)
Comprende exclusivamente las actividades técnicas pendientes indispensables para que un usuario invitado analice documentos locales en AI Studio y obtenga su informe web y DOCX:
- **ACT-02** (Motor analítico Gemini de 1 llamada): 12 – 18 HH
- **ACT-05** (Interfaz de visualización interactiva del informe): 14 – 20 HH
- **ACT-08** (Generador de informe DOCX profesional): 14 – 20 HH
- **ACT-13** (Verificación y publicación en AI Studio): 6 – 10 HH
- **Subtotal Estimado del Hito Piloto:** **46 – 68 HH**

#### B. Capacidades Restantes del Producto Completo
Comprende las actividades que completan la visión integral aprobada (modo autenticado, proyectos persistentes, almacenamiento en Drive y multi-proveedor):
- **ACT-03** (Proveedores LLM adicionales): 16 – 24 HH
- **ACT-06** (Panel de APIs y modelos): 8 – 12 HH
- **ACT-07** (Vistas autenticadas de proyectos): 16 – 24 HH
- **ACT-09** (Autenticación Google): 10 – 16 HH
- **ACT-10** (Persistencia Firestore): 14 – 22 HH
- **ACT-11** (Integración Google Drive y Picker): 20 – 30 HH
- **Subtotal Estimado de Capacidades Restantes:** **84 – 128 HH**

#### C. Esfuerzo Total Pendiente del Producto Completo
- **Suma Total Estimada de Trabajo Pendiente:** **130 – 196 HH**

---

### 6.3 Limitaciones Matemáticas y Operativas de la Suma de Rangos
La suma directa de los rangos de horas-hombre es una herramienta de orientación agregada y está sujeta a las siguientes limitaciones estrictas:
1. **Independencia Estadística no Garantizada:** La adición simple de mínimos y máximos asume que los escenarios más favorables o más desfavorables ocurrirían simultáneamente en todas las actividades, lo cual es estadísticamente improbable pero ilustra los extremos teóricos.
2. **Exclusión de Tiempos de Bloqueo Externo:** Las estimaciones reflejan únicamente tiempo activo de ingeniería de un programador. No incluyen latencias de espera administrativa, tiempos de revisión humana entre Work Items, ni eventuales períodos de espera por cuotas de APIs de terceros o aprobación de pantallas de consentimiento OAuth por parte de Google.
3. **No Representa un Compromiso de Calendario ni Velocidad:** El documento no formula proyecciones de días calendario, fechas límite, porcentajes de avance acumulado ni precios comerciales.

---

## 7. Secuencia de Desarrollo Propuesta

Con base en la regla de precedencia vinculante de `DEVELOPMENT_PLAN.md` (interfaz antes de motor completo) y la minimización de riesgos de integración, se propone el siguiente orden secuencial estructurado en fases conceptuales (sin fijar fechas):

```text
                               FASE PILOTO AI STUDIO

  [ACT-05: UI Visualización Informe] ──(Precedencia normativa: interfaz antes)
                 │
                 ▼
  [ACT-02: Motor Gemini 1 Llamada]  ──(Alineación con límites vigentes de cuota)
                 │
                 ▼
  [ACT-08: Renderizador DOCX]       ──(Generación basada en el JSON validado)
                 │
                 ▼
  [ACT-13: Publicación AI Studio]   ──(Hito Operativo Demostrable en Cloud Run)


                         FASE DE PERSISTENCIA Y CUENTAS

  [ACT-09: Autenticación Google]    ──(Base de identidad para recursos privados)
                 │
                 ▼
  [ACT-10: Persistencia Firestore]  ──(Estructura lógica de usuarios y proyectos)
                 │
                 ▼
  [ACT-07: Vistas de Proyectos]     ──(Interfaz de gestión autenticada)
                 │
                 ▼
  [ACT-11: Integración Drive/Picker]──(Almacenamiento documental en la nube)


                         FASE DE EXTENSIBILIDAD MULTIMODELO

  [ACT-06: Panel APIs y Modelos]    ──(Gestión de credenciales de usuario)
                 │
                 ▼
  [ACT-03: Proveedores LLM Extra]   ──(Soporte OpenAI, Anthropic, OpenRouter)
```

---

## 8. Pendientes de Decisión y Gestión de Riesgos

Para salvaguardar la ejecución ordenada del plan, se identifican los siguientes puntos que requieren decisión explícita del propietario o validación empírica:

1. **Resolución y Cierre del PR #13 (Issue #12):**
   - *Situación:* PR #13 implementó la arquitectura de dos llamadas para invitado (extracción + síntesis) y está actualmente en HOLD para prueba humana en Codespaces.
   - *Decisión Pendiente:* Determinar si se aprueba formalmente PR #13 como paso intermedio verificable de extracción/síntesis REST, o si se procede a refactorizar directamente hacia el modelo de **1 llamada Gemini** (ACT-02) en un nuevo Work Item, capitalizando los aprendizajes de tests y manejo de `prompt.md` en producción obtenidos en PR #13.
2. **Definición de Estrategia de Renderizado DOCX:**
   - *Situación:* La especificación técnica establece el uso de la librería `docx` para generar el archivo Word a partir del JSON validado.
   - *Riesgo:* Mantener el estilo tipográfico profesional exigido requiere definir una plantilla de diseño estricta en código TypeScript.
   - *Mitigación:* Implementar un conjunto representativo de pruebas visuales y de estructura antes de abrir el módulo a otros tipos de informe.
3. **Complejidad de Integración con Google Drive y Scopes OAuth:**
   - *Situación:* Es la actividad con mayor rango de incertidumbre técnica (20–30 HH). Involucra Google Picker, tokens delegados y tratamiento de fallas externas (espacio, revocación, borrado).
   - *Mitigación:* Desarrollar primero el flujo con tokens de prueba y permisos acotados (`drive.file`) para evitar procesos complejos de verificación de marcas de Google en fases tempranas.
4. **Verificación de Publicación en AI Studio (V-036):**
   - *Situación:* La URL compartida reporta actualmente HTTP 404 por no encontrarse desplegada en la infraestructura de Cloud Run de AI Studio.
   - *Mitigación:* Abordar ACT-13 de manera coordinada con el despliegue del Hito Piloto, verificando exhaustivamente que el contenedor inicie en modo producción con `node dist/server.js` y atienda el healthcheck sin errores.
