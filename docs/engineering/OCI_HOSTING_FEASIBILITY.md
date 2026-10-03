# OCI Hosting Feasibility — G_INF_01

**Work Item:** Issue #101 — RESEARCH_GATE: viabilidad de hosting OCI con mínima migración desde Google
**Repository:** cmiloarevalo-hash/G_INF_01
**Baseline revisada:** main@3138299c54e590a38b1a3fd51263abcff32afe53
**Fecha de consulta de fuentes externas:** 2026-10-03
**Tipo de entrega:** investigación y documentación; no implementa ni autoriza migración, infraestructura, cambios de Google, DNS, secretos, billing ni workflows.

## Convenciones de evidencia

Este informe separa deliberadamente hechos y recomendaciones:

- **REPOSITORY FACT:** evidencia observada en el código, lockfile o documentación actual del repositorio en la baseline indicada.
- **ORACLE OFFICIAL FACT:** hecho respaldado por documentación o páginas oficiales de Oracle vigentes consultadas el 2026-10-03.
- **GOOGLE OFFICIAL FACT:** hecho respaldado por documentación oficial de Google/Firebase vigente consultada el 2026-10-03.
- **IMPLEMENTER ANALYSIS:** inferencia técnica derivada de los hechos anteriores.
- **IMPLEMENTER RECOMMENDATION:** propuesta de decisión; no se presenta como hecho de proveedor.
- **POC_REQUIRED:** cuestión que no puede demostrarse sólo documentalmente y requiere prueba real en una cuenta/entorno autorizado.

La documentación canónica existente aún describe Google AI Studio / Cloud Run como target de publicación. Este informe no la modifica. Para este Research Gate, el código real y el estado GitHub actual prevalecen sobre supuestos históricos de hosting.

# 1. Executive Summary

**REPOSITORY FACT.** G_INF_01 no contiene una dependencia de runtime que obligue a ejecutar el proceso Node/Express en Google Cloud. El servidor compila a JavaScript, escucha en PORT sobre 0.0.0.0, expone /api/health, llama a Gemini mediante HTTPS y sirve el frontend Vite compilado desde dist/client. Firebase Authentication y Firestore se ejecutan desde el navegador con el Firebase Web SDK; Google Drive, Google Identity Services y Google Picker también se integran desde el navegador mediante APIs web y tokens OAuth. La generación DOCX se ejecuta en Node mediante el paquete docx.

**IMPLEMENTER ANALYSIS.** La arquitectura híbrida investigada es técnicamente viable:

Internet → dominio público HTTPS → OCI Compute → Caddy → Node.js/Express → frontend React/Vite
y, desde aplicación/navegador según corresponda → Firebase Authentication + Firestore + Google Drive/Picker + Gemini.

La migración mínima es por tanto una sustitución del hosting/runtime público, no una eliminación de Google. No existe evidencia técnica que justifique reemplazar en la primera etapa Firebase Auth, Firestore, Drive, Picker o Gemini.

El principal requisito externo que impide usar una IP pública como URL definitiva es Google OAuth para aplicaciones JavaScript: los orígenes autorizados deben usar HTTPS salvo localhost y el host no puede ser una IP cruda. En consecuencia, el flujo autenticado actual de Drive/Picker requiere un nombre de dominio público real y TLS. El modo invitado podría responder técnicamente por HTTP sobre una IP, pero eso no satisface el flujo autenticado ni es una topología de producción aceptable.

**IMPLEMENTER RECOMMENDATION — RECOMMENDED FOR POC.** VM.Standard.A1.Flex con 1 OCPU y 6 GB RAM, Ubuntu ARM64, Node.js 24, systemd y Caddy, manteniendo todos los servicios Google actuales. La asignación 1 OCPU/6 GB queda dentro incluso del límite conservador de documentación OCI de 2 OCPU/12 GB para Always Free y deja margen suficiente para validar npm ci, npm run build, tests y el runtime real.

**IMPLEMENTER RECOMMENDATION — RECOMMENDED FOR PRODUCTION.** Si el POC valida la aplicación, usar una tenancy Pay As You Go y una VM pequeña pagada x86, por ejemplo VM.Standard.E4.Flex 1 OCPU/4 GB, con systemd + Caddy y deploy por artefacto versionado desde GitHub Actions. Esta recomendación evita fundamentar disponibilidad de producción en capacidad Always Free, reclamación por inactividad, ausencia de SLA y compatibilidad ARM64 aún no probada. Si una A1 pagada o Always Free demuestra suficiente disponibilidad y ARM64 queda validado, puede reconsiderarse como optimización posterior.

**ARM64 COMPATIBILITY: RISK_FOUND.** package-lock.json contiene artefactos Linux ARM64 para esbuild y Rollup, y las dependencias principales son mayoritariamente JavaScript. Sin embargo, Rollup incluye además una dependencia opcional @napi-rs/lzma-linux-x64-gnu sin equivalente ARM64 visible en el lockfile. No hay evidencia de que sea obligatoria para este build, pero impide declarar compatibilidad completa sin ejecutar npm ci + npm run build en A1.

**COST CONCLUSION.** Oracle documenta Compute, block volume y transferencia Always Free, pero sus propias fuentes oficiales consultadas son inconsistentes respecto del máximo A1: la documentación OCI y la documentación de fin de trial indican 1.500 OCPU-hours + 9.000 GB-hours, equivalente a 2 OCPU/12 GB; páginas actuales de pricing muestran 3.000/18.000. Este informe adopta 2 OCPU/12 GB como baseline conservadora y marca la cuota efectiva de la cuenta como POC_REQUIRED. No se afirma “gratis para siempre”. Google conserva cuotas/costos propios independientes de dónde se aloje Express.

# 2. Current Architecture

## 2.1 Runtime y presentación

**REPOSITORY FACT.**

- package.json define Node/TypeScript, React 19, Vite 7.3, Express 5, Firebase 12, Zod 4 y docx 9.
- npm run build compila servidor TypeScript, comprueba tipos del frontend, ejecuta vite build y copia prompt.md al árbol dist.
- npm start ejecuta node dist/server.js.
- server.ts usa Vite como middleware sólo en desarrollo.
- En producción Express sirve dist/client como contenido estático y aplica fallback SPA.
- El proceso lee PORT con fallback 3000 y escucha en 0.0.0.0.
- GET /api/health responde estado del proceso HTTP, uptime y timestamp; no consulta servicios externos.
- POST /api/guest/report-docx genera DOCX en Node.
- POST /api/guest/analyze acepta actualmente sólo provider gemini y model gemini-3.6-flash.

**IMPLEMENTER ANALYSIS.** Todo este runtime puede ejecutarse en una VM Linux genérica. Cloud Run no aparece como SDK, binding propietario o servicio necesario dentro del proceso.

## 2.2 Identidad y Firestore

**REPOSITORY FACT.**

- src/services/auth/firebase.ts usa Firebase Web SDK, GoogleAuthProvider y signInWithPopup.
- La configuración Firebase contiene apiKey, authDomain, projectId, appId y un databaseId opcional.
- Cuando el build no contiene la configuración, el navegador puede obtenerla de GET /api/firebase-config.
- Firestore usa el Firebase Web SDK directamente desde el cliente.
- getConfiguredFirestore admite la base default o un databaseId nombrado.
- Los proyectos, documentos, análisis, reportes y preferencias AI persisten como metadata Firestore bajo rutas por usuario.
- firestore.rules condiciona el acceso a request.auth y al uid del propietario.

**IMPLEMENTER ANALYSIS.** Firestore no está conectado a Express mediante Admin SDK. Cambiar Cloud Run por OCI no altera la interfaz Firestore del código actual.

## 2.3 Drive, Picker y Google Identity Services

**REPOSITORY FACT.**

- El navegador carga https://accounts.google.com/gsi/client y https://apis.google.com/js/api.js.
- Usa google.accounts.oauth2.initTokenClient para solicitar tokens.
- El scope real es exactamente https://www.googleapis.com/auth/drive.file.
- Google Picker recibe developer key, app ID y access token.
- Las operaciones Drive usan directamente endpoints https://www.googleapis.com/drive/v3/... y https://www.googleapis.com/upload/drive/v3/....
- El token Drive permanece en memoria del flujo de autorización; el código modela reautorización ante 401.
- Las referencias persistidas en Firestore son IDs/metadatos de Drive; los binarios no se mueven a Firestore.

**IMPLEMENTER ANALYSIS.** El nuevo hosting afecta el origen web registrado en Google, no el protocolo de acceso a Drive.

## 2.4 IA

**REPOSITORY FACT.**

- src/services/ai/gemini.ts llama por fetch a https://generativelanguage.googleapis.com/v1beta/interactions.
- La credencial viaja en x-goog-api-key desde el backend hacia Google.
- El servidor soporta clave temporal del usuario o alias del propietario respaldados por variables de entorno.
- La implementación actual sólo soporta Gemini/gemini-3.6-flash.
- No se encontraron adaptadores runtime para OpenAI, Anthropic u OpenRouter en la baseline, aunque documentación histórica/técnica los nombre como proveedores contemplados.

**IMPLEMENTER ANALYSIS.** Gemini es un servicio externo HTTPS y no depende de que Node viva en Google. Los otros proveedores no deben considerarse una dependencia de migración porque todavía no son implementación real.

# 3. Current Google Dependency Map

| Componente | Dependencia funcional | Dependencia de hosting | Dependencia de configuración | Dependencia de billing/cuota | ¿Puede mantenerse con servidor en OCI? |
|---|---|---|---|---|---|
| AI Studio hosting / Publish | Publicación del runtime actual | Sí | Sí | Sí, según modalidad actual | No como hosting primario después del corte |
| Cloud Run | Ejecución/publicación actual | Sí | PORT/servicio | Sí | No es necesario para el candidato OCI |
| Firebase Authentication | Google Sign-In y sesión | No | Firebase web config + Authorized Domains | Sí, según plan/MAU | Sí |
| Google Sign-In | Proveedor de identidad | No | Dominio autorizado | Cuota/plan de Auth | Sí |
| Firestore | Metadata, proyectos, historial y preferencias | No | Firebase config, databaseId, Security Rules | Lecturas/escrituras/storage/egress | Sí |
| Drive API | Archivos y artefactos persistentes | No | API habilitada, OAuth, scope drive.file | Quota units + almacenamiento del usuario | Sí |
| Google Picker | Selección de archivos Drive | No | API key, App ID, OAuth client, origen | Dependiente de APIs subyacentes | Sí |
| Google Identity Services | Token Drive en navegador | No | OAuth Client ID + origen HTTPS | Asociada al proyecto OAuth | Sí |
| Gemini API | Análisis | No | API key/alias/modelo | Tokens/cuota | Sí |
| React/Vite | UI | No | Build | No Google-specific | Sí |
| Express/Node | Backend/serving | No | PORT, NODE_ENV | Compute del host | Sí |
| DOCX | Render de informes | No | Ninguna Google específica | Recursos del host | Sí |

## Tabla obligatoria: servicios Google a mantener

| Servicio actual | ¿Mantener? | ¿Funciona desde OCI? | Cambio requerido | Costo/cuota residual | Riesgo |
|---|---|---|---|---|---|
| Firebase Auth | Sí | Sí | Autorizar dominio público nuevo; conservar config y validar popup | Authentication conserva su propio plan/cuota; Identity Platform tiene umbrales MAU si está habilitado | Configuración de dominio/popup y plan real de la cuenta |
| Firestore | Sí | Sí | Ningún cambio de código previsto; conservar reglas, projectId y databaseId | Free quota actual para una DB: 1 GiB, 50k reads/día, 20k writes/día, 20k deletes/día, 10 GiB egress/mes; exceso factura según plan | Egress desde clientes fuera de Google y uso sobre cuota |
| Drive API | Sí | Sí | Añadir nuevo origen OAuth y mantener API habilitada/scope drive.file | Modelo de cuotas Drive; bajo umbral diario documentado no hay cargo extra; storage pertenece al usuario | Cuenta/proyecto puede estar en régimen de cuota distinto; revocación |
| Picker | Sí | Sí | Añadir origen a API key/OAuth; permitir https://docs.google.com/* en website restrictions cuando corresponda | No se afirma SKU independiente; consume configuración/cuotas de APIs asociadas | API key restrictions, App ID/client ID deben coincidir |
| Gemini | Sí | Sí | Mover secretos/variables al runtime OCI; salida HTTPS | Free tier si aplica; paid gemini-3.6-flash al 2026-10-03: USD 0.75/M input y USD 3.75/M output hasta 2026-12-31 | Cuota, rate limits, cambio de precio 2027, claves |
| AI Studio hosting | No como destino final | No aplica | Mantener durante POC; retirar sólo tras aceptación | Costo actual/account-specific; no estimado sin billing real | Corte prematuro rompería rollback |
| Cloud Run | No como destino final | No aplica | Mantener durante POC; retirar sólo tras aceptación | Billing actual/account-specific; no estimado sin billing real | Igual que anterior |

# 4. Oracle Cloud Official Policy Facts

Todos los puntos de esta sección son **ORACLE OFFICIAL FACT**, salvo cuando se marque explícitamente análisis.

## 4.1 Always Free, Free Trial y Pay As You Go

- Oracle mantiene documentación vigente de **Always Free Resources**.
- Free Trial entrega USD 300 de créditos por hasta 30 días.
- Always Free y Free Trial no son lo mismo: el trial habilita servicios elegibles con crédito temporal; Always Free son recursos sujetos a límites específicos.
- La documentación de Free Tier indica que, al finalizar el trial estándar, la cuenta permanece activa y los recursos Always Free dentro de límites continúan disponibles.
- Pay As You Go no exige compromiso mínimo y puede seguir usando recursos Always Free; sólo el uso sobre límites o servicios pagados debe facturarse.
- La documentación indica que la mayoría de usuarios necesita teléfono y tarjeta; Oracle usa la tarjeta para verificación/autorización y declara que no la carga salvo upgrade. La FAQ también describe retenciones temporales de autorización.
- El home region debe elegirse con cuidado: Compute Always Free y Block Volume Always Free deben residir en el home region.
- Always Free no tiene SLA. Los usuarios que sólo consumen Always Free no son elegibles para Oracle Support; existe soporte limitado durante créditos de trial.

## 4.2 Compute Always Free

### VM.Standard.E2.1.Micro

- Hasta dos instancias Always Free.
- AMD/x86.
- 1/8 OCPU con posibilidad de usar recursos CPU adicionales.
- 1 GB RAM.
- Incluye un VNIC con una IP pública y hasta 50 Mbps de ancho de banda de Internet.
- Ubuntu figura entre las imágenes Always Free elegibles.

### VM.Standard.A1.Flex

La documentación OCI de Always Free consultada indica:

- arquitectura Arm;
- primeras 1.500 OCPU-hours y 9.000 GB-hours por mes;
- para tenancies Always Free, equivalente a 2 OCPU y 12 GB RAM totales;
- asignación flexible de CPU/RAM;
- Ubuntu y Oracle Linux entre las imágenes elegibles.

### Inconsistencia oficial detectada

**ORACLE OFFICIAL FACT.** Páginas oficiales actuales de pricing/cost estimator de Oracle indican para A1 las primeras 3.000 OCPU-hours y 18.000 GB-hours por mes sin costo. Esto contradice la documentación OCI de Always Free y la documentación de fin del trial, que siguen indicando 2 OCPU/12 GB para una tenancy Always Free.

**IMPLEMENTER ANALYSIS.** No es responsable convertir la cifra mayor en garantía. El diseño debe caber en 2 OCPU/12 GB y la consola de la cuenta debe confirmar los límites efectivos antes de crear recursos.

**POC_REQUIRED.** Verificar en Limits, Quotas and Usage y en el flujo de creación de A1 cuál es la cuota Always Free efectiva de la tenancy seleccionada.

## 4.3 Storage, backups, transferencia y Load Balancer

- Always Free Block Volume: 200 GB combinados entre boot y block volumes en home region.
- Cinco backups de volumen combinados.
- La documentación describe un boot volume por defecto de 50 GB.
- Object Storage: la página Always Free documenta 20 GB combinados para cuentas sólo Always Free y 50.000 requests API/mes; durante trial/paid la distribución de tiers descrita es distinta.
- Outbound data transfer: 10 TB/mes dentro de Always Free.
- Flexible Load Balancer: una unidad Always Free de 10 Mbps para las tenancies indicadas por la documentación.
- Network Load Balancer: también aparece como recurso Always Free.
- El candidato mínimo no necesita Load Balancer.

## 4.4 Capacidad regional

- Always Free Compute sólo puede crearse en home region.
- Oracle documenta el error “out of host capacity” como falta temporal de capacidad de una shape y recomienda probar otro availability domain, esperar o usar un tipo de cuenta/recurso pagado.
- Free Tier está sujeto a límites de capacidad.

**IMPLEMENTER ANALYSIS.** La disponibilidad de A1/E2 no puede demostrarse documentalmente para una cuenta futura ni reservarse mediante este work item.

**POC_REQUIRED.** Confirmar que la región elegida ofrece A1 y/o E2 cuando se autorice el POC.

## 4.5 Reclamación de instancias idle

### HECHO ORACLE

Oracle documenta que instancias Compute Always Free ociosas pueden ser reclamadas. Una instancia se considera idle si, durante un período de 7 días, se cumplen todos los criterios aplicables:

- CPU p95 menor que 20%;
- utilización de red menor que 20%;
- utilización de memoria menor que 20% para A1.

Oracle también declara en su FAQ que cuentas inactivas por 30 días o más pueden considerarse abandonadas y quedar sujetas a suspensión/cancelación. Este criterio de cuenta no debe confundirse con el criterio técnico de 7 días de una instancia.

La documentación de terminación manual explica opciones de preservación de boot volume, pero la sección de reclamación por inactividad no garantiza explícitamente qué volumen preservará una reclamación automática.

### INFERENCIA PARA G_INF_01

Una aplicación pequeña y de poco tráfico puede quedar por debajo de CPU y red 20% durante una semana. En una A1 de 6 GB, el runtime también puede permanecer bajo 20% de memoria durante largos períodos. Por tanto, **existe un riesgo material de reclamación Always Free**, pero no puede predecirse sin métricas reales de OCI.

No se recomienda generar carga artificial para evadir la política. La mitigación correcta es que la VM sea reproducible, los datos de negocio permanezcan fuera de ella, exista backup de configuración/volumen y producción pueda pasar a compute pagado si la disponibilidad lo exige.

## 4.6 Política de inactividad de cuenta: discrepancia a registrar

La FAQ oficial consultada indica que cuentas inactivas durante 30 días o más pueden considerarse abandonadas. Otra documentación oficial de promociones/Free Tier ha usado criterios de actividad distintos. Por tanto, no se utiliza un número único como garantía operacional. El propietario debe tratar la continuidad de una cuenta gratuita como una condición externa y revisar avisos de cuenta.

# 5. Repository Compatibility Matrix

| Componente actual | Clasificación | Explicación |
|---|---|---|
| React | SIN CAMBIO | JavaScript de navegador; no conoce Cloud Run |
| Vite | SIN CAMBIO | Produce frontend estático; output actual dist/client |
| Express | SIN CAMBIO | Servidor HTTP genérico |
| Node.js | SOLO CONFIGURACIÓN | Instalar Node 24 compatible con arquitectura de VM, NODE_ENV/PORT/systemd |
| Frontend servido por Express | SIN CAMBIO | Ya existe en producción |
| generación DOCX | SIN CAMBIO | docx + Packer ejecutan en Node; sin dependencia Google |
| /api/health | SIN CAMBIO | Sólo salud del proceso; útil para deploy/monitoring |
| Gemini actual | SOLO CONFIGURACIÓN | HTTPS + API key; secretos deben existir en OCI |
| OpenAI/Anthropic/OpenRouter | NO RECOMENDADO / BLOQUEADO | No son runtime implementado actual; no son requisito de migración |
| Firebase Authentication | SOLO CONFIGURACIÓN | Añadir dominio autorizado y verificar popup real |
| Firestore Web SDK | SIN CAMBIO | Cliente conecta directamente con Auth + Rules |
| Firestore databaseId | SIN CAMBIO | Ya soportado de forma opcional |
| Drive API | SOLO CONFIGURACIÓN | Nuevo origen OAuth/API key; endpoints permanecen |
| Google Picker | SOLO CONFIGURACIÓN | Nuevo origen + restricciones de key; app ID/client ID existentes |
| Google Identity Services | SOLO CONFIGURACIÓN | authorized JavaScript origin HTTPS |
| OAuth scopes | SIN CAMBIO | Mantener drive.file; no ampliar por migración |
| Proyectos | SIN CAMBIO | Metadata Firestore + Drive IDs |
| Historial análisis/reportes | SIN CAMBIO | Metadata Firestore y artefactos Drive |
| Preferencias AI | SIN CAMBIO | Firestore; claves siguen fuera de persistencia |
| Variables de entorno | SOLO CONFIGURACIÓN | Cambia mecanismo de inyección/archivo de entorno |
| Secrets | SOLO CONFIGURACIÓN | Cambia ubicación operativa; no nombres/semántica necesariamente |
| Runtime Cloud Run → OCI Compute | CAMBIO ARQUITECTÓNICO | Sustitución del plano de hosting |
| TLS/reverse proxy | CAMBIO ARQUITECTÓNICO | Nueva responsabilidad operativa en OCI |
| Docker | NO RECOMENDADO / BLOQUEADO | No es necesario para mínima migración y está fuera de este work item |
| OCI Load Balancer | NO RECOMENDADO / BLOQUEADO | No aporta valor al POC single-VM; aumenta componentes |

# 6. E2 Micro vs A1 Flex

## 6.1 VM.Standard.E2.1.Micro

**ORACLE OFFICIAL FACT.** Shape AMD, 1/8 OCPU, 1 GB RAM, hasta dos instancias Always Free.

**REPOSITORY FACT.** El build ejecuta dos compilaciones TypeScript, Vite/Rollup, Node y además npm ci instala un árbol significativo con Firebase. El endpoint de análisis acepta JSON de hasta 70 MB en Express y decodifica archivos Base64, por lo que un request grande puede elevar memoria transitoria por encima del tamaño original.

**IMPLEMENTER ANALYSIS.**

- 1 GB puede bastar para el runtime ocioso y casos pequeños, pero es un margen estrecho para npm ci + npm run build y para requests documentales grandes.
- Swap puede evitar algunos OOM durante instalación/build, pero añade I/O y no compensa la CPU muy pequeña.
- Construir fuera de la VM y desplegar un artefacto reduce riesgo.
- E2 evita incertidumbre ARM64, pero su CPU/RAM hacen menos atractiva la prueba representativa del producto.

**IMPLEMENTER RECOMMENDATION.** No usar E2.1.Micro como primera opción para POC integral. Mantenerla como fallback de runtime pequeño si A1 no tiene capacidad, preferentemente con build fuera de la VM y límites operacionales validados.

## 6.2 VM.Standard.A1.Flex

**ORACLE OFFICIAL FACT.** Arm/Ampere flexible. Para diseño conservador se usan 2 OCPU/12 GB como techo documentado por la página OCI de Always Free.

**REPOSITORY FACT — lockfile ARM64.**

- package-lock.json lockfileVersion 3.
- esbuild 0.28.2 incluye @esbuild/linux-arm64.
- Rollup 4.63.5 incluye @rollup/rollup-linux-arm64-gnu y @rollup/rollup-linux-arm64-musl.
- fsevents es optional y Darwin-only.
- No se identificaron dependencias top-level del producto que exijan node-gyp.
- Rollup declara una dependencia opcional @napi-rs/lzma-linux-x64-gnu y no aparece un sibling ARM64 equivalente en el lockfile inspeccionado.
- Dependencias principales: express, firebase, react, react-dom, zod y docx.

**EXTERNAL FACT.** Node.js publica binarios Linux ARM64 para la línea Node 24.

**IMPLEMENTER ANALYSIS.**

- React, Express, Zod, docx y Firebase SDK no presentan en este lockfile una barrera evidente de arquitectura.
- Vite depende de esbuild/Rollup, y ambos tienen artefactos ARM64 presentes en el lockfile.
- La dependencia opcional LZMA x64 no demuestra incompatibilidad porque es optional; tampoco permite declarar éxito sin ejecución real.
- 6 GB RAM entrega margen considerable frente a E2 para instalación, compilación y análisis.
- El runtime no necesita recompilar código nativo propio observado.

**POC_REQUIRED.** En una A1 real ejecutar, desde el SHA exacto: npm ci; npm run build; npm test; npm run test:firestore-rules si el entorno incluye Java; npm start; GET /api/health; prueba DOCX y análisis con tamaños representativos.

### Recomendación diferenciada

**RECOMMENDED_FOR_POC:** A1.Flex 1 OCPU / 6 GB RAM.
**RECOMMENDED_FOR_PRODUCTION:** x86 VM pagada pequeña después del POC; considerar A1 sólo después de build/runtime ARM64 real y aceptación explícita del riesgo de capacidad/reclamación si se pretende Always Free.

# 7. Google Services from OCI

## 7.1 Firebase Authentication

**GOOGLE OFFICIAL FACT.** Firebase permite Google Sign-In web. La documentación de redirect recomienda signInWithPopup como alternativa a signInWithRedirect en navegadores con restricciones de third-party storage.

**REPOSITORY FACT.** G_INF_01 ya usa signInWithPopup, no signInWithRedirect.

**IMPLEMENTER ANALYSIS.** No se necesita adoptar una arquitectura de proxy de authDomain sólo por mover hosting. Debe añadirse el nuevo dominio a Firebase Authentication Authorized Domains y probar popup en navegadores objetivo. authDomain puede conservar el valor Firebase existente inicialmente.

**POC_REQUIRED.** Google Sign-In real en dominio OCI, desktop y móvil, incluyendo popups bloqueados/error recuperable.

## 7.2 Google OAuth / Identity Services

**GOOGLE OFFICIAL FACT.**

- Las apps JavaScript autorizadas deben registrar authorized JavaScript origins.
- Salvo localhost, el origen debe usar HTTPS.
- El host no puede ser una IP cruda.
- Los redirect URIs son relevantes cuando el flujo realmente usa redirect.

**REPOSITORY FACT.** Drive usa GIS initTokenClient con callback y requestAccessToken; no se observó redirect URI para este flujo.

**IMPLEMENTER ANALYSIS.** El cambio requerido es registrar https://dominio-nuevo como authorized JavaScript origin. No añadir redirect URIs que el código no use.

## 7.3 Drive API

**GOOGLE OFFICIAL FACT.** El scope drive.file es recomendado para acceso por archivo y funciona con Picker. Las APIs Drive tienen límites/cuotas y desde 2026 Google documenta un umbral diario de 400.000.000 quota units por proyecto antes de cargos para el régimen nuevo, con detalles de billing sujetos a rollout.

**REPOSITORY FACT.** El producto solicita exactamente drive.file.

**IMPLEMENTER ANALYSIS.** Mantener el scope evita ampliar privilegios durante la migración. El origen nuevo debe quedar autorizado para GIS/OAuth. No hay razón para mover binarios a OCI Object Storage en POC.

**POC_REQUIRED.** Confirmar el régimen de cuotas/billing del proyecto Google existente y probar upload, read y referencias stale.

## 7.4 Google Picker

**GOOGLE OFFICIAL FACT.**

- Deben estar habilitadas Picker API y Drive API.
- El OAuth client de tipo Web debe tener authorized JavaScript origins.
- App ID usa el project number y debe corresponder al mismo proyecto que el client ID.
- Google recomienda restringir la API key a websites; la allowlist debe incluir el origen de la app y https://docs.google.com/* porque Picker se renderiza en iframe de docs.google.com.
- La key puede restringirse a Picker API y Drive API.

**IMPLEMENTER ANALYSIS.** El nuevo dominio no requiere código distinto si se actualizan las restricciones de la credencial existente.

## 7.5 Firestore

**GOOGLE OFFICIAL FACT.** Los SDKs web/mobile de Firebase, combinados con Firebase Auth y Security Rules, soportan arquitecturas en que el cliente se conecta directamente a la base sin servidor intermedio.

**REPOSITORY FACT.** Eso es exactamente lo que hace G_INF_01.

**IMPLEMENTER ANALYSIS.** El servidor OCI no entra en el datapath Firestore actual. Las reglas y tokens Firebase continúan siendo la frontera de autorización. No se observó una restricción de origen Firestore equivalente a OAuth origins que obligue a alojar en Google.

## 7.6 Gemini

**GOOGLE OFFICIAL FACT.** Gemini API se invoca por HTTPS y autentica requests con x-goog-api-key.

**REPOSITORY FACT.** El backend actual ya usa fetch HTTPS a generativelanguage.googleapis.com con x-goog-api-key.

**IMPLEMENTER ANALYSIS.** La llamada es portable a OCI siempre que exista egress HTTPS/DNS y la variable/clave llegue al proceso. AI Studio puede seguir siendo el lugar donde se crea/administra una API key sin ser el hosting del producto.

# 8. Domain / HTTPS Requirements

## 8.1 ¿Puede funcionar en http://IP_PUBLICA?

**IMPLEMENTER ANALYSIS.** El proceso Express y el modo invitado podrían responder por HTTP a nivel de aplicación, pero el producto autenticado no queda funcional: Google exige HTTPS para JavaScript origins salvo localhost y prohíbe IP cruda como host.

**Conclusión:** NO es un endpoint válido para el flujo Google autenticado actual.

## 8.2 ¿Puede funcionar en https://IP_PUBLICA?

TLS sobre una IP no resuelve la restricción OAuth: Google prohíbe el host raw IP para el origen JavaScript, salvo localhost.

**Conclusión:** NO es un origen OAuth web válido para Drive/Picker/GIS.

## 8.3 Dominio necesario

Se requiere un dominio o subdominio público controlado, por ejemplo app.ejemplo.cl, con:

1. DNS A/AAAA apuntando a la IP pública de OCI;
2. puertos 80/443 alcanzables según la estrategia ACME;
3. HTTPS válido;
4. Firebase Authorized Domains actualizado;
5. OAuth authorized JavaScript origin actualizado;
6. restricciones de API key de Picker actualizadas.

**ORACLE OFFICIAL FACT.** La documentación DNS del VCN trata nombres internos que resuelven direcciones privadas; no constituye un dominio público de aplicación apto para el requisito OAuth. No se encontró en la documentación revisada un hostname público gratuito de una Compute VM que sustituya a un dominio controlado por el propietario.

**IMPLEMENTER ANALYSIS.** Si ya existe un dominio, un subdominio tiene costo incremental de registro $0. Si no existe, debe comprarse uno y el costo depende del registrar/TLD; no se inventa una cifra.

## 8.4 Caddy vs Nginx + Certbot

**EXTERNAL OFFICIAL FACT.** Caddy documenta Automatic HTTPS: con dominio público, DNS correcto y puertos accesibles puede obtener/renovar certificados y redirigir HTTP a HTTPS automáticamente.

| Opción | TLS | Renovación | Configuración | Riesgo operacional |
|---|---|---|---|---|
| Caddy | Integrada | Automática | Baja: reverse_proxy + dominio | Menos piezas para single VM |
| Nginx + Certbot | Separada | Certbot/timer | Mayor: Nginx + ACME + renovación | Más componentes, muy conocido |

**IMPLEMENTER RECOMMENDATION.** Caddy para POC y primera producción single-VM. Nginx + Certbot sigue siendo válido si el operador ya lo domina, pero no ofrece una ventaja necesaria para este proyecto.

# 9. Minimal-Change OCI Architecture

Candidato:

Internet
→ DNS de dominio/subdominio existente o adquirido
→ IP pública OCI
→ Caddy en 80/443
→ reverse proxy a Node/Express en puerto interno 3000
→ Express sirve API + dist/client
→ navegador conserva Firebase Auth + Firestore + GIS/Drive/Picker
→ Node conserva Gemini API y DOCX.

## CAMBIA

- plano de hosting AI Studio/Cloud Run → OCI Compute;
- origen público del navegador;
- dominio/DNS, si el actual está ligado al hosting Google;
- terminación TLS;
- proceso de deploy/rollback;
- administración del SO;
- inyección y permisos de variables/secrets del servidor;
- Security Lists/NSG/firewall;
- monitoreo/restart de la VM.

## PERMANECE

- React/Vite;
- Node/Express;
- Firebase Authentication;
- Firestore y databaseId;
- Firestore Security Rules;
- Google Drive;
- Google Picker;
- GIS;
- scope drive.file;
- Gemini/gemini-3.6-flash;
- schema TITLE_STUDY;
- prompts;
- validación Zod;
- renderer DOCX;
- estructura lógica de proyectos/historial;
- contrato /api/health.

# 10. Deployment Alternatives

| Alternativa | Complejidad | Costo | Mantenimiento | Seguridad | Reproducibilidad | ARM64 | Update/Rollback | Logs/TLS/Health | Resultado |
|---|---|---|---|---|---|---|---|---|---|
| A. VM + Node + systemd + Caddy | Baja | Mínimo | Bajo | Buena con hardening básico | Buena con artefacto/SHA | Sí, sujeto a POC | Release dirs + symlink + systemd | journald + Caddy + /api/health | **Preferida** |
| A2. VM + Node + systemd + Nginx/Certbot | Media | Similar | Medio | Buena | Buena | Sí | Igual | Más piezas TLS | Válida, no preferida |
| B. VM + Docker/Compose | Media | Similar | Medio | Buena si bien configurado | Muy buena | Requiere imágenes ARM64 | Tags/imágenes simplifican rollback | logs container + proxy | **DEFER** |
| C. OCI Load Balancer + VM | Media/Alta | Puede ser $0 dentro de límite AF elegible o pagado | Más alto | Puede centralizar TLS | Buena | Neutro | Igual backend | health checks LB | **DEFER** |
| D. OCI DevOps/servicios nativos | Media/Alta | Account-specific | Más plataforma | Buena | Buena | Neutro | Potencialmente buena | Integrado | No simplifica hoy |

### Evaluación

**A — VM + Node + systemd + Caddy.** Menor número de piezas y encaja con el runtime existente. systemd provee restart y boot; Caddy TLS/reverse proxy. Es el baseline recomendado.

**B — Docker/Compose.** Aumenta reproducibilidad, pero hoy no existe Dockerfile ni Compose y el work item prohíbe implementarlos. Introducirlos sólo para migrar hosting añade trabajo y una nueva superficie ARM64 sin necesidad funcional.

**C — Load Balancer.** Un solo backend no obtiene alta disponibilidad real por poner un LB delante. Sólo se justifica al tener múltiples instancias, necesidad específica de edge administrado o una política futura.

**D — OCI nativo.** No se encontró una herramienta OCI que reduzca pasos respecto de una VM + systemd + Caddy para este producto pequeño.

No se recomiendan Kubernetes, OKE, microservicios ni service mesh.

# 11. GitHub-to-OCI Strategy

## A. Manual: git pull / npm ci / build / restart

Ventaja: mínimo setup.
Desventajas: build en servidor, working tree mutable, rollback menos limpio, exige acceso Git desde producción y consume RAM/CPU de la VM.

**Uso:** POC inicial únicamente, desde SHA exacto, para demostrar ARM64 cuando se use A1.

## B. GitHub Actions → SSH

Ventaja: tests/build antes del deploy; pocos componentes.
Riesgo: si se hace git pull remoto sigue existiendo estado mutable y acceso del servidor a GitHub.

## C. GitHub Actions → artefacto → OCI por SSH

Secuencia propuesta para producción futura:

1. checkout de SHA;
2. npm ci;
3. npm run build;
4. npm test;
5. prueba de reglas Firestore según CI existente;
6. empaquetar artefacto versionado;
7. copiar por SSH a /opt/g-inf-01/releases/<sha>;
8. preparar dependencias runtime necesarias sin exponer secretos;
9. apuntar symlink current al release nuevo;
10. systemctl restart g-inf-01;
11. curl local/HTTPS a /api/health;
12. si falla, restaurar symlink anterior y reiniciar.

**IMPLEMENTER RECOMMENDATION.** Producción: opción C. Usa un secreto de deploy SSH acotado por Environment de GitHub; no entrega credenciales Google al workflow si no son necesarias para build/tests; mantiene rollback explícito.

## D. Herramientas OCI nativas

**DEFER.** No hay evidencia de que OCI DevOps simplifique este repo frente a Actions + SSH. Evaluarlo sólo si aparecen múltiples VMs, políticas de organización o requisitos de auditoría.

No crear workflow en este work item.

# 12. Strengths

- Baja dependencia real del proveedor de hosting.
- Express ya sirve SPA y APIs en un solo proceso.
- /api/health ya existe y es independiente de externos.
- Firestore es client-side y sus Rules ya expresan ownership.
- Drive/Picker/GIS están encapsulados en servicios de navegador.
- Scope Drive mínimo drive.file.
- Gemini usa HTTP estándar.
- Los binarios de usuario ya viven en Drive; una pérdida de VM no implica perder el repositorio documental principal.
- DOCX no depende de Google.
- El stack cabe razonablemente en una sola VM.
- La migración puede ejecutarse en paralelo al hosting Google y revertirse por DNS/origen.

# 13. Weaknesses

- El diseño canónico aún documenta AI Studio/Cloud Run como target, por lo que después de una decisión humana habría que actualizar arquitectura/especificación en un work item separado.
- La VM introduce administración de SO, parches, SSH, firewall y backups que Cloud Run abstrae.
- El proceso escucha hoy en 0.0.0.0; la protección de 3000 debe depender de firewall/NSG si no se hace un cambio futuro para bind local.
- Requests de análisis grandes pueden elevar memoria transitoria.
- No hay pipeline OCI ni packaging de release implementado.
- ARM64 no está ejecutado en CI actual.
- La disponibilidad Always Free no está garantizada y no tiene SLA.

# 14. Risks

| Riesgo | Probabilidad cualitativa | Impacto | Mitigación |
|---|---|---|---|
| A1 out of host capacity | Media/externa | Bloquea POC | Probar región/AD; fallback E2 o paid |
| Reclamación idle Always Free | Material para bajo tráfico | Downtime | VM reproducible, backups, paid prod |
| ARM64 optional dependency | Baja/indeterminada | Build falla | POC real npm ci/build en A1 |
| E2 OOM/build lento | Alta comparativa | Deploy inestable | Build externo o A1 |
| OAuth origin mal configurado | Media | Auth/Drive roto | Checklist + E2E antes de DNS final |
| API key Picker restriction | Media | Picker falla | origin + docs.google.com + API restrict |
| Popup bloqueado | Plataforma | Login UX | Prueba móvil/desktop; error recuperable |
| Secret leakage | Baja con controles | Alto | env file perms, no logs, no Git |
| Puerto 3000 expuesto | Evitable | Alto | NSG/firewall; sólo Caddy público |
| OS sin parches | Operacional | Alto | patch cadence |
| Google quota/billing residual | Usage-dependent | Medio | budgets/quotas/observabilidad |
| Precio Gemini cambia 2027 | Cierto en tabla actual | Coste | presupuestar y revisar antes 2027 |
| Docs Oracle A1 inconsistentes | Actual | Decisión errónea | usar baseline conservadora + console check |
| Dominio no disponible | Account-specific | Bloquea OAuth | usar subdominio controlado/adquirir dominio |

# 15. Cost Scenarios

Las cifras son de fuentes oficiales consultadas el 2026-10-03. “$0 dentro de límites” se usa únicamente donde la fuente soporta explícitamente una asignación gratuita. No implica gratuidad futura ni disponibilidad.

## Escenario 1 — OCI Always Free + servicios Google actuales

| Rubro | Tratamiento |
|---|---|
| Compute | **$0 dentro de límites** para una A1 configurada dentro del entitlement Always Free efectivo de la tenancy; diseñar 1 OCPU/6 GB y verificar consola |
| Disco boot/block | **$0 dentro de límites** hasta 200 GB combinados en home region; candidato usa ~50 GB boot |
| Backups OCI | **$0 dentro de límites** hasta cinco volume backups Always Free, sujeto a reglas vigentes |
| Transferencia OCI | **$0 dentro de límites** hasta 10 TB/mes outbound documentado |
| IP pública | La shape E2 documenta una IP incluida; para A1 no se afirma una tarifa independiente sin verificar pricing efectivo en consola |
| Load Balancer | No usar. Si se añade, Oracle documenta una unidad Always Free 10 Mbps bajo condiciones de tenancy |
| Dominio | $0 incremental si se usa un subdominio de dominio ya poseído; si hay que comprar dominio, costo registrar/TLD |
| Firebase Auth | Mantener. Otros servicios de Authentication aparecen sin costo; Identity Platform tiene 50k MAU free antes de pricing cuando aplique |
| Firestore | **$0 dentro de límites** de free quota de la DB elegible; excedentes/billing según ubicación y plan |
| Drive API | Uso bajo umbral diario documentado no incurre cargo extra; verificar régimen del proyecto existente |
| Google Drive storage | Consume almacenamiento/cuota de la cuenta del usuario; no desaparece por migrar hosting |
| Picker | No se afirma costo independiente; depende de configuración/APIs |
| Gemini | **$0 dentro de límites** del free tier cuando la cuenta/modelo es elegible; pago por tokens si usa paid tier |
| Otros LLM | No implementados actualmente; $0 atribuible a migración |

**Gatillos de cobro:** exceder límites OCI, crear recurso no etiquetado/elegible Always Free, storage fuera de home region, features pagadas, Google usage sobre cuotas, Gemini paid tier, compra/renovación de dominio.

## Escenario 2 — OCI Pay As You Go utilizando Always Free donde corresponda

Oracle indica que, después de upgrade, los recursos Always Free continúan sin cargo y sólo cobra uso por encima de límites.

Por tanto, una tenancy PAYG puede ejecutar el mismo A1 1 OCPU/6 GB y storage elegible con **$0 dentro de límites**, pero habilita capacidad pagada y hace más importante definir budgets/quotas porque servicios fuera de esos límites sí pueden facturar.

Ventaja frente a una cuenta exclusivamente gratuita: mejor ruta de fallback a shapes pagadas y acceso a soporte según plan; no elimina capacity constraints de una shape concreta.

## Escenario 3 — fallback de bajo costo si A1/E2 no tiene capacidad o Always Free no es operativo

**IMPLEMENTER RECOMMENDATION.** VM.Standard.E4.Flex x86, 1 OCPU/4 GB, Pay As You Go.

La página oficial OCI IaaS/PaaS consultada publica USD 0.032765 por OCPU-hour y USD 0.0019659 por GB-hour de memoria para E4.Flex. Con 730 horas/mes:

- CPU: 730 × 0.032765 ≈ USD 23.92/mes.
- RAM: 730 × 4 × 0.0019659 ≈ USD 5.74/mes.
- Compute estimado: **≈ USD 29.66/mes**, antes de storage, backups, impuestos u otros servicios.

Es una estimación de catálogo, no una cotización. Debe confirmarse en OCI Cost Estimator para la región/cuenta antes de aprovisionar.

Boot volume, backup e IP deben verificarse en el estimator/console porque el tratamiento Always Free puede interactuar con una tenancy PAYG. Dominio y servicios Google conservan los costos residuales ya descritos.

# 16. Security / Operations

## Sistema base

**IMPLEMENTER RECOMMENDATION.** Ubuntu LTS ARM64 para A1 POC o Ubuntu LTS x86 para E4 producción; Oracle Linux también es válido. La decisión debe favorecer familiaridad operativa, no añadir SDKs OCI innecesarios.

## Usuario y proceso

- crear usuario de servicio sin privilegios, por ejemplo g-inf-01;
- archivos de aplicación sin ownership root donde no corresponda;
- systemd con WorkingDirectory estable, NODE_ENV=production, restart on failure y arranque tras reboot;
- no ejecutar Node como root.

## Red

- OCI Security List/NSG: 443 público; 80 sólo para redirect/ACME; 22 restringido a IP administrativa o usar OCI Bastion;
- firewall del host equivalente;
- **no exponer 3000 públicamente**;
- Caddy reverse proxy a Node;
- mantener egress HTTPS/DNS para Google.

Aunque Node escucha actualmente 0.0.0.0, bloquear 3000 en OCI + host firewall evita exposición. Cambiar posteriormente el bind a 127.0.0.1 sería hardening de código menor, no requisito para demostrar viabilidad.

## TLS

- dominio real;
- Caddy Automatic HTTPS;
- renovación automática;
- HSTS sólo después de comprobar la topología y subdominios aplicables.

## Secrets

- no guardar secretos en Git, frontend, logs ni artefactos;
- Firebase web config y Picker developer key son configuración cliente pero deben restringirse según documentación;
- Gemini owner aliases/access token son secretos del servidor;
- para primera VM, archivo EnvironmentFile root-owned 0600 o mecanismo equivalente;
- OCI Vault puede evaluarse después si simplifica rotación; no es requisito del POC;
- GitHub Actions de deploy no debe necesitar claves de Gemini/Firebase de usuario.

## Logs

- stdout/stderr de Node a journald;
- Caddy access/error logs si se habilitan, con rotación;
- no registrar Authorization, OAuth tokens, API keys ni payloads documentales;
- logrotate sólo si se usan archivos fuera de journald.

## Actualizaciones y runtime

- pin/controlar Node 24 dentro de la línea aprobada;
- parchear SO con cadencia;
- probar npm ci/build al actualizar Node/npm;
- no auto-upgrade de dependencias de aplicación fuera de GitHub/PR.

## Backup / restore

La fuente de verdad del código es GitHub; Firestore y Drive conservan estado lógico/archivos del producto. La VM debe poder reconstruirse desde:

1. imagen Linux;
2. release SHA/artefacto;
3. configuración documentada;
4. secretos recuperados desde canal seguro;
5. DNS.

Backups de boot volume son defensa adicional, no la única estrategia. No dejar datos de negocio únicos en disco local.

## Health y monitoreo mínimo

- systemd ActiveState;
- GET /api/health local y externo;
- espacio de disco;
- memoria/CPU;
- expiración/renovación TLS observada por Caddy;
- alertas OCI mínimas si están disponibles sin complejidad excesiva.

Recordar: /api/health no prueba Firebase, Drive ni Gemini. Las integraciones requieren smoke/E2E explícitos.

# 17. Architecture Delta

## CURRENT

AI Studio / Cloud Run
+ Firebase Authentication
+ Firestore
+ Google Drive / Picker / GIS
+ Gemini API
+ React/Vite + Express + DOCX.

## MINIMAL OCI CANDIDATE

OCI Compute + Caddy + systemd
+ Firebase Authentication
+ Firestore
+ Google Drive / Picker / GIS
+ Gemini API
+ React/Vite + Express + DOCX.

## COMPONENTES QUE CAMBIAN

- host del proceso;
- red pública/NSG;
- TLS/reverse proxy;
- proceso de despliegue;
- administración de SO;
- ubicación de variables/secrets del servidor;
- origen OAuth/Firebase/Picker registrado.

## COMPONENTES QUE PERMANECEN

- frontend;
- backend;
- servicios Firebase;
- Drive/Picker;
- Gemini;
- persistence model;
- report schema/prompt;
- renderer DOCX;
- Firestore Rules.

## INTERFACES QUE PERMANECEN

- rutas /api/*;
- /api/health;
- Firebase Web SDK;
- Firestore collections/documents;
- Drive REST API;
- GIS token client;
- Picker builder;
- Gemini HTTPS API;
- DOCX download/persistence flow.

## CONFIGURACIÓN QUE CAMBIA

- DNS;
- TLS;
- OAuth authorized JavaScript origins;
- Firebase Authorized Domains;
- Picker API key website restrictions;
- PORT/NODE_ENV/systemd EnvironmentFile;
- firewall/NSG;
- deploy credentials.

## ARCHIVOS DEL REPOSITORIO QUE PROBABLEMENTE CAMBIARÍAN EN WORK ITEMS FUTUROS

- documentación de arquitectura/deployment;
- eventualmente scripts/documentación de deploy;
- eventualmente workflow GitHub Actions de deploy;
- opcionalmente server.ts si se decide hacer configurable el bind host o añadir shutdown semantics.

Ninguno debe cambiar en #101 salvo este informe.

## ARCHIVOS QUE NO DEBERÍAN CAMBIAR POR LA MIGRACIÓN MÍNIMA

- schemas TITLE_STUDY;
- prompts;
- renderer DOCX;
- servicios Firestore;
- Drive client/picker si la configuración externa basta;
- Firebase auth driver;
- lógica de proyectos/historial;
- package dependencies, salvo evidencia futura de POC ARM64.

# 18. Reversible Migration Plan

Ninguna etapa apaga Google hosting antes de aceptación.

| Fase | Objetivo | Cambio | Prueba | Riesgo | Rollback / gate |
|---|---|---|---|---|---|
| P0 | Build reproducible | Ningún servicio | CI actual en SHA; npm ci/build/test | Baseline no reproducible | STOP si falla |
| P1 | Probar capacidad OCI | Crear VM sólo tras autorización | SSH, CPU/RAM/shape/limits | No capacity | Eliminar VM; mantener Google |
| P2 | Validar ARM64/runtime | Node 24 + repo/release | npm ci/build/test/start/health | Native optional dep/OOM | Cambiar a x86/E2; Google intacto |
| P3 | Operación mínima | systemd + Caddy | reboot, restart, localhost health | servicio no vuelve | corregir unidad; Google intacto |
| P4 | HTTPS temporal | DNS subdominio + TLS | cert válido + HTTP→HTTPS | DNS/ACME | revertir DNS |
| P5 | Modo invitado | publicar candidato OCI | análisis + DOCX invitado | payload/memoria | volver URL Google |
| P6 | Firebase Auth | Authorized Domain | popup real | popup/origin | quitar dominio OCI |
| P7 | Firestore | mismo proyecto/config | crear/listar/abrir proyecto, isolation | rules/config | usar hosting Google |
| P8 | Drive/GIS/Picker | authorized origin + key restriction | authorize, picker, upload/read | origin/key/scope | retirar origin OCI |
| P9 | Gemini y aliases | secrets OCI | llamada real; 403 sin owner token | secret/quota | quitar secrets/volver Google |
| P10 | E2E autenticado | Ningún servicio nuevo | auth→project→Drive→analysis→DOCX→history | integración | Google sigue disponible |
| P11 | Dominio definitivo | DNS al candidato | E2E + health desde Internet | caché DNS | TTL bajo + revert record |
| P12 | Observación | mantener ambos hosts | errores, memoria, restart, métricas | idle/reclaim | revert DNS |
| P13 | Aceptación humana | decisión de hosting | checklist firmado | deuda operativa | NO cortar sin gate humano |
| P14 | Retirar hosting Google | sólo después de aceptación | confirmar producción estable | pérdida rollback | conservar procedimiento de restore |

Gates humanos obligatorios: creación de cuenta/recursos, billing/PAYG, compra o cambio de dominio/DNS, cambios Firebase/OAuth/API key, introducción de secretos, cutover y retiro de Google hosting.

# 19. Open Questions / Account-Specific Tests

1. **POC_REQUIRED — OCI account:** home region disponible para el propietario.
2. **POC_REQUIRED — A1 entitlement:** resolver discrepancia 1.500/9.000 vs 3.000/18.000 en la Console de esa tenancy.
3. **POC_REQUIRED — Capacity:** A1/E2 disponible en el momento del POC.
4. **POC_REQUIRED — ARM64:** npm ci, build, tests y runtime completos en A1.
5. **POC_REQUIRED — Peak memory:** análisis con archivos representativos cerca de límites de producto.
6. **POC_REQUIRED — Idle:** observar métricas reales y política aplicada durante período suficiente; no se puede inferir una excepción.
7. **POC_REQUIRED — Domain:** confirmar si existe dominio reutilizable o se requiere compra.
8. **POC_REQUIRED — Firebase:** Authorized Domains y comportamiento real de signInWithPopup en nuevo origen.
9. **POC_REQUIRED — OAuth:** authorized JavaScript origin exacto; no inventar redirect URI.
10. **POC_REQUIRED — Picker:** API key restrictions, docs.google.com y App ID/client ID del proyecto real.
11. **POC_REQUIRED — Drive billing/quota:** determinar si el proyecto actual está sujeto al nuevo modelo 2026 o régimen previo.
12. **POC_REQUIRED — Firestore:** confirmar databaseId real y cuál DB recibe free quota.
13. **POC_REQUIRED — Gemini:** tier/billing real, cuota del modelo y manejo de owner aliases fuera de AI Studio hosting.
14. **POC_REQUIRED — Cloud Run/AI Studio cost baseline:** obtener factura/usage real para cuantificar ahorro, no inferirlo.
15. **POC_REQUIRED — Backup restore:** reconstruir VM desde release/config/backup sin depender de estado local irreemplazable.
16. **POC_REQUIRED — Public IPv4 pricing/account:** confirmar en estimator/console cualquier cargo asociado para la configuración elegida.

# 20. Recommendation

## RECOMMENDED FOR POC

**OCI VM.Standard.A1.Flex, 1 OCPU / 6 GB RAM, Ubuntu ARM64, Node.js 24, systemd y Caddy; conservar Firebase Auth, Firestore, Drive, Picker/GIS y Gemini sin migrarlos.**

Motivos:

- prueba exactamente la hipótesis de mínima migración;
- cabe en el límite A1 conservador;
- ofrece mucha más RAM que E2;
- permite validar el único riesgo técnico material nuevo: ARM64;
- no introduce Docker, LB ni OCI DevOps;
- es reversible porque Google hosting permanece activo.

El POC debe empezar con un subdominio HTTPS y no con una IP como origen definitivo, porque OAuth web requiere dominio/HTTPS.

## RECOMMENDED FOR PRODUCTION

**Pay As You Go + VM.Standard.E4.Flex x86 1 OCPU / 4 GB, Node/systemd/Caddy, despliegue de artefacto desde GitHub Actions con rollback por release directory/symlink.**

Razón: para producción, el valor de evitar reclamación idle, capacidad Always Free y ausencia de SLA pesa más que ahorrar ~USD 30/mes de compute estimado. La aplicación conserva los servicios Google actuales.

A1 puede convertirse en opción de producción sólo si el POC demuestra ARM64, la cuenta ofrece capacidad estable y el Humano acepta explícitamente la política de disponibilidad/reclamación aplicable.

## DEFER

- Docker / Docker Compose;
- OCI Load Balancer;
- OCI DevOps;
- Vault gestionado si no aporta valor operacional inmediato;
- reemplazar Firebase Auth;
- migrar Firestore a Oracle DB/Postgres;
- migrar Drive a Object Storage;
- sustituir Picker por explorador propio;
- cambiar Gemini sólo por motivos de hosting;
- soporte multi-provider real;
- actualización de SOFTWARE_ARCHITECTURE.md hasta que el POC/decisión sea aprobada;
- hardening opcional de bind de Node a 127.0.0.1 mediante código.

## DO NOT CHANGE YET

- Firebase Authentication;
- Firestore schema/databaseId/Rules;
- Drive scope drive.file;
- Google Picker;
- Google Identity Services;
- Gemini provider/model;
- schema TITLE_STUDY;
- prompts;
- renderer DOCX;
- lógica de proyectos/historial;
- package.json/package-lock.json;
- workflows GitHub;
- Google billing/configuration;
- DNS;
- infraestructura OCI.

## Impacto estimado

**ESTIMATED ARCHITECTURE IMPACT: LOW.**

El plano de hosting cambia, pero las interfaces funcionales y servicios de datos/identidad/documentos/IA pueden permanecer. El impacto operacional es mayor que el impacto de código.

# 21. Official Sources

Todas consultadas el **2026-10-03**.

| Proveedor | Título | URL | Hecho principal utilizado |
|---|---|---|---|
| Oracle | Always Free Resources | https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm | Shapes E2/A1, 2 OCPU/12 GB conservador, storage, LB, outbound, idle reclaim, home region, capacity |
| Oracle | Oracle Cloud Infrastructure Free Tier | https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier.htm | Trial USD 300/30 días, tarjeta, fin de trial, PAYG, límite A1 al finalizar trial |
| Oracle | Preguntas frecuentes sobre las cuentas gratuitas de OCI Cloud | https://www.oracle.com/latam/cloud/free/faq/ | Verificación de pago, cuenta inactiva, SLA/support, trial/reclaim |
| Oracle | Troubleshooting “out of host capacity” | https://docs.oracle.com/en-us/iaas/Content/Compute/Tasks/troubleshooting-out-of-host-capacity.htm | Capacidad temporal por shape/AD |
| Oracle | Public IP Addresses | https://docs.oracle.com/en-us/iaas/Content/Network/Tasks/managingpublicIPs.htm | Modelo de IP pública OCI |
| Oracle | DNS in Your Virtual Cloud Network | https://docs.oracle.com/en-us/iaas/Content/Network/Concepts/dns.htm | DNS VCN/private names no sustituye dominio público |
| Oracle | Creating a Load Balancer | https://docs.oracle.com/en-us/iaas/Content/Balance/Tasks/managingloadbalancer_topic-Creating_Load_Balancers.htm | Consideraciones/billing de LB |
| Oracle | Precios de procesamiento de Oracle Cloud Compute | https://www.oracle.com/latam/cloud/compute/cost-estimator/ | Pricing A1 y cifra 3.000/18.000 que contradice docs Always Free |
| Oracle | OCI IaaS and PaaS Services Highlights | https://www.oracle.com/cloud/iaas-paas/ | Tarifas de referencia E4/A1 |
| Google/Firebase | Authenticate Using Google with JavaScript | https://firebase.google.com/docs/auth/web/google-signin | Google Sign-In web |
| Google/Firebase | Best practices for signInWithRedirect | https://firebase.google.com/docs/auth/web/redirect-best-practices | Popup como alternativa; authorized domains para redirects |
| Google | OAuth 2.0 for Client-side Web Applications | https://developers.google.com/identity/protocols/oauth2/javascript-implicit-flow | Authorized JS origins; HTTPS; raw IP no permitido |
| Google | Use Google Picker API features in web apps | https://developers.google.com/workspace/drive/picker/guides/web-picker-sample | APIs, origin, key restrictions, docs.google.com, App ID |
| Google | Choose Google Drive API scopes | https://developers.google.com/workspace/drive/api/guides/api-specific-auth | drive.file |
| Google | Drive API Usage limits | https://developers.google.com/workspace/drive/api/guides/limits | Quotas y umbral diario 2026 |
| Firebase | SDKs and client libraries — Firestore | https://firebase.google.com/docs/firestore/client/libraries | Web SDK conecta directamente con Auth + Rules |
| Firebase | Understand Cloud Firestore billing | https://firebase.google.com/docs/firestore/pricing | Free quota y billing |
| Firebase | Firebase Pricing | https://firebase.google.com/pricing | Authentication/Firestore plan thresholds |
| Google AI | Gemini API reference | https://ai.google.dev/api | API HTTPS + x-goog-api-key |
| Google AI | Gemini Developer API pricing | https://ai.google.dev/gemini-api/docs/pricing | gemini-3.6-flash free/paid pricing y cambio 2027 |
| Caddy | Quick-starts: HTTPS / Automatic HTTPS | https://caddyserver.com/docs/quick-starts/https | DNS, ports, TLS automático |
| Caddy | Automatic HTTPS | https://caddyserver.com/docs/automatic-https | Certificados, renovación, redirect |
| Node.js | Node.js v24 archive/downloads | https://nodejs.org/en/download/archive/v24.21.0 | Binario Linux ARM64 |
| GitHub | Deployments and environments | https://docs.github.com/en/actions/concepts/workflows-and-actions/deployment-environments | Environments/secrets/gates para deploy futuro |

---

## Research Gate conclusion

**IMPLEMENTER ANALYSIS:** la hipótesis híbrida queda sustentada documentalmente y por inspección del repositorio. G_INF_01 puede alojar Node/Express/React en OCI y conservar Firebase Authentication, Firestore, Drive/Picker/GIS y Gemini. El cambio mínimo está en hosting, origen HTTPS, configuración OAuth/Firebase/Picker, operación de VM y despliegue.

**IMPLEMENTER RECOMMENDATION:** autorizar, si el Humano lo decide en un work item posterior, un POC reversible en A1 1 OCPU/6 GB con dominio HTTPS y hosting Google aún activo. No autorizar todavía corte de Google hosting ni migración de servicios de aplicación.

**POC_REQUIRED:** ARM64 real, capacidad/cuotas OCI de la cuenta, dominios/OAuth reales, billing residual y recuperación ante VM perdida.
