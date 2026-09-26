# Software Architecture

**Estado:** diseño TARGET aprobado, sin componentes integrados.

## 1. Architecture Scope and Design Drivers

Aplicación ligera, deliberadamente dependiente de Google AI Studio, su publicación compatible con Cloud Run, Firebase Authentication, Firestore y Google Drive. La complejidad analítica se concentra en la LLM, las instrucciones por tipo de informe, el contrato JSON y el renderer. La interfaz es central y se define antes de desarrollar completamente el motor. La solución no persigue neutralidad multicloud ni escala masiva inicial.

## 2. System Context

Intervienen interfaz web, servidor de aplicación, identidad Google, Firestore, Drive de cada usuario autenticado y API LLM elegida con su propia credencial. Invitados acceden al análisis y DOCX descargable sin cuenta ni persistencia personal. El servidor coordina sesiones, proyectos, archivos, análisis, validación y DOCX. Los proyectos autenticados persisten y usan Drive autorizado para archivos; Firestore guarda metadata y estado lógico.

## 3. Component Model

La fuente define solamente las responsabilidades siguientes; fronteras internas y llamadas específicas no determinadas no se completan.

| ID | Componente | Responsabilidad |
|---|---|---|
| CMP-WEB | Web Interface | Experiencia visual y acciones del usuario |
| CMP-SERVER | Application Server | Coordinar operaciones del sistema |
| CMP-IDENTITY | Identity and Session | Google Sign-In y sesiones invitadas |
| CMP-PROJECTS | Project Repository | Proyectos, metadata y resultados |
| CMP-DRIVE | Document Storage | Documentos, JSON e informes en Drive |
| CMP-AI | AI Analysis | Comunicación con LLM, prompt, schema y validación |
| CMP-REPORTS | Report Rendering | Presentación web y generación DOCX |

No se crean como componentes arquitectónicos separados:
- Evidence Gate;
- Critical Reviewer;
- Job Engine;
- Forensic Audit;
- Entity Resolver;
- Pipeline Manager;
- Capability Matrix.

---

Un proyecto no equivale a un informe.

```text
PROJECT
│
├── Documents
├── Analyses
└── Reports
```

Un proyecto puede contener múltiples documentos, análisis e informes.

Los mismos documentos pueden utilizarse para distintos informes.

---

## 4. Architectural Constraints

No forman parte de la implementación mientras no exista un requisito aprobado:
- Cloud SQL;
- MySQL;
- PostgreSQL propio;
- Redis;
- message queues;
- workers independientes;
- microservicios;
- autenticación propia;
- almacenamiento documental propio;
- almacén permanente de API keys;
- sistema complejo de auditoría;
- observabilidad empresarial;
- motor de jobs visible;
- arquitectura distribuida innecesaria.

---

## 5. Processing and Runtime Flows

### Responsabilidad

La LLM realiza la parte compleja del análisis.

Debe poder:
- leer;
- interpretar;
- extraer;
- relacionar;
- comparar;
- identificar diferencias;
- identificar omisiones relevantes;
- elaborar conclusiones estructuradas;
- devolver JSON.

### Entrada al análisis

```text
documentos
+
tipo de informe
+
prompt del módulo
+
instrucción adicional del usuario
+
JSON Schema
```

### Regla de diseño

El backend no debe convertirse en un motor jurídico basado en cientos de condiciones deterministas.

Las diferencias documentales pertenecen al análisis, no al sistema de excepciones.

### Procesamiento

```text
documentos técnicamente legibles con identidad de fuente
+
prompt de informe
+
instrucción del usuario
+
schema final
→ máximo una solicitud LLM por acción «Analizar» (cero si ninguno es legible)
→ JSON final
→ validación con schema ejecutable e integridad referencial
```

En el piloto invitado, la selección de hasta 20 archivos y 50.000.000 bytes originales totales se comprueba antes del envío; exceder cualquiera bloquea el análisis completo. Los formatos no legibles conservan estado individual «No analizado» y causa, sin descartar los legibles dentro del límite. La respuesta del proveedor no equivale por sí sola a lectura correcta de cada documento. Si falla la solicitud o la validación, no se confirma análisis ni se inventa resultado. Los límites técnicos reales del proveedor se comprueban por separado de estos límites de producto.

---

### Restricción de plataforma

```text
Google AI Studio
→ desarrollo
→ publicación
→ Cloud Run
```

La arquitectura no busca neutralidad entre nubes.

### Fuente versionada

GitHub es la fuente versionada de:
- código;
- schemas;
- prompts;
- renderers;
- tests;
- documentación;
- configuración no secreta.

### Vista general

```text
┌──────────────────────────────────────┐
│              WEB UI                  │
│ Proyectos / Documentos / IA          │
│ Informes / Drive / Configuración     │
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│          APPLICATION SERVER          │
│ sesión / proyectos / archivos        │
│ proveedores / análisis / JSON / DOCX │
└───────┬────────┬──────────┬──────────┘
        │        │          │
        ▼        ▼          ▼
      AUTH     DRIVE      LLM APIs
        │
        ▼
    FIRESTORE
```

### Corazón analítico

```text
DOCUMENTOS
+
TIPO DE INFORME
+
PROMPT DEL MÓDULO
+
INSTRUCCIÓN DEL USUARIO
+
JSON SCHEMA
        ↓
       LLM
        ↓
JSON ESTRUCTURADO
        ↓
VALIDACIÓN
        ↓
JSON APROBADO
       ├───────────┐
       ▼           ▼
   INTERFAZ       DOCX
```

---

### Usuario autenticado

```text
Google Sign-In
→ proyecto persistente
→ Drive
→ Firestore
→ análisis
→ JSON persistente
→ DOCX persistente
```

### Usuario invitado

```text
subir documentos
→ ingresar API
→ elegir modelo
→ analizar
→ visualizar
→ generar DOCX
→ descargar
```

No requiere cuenta y no tiene persistencia asociada a una cuenta.

---

### Flujo autenticado

```text
Google Sign-In
→ Mis proyectos
→ Nuevo proyecto
→ crear carpeta Drive
→ subir/seleccionar documentos
→ seleccionar tipo de informe
→ seleccionar proveedor/modelo
→ ingresar API key
→ instrucción adicional opcional
→ Analizar
→ LLM + Schema
→ JSON validado
→ guardar JSON
→ mostrar resultado
→ generar DOCX
→ guardar DOCX en Drive
→ volver posteriormente al proyecto
```

### Flujo invitado

```text
Abrir aplicación
→ subir documentos
→ seleccionar informe
→ ingresar API
→ seleccionar modelo
→ Analizar
→ JSON validado
→ resultado web
→ generar DOCX
→ descargar
```

---

El flujo JSON validado → interfaz y DOCX es un flujo global, no una llamada entre componentes deducida de la tabla.

## 6. Architecture Invariants

El contrato por tipo de informe es el schema ejecutable; el resultado validado alimenta interfaz y DOCX; la LLM no genera Word. Los documentos originales no se sustituyen silenciosamente por normalizaciones; las diferencias son resultados de análisis. Se separan metadata y archivos; la dependencia Google es deliberada. El fallo externo no corrompe estado confirmado ni fabrica resultados. La arquitectura se mantiene ligera, sin las abstracciones multicloud ni los componentes excluidos en §3 y §4. Las invariantes funcionales se especifican en SRS, las de implementación en Technical Specification y las de proceso de ADR se indican fuera del conjunto canónico.

## 7. Requirement-to-Architecture Mapping

Relaciones sustentadas directamente por responsabilidades declaradas; otras aristas no determinadas no se completan.

| Requisito | Elemento |
|---|---|
| UIR-001–UIR-008 | CMP-WEB |
| FR-001, FR-002 | CMP-IDENTITY |
| FR-010–FR-015 | CMP-PROJECTS |
| FR-022, FR-023, FR-054 | CMP-DRIVE |
| FR-030–FR-035, FR-040, FR-048 | CMP-AI |
| FR-051–FR-053 | CMP-REPORTS |

## 8. Interfaces and Integrations

### Proveedores soportados

- Google Gemini;
- OpenAI;
- Anthropic;
- OpenRouter.



La integración de Drive usa la cuenta autorizada de cada usuario; la selección de un archivo existente usa Google Picker. La salida estructurada se valida contra el schema ejecutable correspondiente. Los detalles técnicos de la interfaz común de proveedores pertenecen a Technical Specification.

## 9. Data and Storage

### Estado

Google Drive forma parte integral del producto completo.

No se clasifica como funcionalidad futura.

Su orden de implementación se decidirá durante el desarrollo.

### Organización

```text
Nombre Aplicación/
└── Proyectos/
    └── Nombre Proyecto [projectId]/
        ├── Documentos/
        ├── Analisis/
        └── Informes/
```

### Documento local

```text
equipo
→ aplicación
→ Drive / Documentos
→ análisis
```

### Documento existente en Drive

```text
Google Picker
→ seleccionar documento
→ incorporar al proyecto
→ análisis
```

### Resultado

```text
JSON final → Analisis/
DOCX → Informes/
```

### Condiciones de falla de Drive

La aplicación debe asumir que Google Drive puede no estar disponible o que un recurso previamente vinculado puede dejar de estarlo.

Casos esperados:

- espacio insuficiente en la cuenta del usuario;
- cuota o límite de la API;
- autorización revocada;
- token vencido o inválido;
- archivo eliminado por el usuario;
- carpeta movida o eliminada;
- permiso insuficiente;
- indisponibilidad temporal del servicio.

Regla:

> Un problema de Drive debe producir un error explícito y recuperable. La aplicación nunca debe informar que un archivo fue almacenado correctamente si la operación no fue confirmada.

La metadata persistente debe tolerar que una referencia de Drive quede inválida y tratarla como un recurso no disponible, sin inventar ni reconstruir silenciosamente el archivo.

---

### División de responsabilidades

```text
FIRESTORE
→ metadata y estado lógico

GOOGLE DRIVE
→ archivos
```

### Firestore

Debe almacenar:
- usuarios;
- proyectos;
- análisis;
- informes;
- configuración no sensible;
- Drive IDs;
- preferencias.

### Drive

Debe almacenar:
- documentos originales;
- copias JSON;
- DOCX.

### Exclusiones

No se utilizará Firestore para almacenar PDFs completos.

No se requiere SQL para este producto.

---

## 10. Deployment Topology

El objetivo es el mecanismo de publicación de Google AI Studio compatible con Cloud Run. La topología más específica no está determinada. Un build local que impida Publish es una regresión; la verificación desplegada es necesaria para afirmar compatibilidad.

## 11. Cross-Cutting Concerns

- **Dependencia Google y publicación.** La solución depende deliberadamente de AI Studio, Cloud Run, Firebase Authentication, Firestore y Drive. Un cambio de plataforma puede exigir cambios de aplicación; un build local no demuestra compatibilidad con Publish. No se agregan abstracciones multicloud.
- **Drive y autorización.** Capacidad, cuotas, permisos y presencia de archivos dependen de la cuenta del usuario. Se confirman las operaciones antes de marcarlas exitosas. Una revocación requiere reautorización o error controlado sin interpretar que el proyecto desapareció. Una referencia Firestore a un archivo movido o eliminado se informa como recurso no disponible; se conserva la metadata útil, sin reconstruir el archivo, y se permite reemplazo o reincorporación cuando corresponda.
- **Documentos y memoria.** No se cargan simultáneamente todos los archivos completos de un proyecto. Se procesan individualmente o en lotes pequeños, con límites de tamaño y concurrencia, liberación de referencias, sin copias innecesarias de buffers y streaming cuando reduzca realmente memoria. Los valores concretos son una decisión de implementación según límites del runtime y las APIs.
- **LLM.** Rate limit, cuota, timeout, truncamiento, respuesta inválida e indisponibilidad pueden ocurrir aun con clave válida. Solo se reintenta de forma limitada si el fallo es razonablemente transitorio; no se cambian proveedor o modelo sin informar y no se fabrica un resultado. Toda salida se valida.
- **Errores externos.** Se distingue una falla de autenticación, Drive, Firestore o LLM de una falla interna. El estado previamente confirmado se conserva. No se transforma una falla recuperable en pérdida silenciosa ni se declara éxito antes de confirmación.
- **Operaciones duplicadas.** Para creación persistente se minimizan duplicados por repetición o retry; cuando sea necesario se usan identificadores de operación o comprobación simple de existencia. No se introduce infraestructura distribuida compleja de idempotencia.
- **Health.** `/api/health` expresa respuesta HTTP del proceso; un 200 no verifica Drive, Firestore, LLM, la credencial del usuario ni OAuth. Las integraciones se verifican durante su operación o por acciones explícitas de conexión.

## 12. Architecture Decisions

La ubicación canónica de futuros registros de decisiones arquitectónicas durables es `docs/engineering/adr/`. Esta baseline no contiene ADR concreto. Los cambios durables de arquitectura se documentarán y aprobarán antes de alterar el diseño aprobado; esto es gobierno de cambios, no una capacidad de runtime.
