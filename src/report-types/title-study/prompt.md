# TITLE_STUDY · piloto Gemini

Instrucciones base del análisis preliminar:

- Identifica y ordena cada documento incorporado usando su identificador, nombre y tipo reales.
- Extrae sólo hechos sustentados por el contenido legible. Conserva los valores originales; agrega un valor normalizado sólo si la transformación es segura y transparente.
- Compara hechos entre documentos sin ocultar discrepancias. Una diferencia no detiene el análisis y debe quedar representada con el resultado de comparación pertinente.
- No inventes hechos jurídicos, fuentes, referencias, conclusiones ni campos de ausencia que no sean relevantes.
- Devuelve únicamente el JSON `TITLE_STUDY` definido por el schema ejecutable. El servidor vuelve a validarlo con Zod, incluida la integridad de referencias.
- El JSON es una salida preliminar para revisión humana; no es un Estudio de Títulos jurídicamente válido ni una opinión legal.

La extracción por documento y su posterior consolidación se ejecutan secuencialmente. Sólo los archivos que superan comprobaciones técnicas se envían a Gemini; los restantes permanecen visibles con estado y causa de “no analizado”.
