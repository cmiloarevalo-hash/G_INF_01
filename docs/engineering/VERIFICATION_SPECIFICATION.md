# Verification Specification

**Estado:** obligaciones TARGET; no existe evidencia producida ni resultados de ejecución.

## 1. Verification Scope

Interfaz, autenticación, invitados, proyectos, Drive, Firestore, carga documental, proveedores y modelos, análisis, JSON Schema, validación, DOCX, persistencia, aislamiento de usuarios y despliegue.

## 2. Required Verification

**V-001 — Build:** el proyecto construye correctamente.  
**V-002 — Production startup:** el build inicia en modo producción.  
**V-003 — Health endpoint:** `/api/health` responde 200 sin depender de servicios externos.  
**V-004 — Google authentication:** autenticación real con Google.  
**V-005 — Guest analysis:** análisis completo sin iniciar sesión.  
**V-006 — Project isolation:** un usuario no accede a proyectos de otro.  
**V-007 — Project lifecycle:** persistencia de proyecto entre sesiones.  
**V-008 — Automatic project folder:** estructura de Drive creada automáticamente.  
**V-009 — Local document to Drive:** archivo local persiste en Drive.  
**V-010 — Existing Drive document:** Google Picker selecciona y usa el documento real.  
**V-011 — Real bytes:** la LLM analiza contenido real.  
**V-012 — Filename independence:** mismos bytes con distinto nombre producen análisis sustantivamente equivalente.  
**V-013 — Optional information:** no se generan listas innecesarias de ausencias.  
**V-014 — Normalization without information loss:** se conservan original y normalizado.  
**V-015 — Differences do not abort analysis:** una diferencia no aborta automáticamente.  
**V-016 — Genuine discrepancy:** una contradicción material llega al resultado.  
**V-017 — User API key:** clave válida funciona; inválida falla de forma controlada.  
**V-018 — Model selection:** se utiliza el modelo seleccionado.  
**V-019 — Provider failure:** un fallo no genera contenido ficticio.  
**V-020 — Valid structured output:** la salida cumple el schema.  
**V-021 — Invalid JSON:** se corrige controladamente o falla.  
**V-022 — Missing optional fields:** campos opcionales ausentes son válidos cuando corresponda.  
**V-023 — Multi-document analysis:** múltiples documentos se consolidan sin perder origen.  
**V-024 — Additional instruction:** la instrucción del usuario complementa el prompt base.  
**V-025 — Multiple report types:** mismos documentos generan informes diferentes.  
**V-026 — DOCX from validated JSON:** el DOCX deriva del JSON validado.  
**V-027 — Invalid analysis cannot produce valid report:** JSON inválido no produce informe válido.  
**V-028 — Document presentation:** revisión manual de presentación profesional.  
**V-029 — Analysis persistence:** el análisis persiste para usuarios autenticados.  
**V-030 — Report persistence:** el DOCX queda disponible desde proyecto y Drive.  
**V-031 — API keys not persisted:** las claves no quedan en almacenamiento no autorizado.  
**V-032 — Repository secret scan:** GitHub no contiene secretos.  
**V-033 — Main navigation:** la navegación principal coincide con la especificación.  
**V-034 — Project navigation:** el proyecto muestra Resumen, Documentos, Resultado e Informe.  
**V-035 — Responsive use:** verificación manual en desktop y viewport reducido.  
**V-036 — AI Studio Publish:** publicación real y servicio operativo.  
**V-037 — Complete authenticated workflow:** E2E autenticado completo.  
**V-038 — Complete guest workflow:** E2E invitado completo.  
**V-039 — Drive quota or storage failure:** una falla de cuota o espacio insuficiente se informa y no se marca como carga exitosa.  
**V-040 — OAuth revoked:** revocar acceso a Drive produce error de autorización/reautorización controlado.  
**V-041 — Stale Drive reference:** una referencia Firestore a un archivo eliminado se detecta como recurso no disponible sin corrupción de proyecto.  
**V-042 — Health semantics:** `/api/health` continúa representando solo el proceso HTTP y no depende de Drive, Firestore o LLM.  
**V-043 — Bounded memory processing:** múltiples documentos se procesan incrementalmente sin cargar simultáneamente todos los archivos completos.  
**V-044 — Duplicate operation protection:** una repetición inmediata de una operación persistente no produce duplicados no controlados cuando pueda prevenirse de forma simple.  
**V-045 — Provider quota/timeout/truncation:** rate limit, timeout, cuota agotada o salida truncada producen retry limitado o error controlado, nunca contenido ficticio.

---

## 3. Requirement-to-Verification Mapping

Estas aristas se sustentan en el texto explícito y coincidente del requisito/criterio y la obligación V. No se completan otras por simetría.

| Requisito / aceptación | Verificación |
|---|---|
| FR-002, AC-001 | V-005, V-038 |
| FR-003, AC-008 | V-006 |
| FR-010, FR-011, AC-002 | V-007 |
| FR-020, FR-022, AC-003 | V-009 |
| FR-021, AC-004 | V-010 |
| FR-033 | V-018 |
| FR-034, FR-035 | V-024 |
| FR-040 | V-011 |
| FR-042, FR-043 | V-014 |
| FR-044, FR-045, AC-006 | V-015, V-016 |
| FR-046 | V-013, V-022 |
| FR-048, NFR-020, AC-005 | V-020, V-021, V-027 |
| FR-015, AC-009 | V-025 |
| FR-052, FR-053, AC-007 | V-026 |
| FR-054 | V-030 |
| UIR-003 | V-033 |
| UIR-004 | V-034 |
| NFR-003, AC-013 | V-043 |
| NFR-010, AC-010 | V-031, V-032 |
| NFR-021 | V-019, V-045 |
| NFR-023, AC-011 | V-039, V-041 |
| NFR-024, AC-012 | V-003, V-042 |
| CON-002 | V-036 |
| AC-014 | V-040 |

La cobertura precisa de requisitos y criterios no reflejados en la tabla queda pendiente de definición; los V existentes conservan su obligación aunque no se fuerce una arista individual.

## 4. Exclusions and Known Verification Limits

Compilar, disponer de código, mostrar una pantalla o afirmar que algo funciona no demuestra cumplimiento. `/api/health` no demuestra disponibilidad de Drive, Firestore o proveedores LLM, validez de API key ni autorización OAuth. No existe evidencia producida. La fuente no define casos de prueba concretos ni valores exactos de límites, concurrencia o timeout.

## 5. Verification Levels

Unit, Integration, End-to-End y Manual Demonstration, según la fuente. `NOT_TESTED`, `PASS`, `FAIL` y `BLOCKED` son estados posibles de resultados de ejecución, no estados asignados en este documento.

## 6. Verification Environment

Local: build, schemas, pruebas unitarias, rendering, transformaciones y errores deterministas. Deployed: Cloud Run, Firebase Authentication, Firestore, Drive, OAuth, proveedores reales y flujo completo. La verificación desplegada es obligatoria antes de afirmar compatibilidad con AI Studio Publish.

## 7. Evidence Requirements

Debe existir evidencia observable para considerar una función verificada. Para los V-IDs, cuenta evidencia de las conductas descritas mediante pruebas automatizadas o demostraciones en el entorno pertinente; `V-028` y `V-035` exigen revisión manual expresa. La especificación describe evidencia esperada, sin registrar resultados.

## Correspondencia inicial de mecanismos y comandos

**IMPLEMENTATION_BASELINE:** `npm run build` produce evidencia de V-001; `npm start` permite V-002 y la comprobación HTTP V-003. `npm test` ejecutará los tests automatizados que se incorporen bajo `tests/` con los Work Items, por ejemplo validación de schema y procesamiento acotado cuando existan fixtures. V-004, V-008–V-010, V-036–V-038 y verificaciones que requieren servicios reales necesitan además un entorno desplegado o demostración pertinente; ningún script local equivale por sí solo a su resultado. Los detalles de fixtures y procedimientos son decisiones de implementación.
