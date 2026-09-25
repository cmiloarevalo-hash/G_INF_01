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

Desde Inicio o la navegación lateral se puede abrir **PDF locales (invitado)** para seleccionar varios archivos PDF del dispositivo, ver su nombre y tamaño, y quitarlos individualmente o todos. La página conserva referencias a los archivos sólo mientras permanece abierta; valida la extensión y la firma PDF en un máximo de 1 KiB inicial. Los bytes no se envían al servidor y no se guardan en Drive ni en proyectos persistentes. El procesamiento del contenido, el análisis con IA y la generación de informes siguen sin estar integrados (V-005 y V-038).

## Proceso de trabajo

- [Workflow simplificado](WORKFLOW_SIMPLIFICADO_CHAT_WEB_GPT_GEMINI_3_8.md)
