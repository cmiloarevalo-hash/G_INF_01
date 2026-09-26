# Current State

**Corte de estado:** `main` en `24d44b14d5d690aede60759a0f7603a473209b79`. El análisis del Issue #12 pertenece al PR #13 abierto; sus pruebas locales y las pruebas humanas sobre SHA anteriores no convierten esa capacidad en integrada.

## 1. Integrated Baseline

**CURRENT = BASELINE_EJECUTABLE_INICIAL (Work Item #1).** Existe una baseline funcional integrada que incluye el servidor HTTP Express (`server.ts`), la interfaz web inicial React con Vite (`src/app/`, `src/components/`, `src/pages/`), la suite de pruebas automatizadas (`tests/`), scripts canónicos en `package.json` y lockfile versionado `package-lock.json`.

## 2. Requirement / Capability Status

### Capacidades efectivamente integradas
- **CMP-SERVER (Servidor de aplicación):** Servidor HTTP con Node.js y Express 5. Escucha en `0.0.0.0` mediante `PORT`. Soporta modo desarrollo con Vite integrado como middleware y modo producción sirviendo el frontend estático compilado desde `dist/client`.
- **Salud del proceso (NFR-024, AC-012, V-003, V-042):** Endpoint `GET /api/health` que responde HTTP 200 e informa únicamente la disponibilidad del proceso HTTP (`{"status":"ok", ...}`), sin consultar ni afirmar el estado de servicios externos.
- **CMP-WEB (Interfaz web inicial):** Aplicación React con tema oscuro, profesional y adaptable (UIR-001, UIR-002, UIR-007). Navegación lateral plegable con las secciones previstas en SRS §4: Inicio, Proyectos (Nuevo proyecto, Mis proyectos), Informes (Mis informes), IA (APIs y modelos), Documentos (PDF locales para invitado y Google Drive) y Configuración (UIR-003). Sólo la selección local de PDFs está disponible dentro de Documentos; Drive sigue no integrado. Vista Inicio funcional y activa.
- **Selección local de PDFs para invitado (Issue #6):** Desde Inicio y la navegación existe una página sin autenticación. Conserva referencias a archivos locales sólo mientras esa página está abierta; muestra nombre y tamaño, valida extensión y firma `%PDF-`, evita duplicados por metadata y permite quitar uno o todos. En `main` no se envían documentos al servidor ni a Gemini, ni se generan resultados.
- **Identificación de funciones futuras (UIR-008):** Todas las secciones correspondientes a fases futuras quedan explícitamente señaladas como no disponibles, sin incorporar formularios, botones simulados ni datos ficticios.
- **Toolchain y comandos canónicos (Tech Spec §4):** `npm ci`, `npm run dev`, `npm run build`, `npm start` y `npm test`.
- **Pruebas automatizadas iniciales:** Ejecutadas mediante el runner nativo de Node.js (`node --import tsx --test tests/*.test.ts`).
- **Contrato ejecutable inicial `TITLE_STUDY` (Issue #9):** schema Zod 4, tipos derivados y JSON Schema Draft 2020-12; valida integridad referencial. No incluye prompt, análisis LLM ni renderer.

### Propuesto en PR #13 (sin integrar)
- **Análisis invitado:** La página conserva archivos de cualquier extensión, muestra nombre, tamaño y estado, y permite quitar uno o todos. Sólo PDF con firma `%PDF-`, PNG/JPEG con firma correspondiente y TXT/Markdown UTF-8 son técnicamente legibles en el piloto. CSV, XLS/XLSX y otros formatos quedan seleccionados con «No analizado» y causa. Hasta 20 archivos y 50.000.000 bytes originales de toda la selección; exceder un límite impide cualquier envío. Los legibles se preparan para una única solicitud Gemini y se solicita directamente `TITLE_STUDY`, que se valida con Zod e identidad de fuentes. La clave propia permanece sólo en estado temporal/cabeceras; los alias de Secrets requieren modo explícito y código privado para listar y analizar, sin fallback a `GEMINI_API_KEY`.
- **Significado de los estados del PR:** «No analizado» incluye omisión técnica o ausencia de respuesta validada; «Fuente identificada» sólo confirma que el JSON estructuralmente válido menciona el ID/nombre enviado. La API distingue intento de envío, identificación en la respuesta y contenido cotejado; **este último permanece sin verificar** hasta contrastarlo con documentos originales. Una fuente sin hallazgos también puede estar identificada sin acreditar lectura. El JSON visible es preliminar; no hay DOCX, Drive, persistencia ni autenticación.

### Capacidades que se mantienen NOT_INTEGRATED
Las siguientes capacidades permanecen **NOT_INTEGRATED**:
- Autenticación Google y gestión de sesiones invitadas persistentes (CMP-IDENTITY, FR-010, FR-011, V-004).
- **Prueba manual real del flujo de una llamada y revisión humana del `TITLE_STUDY`:** pendiente para el nuevo HEAD. Hubo pruebas humanas de un PDF sobre `9b86ded` con el flujo anterior, registradas en el PR; no prueban la nueva versión ni comparación entre documentos válidos. Las pruebas automatizadas usan respuestas simuladas; no prueban acceso/tier, cuota real, extracción real, diferencias reales ni calidad jurídica. V-005, V-011, V-020, V-023 y V-038 permanecen pendientes para el nuevo SHA hasta prueba humana coordinada. La inyección de Secrets y la restricción para visitantes anónimos en el Starter Tier público siguen sin prueba real: habilitación pública del modo alias `HOLD`.
- Gestión y persistencia de proyectos en Cloud Firestore (CMP-PROJECTS, V-006, V-007).
- **FR-020 (documentos locales):** integrado parcialmente en `main` sólo para selección temporal de PDFs; la carga al servidor y el análisis están propuestos en el PR #13. No hay persistencia en Drive. **Google Drive y Picker** (CMP-DRIVE, FR-021, V-008–010) y almacenamiento persistente en Drive (FR-022) permanecen **NOT_INTEGRATED**.
- Configuración global/selección de proveedores LLM (Gemini, OpenAI, Anthropic, OpenRouter) permanece `NOT_INTEGRATED`. El PR #13 propone sólo Gemini `gemini-3.6-flash` con clave temporal o alias de prueba; no añade ajustes globales ni cambia silenciosamente proveedor/modelo.
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

Evidencia histórica del Work Item #12 en PR #13 y verificación local del REWORK de una llamada (sin integración en `main`):
- **Adaptador REST Gemini Interactions:** corregido para consumir la respuesta oficial de la API REST Interactions (`/v1beta/interactions`, `gemini-3.6-flash`), extrayendo el texto JSON de la salida final de `model_output` en `steps[].content[].text` y excluyendo pasos de `thought`. Rechaza respuestas incompletas o sin `model_output` válido.
- **Carga de plantilla `prompt.md` en producción (`npm start`):** resuelto mediante `loadTitleStudyPrompt()` con rutas candidatas (relativas al módulo tanto en desarrollo como compilado en `dist`, y relativas a `process.cwd()`), complementado con la copia física de `prompt.md` a `dist/src/report-types/title-study/` durante `npm run build`. Se verificó que `node dist/server.js` carga la plantilla y no falla con `ENOENT`.
- **Suite automatizada local:** `PASS` (evidencia histórica: 27/27 pruebas locales del HEAD `33a51df19a44122828a09717f08aecef80362ec4`), incluidos conteo de llamadas simuladas, límites de selección, discrepancias, fallos, aislamiento de alias y ejecución del módulo compilado en `dist`. `npm ci` y `npm run build` pasan; las pruebas con mocks no demuestran el comportamiento real del proveedor. Esta evidencia pertenece a ese SHA del PR #13, no a `main` ni al siguiente HEAD.
- **REWORK posterior a `33a51df` (SHA exacto en handoff del PR):** `npm ci`, `npm run build`, `npm test` (28/28) y `git diff --check` locales pasan. La prueba añadida comprueba que una fuente identificada en JSON válido sin hallazgos permanece sin contenido cotejado; las pruebas de error y JSON inválido no atribuyen identificación o contenido verificado. El arranque HTTP y el acceso al alias se comprueban por separado. Ningún resultado simulado acredita lectura real de archivos.
- **Protección de Secrets y Alias:** se verificó el rechazo público HTTP 403 en `/api/guest/key-aliases` y `/api/guest/analyze` sin código de acceso o con token inválido, aun indicando alias conocido. Con autorización válida, lista sólo `{ id, label }` sin revelar Secrets. No hay fallback automático a `GEMINI_API_KEY`.
- **Registro empírico coherente de pruebas reales con Gemini:**
  * *Intento 1:* Extracción individual exitosa (`Escritura Pública`). Síntesis posterior falló por errores del proveedor upstream (HTTP 503 por alta demanda y HTTP 429 por límite de 5 peticiones/minuto en Free Tier), manejados como `GEMINI_ERROR` seguro.
  * *Intento 2:* Tras expirar la ventana de cuota por minuto, una ejecución técnica controlada completó exitosamente tanto la extracción (4 hallazgos) como la síntesis (`TITLE_STUDY` con 1 documento fuente validado por Zod). Este intento acreditó que el adaptador REST y la validación de schema operan de extremo a extremo con el modelo real.
  * *Intento 3:* La siguiente ejecución consecutiva volvió a encontrar el límite diario del Free Tier (`Rate limit exceeded: 20 requests per day`), manejado sanitizadamente por la aplicación.
  * *Conclusión:* Son intentos históricos del flujo anterior en dos fases; no verifican la llamada única del nuevo HEAD ni comparaciones reales entre documentos. V-005, V-011, V-020, V-023 y V-038 siguen pendientes de prueba humana específica.
- **Publicación Starter Tier (V-036):** la URL compartida (`ais-pre-...`) devuelve HTTP 404 por no encontrarse desplegada; V-036 permanece `PENDING / NOT RUN`.
- **CI:** `NOT CONFIGURED` (sin workflow de GitHub Actions).
