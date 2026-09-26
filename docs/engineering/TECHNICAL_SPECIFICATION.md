# Technical Specification

**Estado:** propuesta técnica TARGET, aún sin implementación integrada. Las líneas iniciales de versiones y los contratos de comandos se fijan aquí; todavía no existen manifiesto, lockfile ni código ejecutable.

## 1. Implementation Scope

Implementación web y servidor de la arquitectura aprobada, esquemas por tipo de informe, conexión a servicios Google y proveedores LLM, validación de salida y renderizado DOCX. Las responsabilidades y componentes se definen en [Software Architecture](SOFTWARE_ARCHITECTURE.md).

## 2. Runtime and Toolchain

**SOURCE_DEFINED:** Google AI Studio para desarrollo y publicación compatible con Cloud Run; GitHub para código, schemas, prompts, renderers, pruebas, documentación y configuración no secreta. Stack propuesto en §5.

**INITIAL IMPLEMENTATION BASELINE:** Node.js 24 LTS, npm y TypeScript 5.9; React 19, Vite 7.3, Express 5, Zod 4 y `docx` 9 como líneas iniciales. `tsx` 4 se usa solo para desarrollo y ejecución de pruebas TypeScript; no se incorpora como dependencia de producción. La primera implementación fijará versiones exactas resueltas en `package-lock.json` y mantendrá el lockfile en GitHub. Estas líneas son decisiones técnicas iniciales, no versiones declaradas por la especificación original. Node 24 LTS y Vite 7.3 se contrastaron con [Node.js Releases](https://nodejs.org/en/about/previous-releases), [Vite 7](https://vite.dev/blog/announcing-vite7) y [Vite Releases](https://vite.dev/releases). Las versiones exactas de paquetes se fijarán en el lockfile inicial.

## 3. Repository and Module Structure

**SOURCE_DEFINED:** las áreas de código propuestas se conservan. **IMPLEMENTATION_BASELINE:** se incluyen `docs/engineering/adr/` como ubicación futura vacía, `CURRENT_STATE.md` y `DEVELOPMENT_PLAN.md` como documentos canónicos, y se utiliza `VERIFICATION_SPECIFICATION.md` según VERIFICATION_SPECIFICATION.md. Las carpetas y archivos de código describen ubicaciones previstas, no una implementación existente.

```text
/
├── README.md
├── package.json
├── server.ts
├── vite.config.ts
├── tsconfig.app.json
├── tsconfig.server.json
├── docs/
│   └── engineering/
│       ├── SOFTWARE_REQUIREMENTS_SPECIFICATION.md
│       ├── SOFTWARE_ARCHITECTURE.md
│       ├── TECHNICAL_SPECIFICATION.md
│       ├── CURRENT_STATE.md
│       ├── VERIFICATION_SPECIFICATION.md
│       ├── DEVELOPMENT_PLAN.md
│       └── adr/                 # ubicación futura; sin ADR inicial
├── src/
│   ├── app/
│   ├── components/
│   ├── pages/
│   ├── services/
│   │   ├── auth/
│   │   ├── drive/
│   │   ├── firestore/
│   │   └── ai/
│   ├── report-types/
│   │   └── title-study/
│   │       ├── prompt.md
│   │       ├── schema.ts
│   │       └── renderer.ts
│   └── shared/
└── tests/                  # pruebas vinculadas a V existentes
```

La organización conceptual del tipo `TITLE_STUDY` es prompt, schema y renderer; el schema ejecutable es la fuente exacta del contrato y se deriva JSON Schema para la LLM. No se conserva copia normativa divergente del schema en estos documentos.

## 4. Build, Run and Test Commands

**IMPLEMENTATION_BASELINE:** en el primer Work Item de código, `package.json` definirá `"type": "module"` y estos scripts canónicos:

| Script | Definición inicial | Propósito |
|---|---|---|
| `dev` | `tsx watch server.ts` | Servidor Express con Vite integrado en modo desarrollo. |
| `build` | `tsc -p tsconfig.server.json && tsc --noEmit -p tsconfig.app.json && vite build` | Compila servidor, comprueba tipos de cliente y produce frontend. |
| `start` | `node dist/server.js` | Ejecuta el servidor compilado, que sirve el frontend de `dist/client`. |
| `test` | `node --import tsx --test tests/*.test.ts` | Ejecuta las pruebas TypeScript iniciales. |

Comandos previstos: `npm ci` para instalación desde lockfile; `npm run dev`, `npm run build`, `npm start` y `npm test`. Para crear el lockfile inicial se usará `npm install`; después se versionará y las instalaciones reproducibles usarán `npm ci`. El servidor integrará Vite como middleware solo en desarrollo; `vite.config.ts` fijará la salida del cliente en `dist/client`, y `tsconfig.server.json` la salida del servidor en `dist/`. En producción Express servirá `dist/client`. El código y el manifiesto aún no existen, por lo que estos comandos son contrato de implementación inicial y **no se declaran ejecutados**. Las pruebas iniciales se ubicarán en `tests/*.test.ts`; fixtures y procedimientos se concretan con los Work Items.

## 5. Frameworks and Dependencies

### Stack propuesto

#### Frontend
- React
- TypeScript
- Vite

#### Backend
- Node.js
- TypeScript
- Express

#### Schemas
- Zod
- JSON Schema derivado del schema ejecutable

#### Documentos
- docx

#### Google
- Firebase Authentication
- Cloud Firestore
- Google Drive API
- Google Picker
- Cloud Run
- Google AI Studio

#### IA
- Google Gemini
- OpenAI
- Anthropic
- OpenRouter



## 6. Configuration and Environment

El servidor lee `PORT`, escucha en `0.0.0.0`, sirve el frontend compilado y expone `/api/health`. La credencial LLM pertenece al usuario, viaja navegador → HTTPS → backend → proveedor; por defecto permanece solo durante la sesión. Se pueden persistir proveedor y modelo preferidos, pero no la clave. No colocar claves en GitHub, Firestore, Drive, logs, bundle frontend ni `localStorage`. **IMPLEMENTATION_BASELINE:** `NODE_ENV` distingue desarrollo de producción para integrar Vite únicamente en desarrollo; `PORT` es el puerto que asigna el entorno y se lee en el servidor. La configuración concreta de Firebase/OAuth y proveedores se define al implementar cada integración sin persistir credenciales LLM del usuario. No se fijan scopes OAuth ni secretos en esta baseline.

## 7. Implementation Constraints

### Regla central

Cada tipo de informe tiene un único contrato estructurado ejecutable.

```text
LLM
↔
servidor
↔
interfaz
↔
DOCX
```

### Fuente de verdad

El schema exacto vive como artefacto ejecutable.

La documentación lo describe y referencia, pero no mantiene una segunda copia divergente.

### Flujo técnico

```text
Schema ejecutable
→ JSON Schema
→ LLM
→ JSON
→ validación
→ typed result
→ UI + DOCX
```

### Campos opcionales

Los datos que no existan y no sean relevantes no deben aparecer artificialmente como listas de “NO CONSTA”.

---

### Propiedad

Las API keys pertenecen al usuario.

### Flujo

```text
browser
→ HTTPS
→ backend
→ proveedor LLM
```

### Prohibiciones

Las API keys no deben quedar en:
- GitHub;
- Firestore;
- Google Drive;
- logs;
- bundle frontend;
- localStorage.

### Persistencia

Por defecto, la clave se mantiene únicamente durante la sesión.

Se pueden persistir proveedor y modelo preferidos, pero no la credencial.

**Excepción acotada al piloto #12:** el propietario puede almacenar hasta tres claves de prueba en **AI Studio Settings → Secrets** como `GEMINI_TEST_KEY_1`, `GEMINI_TEST_KEY_2`, `GEMINI_TEST_KEY_3`. El backend acepta únicamente alias `test-1`–`test-3`, devuelve sólo nombres al navegador y resuelve el valor dentro del servidor. Las rutas de listado, extracción y consolidación comprueban un código de acceso privado `GEMINI_ALIAS_ACCESS_TOKEN` (al menos 32 caracteres), con `GEMINI_ALIAS_MODE=owner-only` explícito, en cada petición que usa alias; sin esos ajustes el modo falla cerrado. La ruta con clave temporal sigue separada. No se usa automáticamente `GEMINI_API_KEY` de AI Studio y no se persisten códigos en navegador o aplicación. Este control de acceso es una capacidad del propietario, no autenticación de usuarios; debe comprobarse contra visitantes anónimos en el entorno público Starter Tier antes de habilitarlo allí.

---

### Regla principal

La LLM no genera directamente Word.

### Flujo

```text
JSON VALIDADO
→ renderer
→ DOCX
```

### Responsabilidad del renderer

Controla:
- portada;
- tipografía;
- márgenes;
- tablas;
- títulos;
- espaciados;
- numeración;
- secciones;
- encabezados;
- pies.

### Integridad

El renderer no puede inventar hechos ni conclusiones.

---

### Logging mínimo

Registrar únicamente:
- timestamp;
- requestId;
- operación;
- proveedor;
- modelo;
- errorCode;
- duration.

### Prohibiciones

No registrar:
- API keys;
- OAuth tokens;
- PDFs completos;
- resultados completos innecesarios;
- datos personales innecesarios.

### Categorías base de error

```text
INVALID_FILE
FILE_TOO_LARGE
AUTH_REQUIRED
ACCESS_DENIED
DRIVE_ERROR
INVALID_API_KEY
MODEL_UNAVAILABLE
PROVIDER_UNAVAILABLE
INVALID_MODEL_OUTPUT
SCHEMA_VALIDATION_FAILED
REPORT_GENERATION_FAILED
INTERNAL_ERROR
```

### Política de errores de integración

Los errores externos deben:

1. conservar el estado interno válido ya confirmado;
2. informar una causa comprensible;
3. indicar si la operación puede reintentarse cuando corresponda;
4. no fabricar resultados;
5. no marcar una operación como completada antes de confirmación externa;
6. no convertir un error recuperable en pérdida silenciosa de información.

Una falla de autenticación, Drive, Firestore o proveedor LLM debe permanecer diferenciada de una falla interna de la aplicación.

---

### Backend pequeño

Responsabilidades:
- recibir solicitudes;
- validar inputs;
- llamar proveedores;
- validar JSON;
- coordinar persistencia;
- generar DOCX;
- devolver errores técnicos.

### Stateless cuando sea posible

No almacenar permanentemente en RAM:
- proyectos;
- PDFs;
- credenciales;
- sesiones completas de análisis.

### Control de recursos documentales

El procesamiento debe ser acotado por diseño.

Reglas técnicas:

- no cargar todos los documentos de un proyecto simultáneamente;
- establecer límites explícitos de tamaño por archivo;
- controlar el número de operaciones concurrentes;
- procesar y liberar documentos de forma incremental;
- evitar conversiones o copias innecesarias de buffers;
- preferir streaming cuando la API concreta lo soporte y reduzca realmente el uso de memoria;
- rechazar de forma controlada un archivo que exceda los límites establecidos.

Los valores exactos de tamaño, concurrencia y timeout deben fijarse contra los límites vigentes del runtime y de las APIs utilizadas antes de la implementación definitiva.

### Cloud Run

El servidor debe:
- leer `PORT`;
- escuchar en `0.0.0.0`;
- servir frontend compilado;
- exponer `/api/health`.

`/api/health` no debe depender de proveedores externos y representa únicamente la salud del proceso HTTP, no la disponibilidad integral de Drive, Firestore o los proveedores LLM.

---

La interfaz mínima de proveedor propuesta en la fuente es:

```ts
interface AIProvider {
  validateCredential(...)
  listModels(...)
  analyze(...)
}
```

No especifica firmas, payloads ni SDK.

## 8. Architecture-to-Implementation Mapping

La tabla es **IMPLEMENTATION_BASELINE**, decidida ahora para comenzar el código; la especificación original definió los componentes y propuso directorios, pero **no** definió estas aristas. El mapping no cambia responsabilidades arquitectónicas.

| Elemento | Ubicación inicial | Alcance de la correspondencia |
|---|---|---|
| CMP-WEB | `src/app/`, `src/pages/`, `src/components/` | Interfaz y acciones del usuario. |
| CMP-SERVER | `server.ts` | Coordinación HTTP y servidor del frontend. |
| CMP-IDENTITY | `src/services/auth/` | Sign-In Google y sesión invitada. |
| CMP-PROJECTS | `src/services/firestore/` | Proyectos, metadata y resultados lógicos. |
| CMP-DRIVE | `src/services/drive/` | Archivos y referencias Drive. |
| CMP-AI | `src/services/ai/`, `src/report-types/title-study/prompt.md`, `schema.ts` | Proveedor, análisis y validación del contrato. |
| CMP-REPORTS | `src/report-types/title-study/renderer.ts`, presentación en `src/pages/` | DOCX desde JSON validado y visualización web. |

Las interfaces y tipos compartidos se ubican inicialmente en `src/shared/`. Un nuevo tipo de informe añade su propio directorio bajo `src/report-types/` sin alterar las responsabilidades de autenticación, proyectos o almacenamiento. La ubicación de funciones individuales dentro de estas áreas se decide durante la implementación.

## 9. External Services and SDKs

Google Gemini, OpenAI, Anthropic y OpenRouter son proveedores soportados; se selecciona el proveedor y modelo del usuario, sin sustitución silenciosa. Disponibilidad real se consulta cuando el proveedor lo permita; no se fabrican modelos. Firebase Authentication, Cloud Firestore, Google Drive API, Google Picker, Cloud Run y Google AI Studio figuran en el stack propuesto. No se definen SDK concretos ni versiones.

## 10. Packaging and Deployment Parameters

El flujo TARGET es Google AI Studio → build → publish → Cloud Run. El endpoint `/api/health` comprueba solo respuesta HTTP del proceso, sin consultar integraciones. La compatibilidad con el mecanismo real de publicación se comprueba en despliegue (V-036); los detalles de configuración que ese mecanismo exija se concretan durante el Work Item correspondiente.
