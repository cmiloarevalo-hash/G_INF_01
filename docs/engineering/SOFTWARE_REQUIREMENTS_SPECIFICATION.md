# Software Requirements Specification

**Estado:** TARGET aprobado; aplicación en preimplementación. Los estados de integración pertenecen a [Current State](CURRENT_STATE.md).

## 1. Product Objective

Herramienta web ligera para organizar antecedentes inmobiliarios y producir análisis documental asistido por LLM en un resultado JSON validado, una presentación web y un informe DOCX profesional. El primer tipo de informe es Estudio de Títulos (`TITLE_STUDY`); se podrán reutilizar los documentos de un proyecto en otros tipos de informe. No es un chat genérico. El valor principal está en el análisis, las instrucciones de informe y el contrato estructurado.

## 2. Scope

El producto completo comprende proyectos, documentos, análisis, informes, modo autenticado y modo invitado, elección de proveedor/modelo LLM y credencial propia, Google Drive para archivos persistentes de usuarios autenticados y generación DOCX. Toda funcionalidad definida pertenece al producto completo aunque su implementación se ordene después. Los planos aceptados en esta versión se procesan como PDF. La categoría documental es abierta a antecedentes inmobiliarios pertinentes; incluye escrituras, documentos registrales y tributarios, certificados, antecedentes técnicos y legales y planos PDF. Los datos ausentes irrelevantes no generan textos artificiales; las diferencias documentales se conservan como resultados analíticos. No se exige iniciar sesión para el análisis principal.

El proyecto invitado es un contexto temporal de trabajo durante la sesión, no un proyecto persistente recuperable. Los proyectos persistentes pertenecen al usuario autenticado. Cuando un documento local se incorpora correctamente a uno de esos proyectos y la operación de almacenamiento tiene éxito, queda en el Drive autorizado del usuario. No está definido otro almacén documental persistente alternativo.

## 3. Users and Actors

Usuario invitado; usuario autenticado mediante cuenta Google; servicios externos Google (autenticación, Drive y Firestore) y proveedores LLM soportados (Google Gemini, OpenAI, Anthropic y OpenRouter). El usuario aporta su propia credencial LLM.

## 4. Functional Requirements

### Requisitos con ID

### Cuenta y acceso

**FR-001** — El sistema permitirá iniciar sesión mediante una cuenta Google.  
**FR-002** — El sistema permitirá utilizar las funciones principales de análisis sin iniciar sesión.  
**FR-003** — La información persistente de cada usuario autenticado deberá permanecer aislada de otros usuarios.

### Proyectos

**FR-010** — El usuario autenticado podrá crear proyectos.  
**FR-011** — El usuario podrá consultar sus proyectos existentes.  
**FR-012** — Cada proyecto podrá contener múltiples documentos.  
**FR-013** — Cada proyecto podrá contener múltiples análisis.  
**FR-014** — Cada proyecto podrá generar múltiples informes.  
**FR-015** — Los mismos documentos podrán utilizarse para diferentes tipos de informe.

### Documentos

**FR-020** — El sistema permitirá cargar documentos desde el dispositivo local.  
**FR-021** — El sistema permitirá seleccionar documentos mediante Google Drive.  
**FR-022** — Los documentos incorporados correctamente a un proyecto autenticado deberán quedar almacenados en el Google Drive autorizado del usuario una vez confirmada la operación de almacenamiento.  
**FR-023** — El sistema organizará los archivos persistentes por proyecto.  
**FR-024** — El sistema aceptará documentos relacionados con bienes raíces sin depender de una enumeración rígida de tipos documentales.  
**FR-025** — Los planos procesados por esta versión deberán presentarse en PDF.

### IA

**FR-030** — El usuario podrá configurar una API propia de un proveedor LLM soportado.  
**FR-031** — El usuario podrá seleccionar un proveedor.  
**FR-032** — El usuario podrá seleccionar un modelo.  
**FR-033** — La aplicación utilizará el proveedor y modelo seleccionados.  
**FR-034** — El usuario podrá proporcionar una instrucción adicional para un análisis.  
**FR-035** — La instrucción adicional no sustituirá las instrucciones base del tipo de informe.

### Análisis

**FR-040** — La LLM analizará el contenido real de los documentos.  
**FR-041** — El análisis extraerá únicamente información sustentada por los documentos.  
**FR-042** — El sistema conservará los valores documentales originales.  
**FR-043** — El sistema podrá generar representaciones normalizadas sin eliminar los valores originales.  
**FR-044** — Las diferencias entre documentos deberán conservarse y analizarse.  
**FR-045** — Una diferencia documental no provocará por sí sola la interrupción del análisis.  
**FR-046** — Los datos ausentes que no sean relevantes no deberán producir automáticamente campos o textos de ausencia.  
**FR-047** — El sistema deberá evitar redundancias semánticas innecesarias en los resultados.  
**FR-048** — La salida analítica deberá cumplir el schema correspondiente al tipo de informe.

### Informes

**FR-050** — Cada tipo de informe tendrá un contrato estructurado de salida.  
**FR-051** — El sistema presentará en pantalla el resultado estructurado validado.  
**FR-052** — El sistema generará DOCX a partir del resultado estructurado validado.  
**FR-053** — El renderer no podrá crear hechos o conclusiones inexistentes en el resultado validado.  
**FR-054** — Los informes persistentes de usuarios autenticados se almacenarán en el proyecto correspondiente.  
**FR-055** — El usuario podrá consultar sus informes previamente generados.

### Extensibilidad

**FR-060** — El producto permitirá incorporar nuevos tipos de informe.  
**FR-061** — Agregar un tipo de informe no deberá requerir reconstruir la gestión general de usuarios, proyectos o documentos.  
**FR-062** — Cada tipo de informe determinará sus propias instrucciones, schema y presentación.

---

### Requisitos de interfaz con ID

**UIR-001** — La interfaz utilizará navegación lateral plegable.  
**UIR-002** — La navegación principal expondrá solamente funciones necesarias para la operación normal.  
**UIR-003** — La navegación incluirá Inicio, Nuevo proyecto, Mis proyectos, Mis informes, APIs y modelos, Google Drive y Configuración.  
**UIR-004** — Un proyecto presentará como áreas principales Resumen, Documentos, Resultado e Informe.  
**UIR-005** — Los mecanismos técnicos internos no deberán presentarse como navegación principal.  
**UIR-006** — La configuración de APIs y modelos deberá ser accesible sin recorrer menús técnicos internos.  
**UIR-007** — La presentación visual deberá mantenerse clara, consistente y profesional.  
**UIR-008** — No deberán mostrarse controles o funcionalidades simuladas como si estuvieran implementadas.

---

### Detalles funcionales aprobados

### Proyectos

El usuario debe poder:
- crear proyectos;
- consultar proyectos existentes;
- incorporar varios documentos;
- ejecutar varios análisis;
- generar varios informes;
- reutilizar documentos existentes para informes distintos.

### Informes

La aplicación debe:
- mantener separados proyecto e informe;
- permitir múltiples informes por proyecto;
- permitir agregar tipos de informe sin rehacer el sistema general;
- asociar cada informe a un prompt, un schema y un renderer.

### Documentos

El usuario debe poder:
- subir documentos locales;
- seleccionar documentos desde Google Drive;
- trabajar con varios documentos por proyecto;
- procesar documentos relacionados con bienes raíces;
- analizar planos cuando estén en PDF.

#### Política de admisión y piloto invitado (decisión humana registrada en Issue #6; implementación Issue #12)

La selección conserva todos los archivos elegidos, aunque la extensión, MIME o firma no coincida con el formato que el piloto pueda procesar. El sistema diagnostica por archivo y distingue claramente “no analizado” de un resultado de IA; una incompatibilidad no impide procesar otros documentos. Este reemplaza para los flujos futuros la política de rechazo temprano del Issue #6.

El piloto Gemini procesa PDF cuya firma sea legible, imágenes PNG/JPEG con firma correspondiente y TXT/Markdown UTF-8. Los archivos CSV, XLS/XLSX y otros formatos siguen seleccionables pero no se envían ni se convierten. Los planos admitidos continúan siendo PDF (FR-025). Cada archivo compatible se envía secuencialmente a Gemini; los PDFs inline respetan el máximo oficial de 50 MiB. Para los demás archivos, el límite de 70 MiB resulta del límite oficial de 100 MB por payload y la expansión de Base64 usada por el transporte inline ([Gemini File input methods](https://ai.google.dev/gemini-api/docs/file-input-methods), [Document understanding](https://ai.google.dev/gemini-api/docs/document-processing)). Una salida intermedia de hechos se consolida en `TITLE_STUDY`, que se valida con Zod; JSON Schema del proveedor no expresa las reglas referenciales entre elementos, por lo que no reemplaza la validación Zod. La conversión a schema Gemini elimina la declaración Draft y convierte `const` en `enum`; no modifica el validador Zod de aplicación.

La clave Gemini es aportada por el usuario, permanece en el estado de la página durante esta sesión y viaja como cabecera del navegador al servidor y de allí al proveedor. No se guarda en el repositorio, almacenamiento del navegador, logs o almacenamiento persistente. Las solicitudes al proveedor tienen timeout de 120 segundos; fallos, cuota, respuestas truncadas o JSON inválido producen error sin resultado ficticio. El usuario recibe aviso de que el contenido legible se envía a Google Gemini para procesamiento temporal. El resultado es preliminar y requiere revisión humana; no es asesoría legal ni un Estudio de Títulos jurídicamente válido.

### Modo autenticado

El usuario autenticado debe disponer de:
- proyectos persistentes;
- informes persistentes;
- Google Drive;
- historial;
- configuración personal no sensible.

### Modo invitado

Un usuario no autenticado debe poder:
- cargar documentos;
- proporcionar su API;
- seleccionar proveedor y modelo;
- ejecutar un análisis;
- ver el resultado;
- generar y descargar DOCX.

No debe exigirse iniciar sesión para realizar el análisis principal.

---

### Prioridad

La interfaz es una parte central del diseño y debe definirse antes de desarrollar completamente el motor.

### Lenguaje visual

Se conserva la línea general del prototipo previo:
- oscura;
- profesional;
- limpia;
- visualmente consistente;
- sin saturación;
- sin controles técnicos innecesarios.

### Navegación principal

La navegación lateral será plegable.

```text
Inicio

Proyectos
  Nuevo proyecto
  Mis proyectos

Informes
  Mis informes

IA
  APIs y modelos

Documentos
  Google Drive

Configuración
```

### Navegación interna de un proyecto

```text
Resumen
Documentos
Resultado
Informe
```

### Elementos que no deben dominar la UI

No deben aparecer como navegación principal:
- jobs;
- pipeline;
- Evidence Gate;
- Fact IDs;
- Evidence IDs;
- auditoría forense;
- estados técnicos internos;
- matrices de capacidades;
- diagnósticos de infraestructura.

### Configuración de IA

Debe existir una única sección: **APIs Y MODELOS**.

Debe permitir:
- proveedor;
- API key;
- modelo;
- prueba de conexión;
- selección del modelo de uso.

---

### Definición general

Las especificaciones no deben enumerar de forma rígida todos los documentos posibles.

Categoría funcional:

> Documentos relacionados con bienes raíces y antecedentes inmobiliarios.

### Categorías generales

Puede incluir:
- escrituras públicas;
- documentos registrales;
- documentos tributarios;
- certificados municipales;
- certificados de organismos públicos;
- antecedentes técnicos;
- antecedentes legales;
- planos PDF;
- otros documentos inmobiliarios pertinentes.

### Planos

Los planos aceptados por esta versión se procesan en PDF.

---

### Mostrar solo lo encontrado

El informe debe presentar la información realmente obtenida.

### Ausencia relevante

Una ausencia solo debe explicitarse cuando sea importante para el análisis o una conclusión.

### Evitar redundancia

El sistema debe evitar repetir innecesariamente conceptos equivalentes.

### Roles reales

Deben conservarse roles documentales como:
- vendedor;
- comprador;
- heredero;
- adjudicatario;
- cónyuge;
- causante;
- mandatario;
- representante;
- otros roles detectados.

### Original y normalizado

Ejemplo:

```json
{
  "original": "00524-00050",
  "normalized": "524-50"
}
```

La normalización nunca reemplaza silenciosamente el original.

### Diferencias documentales

Las diferencias:
- se conservan;
- se comparan;
- se explican;
- llegan al JSON.

No constituyen por sí mismas un error técnico.

### Resultados posibles de comparación

```text
CONSISTENT
NORMALIZED_EQUIVALENT
DIFFERENT
POSSIBLE_CONTRADICTION
INSUFFICIENT_INFORMATION
```

---

### Primer tipo

```text
TITLE_STUDY
```

### Estructura conceptual

Cada tipo de informe requiere:

```text
prompt
schema
renderer
```

### Regla de extensión

Agregar un nuevo tipo de informe no debe requerir rehacer autenticación, proyectos, almacenamiento, documentos, selección de proveedor, interfaz general ni persistencia general.

La interfaz conserva la línea general oscura, profesional, limpia, consistente, sin saturación ni controles técnicos innecesarios del prototipo previo. La configuración de IA se reúne en **APIs Y MODELOS** y permite proveedor, API key, modelo, prueba de conexión y selección del modelo de uso. Una ausencia se explicita solo si importa al análisis o una conclusión. El backend no reemplaza el trabajo intelectual de la LLM por cientos de reglas jurídicas rígidas. La LLM analiza contenido real, identifica hechos, relaciones, omisiones y contradicciones, distingue lo relevante, mantiene originales y entrega salida estructurada; una diferencia documental no constituye por sí sola error técnico. Los resultados posibles de comparación se conservan en §10.7.

## 5. Non-Functional Requirements

### Simplicidad

**NFR-001** — La arquitectura deberá mantenerse deliberadamente ligera.  
**NFR-002** — No deberá incorporarse infraestructura sin una necesidad funcional establecida.  
**NFR-003** — El procesamiento documental deberá mantener acotados el uso de memoria y la concurrencia, evitando cargar simultáneamente todos los documentos de un proyecto.

### Seguridad

**NFR-010** — Las API keys no podrán quedar incluidas en código, GitHub, archivos públicos ni logs.  
**NFR-011** — Los usuarios autenticados solo podrán acceder a recursos que les pertenezcan.  
**NFR-012** — La comunicación con proveedores externos deberá realizarse mediante HTTPS.

### Calidad

**NFR-020** — El resultado estructurado deberá validarse antes de utilizarse para generar un informe.  
**NFR-021** — Un fallo de proveedor no deberá transformarse en contenido ficticio.  
**NFR-022** — La aplicación deberá presentar errores comprensibles al usuario.  
**NFR-023** — El fallo de una dependencia externa no deberá corromper estado previamente confirmado ni marcar como exitosa una operación no confirmada.  
**NFR-024** — El endpoint de salud deberá representar únicamente la disponibilidad del proceso HTTP y no deberá afirmar la disponibilidad de servicios externos.

### Usabilidad

**NFR-030** — La interfaz deberá minimizar información técnica irrelevante para el usuario final.  
**NFR-031** — Las operaciones principales deberán poder ejecutarse mediante un flujo corto y comprensible.

---

## 6. Constraints and External Dependencies

**CON-001** — La solución se diseñará específicamente para Google AI Studio.  
**CON-002** — La publicación deberá ser compatible con el mecanismo de publicación utilizado por Google AI Studio.  
**CON-003** — GitHub será el repositorio versionado del proyecto.  
**CON-004** — Google Drive será la solución de almacenamiento documental persistente para usuarios autenticados.  
**CON-005** — La identidad persistente utilizará cuentas Google.  
**CON-006** — Las consultas a proveedores LLM utilizarán credenciales aportadas por cada usuario.  
**CON-007** — La aplicación estará orientada inicialmente a pocos usuarios y no deberá optimizarse prematuramente para escala masiva.

---

La configuración personal persistente no incluye la credencial LLM. La aplicación no sustituye silenciosamente proveedor o modelo, ni presenta modelos fabricados como disponibles. Cuando el proveedor lo permite, se consulta su disponibilidad real. La interfaz no presenta controles simulados como implementados (UIR-008). No se define un almacén documental propio o alternativo persistente.

## 7. Acceptance Criteria

**AC-001** — Un visitante puede realizar un análisis sin autenticarse.  
**AC-002** — Un usuario Google puede crear un proyecto y encontrarlo después de volver a ingresar.  
**AC-003** — Un documento local asociado a un proyecto autenticado queda almacenado en el Drive correspondiente.  
**AC-004** — Un archivo seleccionado desde Google Drive puede utilizarse en un análisis.  
**AC-005** — Una respuesta del modelo que no cumple el schema no se considera un análisis válido.  
**AC-006** — Una discrepancia entre documentos permanece en el resultado y no aborta automáticamente el análisis.  
**AC-007** — El DOCX generado corresponde al JSON validado.  
**AC-008** — Un usuario no puede consultar proyectos pertenecientes a otro usuario.  
**AC-009** — Un proyecto puede producir dos tipos de informe utilizando los mismos documentos.  
**AC-010** — Ninguna API key del usuario queda persistentemente expuesta en recursos no autorizados.  
**AC-011** — Una falla de Drive no se presenta como almacenamiento exitoso y no elimina el estado válido previamente confirmado.  
**AC-012** — `/api/health` puede responder correctamente aunque una integración externa esté caída, y su significado está limitado a la salud del proceso.  
**AC-013** — Un conjunto de documentos se procesa sin requerir mantener simultáneamente todos sus archivos completos en memoria.  
**AC-014** — La revocación de autorización de Drive produce un flujo de reautorización o error controlado, sin interpretarse como pérdida del proyecto.

---

## 8. Requirement-to-Acceptance Mapping

Las siguientes relaciones están explícitas por su mismo comportamiento observable en el TARGET. La ausencia de una arista no equivale a ausencia de requisito ni crea un criterio nuevo.

| Requisito | Criterio |
|---|---|
| FR-002 | AC-001 |
| FR-010, FR-011 | AC-002 |
| FR-020, FR-022 | AC-003 |
| FR-021 | AC-004 |
| FR-048, NFR-020 | AC-005 |
| FR-044, FR-045 | AC-006 |
| FR-052, FR-053 | AC-007 |
| FR-003, NFR-011 | AC-008 |
| FR-015, FR-060 | AC-009 |
| NFR-010 | AC-010 |
| NFR-023 | AC-011 |
| NFR-024 | AC-012 |
| NFR-003 | AC-013 |
| FR-021 | AC-014 |

Las demás relaciones específicas no están determinadas en las fuentes.
