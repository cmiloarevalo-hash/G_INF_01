# Report Presentation Specification — TITLE_STUDY

**Estado:** propuesta técnica M3.1 lista para revisión. Este documento define el contrato de presentación del informe DOCX de Estudio de Títulos. No implementa el renderer, no genera DOCX y no modifica el contrato de datos.

**Work Item:** Issue #10 · M3.1, bajo Issue #22 / M3.

## 1. Propósito, autoridad y límites

El flujo obligatorio es:

```text
TITLE_STUDY validado
→ renderer determinista
→ DOCX
```

El schema ejecutable `src/report-types/title-study/schema.ts` sigue siendo la única fuente normativa del contrato de datos. Esta especificación no lo copia ni crea campos alternativos.

El renderer sólo transforma presentación. No agrega hechos, análisis, inferencias, conclusiones jurídicas ni contenido ausente. No realiza una nueva llamada LLM. Si el resultado no valida contra `TITLE_STUDY`, este contrato no autoriza generar un informe válido.

### 1.1 Decisiones humanas documentadas

Issue #10 fija estas decisiones de presentación:

- estilo moderno, ejecutivo, profesional, sobrio, legible y consistente;
- paleta basada en azules y celestes sobrios;
- contraste suficiente para lectura;
- jerarquía clara de títulos y subtítulos;
- negrita selectiva;
- índice basado en títulos reales;
- numeración y listas cuando correspondan semánticamente;
- uso correcto de párrafos, saltos de línea y saltos de página;
- secciones condicionales sin texto repetitivo de ausencia;
- contrato visual previo a la implementación del renderer.

Los valores numéricos y códigos de color de las secciones siguientes son **propuesta técnica M3.1** necesaria para hacer el contrato implementable y verificable. No se presentan como decisiones humanas históricas exactas.

## 2. Principios de diseño

1. **Contenido primero.** La presentación facilita lectura y trazabilidad; no cambia el significado del resultado validado.
2. **Jerarquía explícita.** Los niveles de sección usan estilos reales de Word, no formato manual aislado.
3. **Sobriedad.** El color se usa para jerarquía, encabezados y separación, no como decoración.
4. **Consistencia.** Un mismo tipo semántico conserva el mismo estilo en todo el documento.
5. **Condicionalidad.** Las secciones opcionales se omiten cuando su conjunto de datos no existe o está vacío.
6. **Trazabilidad.** Hallazgos, comparaciones y conclusiones mantienen las referencias que el JSON validado permita resolver.
7. **Sin redundancia.** No repetir el mismo dato en varios bloques salvo que sea necesario para contexto o referencia.

### 2.1 Paleta propuesta

| Uso | Color | Hex |
|---|---|---|
| Azul principal | títulos principales, acentos | `#17365D` |
| Azul secundario | subtítulos, bordes destacados | `#2F75B5` |
| Celeste claro | fondos de encabezado de tabla y bloques suaves | `#D9EAF7` |
| Celeste muy claro | fondo alternativo discreto | `#F3F8FC` |
| Texto principal | cuerpo | `#1F2937` |
| Texto secundario | notas de trazabilidad | `#5B6573` |
| Blanco | fondos principales | `#FFFFFF` |

No usar degradados, sombras intensas, fondos oscuros extensos ni colores rojo/verde para inferir criticidad jurídica. Los estados estructurados se identifican mediante texto explícito; el color no sustituye el significado.

## 3. Configuración de página

**Propuesta técnica M3.1:**

- tamaño: A4, orientación vertical;
- margen superior: 2,3 cm;
- margen inferior: 2,3 cm;
- margen izquierdo: 2,5 cm;
- margen derecho: 2,5 cm;
- distancia del encabezado al borde: 1,25 cm;
- distancia del pie al borde: 1,25 cm;
- color de fondo: blanco;
- alineación del cuerpo: izquierda, salvo tablas y elementos expresamente definidos.

La maquetación no se obtiene mediante espacios, tabulaciones repetidas, múltiples `Enter` ni múltiples `Shift+Enter`.

## 4. Tipografía y estilos base

**Familia propuesta:** Aptos. El documento debe definir la misma familia en estilos de párrafo y títulos. La sustitución de fuente por el visor cuando Aptos no esté instalada es una condición del entorno de visualización, no una autorización para cambiar tamaños o jerarquía.

| Estilo | Tamaño | Peso | Color | Espaciado |
|---|---:|---|---|---|
| Título de portada | 24 pt | negrita | `#17365D` | 0 pt antes / 12 pt después |
| Subtítulo de portada | 13 pt | normal | `#2F75B5` | 0 / 18 pt |
| Heading 1 | 16 pt | negrita | `#17365D` | 18 pt antes / 8 pt después |
| Heading 2 | 13 pt | negrita | `#2F75B5` | 14 pt antes / 6 pt después |
| Heading 3 | 11,5 pt | negrita | `#17365D` | 10 pt antes / 4 pt después |
| Texto normal | 11 pt | normal | `#1F2937` | 0 pt antes / 6 pt después |
| Texto auxiliar/trazabilidad | 9 pt | normal | `#5B6573` | 0 / 4 pt |
| Tabla | 9,5 pt | normal | `#1F2937` | según celda |

Texto normal:

- interlineado: 1,15;
- alineación: izquierda;
- control de viudas y huérfanas activado cuando el formato Word lo permita;
- negrita sólo para etiquetas breves, términos de navegación visual o énfasis ya implícito en la estructura;
- no usar subrayado como énfasis general;
- no justificar texto si produce espacios irregulares visibles.

## 5. Portada

La portada ocupa la primera página y termina siempre con un salto de página explícito.

### 5.1 Contenido permitido

Orden visual:

1. acento gráfico simple en azul principal, sin logotipo inventado;
2. título principal fijo de presentación: **Estudio de Títulos**;
3. subtítulo fijo: **Informe estructurado**;
4. metadatos sólo cuando existan en datos válidos o en contexto de generación autorizado;
5. referencia técnica discreta al tipo `TITLE_STUDY`, sólo si resulta útil para trazabilidad interna y sin desplazar el título legible.

El schema vigente no contiene cliente, inmueble, rol, comuna ni fecha de informe. Por tanto, M3.1 no autoriza mostrarlos ni fabricarlos. Una fecha sólo podrá aparecer si un contrato o contexto de generación autorizado la aporta explícitamente en un Work Item posterior.

### 5.2 Composición

- bloque principal alineado a la izquierda;
- título situado aproximadamente en el tercio superior de la página;
- ancho útil completo respetando márgenes;
- título 24 pt;
- subtítulo 13 pt;
- acento: línea horizontal de 2 pt en `#2F75B5`, ancho máximo 6 cm;
- sin tablas invisibles usadas exclusivamente para posicionamiento cuando un párrafo o tabulación estructurada sea suficiente;
- salto de página posterior obligatorio.

## 6. Objetivo del informe

La sección **Objetivo del informe** aparece después de la portada y antes del contenido analítico o, si el índice ocupa una página propia, inmediatamente después del índice.

El objetivo no es un nuevo campo jurídico ni una conclusión. Mientras el schema vigente no contenga un objetivo sustantivo, el renderer puede usar únicamente texto editorial fijo que describa la función del documento, por ejemplo:

> Presentar de forma estructurada y legible el resultado TITLE_STUDY validado y conservar su trazabilidad con los documentos fuente.

Ese texto es explicación de presentación, no resultado del LLM. No debe ampliarse con afirmaciones sobre validez jurídica, suficiencia documental, propiedad, gravámenes u otras materias no contenidas en el JSON validado.

Estilo: Heading 1 para el título y un único párrafo normal. Si en el futuro el contrato de datos incorpora contexto válido específico, esta especificación deberá revisarse antes de sustituir el texto fijo por contenido dinámico.

## 7. Índice navegable

El informe usa una tabla de contenido de Word generada a partir de estilos reales `Heading 1`, `Heading 2` y, cuando corresponda, `Heading 3`.

Reglas:

- no escribir manualmente números de página;
- no simular el índice mediante una lista de texto estática;
- incluir sólo títulos que existan realmente en el documento;
- nivel máximo visible en el índice: Heading 2 por defecto;
- Heading 3 puede incluirse cuando sea necesario para distinguir subestructuras repetidas y no vuelva el índice excesivamente detallado;
- el índice comienza en página nueva;
- después del índice, el primer bloque sustantivo comienza en página nueva.

La actualización final de campos del índice depende de las capacidades del generador/visor Word y deberá verificarse en el Work Item del renderer; M3.1 sólo fija la estructura requerida.

## 8. Jerarquía, numeración y secciones

Los títulos deben estar asociados a estilos reales de Word.

### 8.1 Niveles

- **Heading 1:** secciones principales.
- **Heading 2:** subgrupos semánticos dentro de una sección.
- **Heading 3:** sólo para subestructura necesaria; no usarlo para cada dato individual.

Los números de sección se derivan de la jerarquía del documento. No insertar números escritos manualmente que puedan quedar desincronizados del índice.

### 8.2 Mapeo de presentación del schema vigente

Sin crear campos nuevos, el renderer posterior podrá expresar el `TITLE_STUDY` vigente mediante estos bloques:

1. Objetivo del informe.
2. Documentos fuente.
3. Hallazgos — sólo si `findings` existe y no está vacío.
4. Diferencias y comparaciones — sólo si `comparisons` existe y no está vacío.
5. Conclusiones — sólo si `conclusions` existe y no está vacío.

Los nombres anteriores son rótulos de presentación, no nuevos campos del schema.

### 8.3 Saltos asociados a títulos

- todo Heading 1 usa `keepWithNext` o equivalente para evitar quedar aislado al final de página;
- Heading 2 y Heading 3 permanecen con el primer párrafo, lista o tabla que les siga cuando sea razonable;
- la portada, el índice y el primer bloque posterior al índice tienen salto de página explícito;
- las demás secciones Heading 1 no requieren automáticamente página nueva: el renderer usa flujo natural, salvo que una sección principal quede con menos de aproximadamente tres líneas útiles al final de página; esa decisión debe resolverse con propiedades de párrafo/paginación, no con líneas vacías.

## 9. Párrafos, saltos y espaciado

Se distinguen tres operaciones:

- **nuevo párrafo:** nueva unidad semántica; utiliza propiedades de espaciado del estilo;
- **salto de línea:** sólo dentro de la misma unidad semántica, por ejemplo una dirección multilínea que ya exista como dato válido;
- **salto de página:** cambio explícito de página para portada, índice o regla de sección definida.

Prohibido:

- usar varios párrafos vacíos para crear espacio;
- usar varios saltos de línea para desplazar contenido;
- usar espacios repetidos para alinear columnas;
- usar saltos de página para ocultar problemas de paginación de tablas.

## 10. Listas y numeraciones

Usar viñetas cuando varios elementos tengan el mismo nivel semántico y el orden no tenga significado.

Usar listas numeradas cuando:

- el orden sea relevante para lectura;
- se presenten conclusiones independientes en secuencia;
- exista una jerarquía de pasos o elementos cuyo orden esté sustentado por el resultado.

Subniveles:

- máximo recomendado: dos niveles;
- sangría consistente;
- no mezclar viñetas y numeración en el mismo nivel sin razón semántica.

Los hallazgos no deben convertirse automáticamente en una lista de frases si una presentación por subtítulo y párrafo conserva mejor sus referencias y valores. Las tablas se reservan para información realmente tabular.

## 11. Tablas

### 11.1 Estilo

**Propuesta técnica M3.1:**

- ancho: 100 % del ancho útil;
- encabezado: fondo `#D9EAF7`, texto `#17365D`, negrita;
- bordes: 0,5 pt, `#B8C7D9`;
- padding interno: 0,15 cm vertical y 0,2 cm horizontal;
- cuerpo: fondo blanco;
- filas alternas: `#F3F8FC` sólo si mejora la lectura de tablas con cuatro o más filas;
- texto: 9,5 pt;
- encabezado de tabla repetido en nuevas páginas cuando Word lo soporte;
- evitar división de una fila entre páginas cuando sea posible;
- no reducir el texto por debajo de 9 pt para forzar ajuste.

### 11.2 Cuándo usar tabla

Una tabla está justificada cuando existen relaciones comparables por filas/columnas, por ejemplo:

- documentos fuente: nombre y tipo documental;
- valores documentales asociados a un hallazgo cuando hay varios valores comparables;
- una comparación con valores de dos o más documentos.

No mostrar identificadores internos como columna principal si pueden resolverse a nombres de documento legibles. Los IDs pueden conservarse en texto auxiliar sólo cuando sean necesarios para trazabilidad inequívoca.

No crear tablas vacías ni filas de “No informado”.

## 12. Presentación de documentos fuente

`sourceDocuments` es obligatorio en el schema vigente y se presenta en una sección propia.

Presentación preferida: tabla con columnas:

- **Documento:** `name`;
- **Tipo:** `documentType`.

El `id` se utiliza para resolver referencias. Puede aparecer como referencia auxiliar de 9 pt si existe ambigüedad entre nombres, pero no como contenido dominante para el usuario final.

No inferir tipo jurídico adicional a partir del nombre del archivo.

## 13. Hallazgos y referencias

La sección Hallazgos existe sólo si `findings` contiene elementos.

Para cada hallazgo:

- `statement` es el contenido principal;
- las referencias `sourceDocumentIds` se resuelven a los nombres de los documentos fuente válidos;
- mostrar una línea auxiliar **Fuentes:** seguida de nombres legibles;
- si `values` no existe, no crear tabla de valores;
- si existe un único valor, puede presentarse como etiqueta/cuerpo;
- si existen dos o más valores comparables, usar tabla.

Para valores:

- conservar siempre `original`;
- mostrar `normalized` sólo si existe;
- no sustituir el original por el normalizado;
- resolver `documentId` al nombre de documento;
- `field` se muestra como etiqueta proveniente del resultado, sin reinterpretación jurídica.

No añadir iconos de aprobación/rechazo ni calificaciones de riesgo que no existan en el contrato.

## 14. Diferencias y comparaciones

La sección existe sólo si `comparisons` contiene elementos.

Cada comparación presenta:

1. `field` como subtítulo o etiqueta principal;
2. el `result` estructurado mediante una etiqueta textual;
3. los valores por documento;
4. `explanation` sólo cuando exista.

Mapeo de presentación, sin alterar el valor del enum:

| Valor estructurado | Etiqueta visible |
|---|---|
| `CONSISTENT` | Consistente |
| `NORMALIZED_EQUIVALENT` | Equivalente tras normalización |
| `DIFFERENT` | Diferente |
| `POSSIBLE_CONTRADICTION` | Posible contradicción |
| `INSUFFICIENT_INFORMATION` | Información insuficiente |

Estas etiquetas son traducción de presentación del estado estructurado, no una conclusión jurídica adicional.

Los valores se presentan en tabla cuando haya dos o más documentos, conservando original y normalizado opcional. El estado usa texto visible; no depender sólo de color. No convertir automáticamente `DIFFERENT` o `POSSIBLE_CONTRADICTION` en una recomendación, alerta jurídica o conclusión no incluida.

## 15. Conclusiones

La sección existe sólo si `conclusions` contiene elementos.

Presentación:

- lista numerada o bloques numerados;
- `statement` como texto principal;
- referencia auxiliar a los hallazgos que sustentan la conclusión, resolviendo `supportingFindingIds` a identificadores/títulos de presentación existentes;
- sin añadir “recomendaciones”, “acciones sugeridas” o “nivel de riesgo” si no forman parte del contrato validado.

El renderer no puede crear una conclusión a partir de una comparación por iniciativa propia.

## 16. Advertencias y otros bloques no presentes

El schema `TITLE_STUDY` vigente no define un campo de advertencias. Por tanto:

- no existe una sección dinámica “Advertencias” en este contrato;
- no convertir errores, comparaciones o ausencia de datos en advertencias jurídicas;
- si un contrato futuro incorpora advertencias válidas, esta especificación debe revisarse antes de presentarlas.

Las únicas notas fijas permitidas en M3.1 son explicaciones editoriales de la naturaleza del documento y trazabilidad, nunca hechos del caso.

## 17. Secciones condicionales y ausencia de datos

En aplicación de FR-046 y FR-047:

- una colección opcional inexistente o vacía omite su sección;
- no insertar “No informado”, “No consta”, “Sin datos”, “N/A” o frases equivalentes de forma automática;
- un campo opcional ausente dentro de un elemento no genera una fila o párrafo vacío;
- no duplicar una misma explicación en resumen, tabla y nota;
- si un dato sí existe y es relevante para entender una comparación, puede repetirse sólo como referencia localizada y breve.

`sourceDocuments` no es condicional porque el schema válido exige al menos un documento fuente.

## 18. Encabezado y pie de página

### 18.1 Encabezado

No aparece en la portada.

Desde la segunda página:

- izquierda: **Estudio de Títulos**;
- 9 pt, color `#5B6573`;
- línea inferior opcional de 0,5 pt en `#D9EAF7`.

No incluir nombre de cliente, inmueble, comuna, rol, identificador personal ni otros datos no existentes.

### 18.2 Pie

No aparece en la portada salvo que el renderer necesite el campo de página oculto para cómputo interno.

Desde la segunda página:

- número de página alineado a la derecha;
- formato visible preferido: **Página X de Y** cuando Word/renderer soporte los campos necesarios de forma fiable;
- 9 pt, `#5B6573`;
- sin fecha dinámica del sistema presentada como si fuera fecha del informe.

La verificación del cálculo `Y` y actualización de campos corresponde al Work Item del renderer.

## 19. Paginación

Reglas:

- portada: una página;
- índice: comienza en página nueva;
- contenido: comienza en página nueva después del índice;
- evitar títulos huérfanos;
- mantener subtítulo con al menos el primer bloque siguiente;
- una tabla puede continuar en otra página, repitiendo encabezado;
- no reducir márgenes o tamaño de letra para evitar un salto;
- una fila especialmente extensa puede dividirse sólo si el motor Word no permite mantenerla completa sin producir una página vacía o desbordamiento;
- no insertar páginas en blanco salvo requisito técnico documentado del formato.

## 20. Coherencia y minimización de información técnica

En aplicación de UIR-007 y NFR-030:

- el informe usa nombres de documento y etiquetas legibles;
- IDs internos aparecen sólo cuando aporten trazabilidad necesaria;
- no mostrar nombres de rutas, nombres de funciones, códigos de error, nombres de variables ni detalles de proveedor LLM;
- `TITLE_STUDY` puede aparecer discretamente como identificación de tipo, pero el título visible principal es “Estudio de Títulos”;
- la presentación debe ser coherente entre portada, índice, cuerpo, tablas, encabezado y pie.

## 21. Criterios de revisión visual futura — V-028

M3.1 define el checklist; **no declara V-028 PASS**.

La revisión manual futura debe comprobar como mínimo:

- [ ] portada con jerarquía, márgenes y salto posterior correctos;
- [ ] índice construido desde headings reales y navegación utilizable;
- [ ] Heading 1, 2 y, si existe, Heading 3 visualmente distinguibles;
- [ ] párrafos con 11 pt, interlineado y espaciado consistentes;
- [ ] listas con sangría y niveles coherentes;
- [ ] tabla legible cuando el payload realmente la justifique;
- [ ] encabezados de tabla repetidos cuando una tabla continúe;
- [ ] documentos fuente y referencias resolubles de forma legible;
- [ ] comparaciones conservan valores originales y normalizados sólo cuando existan;
- [ ] conclusiones mantienen trazabilidad con hallazgos;
- [ ] secciones vacías omitidas sin cadenas repetitivas de ausencia;
- [ ] portada, índice y contenido usan los saltos de página definidos;
- [ ] no hay títulos aislados al final de página;
- [ ] no hay contenido cortado, superpuesto o fuera de márgenes;
- [ ] encabezado y pie no aparecen indebidamente en portada;
- [ ] paginación visible y consistente;
- [ ] paleta y contraste son legibles en pantalla y en impresión estándar;
- [ ] tipografía y tamaños son consistentes;
- [ ] no aparecen hechos, conclusiones o campos no contenidos en el resultado validado;
- [ ] el documento no depende de una nueva llamada LLM para su contenido.

La revisión debe incluir al menos: portada, índice, una página con títulos/subtítulos y listas, una tabla cuando el payload la justifique, un salto entre secciones, encabezado/pie y paginación.

## 22. Relación con V-026, V-027 y V-028

- **V-026 — DOCX from validated JSON:** NOT RUN en M3.1. Este documento sólo define cómo deberá presentarse un resultado ya validado.
- **V-027 — Invalid analysis cannot produce valid report:** NOT RUN en M3.1. La implementación posterior deberá impedir generación válida desde entrada inválida.
- **V-028 — Document presentation:** NOT RUN en M3.1. Requiere DOCX generado y revisión manual expresa.

## 23. Reglas para el Work Item del renderer

La implementación posterior debe poder seguir esta especificación sin reinterpretar decisiones visuales. Como mínimo deberá:

1. consumir únicamente `TITLE_STUDY` validado;
2. usar estilos Word reales para títulos y cuerpo;
3. generar índice a partir de headings;
4. aplicar valores de tipografía, márgenes, paleta, tablas, header/footer y paginación aquí definidos;
5. omitir secciones condicionales vacías;
6. resolver referencias a documentos y hallazgos sin inventar datos;
7. conservar originales y normalizados según el schema;
8. no realizar una llamada LLM durante render;
9. producir evidencia para V-026/V-027;
10. entregar un DOCX para revisión manual V-028.

Cualquier necesidad futura de cambiar el schema, crear campos de presentación persistentes, añadir reglas jurídicas o incorporar contenido sustantivo requiere un Work Item separado y no puede resolverse dentro del renderer como una inferencia local.

## 24. Fuentes normativas relacionadas

- [Software Requirements Specification](SOFTWARE_REQUIREMENTS_SPECIFICATION.md): FR-046, FR-047, FR-050–FR-053, UIR-007 y NFR-030.
- [Software Architecture](SOFTWARE_ARCHITECTURE.md): CMP-REPORTS y flujo de JSON validado hacia interfaz/DOCX.
- [Technical Specification](TECHNICAL_SPECIFICATION.md): responsabilidad del renderer y regla `JSON VALIDADO → renderer → DOCX`.
- [Verification Specification](VERIFICATION_SPECIFICATION.md): V-026, V-027 y V-028.
- Issue #9: schema ejecutable `TITLE_STUDY` como única fuente normativa de datos.
- Issue #10: contrato de presentación.
- Issue #22: M3 y secuencia M3.1–M3.4.
