# OCI Migration Strategy — G_INF_01

**Work Item:** Issue #104 — STRATEGY_GATE: plan de traslado OCI antes de implementación
**Repository:** cmiloarevalo-hash/G_INF_01
**Base revisada:** main@9f20b49e57aa065650fa3b0005b622b10dca33f8
**PR de estrategia:** #105
**Fecha de revisión:** 2026-10-03
**Estado:** REWORK incorporado. Documento de planificación; no ejecuta migración.

# 0. Decisión humana vigente y regla de precedencia

La decisión humana registrada en Issue #104 y PR #105 después de la primera revisión de estrategia reemplaza la secuencia anterior.

La estrategia vigente se divide en dos fases independientes:

## FASE 1 — ORACLE CORE / DOCUMENT ANALYZER

Objetivo: llevar al menor tiempo posible a OCI una versión útil del flujo principal de análisis documental, conservando la interfaz actual y usando exclusivamente el modo invitado.

FASE 1 incluye:

- interfaz web actual;
- selección local de documentos desde el navegador;
- modo invitado;
- clave temporal Gemini aportada por el usuario;
- análisis;
- validación TITLE_STUDY;
- vista de resultado;
- generación y descarga DOCX;
- GET /api/health;
- OCI Compute A1;
- ARM64;
- Node.js 24;
- Express;
- React/Vite;
- systemd;
- Caddy;
- HTTPS;
- hostname de costo cero independiente del dominio corporativo;
- costo objetivo OCI mensual USD 0;
- hosting Google actual operativo como rollback.

FASE 1 no depende de:

- Google Sign-In;
- Firebase Authentication;
- proyectos autenticados;
- Firestore persistente;
- Google Drive;
- Google Picker;
- GIS/OAuth;
- app.ingenierosasesores.cl;
- acceso DNS corporativo;
- production cutover.

Las capacidades Google permanecen en el código; no se eliminan ni rediseñan.

## FASE 2 — INTEGRATIONS

Empieza sólo después de que FASE 1 sea estable y aceptada.

FASE 2 trata por Work Items separados:

- Firebase Authentication / Google Sign-In;
- Firestore y proyectos/historial persistentes;
- Drive;
- Picker;
- GIS/OAuth browser origins;
- hostname corporativo estable;
- app.ingenierosasesores.cl;
- E2E autenticado;
- cutover futuro;
- o alternativas documentadas si alguna integración Google deja de ser conveniente o viable.

**FASE 2 no puede bloquear FASE 1.**

# 1. Restricciones de #104

Durante este Work Item no se autoriza:

- crear VM ni recursos OCI;
- cambiar billing;
- hacer Upgrade / Pay As You Go;
- consumir recursos pagados;
- usar créditos promocionales como fundamento de costo;
- crear o modificar DNS;
- crear hostname DuckDNS;
- tocar ingenierosasesores.cl;
- cambiar Firebase;
- cambiar OAuth;
- cambiar Picker;
- cambiar Google Console;
- desplegar;
- modificar código;
- modificar dependencias;
- modificar workflows;
- crear Issues de ejecución;
- mergear PR #105.

El único cambio de repositorio autorizado es este archivo.

# 2. Estado actual verificado en código

## 2.1 Runtime

REPO FACT:

- server.ts crea Express.
- Producción sirve dist/client.
- PORT es configurable con fallback 3000.
- El listener usa 0.0.0.0.
- GET /api/health devuelve estado del proceso, uptime y timestamp.
- POST /api/guest/analyze implementa análisis invitado.
- POST /api/guest/report-docx genera DOCX.
- Gemini se consume por HTTPS.
- No existe binding de runtime obligatorio a Cloud Run.

## 2.2 Guest flow

src/pages/GuestDocumentsPage.tsx implementa directamente:

1. selección local mediante input type=file;
2. almacenamiento temporal de File en memoria React;
3. serialización Base64 para formatos soportados;
4. clave temporal como opción por defecto;
5. header x-gemini-api-key;
6. POST /api/guest/analyze;
7. validación local del resultado con titleStudySchema;
8. render de TitleStudyResult;
9. POST /api/guest/report-docx;
10. descarga local del DOCX.

GuestDocumentsPage no importa Firebase Auth, Firestore, Drive, Picker ni ProductRuntime.

## 2.3 Comportamiento cuando Firebase no está configurado

src/services/auth/session.ts convierte configuración Firebase ausente en:

- available = false;
- service = null;
- session = unauthenticated.

src/components/AuthSessionControl.tsx presenta explícitamente:

- “Modo invitado”;
- botón deshabilitado “Google no configurado”.

tests/auth-session.test.ts ya comprueba una representación sin Firebase con:

- “Modo invitado”;
- “Google no configurado”;
- “Disponible sin iniciar sesión”;
- “Abrir documentos del invitado”.

## 2.4 ProductRuntime / Firestore sin configuración

src/services/firestore/runtime.tsx devuelve estado unavailable si falta Firebase y continúa renderizando children.

src/services/application/product-runtime.tsx intenta cargar Firebase + Google Drive/Picker; si faltan, captura el error y establece ProductRuntime como unavailable. El provider continúa renderizando children.

Por tanto, la aplicación completa puede renderizar el Home y GuestDocumentsPage aunque la capa autenticada no esté disponible.

## 2.5 Server guest independiente

server.ts:

- /api/guest/analyze acepta clave temporal directamente;
- la ruta de clave temporal no exige alias del propietario;
- /api/guest/report-docx no exige autenticación;
- /api/health no consulta Firebase, Firestore, Drive ni Gemini.

tests/title-study-docx-route.test.ts verifica generación DOCX sin credenciales Gemini ni llamada al proveedor.

tests/guest-documents.test.ts verifica el uso de /api/guest/report-docx.

tests/gemini-alias-access.test.ts verifica que la clave temporal funciona independientemente de los aliases.

## 2.6 Conclusión de cambio de código para FASE 1

**FASE 1 CAN_RUN_WITHOUT_CODE_CHANGES = YES, sujeto a prueba real en OCI.**

No se necesita:

- ocultar componentes autenticados;
- eliminar providers;
- desactivar imports Google;
- cambiar routing;
- cambiar server.ts;
- cambiar package.json;
- cambiar lockfile;
- crear feature flag.

Configuración recomendada para FASE 1:

- no suministrar variables Firebase/Drive/Picker si no son necesarias;
- usar sólo clave temporal Gemini en el flujo invitado;
- aceptar que las secciones autenticadas muestren su estado no disponible;
- verificar que la ausencia de esas configuraciones no produce error fatal en el build/runtime.

Si el POC real contradice esta evidencia y una integración ausente bloquea el guest flow:

**STOP. No parchear dentro del Work Item operativo. Abrir un Work Item mínimo de código después de revisión del Supervisor.**

El Work Item mínimo contingente tendría como único objetivo conservar el guest flow cuando las integraciones autenticadas no estén configuradas; no autorizaría eliminar Firebase/Drive ni rediseñar navegación.

# 3. Arquitectura objetivo por fases

## 3.1 FASE 1

~~~text
Internet
  ↓
hostname POC de costo cero
  ↓ HTTPS
OCI public IPv4
  ↓
VCN / subnet pública / reglas mínimas
  ↓
OCI VM.Standard.A1.Flex
  ↓
Caddy :80/:443
  ↓
Node.js 24 + Express :3000
  ├── React/Vite dist/client
  ├── GET /api/health
  ├── POST /api/guest/analyze
  │     ↓
  │   Gemini HTTPS con clave temporal del usuario
  └── POST /api/guest/report-docx
        ↓
      DOCX descargado al navegador

Navegador
  └── archivos locales temporales

Firebase/Auth/Firestore/Drive/Picker/OAuth:
PRESENTES EN CÓDIGO, NO REQUERIDOS PARA FASE 1
~~~

## 3.2 FASE 2

~~~text
Internet
  ↓
app.ingenierosasesores.cl
  ↓ HTTPS
OCI Compute + Caddy + Node/Express
  ├── guest flow de FASE 1
  ├── Firebase Authentication
  ├── Firestore
  ├── Google Drive / Picker / GIS
  └── Gemini
~~~

FASE 2 extiende la versión útil; no reemplaza el núcleo validado en FASE 1.

# 4. Persistencia y datos

## 4.1 FASE 1

El modo invitado es temporal:

- archivos seleccionados viven en el navegador;
- la clave temporal Gemini vive en el input/request y no debe persistirse;
- el resultado vive en estado de UI;
- DOCX se descarga al navegador;
- no se requiere Firestore;
- no se requiere Drive;
- no se debe guardar información de negocio como único ejemplar en disco OCI.

## 4.2 FASE 2

Cuando se habilite:

- Firestore conserva metadata/proyectos/historial;
- Drive conserva documentos y artefactos;
- Auth conserva identidad;
- OCI sigue siendo runtime reemplazable.

# 5. Estrategia costo objetivo USD 0

## 5.1 Regla

~~~text
TARGET_OCI_MONTHLY_COST = USD 0
PROMOTIONAL_CREDITS_AS_JUSTIFICATION = FORBIDDEN
PAY_AS_YOU_GO_UPGRADE = FORBIDDEN
NON_ZERO_BASE_ESTIMATE = HARD STOP
~~~

La consola real de la tenancy prevalece sobre cualquier estimación documental.

## 5.2 Recursos OCI mínimos para FASE 1

| Recurso | Configuración inicial | Necesidad |
|---|---|---|
| Compute | 1 × VM.Standard.A1.Flex | runtime |
| OCPU | 1 | build/runtime POC |
| RAM | 4 GB | punto de partida |
| Boot volume | objetivo ~50 GB | SO + app |
| VCN | 1 | red |
| Public subnet | 1 | acceso |
| Internet Gateway | 1 | Internet |
| Route table | mínima | conectividad |
| Security List o NSG | mínima | firewall OCI |
| VNIC | primaria | NIC |
| Public IPv4 | 1, preferentemente ephemeral | HTTPS |
| Caddy | instalado en VM | TLS/proxy |

No usar:

- Load Balancer;
- NAT Gateway;
- Oracle Database;
- Autonomous Database;
- Object Storage;
- extra block volumes;
- backups pagados;
- OKE/Kubernetes;
- OCI DevOps;
- Vault;
- WAF;
- API Gateway;
- Functions;
- recursos no exigidos por el guest flow.

## 5.3 A1 / ARM64

Configuración inicial:

~~~text
Shape: VM.Standard.A1.Flex
OCPU: 1
RAM: 4 GB
Boot: ~50 GB
OS: Ubuntu LTS ARM64 soportado
Instances: 1
~~~

Subir a 6 GB sólo si:

1. una medición real demuestra necesidad;
2. el problema no es incompatibilidad ARM64;
3. la consola sigue mostrando costo base USD 0;
4. el cambio permanece dentro de la cuota gratuita efectiva;
5. el Supervisor/Humano autoriza la variación si el Work Item así lo requiere.

El lockfile incluye artefactos ARM64 para esbuild y Rollup, pero conserva una dependencia optional LZMA x64 sin sibling ARM64 visible. Por eso el POC debe ejecutar npm ci, build y tests en A1 real.

Si ARM64 exige cambio de código/dependencia:

**STOP → Supervisor → Work Item separado.**

## 5.4 A1 sin capacidad

No usar fallback pagado.

Opciones permitidas:

- otro Availability Domain legítimo dentro de la home region si existe;
- reintentar más tarde;
- E2.1.Micro sólo si la cuenta lo muestra explícitamente gratuito y el Supervisor acepta su limitación de 1 GB.

Si no hay capacidad free:

**BLOCKED.**

## 5.5 Credits

Los créditos de Free Trial pueden aparecer en UI, pero no se consideran ahorro permanente.

Antes de CREATE debe poder demostrarse que:

- shape;
- boot volume;
- public IPv4;
- red requerida;

no generan cargo base distinto de cero.

Si la interfaz no permite separar “costo base” de “cubierto por créditos”:

**HARD STOP.**

# 6. Hostname y HTTPS

## 6.1 FASE 1 no necesita OAuth

La decisión nueva elimina de FASE 1:

- Google Sign-In;
- OAuth origins;
- Firebase Authorized Domains;
- Picker referrers.

Por tanto, el hostname POC sólo necesita:

- resolver públicamente;
- apuntar a OCI;
- permitir emisión TLS;
- costo USD 0;
- control suficiente para actualizar la IP durante el POC.

No necesita ser aceptado por Google OAuth en FASE 1.

## 6.2 Hostname POC

DuckDNS permanece como candidato simple de costo cero.

Ejemplo ilustrativo, no creado:

~~~text
g-inf-01-poc.duckdns.org
~~~

HUMAN_GATE_DOMAIN se aplica antes de registrar/modificar ese hostname.

El token del proveedor DNS:

- no se pide por chat;
- no se versiona;
- no se entrega a Caddy si no hace falta;
- se usa sólo por el Humano o canal seguro si se requiere actualizar el registro.

## 6.3 Caddy

Objetivo:

~~~text
https://<hostname-poc>
        ↓
Caddy
        ↓
127.0.0.1:3000
~~~

80 y 443 públicos.
3000 no público.

Caddy Automatic HTTPS es el camino preferido porque reduce piezas frente a Nginx + Certbot.

## 6.4 FASE 2 / hostname corporativo

app.ingenierosasesores.cl pertenece a FASE 2.

No debe bloquear ni retrasar el POC útil.

El apex/WordPress de ingenierosasesores.cl no se toca.

# 7. Gates humanos

## HUMAN_GATE_CREATE_OCI

Se requiere antes de crear cualquier recurso OCI.

Debe presentar:

- home region;
- A1 availability;
- 1 OCPU / 4 GB;
- boot volume;
- public IPv4;
- recursos de red;
- costo base USD 0;
- créditos ignorados;
- ausencia de PAYG.

Aprobación para una configuración no autoriza otra.

## HUMAN_GATE_DOMAIN

FASE 1:

- aprueba hostname POC gratuito;
- aprueba creación/modificación de ese registro;
- no aprueba DNS corporativo.

FASE 2:

- se vuelve a usar para app.ingenierosasesores.cl;
- requiere acceso DNS corporativo;
- debe preservar WordPress/apex.

## HUMAN_GATE_GOOGLE_CONFIG

**No se usa en FASE 1.**

Se activa exclusivamente en FASE 2 antes de:

- Firebase Authorized Domains;
- OAuth Authorized JavaScript Origins;
- Picker/API key restrictions;
- cambios equivalentes.

## HUMAN_GATE_CUTOVER

**No se usa en FASE 1.**

FASE 1 mantiene Google hosting como rollback.

Se activa en FASE 2 después de:

- E2E autenticado;
- recovery;
- hostname corporativo;
- observación;
- evidencia de costo;
- rollback probado.

# 8. Regla canónica para cada Work Item futuro

Cada Work Item propuesto debe seguir:

~~~text
Issue
→ branch dedicada
→ implementación autorizada
→ tests + self-review
→ commit/push
→ PR
→ CI exact-head
→ Supervisor review
→ SEMANTIC_ACCEPTED / REWORK / HOLD / ESCALATE
~~~

No se comparte una branch de implementación entre Work Items distintos.

Los Work Items de este documento son propuestas. #104 no los crea.

# 9. Descomposición de FASE 1

## Resumen

| ID propuesto | Objetivo | HH |
|---|---|---:|
| F1-WI-01 | Revalidar baseline y demostrar guest isolation | 1.0–2.0 |
| F1-WI-02 | Gate costo + crear OCI mínimo | 1.5–2.5 |
| F1-WI-03 | Validar ARM64 + build/runtime | 1.5–2.5 |
| F1-WI-04 | systemd + firewall + Caddy + hostname HTTPS | 2.5–4.0 |
| F1-WI-05 | Guest E2E + Gemini temporal + DOCX | 1.5–2.5 |
| F1-WI-06 | Reboot/rebuild/rollback/observación y aceptación FASE 1 | 2.0–3.5 |
| Contingencia FASE 1 | incidencias menores sin ampliar scope | 1.0–2.0 |

**FASE 1 estimada: 11–19 HH de ingeniería activa.**

La estimación excluye esperas por:

- capacidad A1;
- aprobación humana;
- propagación DNS;
- observación calendario;
- indisponibilidad externa Gemini.

## F1-WI-01 — Baseline + Guest Isolation Proof

### Objetivo

Demostrar sobre SHA exacto que el flujo invitado puede operar sin configuración Firebase/Drive/Picker/OAuth y dejar el POC listo para aprovisionamiento.

### Dependencia

- #104 accepted.
- #103 reactivado o Work Item equivalente autorizado.

### Scope

- npm ci;
- build;
- tests;
- Firestore Rules tests como regresión;
- npm start;
- /api/health;
- verificar UI guest sin Firebase vars;
- verificar selección local;
- verificar ruta DOCX con fixture válido;
- verificar que Firebase/Drive unavailable no rompe render;
- iniciar OCI_POC_RUNBOOK.

### No-scope

- OCI;
- DNS;
- Gemini real;
- código funcional;
- dependencias;
- Google config.

### Authorized files/areas

Preferidos:

- docs/engineering/OCI_POC_RUNBOOK.md

Sólo si el Issue futuro lo autoriza expresamente:

- evidencia documental adicional bajo docs/engineering.

No código.

### External changes allowed

NONE.

### Human gates

NONE.

### Tests

- npm ci;
- npm run build;
- npm test;
- npm run test:firestore-rules;
- npm start;
- GET /api/health;
- render sin Firebase;
- guest local selection;
- DOCX route test existente.

### Acceptance criteria

PASS si:

- build/test green;
- app carga en modo invitado sin config Google/Firebase;
- guest page accesible;
- health 200;
- DOCX route funciona;
- no cambio de código.

### Evidence required

- base/head SHA;
- command results;
- test counts;
- screenshots sanitizadas de “Modo invitado” y guest page;
- health response;
- lista de env vars deliberadamente no configuradas, sin valores.

### STOP

- guest flow no renderiza sin Firebase/Drive;
- requiere código;
- requiere dependency change.

### Rollback

No hay cambio externo. Descartar branch si falla.

### Expected HH

1.0–2.0 HH.

### Handoff format

~~~text
WORK ITEM: F1-WI-01
BASE:
BRANCH:
PR:
HEAD:
BUILD: PASS|FAIL
TESTS: PASS|FAIL
GUEST_WITHOUT_FIREBASE: PASS|FAIL
HEALTH: PASS|FAIL
DOCX_ROUTE: PASS|FAIL
CODE_CHANGES: NONE
STATE: READY_FOR_REVIEW|BLOCKED
STOP → SUPERVISOR
~~~

## F1-WI-02 — OCI Zero-Cost Gate + Minimal Provisioning

### Objetivo

Validar la cuenta real y crear una única VM A1 mínima sólo si la consola demuestra costo base USD 0.

### Dependencia

- F1-WI-01 accepted.
- sesión OCI autorizada.

### Scope

- inspección account/home region;
- A1 availability;
- 1 OCPU / 4 GB;
- ~50 GB boot;
- red mínima;
- ephemeral public IPv4;
- una VM;
- registrar configuración real.

### No-scope

- Node/app deploy;
- Caddy;
- DNS;
- Google config;
- PAYG;
- servicios OCI adicionales.

### Authorized files/areas

- docs/engineering/OCI_POC_RUNBOOK.md

No application code.

### External changes allowed

Después del gate:

- una VM A1;
- recursos mínimos de VCN/subnet/route/security;
- boot volume incluido;
- public IPv4 si costo USD 0.

### Human gates

**HUMAN_GATE_CREATE_OCI obligatorio antes de CREATE.**

### Tests

- revisar costo base;
- revisar free eligibility;
- SSH reachability sólo con public key;
- verificar que no se creó recurso extra.

### Acceptance criteria

PASS si:

- A1 elegible;
- costo base USD 0 sin credits;
- no PAYG;
- VM única creada;
- recursos mínimos.

### Evidence required

- captura previa sanitizada;
- home region;
- shape/OCPU/RAM;
- boot;
- cost estimate;
- lista de recursos creados sin OCIDs sensibles.

### STOP

- costo > 0;
- costo ambiguo por credits;
- PAYG requerido;
- A1 no elegible;
- public IPv4 con cargo;
- storage con cargo;
- capacity sin alternativa free aprobada.

### Rollback

Terminar los recursos creados en el Work Item y comprobar que no quede recurso facturable.

### Expected HH

1.5–2.5 HH.

### Handoff format

~~~text
WORK ITEM: F1-WI-02
OCI_GATE: PASS|BLOCKED
HOME_REGION:
A1: AVAILABLE|NOT_AVAILABLE
CONFIG: 1 OCPU / 4 GB / ~50 GB
BASE_COST: USD 0|NON_ZERO|UNKNOWN
HUMAN_GATE_CREATE_OCI: APPROVED|NOT_APPROVED
RESOURCES_CREATED:
ROLLBACK_STATUS:
STATE:
STOP → SUPERVISOR
~~~

## F1-WI-03 — ARM64 + Build/Runtime

### Objetivo

Resolver el riesgo ARM64 ejecutando el SHA real en A1 sin cambiar código ni dependencias.

### Dependencia

- F1-WI-02 accepted;
- VM A1 activa.

### Scope

- uname -m;
- Node 24 ARM64;
- npm;
- obtener SHA;
- npm ci;
- npm run build;
- npm test;
- test Firestore Rules sólo si Java/emulador no añade complejidad innecesaria; CI exact-head sigue siendo obligatorio;
- npm start;
- localhost /api/health;
- medir RAM/tiempo.

### No-scope

- arreglar package-lock;
- reemplazar paquetes;
- Docker;
- Google config;
- DNS.

### Authorized files/areas

- docs/engineering/OCI_POC_RUNBOOK.md

No package.json/package-lock ni código.

### External changes allowed

- paquetes OS necesarios;
- Node 24;
- checkout/release en la VM.

### Human gates

No gate nuevo si F1-WI-02 ya autorizó la VM.
Si se pretende cambiar CPU/RAM o recurso: volver al gate aplicable.

### Tests

- architecture;
- npm ci;
- build;
- tests;
- start;
- health;
- memory snapshot.

### Acceptance criteria

PASS si el producto instala, compila, testea y arranca en ARM64 sin modificación de repo.

### Evidence required

- uname;
- Node/npm;
- SHA;
- tiempos;
- peak RAM aproximado;
- command output resumido;
- health.

### STOP

- native package failure;
- OOM;
- dependency workaround requerido;
- cambio de código requerido.

### Rollback

Eliminar release fallido. Si la VM queda inconsistente, reprovisionar bajo el mismo costo/gate o terminarla.

### Expected HH

1.5–2.5 HH.

### Handoff format

~~~text
WORK ITEM: F1-WI-03
ARCH: ARM64
NODE:
SHA:
NPM_CI: PASS|FAIL
BUILD: PASS|FAIL
TESTS: PASS|FAIL
RUNTIME: PASS|FAIL
PEAK_RAM:
CODE_CHANGES_REQUIRED: YES|NO
STATE:
STOP → SUPERVISOR
~~~

## F1-WI-04 — Service + Network + Caddy + Free HTTPS Hostname

### Objetivo

Exponer el guest runtime por HTTPS usando systemd, Caddy y hostname gratuito, sin tocar Google ni DNS corporativo.

### Dependencia

- F1-WI-03 accepted.

### Scope

- usuario de servicio;
- release directory;
- EnvironmentFile si hace falta configuración server-side;
- systemd;
- journald;
- firewall host;
- OCI inbound rules;
- 22 restringido;
- 80/443 público;
- 3000 no público;
- Caddy;
- hostname POC gratuito;
- Automatic HTTPS;
- HTTP→HTTPS.

### No-scope

- Firebase;
- OAuth;
- Picker;
- Drive;
- app.ingenierosasesores.cl;
- corporate DNS;
- Load Balancer.

### Authorized files/areas

Si el futuro Issue lo autoriza:

- docs/engineering/OCI_POC_RUNBOOK.md;
- deploy/oci/Caddyfile.example;
- deploy/oci/g-inf-01.service.example.

No application code.

### External changes allowed

- configuración VM;
- network rules;
- hostname POC gratuito;
- DNS de ese hostname;
- certificado ACME.

### Human gates

**HUMAN_GATE_DOMAIN obligatorio antes de crear/modificar hostname POC.**

HUMAN_GATE_GOOGLE_CONFIG no aplica.

### Tests

- systemctl start/stop/restart;
- restart on failure;
- port 3000 no reachable externally;
- 80 redirect;
- 443 valid;
- health por HTTPS;
- Caddy logs sin secrets.

### Acceptance criteria

PASS si:

- service supervisado;
- 3000 privado;
- HTTPS válido;
- hostname costo cero;
- app guest carga;
- ninguna Google config mutada.

### Evidence required

- Caddy/systemd config sanitizada;
- ports;
- TLS issuer/expiry;
- hostname;
- health HTTPS;
- screenshot app;
- costo sigue USD 0.

### STOP

- dominio/hostname requiere pago;
- Caddy requiere secret no previsto;
- TLS no es válido;
- 3000 público;
- Google config parece necesaria para guest.

### Rollback

- retirar hostname POC;
- detener Caddy;
- revertir reglas a estado administrativo mínimo;
- Google hosting sigue activo.

### Expected HH

2.5–4.0 HH.

### Handoff format

~~~text
WORK ITEM: F1-WI-04
SYSTEMD: PASS|FAIL
PORT_3000_PUBLIC: NO|YES
CADDY: PASS|FAIL
HOSTNAME:
HTTPS: PASS|FAIL
HUMAN_GATE_DOMAIN: APPROVED|NOT_APPROVED
GOOGLE_CONFIG_CHANGED: NO
BASE_COST: USD 0|OTHER
STATE:
STOP → SUPERVISOR
~~~

## F1-WI-05 — Guest Analyzer E2E

### Objetivo

Demostrar el valor útil de FASE 1 en OCI: archivos locales → clave temporal → Gemini → resultado validado → DOCX.

### Dependencia

- F1-WI-04 accepted;
- HTTPS POC activo;
- usuario de prueba autorizado dispone de clave temporal Gemini.

### Scope

- UI actual;
- archivos locales no sensibles;
- formatos soportados;
- selección límite;
- temporary key;
- POST /api/guest/analyze;
- validación TITLE_STUDY;
- resultado;
- DOCX;
- errores controlados;
- memoria/latencia aproximada.

### No-scope

- alias propietario como requisito;
- Firebase;
- Firestore;
- Drive;
- Picker;
- Google OAuth;
- corporate domain.

### Authorized files/areas

- docs/engineering/OCI_POC_RUNBOOK.md

No código salvo un Work Item nuevo si aparece blocker real.

### External changes allowed

- llamadas Gemini iniciadas por usuario con clave temporal.

No Google Console mutation.

### Human gates

Ninguno adicional.
La clave Gemini nunca se pide ni registra en handoff.

### Tests

Caso positivo:

~~~text
open
→ local files
→ temporary Gemini key
→ analyze
→ valid TITLE_STUDY
→ result
→ DOCX
~~~

Casos negativos mínimos:

- sin clave;
- sin archivos;
- archivo no legible;
- límite excedido;
- provider 401/403;
- provider 429/error;
- DOCX invalid payload;
- refresh/navigation behavior documentado.

### Acceptance criteria

PASS si el flujo principal produce resultado validado y DOCX desde OCI sin Firebase/Drive/OAuth.

### Evidence required

- SHA;
- hostname;
- test cases;
- PASS/FAIL;
- latencia aproximada;
- RAM;
- screenshot sanitizada;
- DOCX sample no sensible;
- logs sin API key.

### STOP

- clave aparece en log;
- guest flow depende de Firebase/Drive;
- cambio de código requerido;
- OOM;
- costo OCI deja de ser USD 0.

### Rollback

Dejar de usar hostname OCI y volver al hosting Google.

### Expected HH

1.5–2.5 HH.

### Handoff format

~~~text
WORK ITEM: F1-WI-05
GUEST_UI: PASS|FAIL
LOCAL_FILES: PASS|FAIL
TEMP_GEMINI_KEY: PASS|FAIL
ANALYSIS: PASS|FAIL
VALIDATED_RESULT: PASS|FAIL
DOCX: PASS|FAIL
FIREBASE_REQUIRED: NO|YES
DRIVE_REQUIRED: NO|YES
SECRET_LOGGED: NO|YES
STATE:
STOP → SUPERVISOR
~~~

## F1-WI-06 — Recovery, Rollback, Observation, Phase-1 Acceptance

### Objetivo

Demostrar que el runtime OCI de FASE 1 es reemplazable y que el retorno al hosting Google es inmediato y seguro.

### Dependencia

- F1-WI-05 accepted.

### Scope

- reboot;
- systemd/Caddy recovery;
- health;
- guest smoke;
- release rollback;
- reconstrucción documentada;
- observar CPU/RAM/network/disk;
- observar costo;
- registrar capacity/reclaim signals;
- validar Google hosting rollback;
- cierre de FASE 1.

### No-scope

- Auth;
- Firestore;
- Drive;
- OAuth;
- corporate DNS;
- production cutover.

### Authorized files/areas

- docs/engineering/OCI_POC_RUNBOOK.md;
- docs de operación autorizadas por el Issue futuro.

### External changes allowed

- reboot;
- rollback de release;
- eventual reprovision sólo si existe autorización vigente y costo sigue USD 0.

### Human gates

No nuevo gate para pruebas no destructivas.
Si se requiere crear una nueva VM para recovery real y la autorización previa no cubre la recreación: HUMAN_GATE_CREATE_OCI de nuevo.

### Tests

- reboot;
- service auto-start;
- HTTPS;
- guest smoke;
- release rollback;
- rebuild procedure walkthrough;
- cost check;
- Google host still available.

### Acceptance criteria

PASS si:

- reboot recupera servicio;
- rollback de release funciona;
- procedimiento de rebuild es reproducible;
- no hay datos únicos OCI;
- costo observado USD 0;
- Google hosting sigue operativo.

### Evidence required

- timestamps;
- service states;
- health;
- release SHAs;
- cost screenshot;
- observation summary;
- rollback check.

### STOP

- paid line item;
- reclaim/inestabilidad no aceptada;
- rollback Google roto;
- estado único local;
- recovery depende de secreto no recuperable.

### Rollback

Volver completamente al hosting Google y terminar OCI si el Humano decide abandonar el POC.

### Expected HH

2.0–3.5 HH.

### Handoff format

~~~text
WORK ITEM: F1-WI-06
REBOOT: PASS|FAIL
RELEASE_ROLLBACK: PASS|FAIL
REBUILD: PASS|FAIL|DOCUMENTED_ONLY
GOOGLE_HOST_ROLLBACK: PASS|FAIL
OBSERVED_OCI_COST: USD 0|OTHER|UNKNOWN
PHASE_1_STATE: ACCEPTANCE_READY|BLOCKED
OPEN_RISKS:
STOP → SUPERVISOR
~~~

# 10. FASE 1 — Definition of Done

FASE 1 está lista para aceptación sólo si:

1. A1 real ejecuta el SHA aprobado;
2. ARM64 está demostrado;
3. app se inicia con systemd;
4. Caddy sirve HTTPS;
5. hostname POC cuesta USD 0;
6. 3000 no está expuesto;
7. /api/health pasa;
8. la interfaz actual carga;
9. selección local funciona;
10. clave temporal funciona;
11. análisis Gemini funciona;
12. resultado TITLE_STUDY se valida;
13. resultado se muestra;
14. DOCX se genera/descarga;
15. Firebase/Drive/OAuth no fueron necesarios;
16. Google hosting continúa disponible;
17. costo OCI observado sigue USD 0;
18. no se cambió código para conseguirlo;
19. rollback/recovery están documentados;
20. Supervisor acepta evidencia.

FASE 1 no necesita demostrar ningún flujo autenticado.

# 11. Descomposición de FASE 2

FASE 2 sólo se propone; no se ejecuta ni crea desde #104.

## Resumen

| ID propuesto | Objetivo | HH |
|---|---|---:|
| F2-WI-01 | Firebase Auth / Google Sign-In | 1.5–2.5 |
| F2-WI-02 | Firestore proyectos/historial | 1.5–2.5 |
| F2-WI-03 | Drive + GIS + Picker | 2.5–4.0 |
| F2-WI-04 | app.ingenierosasesores.cl + Google origin config | 1.5–3.0 |
| F2-WI-05 | E2E autenticado + recovery | 2.0–3.5 |
| F2-WI-06 | Cutover estable | 2.0–4.0 |
| Contingencia FASE 2 | integraciones externas | 1.0–2.0 |

**FASE 2 estimada: 12–22 HH de ingeniería activa.**

**Total FASE 1 + FASE 2: 23–41 HH**, sin contar esperas externas ni observación calendario.

## F2-WI-01 — Firebase Authentication / Google Sign-In

### Objetivo

Habilitar Google Sign-In sobre el hostname OCI aprobado sin cambiar el guest flow.

### Dependencia

- FASE 1 accepted.

### Scope

- Firebase Authorized Domain;
- OAuth authorized origin si aplica al flujo Firebase;
- signInWithPopup;
- logout;
- session restoration;
- errores.

### No-scope

- Firestore business flows;
- Drive;
- Picker;
- corporate cutover.

### Authorized files/areas

Preferencia: documentación/runbook y configuración externa.
Código sólo si evidencia demuestra incompatibilidad y el Issue autoriza paths exactos.

### External changes allowed

Sólo cambios Google/Firebase enumerados y aprobados.

### Human gates

**HUMAN_GATE_GOOGLE_CONFIG obligatorio.**

### Tests

- unauthenticated guest sigue funcionando;
- login popup;
- logout;
- refresh/session;
- failure/retry.

### Acceptance criteria

Auth funciona en OCI y guest no regresa.

### Evidence required

Before/after sanitizado de Authorized Domains/origins + E2E auth.

### STOP

- requiere nuevo scope;
- requiere paid service;
- requiere client secret en frontend;
- cambio no incluido en gate.

### Rollback

Retirar entradas del hostname OCI añadidas en este WI; mantener config previa y guest.

### Expected HH

1.5–2.5 HH.

### Handoff format

~~~text
WORK ITEM: F2-WI-01
HUMAN_GATE_GOOGLE_CONFIG:
FIREBASE_AUTH: PASS|FAIL
GOOGLE_SIGN_IN: PASS|FAIL
GUEST_REGRESSION: PASS|FAIL
EXTERNAL_CHANGES:
ROLLBACK:
STATE:
STOP → SUPERVISOR
~~~

## F2-WI-02 — Firestore Projects / History

### Objetivo

Restaurar proyectos persistentes e historial sobre el mismo backend Firestore.

### Dependencia

- F2-WI-01 accepted.

### Scope

- databaseId real;
- create/list/open project;
- UID isolation;
- persisted analysis/report history;
- rules behavior.

### No-scope

- Drive/Picker;
- data migration;
- schema change;
- rules rewrite salvo issue separado.

### Authorized files/areas

- runbook/evidence;
- no schema/rules unless defect separado y autorizado.

### External changes allowed

Ninguna mutación estructural; sólo uso del Firestore existente para pruebas autorizadas.

### Human gates

HUMAN_GATE_GOOGLE_CONFIG sólo si surge cambio de config no cubierto.

### Tests

- CRUD funcional previsto;
- other-UID denial;
- history;
- reopen;
- Firestore Rules tests.

### Acceptance criteria

Persistencia existente funciona desde OCI sin migración.

### Evidence required

test matrix, project IDs sanitizados, rules results.

### STOP

- data migration necesaria;
- rules/schema change requerido;
- acceso cross-user.

### Rollback

Eliminar datos de prueba si corresponde; guest y Google hosting siguen.

### Expected HH

1.5–2.5 HH.

### Handoff format

~~~text
WORK ITEM: F2-WI-02
FIRESTORE: PASS|FAIL
DATABASE_ID: CONFIRMED|UNKNOWN
PROJECTS: PASS|FAIL
HISTORY: PASS|FAIL
UID_ISOLATION: PASS|FAIL
SCHEMA_CHANGE: NO|REQUIRED
STATE:
STOP → SUPERVISOR
~~~

## F2-WI-03 — Drive / GIS / Picker

### Objetivo

Habilitar almacenamiento/selección Drive y Picker sobre OCI con el scope actual.

### Dependencia

- F2-WI-02 accepted.

### Scope

- GIS token client;
- drive.file;
- authorized JS origin;
- Picker API;
- API key referrer restrictions;
- docs.google.com restriction;
- upload/read/select;
- revoked token handling.

### No-scope

- ampliar OAuth scopes;
- migrar a Object Storage;
- crear file browser propio;
- corporate cutover.

### Authorized files/areas

- runbook/evidence;
- código sólo con issue separado si config externa no basta.

### External changes allowed

Cambios mínimos Google aprobados para hostname OCI.

### Human gates

**HUMAN_GATE_GOOGLE_CONFIG obligatorio para el diff exacto.**

### Tests

- authorize;
- scope;
- picker open/cancel;
- upload;
- read;
- folder flow;
- revoke/reauthorize.

### Acceptance criteria

Drive/Picker funcionan sin ampliar scope ni cambiar arquitectura.

### Evidence required

before/after config sanitizado, scope observado, E2E Drive.

### STOP

- scope adicional requerido;
- credencial nueva no aprobada;
- billing requerido;
- arquitectura nueva.

### Rollback

Retirar origin/referrer agregado y volver a Google host/guest.

### Expected HH

2.5–4.0 HH.

### Handoff format

~~~text
WORK ITEM: F2-WI-03
HUMAN_GATE_GOOGLE_CONFIG:
DRIVE_AUTH: PASS|FAIL
SCOPE_DRIVE_FILE: PASS|FAIL
PICKER: PASS|FAIL
UPLOAD_READ: PASS|FAIL
NEW_SCOPE_REQUIRED: NO|YES
STATE:
STOP → SUPERVISOR
~~~

## F2-WI-04 — Corporate Hostname app.ingenierosasesores.cl

### Objetivo

Añadir hostname corporativo estable sin afectar WordPress ni retirar el hostname POC.

### Dependencia

- F2-WI-03 accepted;
- acceso DNS corporativo disponible.

### Scope

- app.ingenierosasesores.cl;
- registro DNS;
- Caddy/TLS;
- Firebase Authorized Domain;
- OAuth origin;
- Picker referrer;
- E2E smoke;
- coexistencia POC.

### No-scope

- apex;
- www;
- WordPress;
- cutover final;
- desmantelar POC.

### Authorized files/areas

- runbook;
- configs example si Issue los autoriza.

### External changes allowed

DNS del subdominio app + Google config exacta aprobada.

### Human gates

- **HUMAN_GATE_DOMAIN**
- **HUMAN_GATE_GOOGLE_CONFIG**

Ambos explícitos.

### Tests

- DNS;
- TLS;
- guest;
- auth;
- Firestore;
- Drive/Picker.

### Acceptance criteria

Hostname corporativo sirve todo lo ya aceptado y WordPress sigue sin cambios.

### Evidence required

DNS before/after, TLS, E2E, WordPress smoke.

### STOP

- no acceso DNS;
- cambio toca apex/WWW;
- Google config inesperada;
- costo no cero.

### Rollback

Retirar/revertir sólo registro app y entradas Google nuevas; POC/Google host permanecen.

### Expected HH

1.5–3.0 HH.

### Handoff format

~~~text
WORK ITEM: F2-WI-04
HUMAN_GATE_DOMAIN:
HUMAN_GATE_GOOGLE_CONFIG:
APP_HOSTNAME: PASS|FAIL
TLS: PASS|FAIL
WORDPRESS_UNCHANGED: PASS|FAIL
E2E_SMOKE: PASS|FAIL
STATE:
STOP → SUPERVISOR
~~~

## F2-WI-05 — Authenticated E2E + Recovery

### Objetivo

Probar el producto integrado completo sobre el hostname corporativo antes de cualquier cutover.

### Dependencia

- F2-WI-04 accepted.

### Scope

- login;
- project;
- documents;
- Drive;
- analysis;
- JSON;
- DOCX;
- persistence;
- history;
- reopen;
- reboot;
- release rollback;
- guest regression.

### No-scope

- cambiar DNS de tráfico final;
- apagar Google hosting.

### Authorized files/areas

- runbook/evidence.

### External changes allowed

Sólo datos de prueba autorizados.

### Human gates

No nuevo gate si no hay mutaciones.
Cualquier config adicional vuelve al gate correspondiente.

### Tests

E2E completo + casos negativos + recovery.

### Acceptance criteria

Guest y authenticated flows pasan después de reboot y release rollback.

### Evidence required

checklist exacto, SHA, hostname, timestamps, failures.

### STOP

- guest regression;
- auth/data loss;
- recovery falla;
- costo cambia.

### Rollback

Volver a hostname/hosting ya aceptado; no cutover.

### Expected HH

2.0–3.5 HH.

### Handoff format

~~~text
WORK ITEM: F2-WI-05
GUEST_E2E: PASS|FAIL
AUTH_E2E: PASS|FAIL
FIRESTORE: PASS|FAIL
DRIVE_PICKER: PASS|FAIL
DOCX: PASS|FAIL
REBOOT: PASS|FAIL
ROLLBACK: PASS|FAIL
CUTOVER_AUTHORIZED: NO
STATE:
STOP → SUPERVISOR
~~~

## F2-WI-06 — Stable Cutover

### Objetivo

Cambiar el acceso productivo a OCI sólo después de aceptación humana explícita, conservando rollback.

### Dependencia

- F2-WI-05 accepted;
- período de observación cumplido;
- costo USD 0 confirmado.

### Scope

- plan de cutover;
- TTL;
- traffic switch;
- smoke;
- monitoreo;
- rollback window;
- mantener Google hosting durante ventana acordada.

### No-scope

- retirar Google hosting en el mismo acto;
- migrar servicios Google;
- cambiar datos.

### Authorized files/areas

- runbook/cutover checklist;
- arquitectura documental si se autoriza en Issue separado.

### External changes allowed

Sólo el cambio de tráfico/DNS exacto aprobado.

### Human gates

**HUMAN_GATE_CUTOVER obligatorio.**

### Tests

- pre-cutover E2E;
- post-cutover guest/auth E2E;
- health;
- monitoring;
- rollback drill/ability.

### Acceptance criteria

Tráfico principal usa OCI, sin regresión, y Google hosting sigue utilizable durante rollback window.

### Evidence required

approval, before/after DNS, timestamps, smoke/E2E, cost.

### STOP

- gate no aprobado;
- costo no cero;
- E2E falla;
- rollback no disponible.

### Rollback

Revertir el acceso al hosting Google.

### Expected HH

2.0–4.0 HH.

### Handoff format

~~~text
WORK ITEM: F2-WI-06
HUMAN_GATE_CUTOVER:
PRE_CUTOVER_E2E: PASS|FAIL
CUTOVER: PASS|FAIL|NOT_EXECUTED
POST_CUTOVER_E2E: PASS|FAIL|NOT_EXECUTED
GOOGLE_ROLLBACK_AVAILABLE: YES|NO
OBSERVED_COST:
STATE:
STOP → SUPERVISOR
~~~

# 12. Estrategia de secretos

## FASE 1

La única credencial necesaria para el caso principal es la clave Gemini temporal del usuario.

No pedir ni registrar su valor.

No requiere:

- Firebase API config;
- OAuth client;
- Picker key;
- Drive token;
- owner aliases.

Si se usan aliases opcionalmente, pasan a una prueba separada y no pueden convertirse en dependencia de aceptación FASE 1.

## Servidor

Secrets futuros de owner aliases, si se autorizan:

- fuera de Git;
- EnvironmentFile con permisos mínimos;
- no command line;
- no logs;
- no screenshots.

## Información que sí se puede pedir

- home region;
- screenshot de shape/costo sin secretos;
- disponibilidad A1;
- costo estimado;
- hostname POC preferido;
- capacidad de crear/modificar ese hostname;
- SSH public key;
- acceso futuro al DNS corporativo;
- aprobación textual de gates.

## Información que nunca se pide por chat/repo

- Oracle password;
- SSH private key;
- Gemini key;
- DuckDNS token;
- OAuth client secret;
- access/refresh token;
- banking credentials;
- Firebase secrets;
- service-account private keys;
- datos personales innecesarios.

# 13. Seguridad

- SSH key only;
- 22 restringido;
- 80/443 público;
- 3000 no público;
- Node no root;
- service user;
- Caddy reverse proxy;
- firewall OCI + host;
- secrets fuera de Git;
- logs sin Authorization/API keys/request bodies documentales;
- Ubuntu security updates;
- Node version registrada;
- no npm update manual;
- mínimo privilegio.

# 14. Rollback y reconstrucción

## FASE 1

Rollback principal:

~~~text
OCI guest endpoint falla
→ dejar de usar hostname POC
→ volver al hosting Google actual
~~~

No hay DNS corporativo que revertir.

Rebuild:

1. nueva VM A1 sólo con gate/costo válido;
2. Node 24;
3. Caddy;
4. systemd;
5. release SHA;
6. configuración operativa;
7. hostname POC actualizado;
8. health;
9. guest E2E.

No datos de negocio únicos en OCI.

## FASE 2

Además:

- revertir app.ingenierosasesores.cl;
- retirar origins temporales sólo si se abandona;
- conservar Firestore/Drive sin migración.

# 15. Riesgos actualizados

| Riesgo | Fase | Probabilidad | Impacto | Mitigación | STOP |
|---|---|---|---|---|---|
| A1 sin capacidad | 1 | media | alto | esperar/AD válido | no paid fallback |
| A1 no free | 1 | desconocida | alto | console gate | cualquier costo |
| public IPv4 cobrado | 1 | desconocida | alto | console gate | cargo |
| ARM64 incompatibilidad | 1 | baja-media | alto | test real | code/dependency change |
| 4 GB insuficiente | 1 | baja-media | medio | medir; 6 GB sólo free | OOM sin margen |
| Free Tier reclaim | 1 | material | alto | rebuild + Google rollback | inestabilidad no aceptada |
| hostname POC falla | 1 | baja-media | medio | proveedor gratuito alternativo aprobado | compra requerida |
| TLS falla | 1 | baja | medio | Caddy/DNS checks | no HTTPS |
| Gemini key expuesta | 1 | controlable | crítico | no logs/no persistence | leak |
| Gemini quota/provider | 1 | externa | medio | error controlado | paid requirement |
| Firebase/OAuth | 2 | media | alto | gate/config exacta | bloquea sólo F2 |
| Drive/Picker | 2 | media | medio-alto | scope actual + tests | scope mayor |
| DNS corporativo sin acceso | 2 | alta hoy | alto | no bloquear F1 | no cutover |
| WordPress afectado | 2 | baja | crítico | sólo app subdomain | apex/www change |
| cutover prematuro | 2 | controlable | crítico | HUMAN_GATE_CUTOVER | gate ausente |
| cambio política Free Tier | 1/2 | media largo plazo | alto | revalidar costo | cost > 0 |

# 16. HH consolidadas

## FASE 1 — Oracle Core / Document Analyzer

| Actividad | HH |
|---|---:|
| Baseline + guest isolation | 1.0–2.0 |
| Account/cost + provisioning | 1.5–2.5 |
| ARM64/build/runtime | 1.5–2.5 |
| systemd/network/Caddy/HTTPS | 2.5–4.0 |
| guest E2E/Gemini/DOCX | 1.5–2.5 |
| recovery/rollback/observation | 2.0–3.5 |
| contingencia | 1.0–2.0 |
| **TOTAL FASE 1** | **11–19 HH** |

## FASE 2 — Integrations

| Actividad | HH |
|---|---:|
| Firebase Auth | 1.5–2.5 |
| Firestore | 1.5–2.5 |
| Drive/GIS/Picker | 2.5–4.0 |
| corporate hostname + Google config | 1.5–3.0 |
| authenticated E2E/recovery | 2.0–3.5 |
| cutover | 2.0–4.0 |
| contingencia | 1.0–2.0 |
| **TOTAL FASE 2** | **12–22 HH** |

## Total programa

**23–41 HH de ingeniería activa** si no hay rediseño.

Factores fuera de HH activa:

- espera por A1;
- propagación DNS;
- revisión humana;
- observación calendario;
- verificación OAuth si fuera exigida en FASE 2;
- outages externos.

La nueva secuencia reduce el time-to-useful-Oracle porque FASE 1 ya no espera Auth, Firestore, Drive, Picker, OAuth ni DNS corporativo.

# 17. Work Item contingente de código

No se propone como trabajo normal porque el código actual permite FASE 1.

Sólo si F1-WI-01 o F1-WI-05 demuestra un blocker real:

## F1-CODE-BLOCKER — Guest Mode Isolation Fix

### Objetivo

Eliminar únicamente la dependencia accidental que impida ejecutar guest mode sin Google configuration.

### Dependencia

- evidencia reproducible de blocker;
- Supervisor REWORK/authorization.

### Scope

El menor cambio posible en el punto exacto demostrado.

### No-scope

- rediseño UI;
- eliminar Firebase/Drive;
- cambiar business logic;
- nuevas features;
- dependencias salvo evidencia estricta y autorización explícita.

### Authorized files/areas

Se definen en el Issue según el stack trace/evidencia; no se preautoriza ningún path.

### External changes allowed

NONE.

### Human gates

Ningún gate cloud; el gate es workflow/Supervisor.

### Tests

- regresión específica;
- full CI;
- guest E2E sin Firebase/Drive config.

### Acceptance criteria

Guest mode funciona con integraciones autenticadas unavailable y no cambia su comportamiento con config presente.

### Evidence required

before failing test, after passing test, aggregate diff, exact-head CI.

### STOP

- fix requiere architecture change;
- dependency migration;
- scope expansion.

### Rollback

Revert PR; Google hosting intacto.

### Expected HH

1–3 HH si el blocker es local. Si excede, reestimar antes de implementar.

### Handoff format

~~~text
WORK ITEM: F1-CODE-BLOCKER
REPRODUCED_BLOCKER:
FILES_CHANGED:
TEST_ADDED:
GUEST_WITHOUT_GOOGLE: PASS|FAIL
FULL_CI: PASS|FAIL
SCOPE_EXPANSION: NO|YES
STATE:
STOP → SUPERVISOR
~~~

# 18. Cambios de repositorio previstos por fase

## FASE 1

Posibles archivos en Work Items autorizados:

- docs/engineering/OCI_POC_RUNBOOK.md;
- deploy/oci/Caddyfile.example;
- deploy/oci/g-inf-01.service.example;
- scripts pequeños de operación bajo deploy/oci sólo si el Issue los autoriza.

No se necesita cambio de aplicación para el plan actual.

## FASE 2

Posibles:

- documentación de integración;
- deployment/cutover checklist;
- workflow de deploy sólo en Issue separado;
- actualización de SOFTWARE_ARCHITECTURE después de decisión estable.

## No tocar sin Issue separado

- TITLE_STUDY schema;
- prompts;
- renderer;
- business logic;
- Firestore schema/rules;
- provider/model;
- package dependencies;
- data migration.

# 19. Revalidación de fuentes externas

Este REWORK cambia secuenciación por decisión humana y por evidencia del repositorio; no introduce una nueva decisión de proveedor que requiera reemplazar la investigación #101.

Fuentes conservadas, consultadas originalmente el 2026-10-03:

- Oracle Always Free Resources:
  https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm
- Oracle Free Tier:
  https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier.htm
- Oracle Free FAQ:
  https://www.oracle.com/latam/cloud/free/faq/
- Oracle Public IP:
  https://docs.oracle.com/en-us/iaas/Content/Network/Tasks/managingpublicIPs.htm
- Caddy Automatic HTTPS:
  https://caddyserver.com/docs/automatic-https
- Node.js 24 archive:
  https://nodejs.org/en/download/archive/v24.21.0
- Firebase Google Sign-In:
  https://firebase.google.com/docs/auth/web/google-signin
- Google OAuth web:
  https://developers.google.com/identity/protocols/oauth2/javascript-implicit-flow
- Google Picker:
  https://developers.google.com/workspace/drive/picker/guides/web-picker
- DuckDNS:
  https://www.duckdns.org/about.jsp

FASE 1 sólo usa las fuentes OCI/Caddy/Node/hostname. Las fuentes Firebase/OAuth/Picker pasan a FASE 2.

# 20. Open questions

## FASE 1

1. ¿La tenancy real muestra A1 1 OCPU/4 GB como free/elegible?
2. ¿Public IPv4 aparece con costo base USD 0?
3. ¿Hay capacidad A1 en Santiago?
4. ¿4 GB bastan para build y análisis representativo?
5. ¿ARM64 completa npm ci/build/test sin problema native?
6. ¿Qué hostname POC gratuito aprueba el Humano?
7. ¿Qué período de observación mínimo se exigirá?
8. ¿La política idle/reclaim es aceptable para el uso esperado?

## FASE 2

1. ¿Cuándo habrá acceso DNS de ingenierosasesores.cl?
2. ¿El mismo Firebase project seguirá siendo la opción elegida?
3. ¿Se reutilizan OAuth/Picker credentials actuales?
4. ¿El Humano quiere mantener Google integrations o evaluar reemplazos?
5. ¿Qué ventana de rollback se exige antes de retirar hosting Google?

# 21. Criterio de aceptación de la estrategia rework

El Supervisor debe poder responder desde este documento:

1. qué entrega FASE 1;
2. por qué FASE 1 no necesita Firebase/Drive/OAuth;
3. que el código actual falla de forma segura sin esas integraciones;
4. qué Work Item se ejecuta primero;
5. qué gate crea OCI;
6. qué gate habilita hostname POC;
7. por qué Google config se posterga;
8. cuánto cuesta el objetivo;
9. cuántas HH requiere FASE 1;
10. cuántas HH agrega FASE 2;
11. cómo se vuelve a Google;
12. qué hacer si ARM64 o guest isolation requiere código.

# 22. Resultado

~~~text
PHASE_1:
Oracle Core / Document Analyzer
guest-only
local files
temporary Gemini key
analysis
validated result
DOCX
A1 ARM64
systemd
Caddy
HTTPS
USD 0 target
Google hosting rollback
NO Firebase/Auth/Firestore/Drive/Picker/OAuth dependency

PHASE_2:
Firebase Auth
Firestore
Drive
Picker
OAuth
corporate hostname
authenticated E2E
cutover

PHASE_1_CODE_CHANGE_REQUIRED:
NO, based on current repository evidence

EXTERNAL CHANGES PERFORMED BY #104:
NONE

CODE CHANGES PERFORMED BY #104:
NONE

ISSUES CREATED BY #104:
NONE

MIGRATION EXECUTED:
NO
~~~

# 23. Handoff esperado de #104

~~~text
WORK ITEM: #104

BASE:
9f20b49e57aa065650fa3b0005b622b10dca33f8

BRANCH:
strategy/issue-104-oci-migration

PR:
#105

STRATEGY DOCUMENT:
docs/engineering/OCI_MIGRATION_STRATEGY.md

PHASE_1:
DOCUMENTED

PHASE_1_NO_CODE:
VERIFIED_FROM_REPOSITORY

PHASE_2:
DOCUMENTED

ZERO_COST_STRATEGY:
DOCUMENTED

WORK_ITEM_DECOMPOSITION:
PROPOSED

HUMAN_GATES:
DOCUMENTED

ROLLBACK:
DOCUMENTED

PHASE_1_HH:
11–19

PHASE_2_HH:
12–22

EXTERNAL_CHANGES_PERFORMED:
NONE

CODE_CHANGES:
NONE

STATE:
READY_FOR_REVIEW

STOP → SUPERVISOR
~~~
