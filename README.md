# Aplicación de análisis documental inmobiliario

Aplicación web ligera de análisis documental asistido por LLM. El primer tipo de informe objetivo es el Estudio de Títulos. Nombre comercial: no determinado por las fuentes.

## Mapa del repositorio

La estructura de código implementada corresponde a la baseline inicial definida en [Technical Specification](docs/engineering/TECHNICAL_SPECIFICATION.md#3-repository-and-module-structure). Contiene el servidor HTTP Express (`server.ts`), la interfaz web inicial React con Vite (`src/app/`, `src/components/`, `src/pages/`), pruebas automatizadas (`tests/`) y artefactos de compilación (`dist/`).

## Documentos de ingeniería

- [Software Requirements Specification](docs/engineering/SOFTWARE_REQUIREMENTS_SPECIFICATION.md)
- [Software Architecture](docs/engineering/SOFTWARE_ARCHITECTURE.md)
- [Technical Specification](docs/engineering/TECHNICAL_SPECIFICATION.md)
- [Current State](docs/engineering/CURRENT_STATE.md)
- [Verification Specification](docs/engineering/VERIFICATION_SPECIFICATION.md)
- [Development Plan](docs/engineering/DEVELOPMENT_PLAN.md)
- [Report Presentation Specification](docs/engineering/REPORT_PRESENTATION_SPECIFICATION.md)

## Entorno y comienzo

Target de desarrollo/publicación: Google AI Studio y mecanismo compatible con Cloud Run. Fuente versionada: GitHub.

Comandos ejecutables soportados por la baseline (`package.json`):

- **Instalación reproducible:** `npm ci` (o `npm install`).
- **Modo desarrollo:** `npm run dev` (ejecuta `tsx watch server.ts` con Vite integrado como middleware).
- **Compilación de producción:** `npm run build` (compila `server.ts` a `dist/server.js`, valida tipos con `tsc` y genera el cliente en `dist/client`).
- **Ejecución en producción:** `npm start` (ejecuta `node dist/server.js` sirviendo el frontend estático compilado desde `dist/client` y escuchando en `0.0.0.0` mediante `PORT`).
- **Pruebas automatizadas:** `npm test` (ejecuta el runner nativo de pruebas TypeScript con `node --import tsx --test tests/*.test.ts`).

Endpoint de salud:
- `GET /api/health`: Responde HTTP 200 con el estado del proceso HTTP (`{"status":"ok", ...}`). No consulta ni afirma el estado de servicios externos.

## Verificación

Las obligaciones y la evidencia esperada se describen en [Verification Specification](docs/engineering/VERIFICATION_SPECIFICATION.md). Con la integración de la baseline inicial (Work Item #1), se cuenta con evidencia local para:
- **V-001 (Build):** `npm run build` compila servidor y cliente sin errores.
- **V-002 (Production startup):** `npm start` inicia el servidor Express en producción.
- **V-003 / V-042 (Health endpoint & semantics):** `GET /api/health` responde HTTP 200 limitándose a la salud del proceso.
- **V-033 (Main navigation):** Navegación lateral plegable con las secciones previstas en SRS §4.
- **V-035 (Responsive use):** Interfaz adaptable a pantallas desktop y viewports móviles.

## Capacidad de invitado disponible

Desde Inicio o la navegación lateral se abre el espacio de documentos invitados. Conserva y muestra los archivos seleccionados, incluso si no están admitidos, y permite quitar uno o todos. El piloto del Issue #12 envía en **una única solicitud Gemini por acción «Analizar»** los PDF con firma válida, PNG/JPEG con firma correspondiente y TXT/Markdown UTF-8 técnicamente legibles; con ninguno legible no llama al proveedor. CSV, XLS/XLSX y otros formatos siguen visibles como «No analizado» con causa. La clave que aporta el usuario durante la sesión no se guarda ni persiste en el navegador, GitHub, logs, Drive o proyectos. El JSON `TITLE_STUDY` se valida con Zod y se muestra como resultado preliminar sujeto a revisión humana; no genera DOCX ni constituye un estudio jurídicamente válido. Los estados distinguen contenido enviado, omitido y resultado validado: un error de proveedor o JSON inválido no marca archivos como analizados.

Límite de producto: **20 archivos seleccionados y 50.000.000 bytes originales en total**. Un exceso bloquea todo el envío, identifica el límite superado y no crea un resultado parcial. Estos números no garantizan que el payload conjunto, los tokens o el proveedor admitan el caso; errores técnicos reales se comunican sin informe ficticio. La prueba real del nuevo flujo con clave y documentos propios aún requiere verificación manual coordinada y ligada al SHA; los tests simulados no prueban calidad ni acceso real.

#### Claves de prueba de AI Studio (piloto #12)

La opción **Mi clave temporal** continúa disponible sin configurar Secrets. Para habilitar **Clave de prueba del propietario**, el propietario crea hasta tres Secrets en **AI Studio → Settings → Secrets**, con nombres `GEMINI_TEST_KEY_1`, `GEMINI_TEST_KEY_2`, `GEMINI_TEST_KEY_3` y valores de claves de prueba; crea también `GEMINI_ALIAS_ACCESS_TOKEN` con un valor aleatorio privado de al menos 32 caracteres, y define `GEMINI_ALIAS_MODE` como `owner-only` en el entorno del servidor. En Codespaces se configuran las mismas variables de manera privada en el proceso servidor. No guardar sus valores en el repositorio, archivos `.env` versionados, ni compartir el código de acceso con visitantes. La interfaz permite introducir temporalmente el código, consultar sólo los nombres «Prueba 1–3» y elegir uno; el servidor obtiene la clave desde el Secret y exige el código para listar alias y para **cada** solicitud a `/api/guest/analyze`. El modo queda deshabilitado si no se define expresamente el modo o falta un código suficientemente largo. La variable automática `GEMINI_API_KEY` de AI Studio nunca se utiliza como alternativa. Publicar únicamente mediante HTTPS; una persona que conozca el código puede consumir la cuota del propietario.

Las pruebas locales usan Secrets simulados: no demuestran inyección efectiva de variables, acceso a Gemini ni controles de publicación del Starter Tier en AI Studio. Antes de habilitar alias en una página pública se debe comprobar en el despliegue real que visitantes sin código obtienen 403 en el listado y en `/api/guest/analyze`, y que sólo el propietario dispone del código. Mientras esa prueba no se ejecute, el modo alias permanece deshabilitado en cualquier publicación pública.

## Proceso de trabajo

- [Workflow simplificado](WORKFLOW_SIMPLIFICADO_CHAT_WEB_GPT_GEMINI_3_8.md)
