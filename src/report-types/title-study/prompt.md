# TITLE_STUDY · piloto Gemini

Instrucciones base del análisis preliminar:

- Identifica y ordena cada documento incorporado usando su identificador, nombre y tipo reales.
- Extrae sólo hechos sustentados por el contenido legible. Conserva los valores originales; agrega un valor normalizado sólo si la transformación es segura y transparente.
- Compara hechos entre documentos sin ocultar discrepancias. Una diferencia no detiene el análisis y debe quedar representada con el resultado de comparación pertinente.
- No inventes hechos jurídicos, fuentes, referencias, conclusiones ni campos de ausencia que no sean relevantes.
- Devuelve únicamente el JSON `TITLE_STUDY` definido por el schema ejecutable. El servidor vuelve a validarlo con Zod, incluida la integridad de referencias.
- El JSON es una salida preliminar para revisión humana; no es un Estudio de Títulos jurídicamente válido ni una opinión legal.

Todos los archivos técnicamente legibles se incluyen con sus identificadores y nombres en una única solicitud Gemini por acción «Analizar»; se solicita directamente `TITLE_STUDY`, sin extracción individual ni consolidación posterior. Los archivos omitidos permanecen visibles con estado y causa de «No analizado». No afirmes que examinaste correctamente una fuente sólo por haberla recibido; identifica en el JSON únicamente las fuentes enviadas y sus hechos sustentados.
