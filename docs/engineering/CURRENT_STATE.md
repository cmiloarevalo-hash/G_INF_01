# Current State

**Corte de implementación:** Work Item #91 / PR #92, branch `issue-91-m4-m5-final-integration`, basada en `main@7a8808e55574038efa5f14dd5bddbbaead7d1ad5`.

Este documento distingue entre **capacidad implementada en repositorio** y **verificación real de plataforma/despliegue**. Un build, test, emulador o CI verde no convierte por inferencia una verificación deployed/manual en `PASS`.

## 1. Estado integrado en main antes de #91

La base `main@7a8808e55574038efa5f14dd5bddbbaead7d1ad5` contiene:

- M1, M2 y M3 cerradas;
- M4.1 completada; #84 registra V-004 completada mediante #53;
- M4.2 completada según el plan canónico #84;
- M4.3a-e completadas;
- servicios autenticados restantes integrados por #89 / PR #90:
  - coordinación de incorporación documental;
  - adapter Google Picker;
  - lectura acotada de referencias Drive;
  - metadata de análisis e informes y drivers Firestore;
  - persistencia confirmada de JSON/DOCX a Drive;
  - historial/reapertura;
  - preferencias provider/model no sensibles;
  - credencial AI sólo en memoria;
  - Firestore Security Rules y pruebas en emulador.

GitHub sigue siendo la fuente persistente de verdad. La publicación sigue siendo una acción humana separada.

## 2. Work Item #91 — M4/M5 final

#91 es el único bloque activo de implementación y conserva la nomenclatura canónica de #84.

En PR #92 están implementadas a nivel de repositorio:

### M4.3f — integración documental autenticada + UI Documentos

- workspace de proyecto persistente;
- autorización Drive de sesión;
- preparación de carpetas Drive del proyecto;
- carga local → Drive confirmado → metadata;
- Google Picker → selección confirmada → metadata;
- cancelación sin persistencia;
- listado persistente;
- verificación controlada de referencia Drive;
- estados pending/cancelled/error/authorization-required/unavailable/stale;
- ningún éxito antes de confirmación.

### M4.4a — Resultado + persistencia de análisis

- usa metadata documental persistida del proyecto;
- recupera referencias Drive con lectura acotada;
- aplica límites de cantidad/tamaño antes del análisis;
- ejecuta únicamente la configuración AI soportada;
- acepta sólo resultado `TITLE_STUDY` validado;
- persiste JSON confirmado en Drive antes de metadata;
- separa errores de Drive, provider, validation y persistence;
- impide operaciones duplicadas simples.

### M4.4b — Informe + persistencia DOCX

- genera DOCX sólo desde `TITLE_STUDY` válido;
- usa la ruta existente de renderer DOCX sin enviar credenciales;
- persiste DOCX en Drive antes de metadata;
- conserva explícitamente fallos parciales cuando Drive confirmó archivo pero la metadata no quedó confirmada.

### M4.4c — historial / reapertura / Mis informes

- lista análisis e informes persistidos;
- reabre análisis validando nuevamente el JSON;
- reabre/descarga informes disponibles;
- diferencia empty, not-found, failure, stale y authorization-required;
- `Mis informes` está habilitado porque tiene implementación funcional.

### M4.5c — APIs y modelos

- UI sólo para `gemini` / `gemini-3.6-flash`, que son las opciones realmente implementadas;
- provider/model pueden persistirse como preferencia no sensible;
- API key se mantiene sólo en memoria y puede limpiarse;
- instrucción adicional se mantiene sólo en memoria de sesión;
- la frontera HTTP existente transporta provider/model/instrucción adicional;
- provider/model no implementados se rechazan antes de invocar al proveedor;
- no se usa Firestore, Drive, `localStorage` ni `sessionStorage` para credenciales.

### M5.1 — flujo autenticado E2E de repositorio

El wiring de repositorio conecta:

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

Esta integración de código no constituye por sí sola una demostración deployed con servicios reales.

### M5.2 — navegación y experiencia integrada

La experiencia autenticada contiene:

- Resumen;
- Documentos;
- Resultado;
- Informe;
- historial contextual;
- Mis informes;
- APIs y modelos.

Los controles globales que todavía no tienen superficie funcional independiente permanecen no disponibles. El modo invitado se conserva.

### M5.3 — regresión y resilience

La suite cubre, con fakes/emuladores cuando corresponde:

- regresión del modo invitado;
- semántica process-only de `/api/health`;
- no persistencia de credenciales;
- protección contra operaciones duplicadas;
- lectura Drive bounded-memory/streaming;
- fallos provider;
- referencias stale/unavailable;
- autorización requerida/revocada;
- cuota/storage;
- fallos parciales Drive/Firestore;
- no fake success.

### M5.4 — auditoría final

El cierre de #91 exige, sobre el HEAD exacto de PR #92:

```text
npm run build
npm test
npm run test:firestore-rules
git diff --check 7a8808e55574038efa5f14dd5bddbbaead7d1ad5...HEAD
```

Además se revisan diff completo, scope, secretos, persistencia de credenciales y coherencia UI/documentación. El estado `READY_FOR_REVIEW` sólo corresponde después de CI verde del HEAD exacto.

## 3. Límites de verificación

No se reclaman desde #91 como `PASS` nuevas verificaciones que exijan entorno real, despliegue o revisión manual.

En particular, CI/repositorio no demuestra por sí solo:

- configuración efectiva de Firebase/Google/Drive/Picker del entorno publicado;
- OAuth real o cuenta Google real;
- disponibilidad real de Drive/Firestore/Gemini;
- compatibilidad del SHA actual con Publish;
- revisión manual responsive/profesional;
- que el `main` actual esté desplegado.

Las verificaciones reales/finales y el cierre administrativo de M4/M5 permanecen bajo control del Supervisor/Humano después de la integración de #91.

## 4. Estado administrativo

El snapshot machine de Issue #43, generado desde el estado canónico de GitHub para `main@7a8808e55574038efa5f14dd5bddbbaead7d1ad5`, registra **64%**: M1 20 + M2 20 + M3 20 + M4.1 4.

Issue #84 registra el estado de ingeniería más reciente de M4/M5 y #91 como bloque final activo. La diferencia con el porcentaje machine se debe a que el control administrativo de #45 todavía no ha sido reconciliado/cerrado por el Supervisor. Este Work Item no modifica Issues padre ni se autoasigna puntos.
