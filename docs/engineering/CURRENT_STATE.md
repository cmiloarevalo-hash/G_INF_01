# Current State

## 1. Integrated Baseline

**CURRENT = BASELINE_EJECUTABLE_INICIAL (Work Item #1).** Existe una baseline funcional integrada que incluye el servidor HTTP Express (`server.ts`), la interfaz web inicial React con Vite (`src/app/`, `src/components/`, `src/pages/`), la suite de pruebas automatizadas (`tests/`), scripts canónicos en `package.json` y lockfile versionado `package-lock.json`.

## 2. Requirement / Capability Status

### Capacidades efectivamente integradas
- **CMP-SERVER (Servidor de aplicación):** Servidor HTTP con Node.js y Express 5. Escucha en `0.0.0.0` mediante `PORT`. Soporta modo desarrollo con Vite integrado como middleware y modo producción sirviendo el frontend estático compilado desde `dist/client`.
- **Salud del proceso (NFR-024, AC-012, V-003, V-042):** Endpoint `GET /api/health` que responde HTTP 200 e informa únicamente la disponibilidad del proceso HTTP (`{"status":"ok", ...}`), sin consultar ni afirmar el estado de servicios externos.
- **CMP-WEB (Interfaz web inicial):** Aplicación React con tema oscuro, profesional y adaptable (UIR-001, UIR-002, UIR-007). Navegación lateral plegable con las secciones previstas en SRS §4: Inicio, Proyectos (Nuevo proyecto, Mis proyectos), Informes (Mis informes), IA (APIs y modelos), Documentos (PDF locales para invitado y Google Drive) y Configuración (UIR-003). Sólo la selección local de PDFs está disponible dentro de Documentos; Drive sigue no integrado. Vista Inicio funcional y activa.
- **Selección local de PDFs para invitado (Issue #6):** Desde Inicio y la navegación existe una entrada a una página disponible sin autenticación. Mantiene referencias reales a varios `File` locales sólo mientras esa página está abierta; muestra nombre y tamaño, valida extensión y firma `%PDF-` en los primeros 1 KiB, evita re-agregar una selección con la misma metadata y permite quitar uno o todos. No carga archivos al servidor ni los persiste o procesa. El análisis y los informes siguen fuera de alcance.
- **Identificación de funciones futuras (UIR-008):** Todas las secciones correspondientes a fases futuras quedan explícitamente señaladas como no disponibles, sin incorporar formularios, botones simulados ni datos ficticios.
- **Toolchain y comandos canónicos (Tech Spec §4):** `npm ci`, `npm run dev`, `npm run build`, `npm start` y `npm test`.
- **Pruebas automatizadas iniciales:** Ejecutadas mediante el runner nativo de Node.js (`node --import tsx --test tests/*.test.ts`).

### Capacidades que se mantienen NOT_INTEGRATED
Las siguientes capacidades permanecen **NOT_INTEGRATED**:
- Autenticación Google y gestión de sesiones invitadas persistentes (CMP-IDENTITY, FR-010, FR-011, V-004).
- Flujo completo de análisis invitado (FR-002, AC-001, V-005, V-038); la selección local de archivos es sólo un paso inicial.
- Gestión y persistencia de proyectos en Cloud Firestore (CMP-PROJECTS, V-006, V-007).
- **FR-020 (documentos locales):** parcialmente integrado sólo para seleccionar y mantener referencias temporales a PDFs locales en la página invitada; carga al servidor y procesamiento del contenido siguen fuera de alcance. **Google Drive y Picker** (CMP-DRIVE, FR-021, V-008–010) y almacenamiento persistente en Drive (FR-022) permanecen **NOT_INTEGRATED**.
- Configuración y consulta de proveedores LLM (Gemini, OpenAI, Anthropic, OpenRouter) y claves de API (CMP-AI, FR-030–035, V-011–019).
- **Contrato ejecutable inicial `TITLE_STUDY` (Issue #9):** schema Zod 4 en `src/report-types/title-study/schema.ts`, con tipo TypeScript derivado y función que produce JSON Schema Draft 2020-12 desde el mismo schema. Incluye documentos fuente con tipo abierto, hallazgos con referencias a documentos, valores originales y normalizados opcionales, comparaciones con los cinco resultados de SRS §10.7 y conclusiones con referencias a hallazgos. No incluye prompt, análisis LLM, renderer ni DOCX.
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
- **Pruebas específicas de selección local:** `PASS` (4 pruebas: firma/extensión PDF, selección múltiple/deduplicación, eliminación/reselección e intercalación de selección con eliminación).
- **Suite automatizada completa:** `PASS` (7/7 pruebas en `tests/*.test.ts`).
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
