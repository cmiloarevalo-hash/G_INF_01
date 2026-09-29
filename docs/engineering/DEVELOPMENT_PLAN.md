# Development Plan

**Estado actual:** implementación principal consolidada; #91 / PR #92 es el último bloque de implementación M4/M5 definido por el plan canónico #84.

## 1. Objetivo

Completar la herramienta web de análisis documental inmobiliario con:

- flujo invitado sin autenticación;
- identidad Google y proyectos persistentes;
- documentos persistentes en Google Drive;
- análisis `TITLE_STUDY` validado;
- JSON e informes DOCX persistentes para usuarios autenticados;
- historial/reapertura;
- configuración del provider/model realmente implementado;
- credencial LLM aportada por el usuario y mantenida sólo en memoria.

## 2. Arquitectura de ejecución vigente

La implementación preserva las responsabilidades aprobadas:

```text
WEB UI
→ sesión/proyecto
→ Drive para archivos
→ Firestore para metadata/preferencias no sensibles
→ proveedor LLM para análisis
→ schema TITLE_STUDY
→ renderer DOCX
```

No se introduce almacén documental alternativo, provider nuevo, microservicios ni persistencia permanente de API keys.

## 3. Cierre de implementación M4/M5

El plan canónico #84 establece #91 como un único bloque final que cubre:

- M4.3f;
- M4.4a-c;
- M4.5c;
- M5.1-4.

PR #92 implementa esos puntos de forma incremental en una sola branch con checkpoints recuperables.

El objetivo técnico del flujo autenticado es:

```text
Google Sign-In
→ proyecto
→ documentos
→ análisis
→ análisis persistido
→ informe
→ informe persistido
→ reapertura / historial
```

La navegación integrada expone sólo superficies implementadas. El modo invitado se mantiene como flujo separado y funcional.

## 4. Después de #91

Después de la revisión/merge de #91 no se crean automáticamente nuevas tareas de implementación.

Quedan únicamente, salvo defecto o cambio de alcance decidido por el Humano:

1. verificaciones reales/deployed/manual exigidas por la especificación;
2. reconciliación de V-IDs con evidencia del entorno correcto;
3. actualización/cierre administrativo de M4 y M5 por el Supervisor;
4. publicación, que sigue siendo acción humana.

Un test local, emulador o GitHub Actions no sustituye evidencia de plataforma cuando la verificación exige Firebase/Google/Drive/Picker/Publish reales.

## 5. Restricciones permanentes

- GitHub es la fuente versionada de verdad.
- No persistir credenciales LLM en Firestore, Drive, logs, bundle, `localStorage` o `sessionStorage`.
- No informar éxito antes de confirmación externa.
- Conservar bounded-memory para lectura documental.
- No sustituir silenciosamente provider/model.
- No habilitar UI para una capacidad inexistente.
- No ampliar proveedores sin RESEARCH_GATE y decisión del Supervisor.
