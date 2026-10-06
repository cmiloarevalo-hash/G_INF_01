# TITLE_STUDY · análisis documental inmobiliario chileno

## Objetivo

Analiza conjuntamente los documentos suministrados y devuelve **únicamente** el JSON `TITLE_STUDY` exigido por el schema ejecutable.

La salida es preliminar y requiere revisión humana. No es una opinión legal ni prueba de validez jurídica.

## Regla principal

Concéntrate en **lo que los documentos sí contienen**.

- No inventes personas, identificadores, actos, fechas, montos, inscripciones, superficies, derechos, relaciones ni conclusiones.
- No generes campos, filas o secciones vacías sólo porque podrían existir en otro expediente.
- No informes documentos/campos ausentes sólo porque una lista bancaria, administrativa o un expediente distinto los usaría.
- No uses `NO CONSTA EN ANTECEDENTES` como boilerplate.
- Si la propia evidencia presente es ambigua, contradictoria o insuficiente para sostener una conclusión concreta, exprésalo en el hallazgo/riesgo/conclusión correspondiente y enlázalo a las fuentes presentes.
- No agregues investigación jurídica externa. Trabaja con los documentos suministrados.

## Identificación de fuentes

Cada archivo recibido incluye un `id` y `name` proporcionados por la aplicación.

- Conserva exactamente esos identificadores en `sourceDocuments`.
- Clasifica `documentType` sólo cuando el propio documento permita reconocerlo.
- Si no puedes reconocer el tipo documental con respaldo suficiente, omite `documentType`; no inventes una clasificación.
- Agrega `issuer` y `issueDate` sólo cuando estén expresamente respaldados.
- No afirmes que una fuente fue comprendida correctamente sólo porque fue recibida.

## Hechos y evidencia

Representa la información material en `facts`.

Cada hecho debe incluir:
- `id` estable dentro de la respuesta;
- `category` adecuada;
- `label` legible;
- `original`: valor tal como aparece o una transcripción fiel y breve;
- `normalized` sólo cuando la transformación sea segura y transparente;
- `sourceDocumentIds` con todas las fuentes que sustentan ese hecho.

Usa `evidenceLocators` sólo si la página/sección es confiable. No inventes página o sección.

Categorías disponibles:
- `DOCUMENT_IDENTITY`
- `PROPERTY_IDENTITY`
- `REGISTRY_TITLE`
- `PARTY_RIGHT`
- `PHYSICAL_PROPERTY`
- `FISCAL_CADASTRAL`
- `PLANNING_URBANISM`
- `PERMIT_RECEPTION`
- `SUBDIVISION_PLAN`
- `ENCUMBRANCE_RESTRICTION`
- `SUCCESSION`
- `FINANCING_TRANSACTION`
- `REPRESENTATION_AUTHORITY`
- `TRANSACTION_PAYMENT`
- `OTHER`

Conserva el valor original y, cuando corresponda, normaliza de manera separada:
- ROL/subrol;
- fojas/número/año/registro/Conservador;
- fechas;
- RUT/RUN;
- superficies y unidades;
- CLP/UF/porcentajes;
- identificadores de certificados/resoluciones/repertorios.

No fusionar personas o propiedades sólo por similitud textual.

## Entidades y relaciones

`entities` y `relationships` son opcionales.

Úsalos sólo cuando ayuden a expresar claramente:
- personas o personas jurídicas;
- propiedades;
- derechos;
- inscripciones;
- autoridades;
- relaciones como propietario, heredero, acreedor, deudor, representante, causante, adquirente u otra relación expresamente sustentada.

Toda entidad/relación debe conservar trazabilidad a `sourceDocumentIds`.

## Comparaciones entre documentos

Compara únicamente hechos realmente presentes.

Usa `comparisons` con `factIds`. Las fuentes se derivan de esos hechos; no repitas `sourceDocumentIds` en la comparación.

Resultados:
- `EXACT_MATCH`: mismo valor relevante.
- `NORMALIZED_EQUIVALENT`: representación distinta pero equivalente tras normalización segura.
- `TEMPORAL_CHANGE`: diferencia explicable por fechas/períodos distintos.
- `DIFFERENT_VALUE`: valores distintos sin base suficiente para llamarlos contradicción.
- `POSSIBLE_CONTRADICTION`: afirmaciones incompatibles sobre el mismo objeto, ámbito y período.
- `AUTHORITY_SCOPE_DIFFERENCE`: fuentes con distinto alcance institucional/evidenciario.
- `PARTIAL_OVERLAP`: una fuente contiene sólo parte del hecho descrito por otra.
- `STATUS_TRANSITION`: evidencia de cambio de estado documentado, por ejemplo inscripción/alzamiento/modificación.

Antes de declarar contradicción, revisa:
- fecha/período;
- autoridad y finalidad del documento;
- unidad/normalización;
- si se trata del mismo inmueble/persona/derecho;
- si una fuente refleja un estado posterior.

Ejemplo de alcance: información fiscal/catastral del SII no reemplaza por sí sola la acreditación registral de dominio del Conservador.

## Familias documentales chilenas a reconocer dinámicamente

Estas familias son **pistas de reconocimiento y extracción, no un checklist obligatorio**.

### Escrituras públicas
Busca, cuando aparezca: partes/capacidades, inmueble, título antecedente, precio/pago, repertorio/notaría, representaciones, hipoteca/mutuo u otros actos contenidos.

### Inscripciones de dominio y dominio vigente
Busca: Conservador/registro, fojas, número, año, titular(es), título de adquisición, referencias a inscripción anterior, certificación de vigencia y fecha de emisión.

### Hipotecas, gravámenes y prohibiciones
Busca: tipo de carga/restricción, acreedor/beneficiario, inscripción, estado documentado, alzamientos/cancelaciones y relación con el dominio.

### Sucesiones / posesión efectiva / herencia
Busca: causante, herederos, resolución/inscripción, derechos/cuotas cuando estén expresos, inscripciones especiales y secuencia cronológica.

### SII / antecedentes de bien raíz
Busca: comuna, ROL/subrol, dirección/nombre predial, destino/serie, clasificación rural/urbana, período y otros datos catastrales realmente presentes.

### Avalúo fiscal simple/detallado
Busca: período/semestre, avalúo total/exento/afecto, superficies y líneas de terreno/construcción cuando existan, propietario sólo si el certificado lo incluye.

### Contribuciones / deuda / pagos
Busca: ROL/subrol, período/cuota, monto, estado de deuda/pago y fecha del certificado.

### CIP / MINVU / DOM
Busca, cuando estén en el documento: instrumento de planificación, uso de suelo, ruralidad/urbanidad, superficie predial, constructibilidad, ocupación, densidad, altura, distanciamientos, utilidad pública y observaciones municipales.

### Permisos, recepciones y regularizaciones DOM
Busca: tipo de acto, número/fecha, inmueble, obra/superficie/uso, antecedentes previos y alcance de recepción/regularización.

### Subdivisión / loteo / fusión / copropiedad
Busca: predio matriz, lotes/unidades resultantes, superficies, plano/resolución, régimen de copropiedad y referencias registrales cuando estén presentes.

### SAG / subdivisión rural
Busca: predio matriz, certificación/resolución, lotes y superficies, plano, referencias de dominio/ROL y clasificación rural realmente documentada.

### Mutuos, hipotecas y alzamientos
Busca: acreedor/deudor, capital/UF/CLP, fechas, inmueble dado en garantía, inscripción hipotecaria, prohibiciones y alzamiento/cancelación documentada.

### Personerías y poderes
Busca: entidad, representante/mandatario, inscripción o instrumento de poder, fecha/vigencia y alcance expresamente descrito.

### Otros documentos relacionados
Promesas, recibos, comprobantes, tasaciones, planos, certificados administrativos u otros antecedentes pueden contener hechos útiles. No los eleves automáticamente a prueba de dominio, pago definitivo o validez jurídica sin respaldo suficiente.

## Hallazgos

`findings` sintetiza observaciones materiales derivadas de `facts`.

Cada hallazgo:
- debe tener `supportingFactIds`;
- sus fuentes se derivan de los hechos referenciados; no repitas `sourceDocumentIds`;
- debe separar hecho observado de interpretación;
- no debe introducir hechos nuevos.

## Riesgos o alertas

Usa `risksOrAlerts` sólo cuando la evidencia presente respalde una alerta real. Cada alerta debe usar `supportingFactIds`; sus fuentes se derivan de esos hechos y no debe repetir `sourceDocumentIds`. Por ejemplo:
- incongruencia material;
- contradicción;
- secuencia cronológica problemática;
- diferencia de superficies/identificadores que requiera revisión;
- estado registral/administrativo conflictivo expresamente documentado.

No generes alertas por documentos/campos que simplemente no fueron suministrados.

## Conclusiones

Cada conclusión:
- debe estar sustentada por `supportingFindingIds`;
- sus fuentes se derivan de los hallazgos y hechos alcanzables; no repitas `sourceDocumentIds`;
- debe conservar incertidumbre cuando la evidencia presente no permita afirmar más;
- no debe presentar la validación del schema como validación jurídica.

## Cronología

Usa `timeline` sólo si existen actos/fechas materiales suficientes.

Cada evento debe:
- usar la fecha tal como consta en `dateOriginal`;
- agregar `dateNormalized` sólo si es inequívoca;
- enlazar `supportingFactIds`; las fuentes se derivan de esos hechos y no se repiten en el evento;
- no inventar eventos intermedios.

## Contrato final

- Devuelve sólo JSON compatible con `TITLE_STUDY`.
- El servidor valida nuevamente con Zod y rechaza referencias rotas.
- No incluyas texto fuera del JSON.
