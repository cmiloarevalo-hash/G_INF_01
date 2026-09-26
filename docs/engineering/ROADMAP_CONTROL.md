# Metas de seguimiento y ponderación administrativa — G_INF_01

**Estado:** acuerdo humano para llevar un control sencillo. Complementa el [Development Plan](DEVELOPMENT_PLAN.md) y su [propuesta V2](DEVELOPMENT_PLAN_PROPOSAL.md); no modifica requisitos, arquitectura, workflow ni autoriza por sí mismo nuevas implementaciones. **Corte de referencia:** `main` `24d44b14d5d690aede60759a0f7603a473209b79`; [Issue #12](https://github.com/cmiloarevalo-hash/G_INF_01/issues/12) / [PR #13](https://github.com/cmiloarevalo-hash/G_INF_01/pull/13) abiertos en HEAD `c04257c711bbd0bfb5b4bdfa9fe09c7d93297d02` y en HOLD a la fecha de esta nota. Confirmar el estado vivo antes de actualizar.

## Regla del porcentaje

Las cinco metas reciben **20 puntos porcentuales cada una (5 × 20 = 100)**. Es una **ponderación uniforme convencional del trabajo restante**, útil para visualizar controles; no expresa iguales HH, costos, duración, importancia técnica ni avance observado. La baseline ya integrada (servidor, UI inicial, selección PDF y contrato `TITLE_STUDY`) queda fuera de este 100% y no se cuenta dos veces.

Sólo se suman al «porcentaje de metas cumplidas» los 20 puntos de una meta con su condición de término **verificada y registrada en GitHub** (Issue/PR/SHA y, cuando corresponda, prueba humana). Antes de ello se marca `EN CURSO`, `PENDIENTE` o `PAUSADA`, sin inventar un porcentaje parcial de ejecución. Si más adelante se desea medir avance parcial por actividad u horas, habrá que definir ese método y registrar evidencia en otro Work Item.

| Meta | Resultado comprobable para cerrar la meta | Estado al registrar | Peso |
|---|---|---|---:|
| **M1 · Análisis invitado de una llamada** | Completar revisión del [Issue #12 / PR #13](https://github.com/cmiloarevalo-hash/G_INF_01/pull/13) sobre su SHA vigente; prueba real con documentos propios y revisión humana del JSON y estados; integrar sólo tras satisfacer el workflow. | **EN CURSO / HOLD**: código y tests propuestos en PR, prueba real del nuevo flujo pendiente. | 20% |
| **M2 · Publicación comprobada del piloto** | En Work Item posterior: comprobar acceso, ejecución de la versión identificada, secretos y rutas, y registrar evidencia de publicación conforme a V-036. Previsualización no equivale a publicación. | **PAUSADA**: AI Studio se retomará por decisión humana. | 20% |
| **M3 · Resultado e informe para invitado** | Presentación web legible y DOCX generado desde `TITLE_STUDY` validado, con pruebas del contenido y revisión humana. No atribuir al LLM la generación de Word. | **PAUSADA parcialmente**: DOCX/Issue #10 queda pendiente por decisión humana; la presentación rica tampoco está integrada. | 20% |
| **M4 · Trabajo persistente y capacidades completas** | Identidad Google, autorización, proyectos en Firestore, documentos/JSON/DOCX en Drive y vistas de recuperación; implementar también la configuración y demás proveedores previstos mediante Work Items independientes. | **PENDIENTE**. Su orden interno se propone después, según contratos y prioridad. | 20% |
| **M5 · Integración del producto completo** | Verificar de extremo a extremo permisos, persistencia, análisis, informes, recuperación y errores entre componentes; registrar resultados por SHA y entorno. | **PENDIENTE**: requiere las capacidades relevantes de M3 y M4. | 20% |

**Registro inicial:** 0 de estas 5 metas tienen todas sus condiciones comprobadas; **0/100 puntos de metas cerradas**, lo cual **no significa 0% de trabajo técnico realizado**. M1 tiene trabajo real en un PR abierto. Actualizar este registro cuando se cierre una meta; no inferir cumplimiento de un build, mock, previsualización o PR sin merge.

**Secuencia de coordinación propuesta:** verificar M1 cuando el Humano retome pruebas; planear M2 por separado cuando se retome AI Studio; M3 y M4 pueden descomponerse en Work Items posteriores, y M5 integra lo realizado. Las dependencias técnicas salen de [Software Architecture](SOFTWARE_ARCHITECTURE.md) y la propuesta V2; el único orden canónico general es definir la interfaz antes de completar el motor ([Development Plan §3](DEVELOPMENT_PLAN.md)). Esta tabla no es un cálculo de ruta crítica ni fija fechas.
