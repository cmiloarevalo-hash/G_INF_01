# Aplicación de análisis documental inmobiliario

Aplicación web ligera de análisis documental asistido por LLM. El primer tipo de informe objetivo es el Estudio de Títulos. Nombre comercial: no determinado por las fuentes.

## Mapa del repositorio

La estructura de código propuesta se encuentra en [Technical Specification](docs/engineering/TECHNICAL_SPECIFICATION.md#3-repository-and-module-structure). El proyecto está en preimplementación; la estructura propuesta no describe archivos de código existentes.

## Documentos de ingeniería

- [Software Requirements Specification](docs/engineering/SOFTWARE_REQUIREMENTS_SPECIFICATION.md)
- [Software Architecture](docs/engineering/SOFTWARE_ARCHITECTURE.md)
- [Technical Specification](docs/engineering/TECHNICAL_SPECIFICATION.md)
- [Current State](docs/engineering/CURRENT_STATE.md)
- [Verification Specification](docs/engineering/VERIFICATION_SPECIFICATION.md)
- [Development Plan](docs/engineering/DEVELOPMENT_PLAN.md)

## Entorno y comienzo

Target de desarrollo/publicación: Google AI Studio y mecanismo compatible con Cloud Run. Fuente versionada: GitHub. La [Technical Specification](docs/engineering/TECHNICAL_SPECIFICATION.md#4-build-run-and-test-commands) fija los scripts iniciales para el primer Work Item de implementación. Cuando existan `package.json` y lockfile, el inicio mínimo será `npm ci` y `npm run dev`. Todavía no hay aplicación ni comandos ejecutables.

## Verificación

Las obligaciones y la evidencia esperada están en [Verification Specification](docs/engineering/VERIFICATION_SPECIFICATION.md). No existen resultados de verificación.

## Proceso de trabajo

- [Workflow simplificado](WORKFLOW_SIMPLIFICADO_CHAT_WEB_GPT_GEMINI_3_8.md)
