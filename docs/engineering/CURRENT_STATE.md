# Current State

## 1. Integrated Baseline

**CURRENT = BASELINE_EJECUTABLE_INICIAL (Work Item #1).** Existe una baseline funcional integrada que incluye el servidor HTTP Express (`server.ts`), la interfaz web inicial React con Vite (`src/app/`, `src/components/`, `src/pages/`), la suite de pruebas automatizadas (`tests/`), scripts canónicos en `package.json` y lockfile versionado `package-lock.json`.

## 2. Requirement / Capability Status

### Capacidades efectivamente integradas
- **CMP-SERVER (Servidor de aplicación):** Servidor HTTP con Node.js y Express 5. Escucha en `0.0.0.0` mediante `PORT`. Soporta modo desarrollo con Vite integrado como middleware y modo producción sirviendo el frontend estático compilado desde `dist/client`.
- **Salud del proceso (NFR-024, AC-012, V-003, V-042):** Endpoint `GET /api/health` que responde HTTP 200 e informa únicamente la disponibilidad del proceso HTTP (`{"status":"ok", ...}`), sin consultar ni afirmar el estado de servicios externos.
- **CMP-WEB (Interfaz web inicial):** Aplicación React con tema oscuro, profesional y adaptable (UIR-001, UIR-002, UIR-007). Navegación lateral plegable con las secciones previstas en SRS §4: Inicio, Proyectos (Nuevo proyecto, Mis proyectos), Informes (Mis informes), IA (APIs y modelos), Documentos (análisis preliminar de archivos locales para invitado y Google Drive) y Configuración (UIR-003). Drive sigue no integrado. Vista Inicio funcional y activa.
- **Selección y análisis invitado (Issue #12):** La página conserva archivos de cualquier extensión y firma, muestra nombre, tamaño y estado por archivo, y permite quitar uno o todos. El piloto lee y envía secuencialmente un archivo por solicitud, sólo para PDF con firma `%PDF-`, PNG/JPEG con firma correspondiente y TXT/Markdown UTF-8. Otros tipos, incluido CSV y XLS/XLSX, se mantienen seleccionados como “No analizado” con causa y no bloquean los compatibles. Límites inline: PDF 50 MiB; otros admitidos 70 MiB por expansión Base64 para mantenerse bajo 100 MB de payload Gemini. La clave propia se conserva sólo en el estado temporal de la página y cabeceras HTTPS/API. La opción de alias resuelve en el servidor únicamente Secrets explícitos `GEMINI_TEST_KEY_1`–`3` del propietario; el navegador sólo recibe nombres y usa un código privado temporal para listar alias y acceder a cada ruta de análisis. El modo alias queda deshabilitado sin configuración explícita y no usa la variable automática `GEMINI_API_KEY`. No se guardan claves en la aplicación ni se registran. Se avisa que los archivos legibles se envían a Google Gemini y el procesamiento es temporal.
- **Identificación de funciones futuras (UIR-008):** Todas las secciones correspondientes a fases futuras quedan explícitamente señaladas como no disponibles, sin incorporar formularios, botones simulados ni datos ficticios.
- **Toolchain y comandos canónicos (Tech Spec §4):** `npm ci`, `npm run dev`, `npm run build`, `npm start` y `npm test`.
- **Pruebas automatizadas iniciales:** Ejecutadas mediante el runner nativo de Node.js (`node --import tsx --test tests/*.test.ts`).

### Capacidades que se mantienen NOT_INTEGRATED
Las siguientes capacidades permanecen **NOT_INTEGRATED**:
- Autenticación Google y gestión de sesiones invitadas persistentes (CMP-IDENTITY, FR-010, FR-011, V-004).
- **Prueba manual real con Gemini y revisión humana del `TITLE_STUDY`:** pendiente. Las pruebas automatizadas usan respuestas simuladas; no prueban acceso/tier, cuota real, extracción real, diferencias reales ni calidad jurídica. V-005, V-011, V-020, V-023 y V-038 permanecen `NOT RUN` hasta la prueba humana con documentos propios en Codespaces, vinculada al SHA del PR. La inyección de Secrets y la restricción para visitantes anónimos en el Starter Tier público siguen sin prueba real: habilitación pública del modo alias `HOLD`.
- Gestión y persistencia de proyectos en Cloud Firestore (CMP-PROJECTS, V-006, V-007).
- **FR-020 (documentos locales):** integrado parcialmente para selección temporal y piloto de análisis invitado descrito arriba. No hay persistencia en Drive. **Google Drive y Picker** (CMP-DRIVE, FR-021, V-008–010) y almacenamiento persistente en Drive (FR-022) permanecen **NOT_INTEGRATED**.
- Configuración global/selección de proveedores LLM (Gemini, OpenAI, Anthropic, OpenRouter) permanece `NOT_INTEGRATED`. El flujo piloto #12 integra únicamente Gemini `gemini-3.6-flash` con clave temporal o alias de prueba autorizado del propietario; no añade ajustes globales ni cambia silenciosamente proveedor/modelo.
- **Contrato ejecutable y piloto `TITLE_STUDY` (Issues #9/#12):** schema Zod 4 mantiene validación referencial y deriva JSON Schema Draft 2020-12 para Gemini. `src/services/ai/gemini.ts` extrae hechos de archivos individualmente, los consolida con el prompt del tipo y vuelve a validar la respuesta final con `titleStudySchema`. PDF/PNG/JPEG/TXT/Markdown son formatos procesables; los demás se conservan sin enviar. Diferencias entre documentos se mantienen como comparaciones. El JSON visible está marcado preliminar y requiere revisión humana. No hay DOCX, persistencia, Drive ni autenticación.
- Generación y descarga de informes DOCX (CMP-REPORTS, FR-050–054, V-026–030).
- Las restricciones `CON-*` se mantienen como restricciones TARGET cuya verificación integral requiere el entorno desplegado pertinente.

## 3. Evidencia producida

Evidencia local producida en la baseline del Work Item #1:
- **V-001 (Build):** `PASS`. `npm run build` compila `server.ts` a `dist/server.js`, comprueba tipos de cliente con `tsc` y genera el cliente en `dist/client`.
- **V-002 (Production startup):** `PASS`. `npm start` (`node dist/server.js`) levanta el servidor Express sirviendo el frontend estático compilado en `0.0.0.0` usando `PORT`.
- **V-003 (Health endpoint):** `PASS`. `GET /api/health` responde HTTP 200 con `{ status: "ok", uptime: <number>, timestamp: <string> }`.
- **V-042 (Health semantics):** `PASS`. `GET /api/health` no consulta ni afirma el estado de Drive, Firestore ni proveedores LLM.
- **V-033 (Main navigation):** `PASS` para la navegación de la baseline, antes del Issue #6; no verifica manualmente la nueva entrada de documentos locales.
- **V-035 (Responsive use):** `PASS` para la interfaz de la baseline, antes del Issue #6; no verifica manualmente la nueva página en desktop o móvil.
- **Pruebas automatizadas locales:** `PASS` (3/3 pruebas de la baseline ejecutadas en `tests/*.test.ts`).

Evidencia local del Work Item #6 (código y pruebas de la rama del PR #7):
- **Pruebas específicas de selección local:** evidencia de esa rama/HEAD; la regla de admisión fue reemplazada por la decisión humana registrada en Issue #6 e implementada en Issue #12.
- **Revisión manual desktop/móvil para el Issue #6:** `NOT RUN`; el navegador disponible no pudo abrir el servidor local (`net::ERR_BLOCKED_BY_CLIENT`). La comprobación visual responsive y de interacción real de la nueva página sigue pendiente.
- **CI:** `NOT CONFIGURED` (no existe pipeline de CI versionado en el repositorio; la evidencia corresponde a verificación local).

Evidencia local del Work Item #9:
- **Instalación reproducible:** `npm ci` pasa con el lockfile actualizado y resuelve Zod `4.6.5`.
- **Contrato `TITLE_STUDY`:** pruebas automatizadas verifican payload mínimo sin campos opcionales irrelevantes, rechazo de estructura inválida, preservación de valor original/normalizado, aceptación de diferencias documentales y los cinco resultados posibles.
- **JSON Schema derivado:** prueba automatizada comprueba que se conservan el discriminador, campos requeridos, mínimo de documentos y valores de comparación, enum, propiedades opcionales y prohibición de propiedades adicionales.
- **Diferencia entre Zod y JSON Schema:** Zod rechaza referencias a documentos/hallazgos inexistentes y evita identificadores duplicados para documentos y hallazgos. `z.toJSONSchema()` conserva la estructura de esos campos como arrays de strings, pero no representa estas reglas entre elementos del payload. Para validar integridad referencial hay que validar con `titleStudySchema`; JSON Schema derivado por sí solo no equivale a esa validación.
- **Alcance de la evidencia:** las pruebas locales verifican el schema Zod y su JSON Schema derivado; no verifican una respuesta de LLM ni constituyen evidencia de análisis completo. No se marca V-020, V-021 o V-022 como PASS por estas pruebas aisladas.
- **Build y pruebas locales:** `npm run build` pasa; `npm test` pasa con 14/14 pruebas en total (7 pruebas para `TITLE_STUDY`).
- **CI:** `NOT CONFIGURED` (sin workflow de GitHub Actions).

Evidencia del Work Item #12 (REWORK REST Interactions y verificación en AI Studio Starter Tier):
- **Adaptador REST Gemini Interactions:** corregido para consumir la respuesta oficial de la API REST Interactions (`/v1beta/interactions`, `gemini-3.6-flash`), extrayendo el texto JSON de la salida final de `model_output` en `steps[].content[].text` y excluyendo pasos de `thought`. Rechaza respuestas incompletas o sin `model_output` válido.
- **Suite automatizada local:** `PASS` (30/30 pruebas); incluye 2 pruebas nuevas para la respuesta representativa REST y casos de pasos incompletos/inválidos sin éxito ficticio. `npm ci`, `npm run build` y `git diff --check` pasan sin errores.
- **Protección de Secrets y Alias:** se verificó el rechazo público HTTP 403 en `/api/guest/key-aliases`, `/api/guest/extract` y `/api/guest/synthesize` sin código de acceso o con token inválido, aun indicando alias conocido. Con autorización válida, lista sólo `{ id, label }` sin revelar Secrets. No hay fallback automático a `GEMINI_API_KEY`.
- **Prueba real de extracción con Gemini en AI Studio:** `PASS` técnico para la extracción individual en vuelo real (`Extraction success: Escritura Pública`), validando los hechos extraídos con `guestDocumentFactsSchema`.
- **Prueba real de síntesis con Gemini en AI Studio:** ejecutada contra el proveedor; Gemini devolvió errores reales controlados (HTTP 503 por alta demanda y HTTP 429 por límite de cuota/tasa en Free Tier de 5 peticiones por minuto), manejados transparentemente por la aplicación como `GEMINI_ERROR` sin inventar informes simulados ni filtrar claves. V-005, V-011, V-020, V-023 y V-038 permanecen `PENDING` para la revisión humana formal de calidad jurídica del informe consolidado.
- **Publicación Starter Tier (V-036):** la URL compartida (`ais-pre-...`) devuelve HTTP 404 por no encontrarse desplegada; V-036 permanece `PENDING / NOT RUN`.
- **CI:** `NOT CONFIGURED` (sin workflow de GitHub Actions).
