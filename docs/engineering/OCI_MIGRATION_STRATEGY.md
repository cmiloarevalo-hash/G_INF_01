# OCI Migration Strategy — G_INF_01

**Work Item:** Issue #104 — STRATEGY_GATE: plan de traslado OCI antes de implementación  
**Repository:** `cmiloarevalo-hash/G_INF_01`  
**Base revisada:** `main@9f20b49e57aa065650fa3b0005b622b10dca33f8`  
**Fecha de revisión externa:** 2026-10-03  
**Estado del documento:** estrategia previa a implementación. No ejecuta migración ni concede autoridad para crear o modificar recursos externos.

## 0. Autoridad, propósito y reglas de no ejecución

Este documento convierte la investigación aceptada de Issue #101 / PR #102 y el POC futuro de Issue #103 en un plan de ejecución verificable para el Supervisor/Humano.

Issue #103 está **pausado** mientras #104 no sea revisado y aceptado. La existencia de este documento no levanta ese HOLD y no aprueba implícitamente ninguna operación.

Durante #104:

- no crear VM, VCN, subnet, IP, volumen, presupuesto, cuota ni otro recurso OCI;
- no hacer Upgrade / Pay As You Go;
- no consumir créditos promocionales como justificación económica;
- no crear hostname DuckDNS ni otro recurso DNS;
- no comprar dominio;
- no modificar `ingenierosasesores.cl` ni sus DNS;
- no modificar Firebase Authorized Domains;
- no modificar OAuth clients/origins/redirect URIs;
- no modificar API keys o restricciones de Google Picker;
- no introducir secrets;
- no desplegar;
- no modificar código, dependencias, workflows ni arquitectura canónica.

La meta futura es **OCI mensual objetivo USD 0**, usando únicamente recursos que la cuenta real confirme como gratuitos/elegibles sin depender de créditos promocionales. Cualquier costo previsto o inferido distinto de cero es un **HARD STOP**.

## 0.1 Evidencia previa incorporada

### Issue #101 / PR #102

La investigación ya aceptada estableció que el runtime puede separarse del hosting Google sin migrar servicios funcionales:

- Node.js + Express;
- React/Vite servido por Express;
- DOCX en Node;
- Firebase Authentication;
- Firestore Web SDK con `databaseId` opcional;
- Google Identity Services;
- Google Drive / Picker;
- Gemini por HTTPS.

PR #102 fue merged como `9f20b49e57aa065650fa3b0005b622b10dca33f8`.

### Issue #103

El POC futuro contiene una secuencia técnica detallada, pero quedó pausado por `STRATEGY_GATE ACTIVE`.

La última autorización humana relevante registrada antes de la pausa fijó:

- una única `VM.Standard.A1.Flex`;
- **inicio en 1 OCPU / 4 GB RAM**;
- subir a 6 GB sólo si una medición demuestra necesidad y la consola sigue confirmando costo cero/elegibilidad;
- boot volume objetivo ~50 GB;
- no Load Balancer, NAT Gateway, Oracle DB, OKE, Object Storage, Vault, OCI DevOps ni backup pagado;
- hosting Google activo como rollback;
- Firebase Auth, Firestore, Drive/Picker/GIS y Gemini se mantienen;
- no migrar datos funcionales.

Esas restricciones se conservan aquí.

## 0.2 Convenciones

- **REPO FACT:** observado en `main@9f20b49...`.
- **EXTERNAL FACT:** respaldado por fuente oficial o, para DuckDNS, por documentación del propio servicio.
- **STRATEGY:** decisión propuesta por este documento.
- **HUMAN GATE:** aprobación humana explícita, nunca inferida.
- **PASS/FAIL:** resultado futuro demostrado con evidencia.
- **HARD STOP:** no continuar automáticamente.
- **ROLLBACK:** operación que devuelve al estado anterior sin pérdida de datos funcionales.

# 1. Estado actual

## 1.1 Arquitectura de ejecución actual

La documentación canónica todavía describe Google AI Studio / Cloud Run como target de publicación. El código actual es portable:

```text
Internet
→ hosting Google actual
→ Node.js 24 / Express
   ├── API /api/*
   ├── /api/health
   ├── Gemini HTTPS
   ├── DOCX
   └── dist/client (React/Vite)

Navegador
   ├── Firebase Authentication
   ├── Firestore Web SDK
   ├── Google Identity Services
   ├── Google Picker
   └── Drive REST API
```

**REPO FACT:**

- `server.ts` lee `PORT`, escucha en `0.0.0.0` y sirve `dist/client` en producción.
- `/api/health` mide sólo disponibilidad del proceso HTTP.
- `signInWithPopup` implementa Google Sign-In de Firebase.
- Firestore se usa desde Firebase Web SDK y admite una base nombrada.
- GIS usa `initTokenClient`.
- Drive solicita exactamente `https://www.googleapis.com/auth/drive.file`.
- Picker carga desde navegador.
- Gemini usa `https://generativelanguage.googleapis.com/v1beta/interactions`.
- `package-lock.json` contiene artefactos de esbuild y Rollup para Linux ARM64; también contiene una dependencia opcional LZMA x64 sin equivalente ARM64 visible, por lo que ARM64 sigue requiriendo POC real.

## 1.2 Qué se traslada a OCI

Sólo el plano de hosting/runtime:

- proceso Node/Express;
- frontend compilado React/Vite servido por Express;
- render DOCX;
- llamada server-side a Gemini;
- terminación TLS/reverse proxy;
- process supervision;
- logs de sistema;
- release/deploy del proceso.

## 1.3 Qué NO se migra

- Firebase Authentication;
- usuarios Firebase;
- Firestore;
- Firestore Security Rules;
- metadata/proyectos/historial Firestore;
- Google Drive;
- documentos/JSON/DOCX almacenados en Drive;
- Google Picker;
- Google Identity Services;
- scope `drive.file`;
- Gemini;
- schemas;
- prompts;
- renderer;
- lógica de negocio.

No existe migración de datos funcionales hacia Oracle.

## 1.4 Persistencia actual

La estrategia depende de que OCI sea un runtime reemplazable:

- GitHub = fuente versionada de código/configuración no secreta;
- Firestore = metadata y estado lógico;
- Drive = documentos y artefactos persistentes;
- OCI VM = código desplegado, runtime, configuración operativa, logs y cachés reemplazables;
- secrets = reinyectables desde un canal autorizado, nunca almacenados en Git.

No se permite que la VM se convierta en fuente única de datos de negocio.

## 1.5 Información conocida de cuenta/dominio

Registrada en #104:

- home region observada: **Chile Central (Santiago)**;
- cuenta: Free Tier / Free Trial;
- no Upgrade PAYG;
- créditos promocionales no justifican arquitectura;
- `ingenierosasesores.cl` sigue en WordPress;
- no existe actualmente acceso cPanel/DNS corporativo disponible para esta ejecución;
- POC puede usar hostname gratuito independiente;
- `app.ingenierosasesores.cl` queda para una transición posterior con acceso DNS y aprobación humana.

## 1.6 Información faltante antes de ejecutar

- que A1 aparezca disponible en la cuenta al momento del POC;
- que la consola muestre `VM.Standard.A1.Flex` como elegible/gratuita;
- costo recurrente efectivo de A1 + boot volume + public IPv4 en esa pantalla, **antes de considerar créditos**;
- disponibilidad de 1 OCPU / 4 GB en home region;
- disponibilidad real de Ubuntu LTS ARM64;
- aceptación de un hostname POC gratuito en la configuración Google existente;
- posibilidad de verificar ese hostname si Google lo exige;
- acceso futuro a DNS de `ingenierosasesores.cl`;
- comportamiento ARM64 real del lockfile;
- consumo de memoria real del build y de un análisis representativo;
- régimen real de reclamación/capacidad observado por la tenancy.

# 2. Arquitectura objetivo

## 2.1 Diagrama

```text
Internet
  ↓
hostname HTTPS
  ↓
public IPv4 OCI
  ↓
VCN + public subnet + Internet Gateway
  ↓
OCI Compute VM.Standard.A1.Flex
  ↓
Caddy :80/:443
  ↓
Node.js 24 / Express :3000
  ├── React/Vite dist/client
  ├── /api/health
  ├── generación DOCX
  └── Gemini HTTPS
        ↓
      Google Gemini

Navegador
  ├── Firebase Authentication (Google)
  ├── Firestore (Google)
  ├── Google Identity Services
  ├── Google Picker
  └── Google Drive API
```

## 2.2 Responsabilidades OCI

OCI queda responsable únicamente de:

- VM Linux;
- CPU/RAM;
- boot volume;
- VNIC;
- public IPv4;
- VCN/subnet/rutas/security rules;
- conectividad inbound 80/443 y SSH restringido;
- conectividad outbound HTTPS/DNS;
- proceso Node;
- Caddy/TLS;
- systemd;
- journald;
- disponibilidad del runtime;
- reconstrucción del host.

## 2.3 Responsabilidades Google que permanecen

Google continúa responsable de:

- identidad Firebase;
- tokens/sesiones Firebase;
- Firestore;
- Security Rules;
- Drive;
- Picker/GIS;
- OAuth;
- archivos y artefactos persistentes;
- Gemini API;
- sus cuotas y condiciones de servicio.

## 2.4 Interfaz entre capas

No se introduce gateway multicloud ni base de datos OCI.

El navegador sigue llamando directamente a Firebase/Firestore y Drive según el código actual. Node sólo necesita salida HTTPS para Gemini y sirve las APIs locales.

## 2.5 Proceso de despliegue

### POC

Ruta deliberadamente simple:

```text
SHA aprobado
→ obtener repositorio/release en VM
→ npm ci
→ npm run build
→ npm test
→ npm start / systemd
→ /api/health
```

La compilación en A1 es parte de la prueba ARM64 y, por tanto, sí debe ejecutarse al menos una vez durante POC.

### Uso estable futuro

Después del POC, un Work Item separado puede pasar a:

```text
main / SHA aprobado
→ CI existente
→ build/test
→ artefacto versionado
→ SSH mínimo
→ /opt/g-inf-01/releases/<sha>
→ current symlink
→ systemctl restart
→ health
→ rollback automático/manual al release previo
```

No se crea ese workflow en #104.

## 2.6 Recuperación/reprovisión

Una VM nueva debe poder reconstruirse con:

1. Ubuntu ARM64 soportado;
2. Node 24;
3. Caddy;
4. usuario de servicio;
5. release exacto de GitHub;
6. EnvironmentFile seguro;
7. systemd unit;
8. Caddyfile;
9. reglas de red reproducibles;
10. hostname/DNS;
11. smoke tests.

La recuperación no depende de restaurar un filesystem completo si GitHub, Firestore, Drive y el canal seguro de secrets están disponibles.

# 3. Estrategia de costo objetivo USD 0

## 3.1 Regla económica

```text
TARGET_OCI_MONTHLY_COST = USD 0
PROMOTIONAL_CREDITS_AS_JUSTIFICATION = FORBIDDEN
PAY_AS_YOU_GO_UPGRADE = FORBIDDEN
NON_ZERO_ESTIMATE = HARD STOP
```

La cuenta puede mostrar créditos de trial, pero esos créditos se ignoran para decidir viabilidad. Un recurso sólo se considera permitido si es elegible por sí mismo como Always Free / Free Tier y su costo recurrente observable, sin offset de créditos, es USD 0.

## 3.2 Recursos OCI estrictamente necesarios

| Recurso | Necesidad | Configuración objetivo POC | Regla de costo |
|---|---|---|---|
| Compute | Ejecutar app | 1 × VM.Standard.A1.Flex | Debe aparecer elegible/gratuita |
| OCPU | Runtime/build | 1 OCPU inicial | No aumentar sin medición + costo cero |
| RAM | Runtime/build | 4 GB inicial | 6 GB sólo si medición lo exige y sigue $0 |
| Boot volume | SO/app | objetivo 50 GB | Debe estar dentro de free allocation |
| VCN | Red | 1 | No añadir servicios extra |
| Public subnet | Acceso web | 1 | Sólo app POC |
| Internet Gateway | inbound/outbound Internet | 1 | Necesario para servidor público |
| Route table | ruta IGW | mínima | Sin rutas complejas |
| Security List o NSG | firewall cloud | mínima | 22 restringido, 80/443 público |
| VNIC | NIC de VM | primaria | estándar |
| Public IPv4 | hostname/TLS | **ephemeral** para POC | La consola debe mostrar $0 |
| Caddy | TLS/proxy | instalado en VM | software, sin servicio OCI adicional |

No se requiere para POC:

- Load Balancer;
- Network Load Balancer;
- NAT Gateway;
- Bastion pagado;
- Oracle Database;
- Autonomous Database;
- PostgreSQL gestionado;
- Object Storage;
- File Storage;
- Block Volume adicional;
- backup pagado;
- OKE/Kubernetes;
- Container Registry como requisito;
- OCI DevOps;
- Vault;
- WAF;
- CDN;
- Functions;
- API Gateway;
- Monitoring avanzado pagado;
- logging externo pagado.

Si una función considerada “estándar” presenta una línea de costo en la cuenta real, deja de estar autorizada.

## 3.3 Baseline Always Free oficial

**EXTERNAL FACT — Oracle, consultado 2026-10-03.**

La documentación Always Free vigente indica:

- Compute Always Free debe crearse en home region;
- A1: 1.500 OCPU-hours + 9.000 GB-hours/mes, equivalente para Always Free tenancy a 2 OCPU + 12 GB;
- Block Volume: 200 GB combinados boot/block;
- cinco volume backups dentro de la asignación documentada;
- boot volume por defecto descrito: 50 GB;
- instancias Always Free idle pueden ser reclamadas;
- falta de capacidad puede producir `out of host capacity`.

Fuentes:

- https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm
- https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier.htm
- https://www.oracle.com/latam/cloud/free/faq/

La estrategia conserva el límite conservador de la documentación OCI. Cualquier cifra distinta en pricing/console no amplía automáticamente el scope.

## 3.4 Configuración inicial recomendada

```text
Shape: VM.Standard.A1.Flex
OCPU: 1
RAM: 4 GB
Boot: ~50 GB
Architecture: ARM64
OS: Ubuntu LTS ARM64 soportado
Public IPv4: ephemeral
Instances: 1
Extra volumes: 0
Paid services: 0
```

### Por qué 4 GB

Issue #103 cambió la recomendación inicial de #101: comenzar en 4 GB y medir.

4 GB:

- reduce consumo de cuota;
- deja capacidad libre dentro del ceiling conservador;
- debería ser suficiente para probar runtime y build en un stack Node moderado;
- no presupone que 6 GB sean necesarios.

### Cuándo subir a 6 GB

Sólo si:

1. A1 ya fue validada como costo cero;
2. una medición muestra OOM, presión sostenida o margen insuficiente;
3. el problema no es una incompatibilidad de arquitectura;
4. la consola confirma que 1 OCPU/6 GB sigue dentro de la asignación gratuita real;
5. el Supervisor acepta la evidencia.

No subir por comodidad.

## 3.5 ARM64 como estrategia, no como supuesto

Node.js 24 publica binarios Linux ARM64 oficialmente.

Fuente:
- https://nodejs.org/en/download/archive/v24.21.0

**REPO FACT:**

- `@esbuild/linux-arm64` existe en lockfile;
- `@rollup/rollup-linux-arm64-gnu` existe;
- `@rollup/rollup-linux-arm64-musl` existe;
- `fsevents` es optional/Darwin;
- existe una dependencia optional `@napi-rs/lzma-linux-x64-gnu` sin sibling ARM64 visible.

Por ello:

```text
ARM64_DOCUMENTARY_COMPATIBILITY = PLAUSIBLE
ARM64_EXECUTED_COMPATIBILITY = NOT_PROVEN
```

No cambiar dependencias para “hacerlo funcionar” dentro del POC. Si `npm ci`, build o runtime falla por ARM64:

**FAIL → HARD STOP → evidencia → Supervisor → Work Item separado.**

## 3.6 Control de gasto antes de crear

### Control primario

Antes del botón Create:

1. cuenta no actualizada a PAYG;
2. home region confirmada;
3. shape exacta A1;
4. 1 OCPU / 4 GB;
5. boot ~50 GB;
6. una sola VM;
7. public IPv4 requerida;
8. sin add-ons;
9. captura sin datos sensibles que muestre elegibilidad/free label;
10. captura que muestre costo estimado recurrente;
11. validar que el costo es USD 0 **sin aplicar créditos promocionales**.

Si la interfaz sólo muestra “cubierto por créditos” o no permite distinguir costo base de crédito:

**HARD STOP.**

### Control adicional

Oracle documenta:

- Budgets como **soft limits** con alertas; no bloquean gasto.
- Compartment Quotas como controles de consumo más duros mediante `set`/`zero`.

Fuentes:

- https://docs.oracle.com/en-us/iaas/Content/Billing/Concepts/budgetsoverview.htm
- https://docs.oracle.com/en-us/iaas/Content/Quotas/home.htm
- https://docs.oracle.com/en-us/iaas/Content/Quotas/Concepts/quota_policy_syntax.htm

**STRATEGY:** no depender de Budgets para garantizar USD 0. Opcionalmente, un futuro Work Item puede definir quota policies para bloquear familias no autorizadas, pero sólo después de verificar nombres de quota reales en la tenancy. No inventar quota identifiers en el runbook.

## 3.7 Si A1 no tiene capacidad

Oracle documenta `out of host capacity` como condición posible de capacidad.

Ruta:

1. intentar sólo los AD/opciones legítimas que la home region exponga;
2. esperar/reintentar posteriormente;
3. no cambiar a una shape pagada;
4. E2.1.Micro puede evaluarse sólo si aparece explícitamente Free Tier/Always Free y costo USD 0;
5. E2 no se considera equivalente: 1 GB RAM es un riesgo para build/payloads;
6. si A1 y E2 free no están disponibles: `A1_NO_CAPACITY` / `BLOCKED`.

No Upgrade PAYG.

## 3.8 Idle/reclaim

Oracle documenta reclamación de instancias Always Free consideradas idle durante un período de 7 días bajo umbrales de CPU, red y, para A1, memoria.

No se diseñarán keep-alives artificiales ni carga falsa.

Mitigación legítima:

- runtime reproducible;
- no datos únicos locales;
- runbook de reprovision;
- hostname POC actualizable;
- hosting Google todavía disponible;
- observación real.

## 3.9 IP pública

Para el POC se prefiere **ephemeral public IPv4**:

- viene asociada al ciclo del private IP/VNIC;
- es suficiente para DuckDNS;
- no requiere administrar un objeto Reserved Public IP;
- si la VM se reprovisiona y cambia IP, se actualiza el hostname POC.

Oracle documenta los tipos ephemeral/reserved y que la public IP requiere public subnet + Internet Gateway + reglas de red.

Fuentes:

- https://docs.oracle.com/en-us/iaas/Content/Network/Tasks/managingpublicIPs.htm
- https://docs.oracle.com/en-us/iaas/Content/Network/Tasks/assign-public-ip-instance-launch.htm

No se asume costo de public IPv4: **la consola debe confirmar USD 0** para la configuración real.

# 4. Estrategia hostname / dominio

## 4.1 Requisito Google

Google exige para OAuth web:

- JavaScript origins HTTPS, excepto localhost;
- host no puede ser raw IP;
- TLD debe pertenecer a Public Suffix List;
- sólo usar dominios propios, autorizados o licenciados;
- producción puede exigir verificación de dominio.

Fuentes:
- https://developers.google.com/identity/protocols/oauth2/javascript-implicit-flow
- https://developers.google.com/identity/protocols/oauth2/policies
- https://developers.google.com/identity/protocols/oauth2/production-readiness/policy-compliance

Por tanto:

- `http://<PUBLIC_IP>` no valida OAuth;
- `https://<PUBLIC_IP>` tampoco;
- se necesita hostname DNS + certificado público.

## 4.2 POC con hostname gratuito independiente

### Candidato preferido: DuckDNS

DuckDNS declara que ofrece gratuitamente subdominios `*.duckdns.org` apuntados a una IP elegida.

Fuentes:
- https://www.duckdns.org/about.jsp
- https://www.duckdns.org/spec.jsp
- https://www.duckdns.org/tac.jsp

Además, `duckdns.org` está incorporado como private suffix en la Public Suffix List.

Referencia:
- https://bugzilla.mozilla.org/show_bug.cgi?id=1165730
- https://publicsuffix.org/list/

Hostname ilustrativo, **no reservado por este Work Item**:

```text
g-inf-01-poc.duckdns.org
```

El nombre final lo aprueba el Humano en `HUMAN_GATE_DOMAIN`.

### Limitación importante

DuckDNS es apropiado sólo como candidato de POC.

Google OAuth exige usar dominios que se posean o cuyo uso esté autorizado/licenciado y puede exigir verificación del dominio asociado a una app pública/producción. Por tanto, no se declara de antemano que el proyecto Google actual aceptará el hostname DuckDNS en todas sus pantallas/estados.

Antes de cualquier mutación Google:

1. verificar si el hostname es aceptado como Authorized JavaScript Origin;
2. verificar si el proyecto exige Search Console/domain verification;
3. verificar si el usuario puede demostrar el control requerido;
4. si no: **STOP**.

No se compra dominio para superar el bloqueo.

### Opciones rechazadas para POC autenticado

- raw public IP: bloqueado por reglas OAuth;
- `sslip.io` / `nip.io` u hostname automático no controlado: evita gestionar DNS, pero no es preferido porque reduce control del nombre y puede entrar en conflicto con la política de dominio propio/autorizado;
- hostname interno OCI: no es un dominio público estable para OAuth;
- certificado self-signed: no satisface el objetivo HTTPS público.

## 4.3 HTTPS/Caddy

Caddy documenta Automatic HTTPS para hostname público cuando:

- A/AAAA resuelve al servidor;
- 80/443 son accesibles;
- Caddy puede bindearlos;
- data directory es persistente;
- hostname aparece en configuración.

Fuentes:
- https://caddyserver.com/docs/quick-starts/https
- https://caddyserver.com/docs/automatic-https

POC:

```text
<hostname-poc> {
  reverse_proxy 127.0.0.1:3000
}
```

Este fragmento es conceptual; el ejemplo versionado futuro pertenece a #103 o Work Item posterior.

No se necesita el plugin DNS de DuckDNS si el hostname A resuelve a la public IPv4 y 80/443 permiten ACME HTTP/TLS challenge. Evitar plugins reduce superficie y elimina la necesidad de entregar el token DuckDNS a Caddy.

## 4.4 Firebase

Antes de probar Auth:

- agregar hostname POC a Firebase Authentication → Authorized Domains;
- no cambiar `authDomain` por defecto salvo evidencia real de que el flujo actual lo requiera;
- mantener `signInWithPopup`;
- no introducir redirect URIs si el flujo GIS/Drive actual no los usa.

Firebase documenta gestión de Authorized Domains en Authentication Settings.

Fuente:
- https://firebase.google.com/docs/auth/faq-and-troubleshooting
- https://firebase.google.com/docs/auth/web/google-signin

## 4.5 GIS/OAuth

Para Drive/GIS:

- agregar exactamente `https://<hostname-poc>` a Authorized JavaScript Origins;
- scheme/domain/port deben coincidir;
- no añadir redirect URI por especulación;
- conservar el client ID existente si puede reutilizarse;
- no crear client secret para web app; el flujo actual no lo usa;
- no ampliar scope `drive.file`.

## 4.6 Picker/API key

Google Picker documenta:

- website restriction con el dominio de la app;
- `https://docs.google.com/*` debe estar permitido cuando se restringe por websites;
- API key restringida a Picker API y Drive API cuando corresponda;
- App ID y client ID deben pertenecer al mismo proyecto.

Fuente:
- https://developers.google.com/workspace/drive/picker/guides/web-picker

Cambio POC mínimo:

- añadir el referrer/origin POC;
- conservar `https://docs.google.com/*`;
- no ampliar APIs.

## 4.7 Transición futura a app.ingenierosasesores.cl

Cuando haya acceso DNS y aprobación:

```text
POC: g-inf-01-poc.duckdns.org
              ↓ misma app / misma VM o VM reconstruida
STABLE: app.ingenierosasesores.cl
```

No requiere migración de datos ni cambio funcional.

Secuencia futura:

1. `HUMAN_GATE_DOMAIN` confirma control DNS corporativo;
2. crear `app.ingenierosasesores.cl` apuntando al candidato OCI;
3. Caddy obtiene TLS para el hostname corporativo;
4. mantener hostname POC en paralelo;
5. `HUMAN_GATE_GOOGLE_CONFIG`;
6. añadir hostname corporativo a Firebase Authorized Domains;
7. añadir `https://app.ingenierosasesores.cl` a OAuth Authorized JavaScript Origins;
8. añadir referrer corporativo a Picker API key restrictions;
9. E2E completo por hostname corporativo;
10. `HUMAN_GATE_CUTOVER`;
11. dirigir tráfico/usuarios al hostname corporativo;
12. mantener hosting Google y POC durante observación;
13. retirar entradas temporales sólo con evidencia y autorización.

El dominio raíz `ingenierosasesores.cl` y WordPress no se tocan.

# 5. Fases de ejecución futuras

Las fases siguientes describen ejecución futura. #104 no ejecuta ninguna.

## Fase 1 — Revalidación local

**Entrada**
- #104 aceptado;
- #103 reactivado explícitamente;
- SHA de `main` seleccionado.

**Acciones**
- registrar SHA;
- `npm ci`;
- `npm run build`;
- `npm test`;
- `npm run test:firestore-rules`;
- `npm start`;
- GET `/api/health`;
- DOCX local determinista;
- revisar diff desde baseline.

**Evidencia**
- comandos/resultados;
- SHA;
- CI verde;
- health JSON;
- ausencia de cambio funcional.

**PASS**
- todo compila/testea y arranca sin dependencias externas de hosting.

**FAIL**
- baseline no es reproducible.

**STOP**
- cualquier fallo inexplicado o necesidad de cambio de código/dependencias.

**Rollback**
- ninguno: no hay cambio externo.

## Fase 2 — Gate OCI cuenta/costo

**Entrada**
- Fase 1 PASS;
- sesión OCI autorizada;
- `HUMAN_GATE_CREATE_OCI` todavía no consumido.

**Acciones**
- inspección read-only de home region;
- disponibilidad A1;
- free eligibility;
- 1 OCPU / 4 GB;
- boot ~50 GB;
- public IPv4;
- costo base sin créditos.

**Evidencia**
- capturas sin OCIDs/secrets;
- región;
- shape;
- costo;
- etiqueta/elegibilidad.

**PASS**
- configuración exacta es elegible y USD 0 sin créditos.

**FAIL**
- costo > 0, ambigüedad de costo, PAYG requerido o A1 no elegible.

**STOP**
- cualquier línea pagada.

**Rollback**
- ninguno: inspección only.

## Fase 3 — Creación VM

**Entrada**
- Fase 2 PASS;
- **HUMAN_GATE_CREATE_OCI = APPROVED**.

**Acciones**
- una A1 1 OCPU/4 GB;
- Ubuntu ARM64;
- boot ~50 GB;
- public subnet;
- ephemeral IPv4;
- llave SSH pública;
- red mínima.

**Evidencia**
- shape/arquitectura;
- costo post-create;
- recursos creados sin IDs sensibles.

**PASS**
- única VM accesible y recursos siguen USD 0.

**FAIL**
- recurso incorrecto, costo inesperado, capacity error.

**STOP**
- no sustituir por recurso pagado.

**Rollback**
- terminar sólo los recursos creados en la fase; confirmar que no quedan recursos con costo.

## Fase 4 — Prueba ARM64

**Entrada**
- VM creada;
- SSH funcional.

**Acciones**
- `uname -m`;
- instalar Node 24 ARM64;
- obtener SHA exacto;
- `npm ci`;
- build/tests;
- medir RAM/tiempo;
- no corregir dependencias.

**Evidencia**
- `aarch64`/ARM64;
- Node/npm;
- resultados;
- peak memory aproximado;
- errores nativos si existen.

**PASS**
- install/build/tests funcionan sin cambio de dependencia.

**FAIL**
- incompatibilidad ARM64 o OOM reproducible.

**STOP**
- necesidad de cambiar package.json/lockfile/código.

**Rollback**
- destruir/reprovisionar VM si quedó inconsistente; Google intacto.

## Fase 5 — Instalación/runtime

**Entrada**
- ARM64 PASS.

**Acciones**
- usuario `g-inf-01`;
- release dir;
- dependencias runtime;
- configuración no secreta;
- `NODE_ENV=production`;
- ejecución manual inicial.

**Evidencia**
- process owner;
- health local;
- no secretos en command line/logs.

**PASS**
- app sirve frontend/API local.

**FAIL**
- runtime no arranca.

**STOP**
- requiere parche funcional.

**Rollback**
- eliminar release y volver al estado pre-runtime.

## Fase 6 — systemd

**Entrada**
- runtime manual PASS.

**Acciones**
- unit mínima;
- EnvironmentFile;
- restart on failure;
- enable on boot;
- journald.

**Evidencia**
- `systemctl status`;
- stop/start/restart;
- health.

**PASS**
- proceso vuelve correctamente.

**FAIL**
- unidad no confiable.

**STOP**
- permisos/secrets inseguros.

**Rollback**
- disable unit; restaurar ejecución manual.

## Fase 7 — Firewall/red

**Entrada**
- systemd PASS.

**Acciones**
- OCI security rules;
- firewall host;
- 80/443 público;
- 22 restringido;
- bloquear 3000 externo;
- egress DNS/HTTPS.

**Evidencia**
- escaneo/connection checks;
- 3000 no accesible externamente;
- SSH sigue controlado.

**PASS**
- sólo superficie prevista.

**FAIL**
- 3000/SSH expuestos indebidamente o app sin egress.

**STOP**
- no continuar a Internet público con reglas abiertas.

**Rollback**
- restaurar reglas anteriores conocidas.

## Fase 8 — Caddy

**Entrada**
- red PASS.

**Acciones**
- instalar Caddy compatible;
- proxy a `127.0.0.1:3000`;
- HTTP temporal por IP sólo para validar proxy si se necesita.

**Evidencia**
- proxy responde;
- Node no está público.

**PASS**
- Caddy alcanza health/app.

**FAIL**
- proxy no estable.

**STOP**
- no confundir HTTP/IP con OAuth listo.

**Rollback**
- detener Caddy; Node local continúa.

## Fase 9 — Hostname/HTTPS

**Entrada**
- Caddy PASS;
- **HUMAN_GATE_DOMAIN = APPROVED**.

**Acciones**
- crear/usar hostname POC gratuito aprobado;
- apuntar a public IPv4;
- configurar Caddy;
- obtener certificado;
- verificar HTTP→HTTPS.

**Evidencia**
- DNS A;
- certificado público válido;
- HTTPS health;
- renovación/configuración ACME.

**PASS**
- hostname público HTTPS estable.

**FAIL**
- DNS/cert no valida.

**STOP**
- no comprar dominio ni usar certificados inseguros.

**Rollback**
- retirar hostname/config POC; VM sigue disponible por canal admin.

## Fase 10 — Prueba modo invitado

**Entrada**
- HTTPS PASS.

**Acciones**
- UI;
- archivos no sensibles;
- Gemini con clave temporal autorizada;
- análisis;
- JSON;
- DOCX;
- límites/errores;
- medir memoria.

**Evidencia**
- screenshots/resultados sin datos sensibles;
- health;
- memoria;
- DOCX generado.

**PASS**
- flujo invitado equivalente.

**FAIL**
- regresión de hosting/runtime.

**STOP**
- pérdida de datos, secreto en logs, OOM recurrente.

**Rollback**
- dejar de usar hostname OCI; hosting Google intacto.

## Fase 11 — Gate Google configuration

**Entrada**
- guest PASS;
- lista exacta de cambios preparada.

**Acciones**
- presentar cambios mínimos;
- no ejecutarlos todavía.

**Evidencia**
- before-state;
- hostname;
- Firebase domain;
- OAuth origin;
- Picker referrer;
- scope unchanged.

**PASS**
- **HUMAN_GATE_GOOGLE_CONFIG = APPROVED**.

**FAIL**
- aprobación denegada o hostname no verificable/aceptable.

**STOP**
- no mutar Google sin aprobación.

**Rollback**
- ninguno: gate previo.

## Fase 12 — Firebase Auth

**Entrada**
- Google gate aprobado;
- hostname aceptado.

**Acciones**
- añadir Authorized Domain aprobado;
- probar `signInWithPopup`;
- logout/session recovery.

**Evidencia**
- login real;
- user identity;
- errores negativos;
- no client secret.

**PASS**
- Auth equivalente.

**FAIL**
- popup/origin/domain failure.

**STOP**
- requiere rediseñar authDomain/redirect sin issue.

**Rollback**
- retirar sólo la entrada POC si se abandona; conservar configuración previa.

## Fase 13 — Firestore

**Entrada**
- Auth PASS.

**Acciones**
- usar mismo Firebase project;
- confirmar `databaseId`;
- crear/listar/abrir proyecto de prueba;
- historial;
- aislamiento por UID;
- rules negativas.

**Evidencia**
- operaciones reales;
- no migración de datos;
- Security Rules continúan controlando acceso.

**PASS**
- persistencia existente accesible y aislada.

**FAIL**
- acceso indebido o pérdida/corrupción.

**STOP**
- cualquier problema de autorización.

**Rollback**
- eliminar sólo datos de prueba autorizados; usar hosting Google.

## Fase 14 — Drive/Picker

**Entrada**
- Auth/Firestore PASS.

**Acciones**
- OAuth origin POC;
- Picker referrer POC + docs.google.com;
- scope exacto `drive.file`;
- autorizar;
- Picker;
- upload/read;
- folders;
- stale/revoked behavior.

**Evidencia**
- scope observado;
- operaciones reales;
- error 401/reautorización;
- no secrets persistidos.

**PASS**
- Drive/Picker equivalente.

**FAIL**
- origin/key/scope/permission failure.

**STOP**
- necesidad de ampliar scope o crear credenciales no aprobadas.

**Rollback**
- retirar entradas POC añadidas si se abandona; Drive data existente permanece.

## Fase 15 — Gemini

**Entrada**
- runtime e HTTPS PASS.

**Acciones**
- clave temporal;
- owner aliases sólo si su secret provisioning está autorizado;
- error/quota;
- timeout;
- confirmar no persistencia.

**Evidencia**
- request exitoso;
- 403 del alias sin capability cuando aplique;
- logs sin clave.

**PASS**
- Gemini funciona desde OCI.

**FAIL**
- egress/auth/quota distinto no resuelto.

**STOP**
- requiere billing o key nueva no aprobada.

**Rollback**
- retirar secrets OCI; Google hosting sigue.

## Fase 16 — DOCX

**Entrada**
- análisis válido.

**Acciones**
- generar DOCX invitado;
- generar/persistir DOCX autenticado si flujo disponible;
- descargar/reabrir.

**Evidencia**
- MIME/nombre;
- archivo usable;
- referencia/persistencia cuando corresponda.

**PASS**
- DOCX equivalente.

**FAIL**
- renderer/runtime diferente.

**STOP**
- necesidad de cambiar renderer.

**Rollback**
- usar hosting Google; no alterar documentos previos.

## Fase 17 — E2E

**Entrada**
- fases 12–16 PASS.

**Acciones**
- login;
- proyecto;
- documentos;
- Drive;
- análisis;
- JSON;
- DOCX;
- persistencia;
- historial;
- reapertura;
- modo invitado.

**Evidencia**
- checklist E2E;
- SHA;
- hostname;
- resultados;
- casos negativos.

**PASS**
- flujo completo.

**FAIL**
- cualquier tramo esencial falla.

**STOP**
- no pasar a observación/cutover.

**Rollback**
- usuarios vuelven al hosting Google.

## Fase 18 — Reboot/recovery

**Entrada**
- E2E PASS.

**Acciones**
- reboot;
- validar systemd/Caddy/TLS;
- health;
- E2E smoke;
- simular release rollback.

**Evidencia**
- servicio vuelve sin intervención manual indebida;
- logs;
- release anterior recuperable.

**PASS**
- reboot y rollback técnico funcionan.

**FAIL**
- estado oculto/no reproducible.

**STOP**
- VM contiene dependencia manual no documentada.

**Rollback**
- release anterior o Google hosting.

## Fase 19 — Reconstrucción / disaster recovery

**Entrada**
- recovery PASS;
- autorización explícita para la prueba destructiva si se decide ejecutarla.

**Acciones**
- documentar nueva VM desde cero;
- preferentemente demostrar en entorno controlado si capacidad/costo permiten;
- no perder datos funcionales.

**Evidencia**
- tiempos;
- pasos;
- SHA;
- configuración restaurada;
- secretos reinyectados sin exposición.

**PASS**
- runtime reemplazable.

**FAIL**
- existe estado único local.

**STOP**
- no cortar Google.

**Rollback**
- Google hosting; conservar VM original hasta aceptar evidencia.

## Fase 20 — Observación

**Entrada**
- E2E/recovery PASS.

**Acciones**
- observar CPU/RAM/red/disco;
- logs;
- uptime;
- reclaim/capacity signals;
- no carga artificial.

**Evidencia**
- métricas por intervalo;
- incidentes;
- costo observado;
- notificaciones Oracle.

**PASS**
- período definido por Humano/Supervisor sin riesgo no aceptado.

**FAIL**
- reclaim, costo, inestabilidad.

**STOP**
- no avanzar a cutover.

**Rollback**
- continuar en hosting Google.

## Fase 21 — Cutover futuro

**Entrada**
- todas las fases anteriores PASS;
- acceso DNS corporativo;
- `app.ingenierosasesores.cl` listo;
- E2E corporativo PASS;
- observación aceptada.

**Acciones**
- ninguna hasta `HUMAN_GATE_CUTOVER`.

Después del gate, en Work Item separado:

- DNS corporativo;
- Google origins corporativos;
- tráfico a OCI;
- monitoreo;
- mantener Google rollback;
- retiro futuro sólo con otra decisión explícita.

**Evidencia**
- aprobación humana;
- TTL/DNS;
- HTTPS;
- E2E;
- rollback practicable.

**PASS**
- cutover aceptado.

**FAIL**
- cualquier regresión.

**STOP**
- sin gate, no existe cutover.

**Rollback**
- revert DNS/origen de acceso al hosting Google.

# 6. Gates humanos obligatorios

Los cuatro gates son condiciones de workflow, no casillas informales.

## HUMAN_GATE_CREATE_OCI

**Se activa antes de crear cualquier recurso OCI.**

Debe recibir:

- home region;
- screenshot sin secretos;
- A1 shape;
- OCPU/RAM;
- boot volume;
- public IPv4;
- lista exacta de recursos;
- costo base USD 0, sin créditos;
- ausencia de PAYG requirement.

Aprobación válida:

```text
HUMAN_GATE_CREATE_OCI = APPROVED
scope = single A1 POC + minimum network/boot resources
cost = USD 0
```

Cualquier variación requiere nuevo gate.

## HUMAN_GATE_DOMAIN

**Se activa antes de crear/modificar cualquier hostname/DNS externo.**

Para POC debe especificar:

- proveedor gratuito;
- hostname propuesto;
- que no hay compra;
- destino IP;
- reversión.

Para corporativo debe especificar:

- control DNS de `ingenierosasesores.cl`;
- registro exacto `app`;
- TTL;
- no tocar WordPress/apex.

Aprobar DuckDNS POC no aprueba DNS corporativo futuro.

## HUMAN_GATE_GOOGLE_CONFIG

**Se activa antes de Firebase/OAuth/Picker/Google Console.**

Debe presentar diff lógico exacto:

- Firebase Authorized Domain a añadir;
- OAuth Authorized JavaScript Origin a añadir;
- Picker website referrer a añadir;
- mantener `https://docs.google.com/*`;
- scopes sin cambio;
- credentials sin reemplazo salvo evidencia;
- billing sin cambio.

Aprobación de hostname POC no aprueba hostname corporativo: el corporativo requiere un nuevo uso del gate.

## HUMAN_GATE_CUTOVER

**Se activa sólo después de E2E + recovery + observación.**

Debe incluir:

- hostname final;
- evidencia E2E;
- costo observado;
- riesgos abiertos;
- rollback DNS;
- hosting Google todavía operativo;
- duración de observación posterior;
- criterio de retorno.

No puede asumirse por haber aprobado POC.

# 7. Información requerida al Humano

## 7.1 Información que sí se puede pedir

- confirmación de cuenta OCI creada/login funcional;
- home region mostrada;
- screenshots de consola sin secretos/IDs sensibles;
- disponibilidad A1;
- etiqueta de Free Tier/Always Free;
- costo estimado base;
- CPU/RAM/boot volume;
- dominio/hostname disponible;
- capacidad de editar DNS;
- preferencia de subdominio;
- clave SSH **pública**;
- aprobación textual de gates;
- screenshots de configuración Google con valores sensibles ocultos.

## 7.2 Información que nunca se pide por chat/repo

- contraseña Oracle;
- clave SSH privada;
- token DuckDNS;
- Gemini API keys;
- owner alias secrets;
- OAuth client secrets;
- access tokens;
- refresh tokens;
- cookies;
- credenciales bancarias;
- recovery codes;
- secrets Firebase;
- valores privados de service accounts;
- OCIDs/tenancy IDs salvo necesidad técnica excepcional, y nunca versionados;
- documentos personales no necesarios para la prueba.

Si un paso requiere un secreto, el Humano lo introduce directamente en el sistema autorizado; el Implementador documenta el nombre/ubicación lógica, no el valor.

# 8. Cambios de repositorio previstos para ejecución posterior

## 8.1 Archivos que #103 podría crear

Ya contemplados por #103:

- `docs/engineering/OCI_POC_RUNBOOK.md`;
- `deploy/oci/Caddyfile.example`;
- `deploy/oci/g-inf-01.service.example`;
- scripts pequeños no secretos en `deploy/oci/` si reducen error manual y siguen dentro del scope.

## 8.2 Cambios potenciales de uso estable, siempre en Work Item separado

- workflow de deploy;
- release packaging;
- script de deploy/rollback;
- runbook de recovery;
- actualización posterior de arquitectura canónica;
- checklist de cutover.

## 8.3 Archivos/comportamientos que NO se deben tocar sin issue separado

- `src/report-types/title-study/schema.ts`;
- prompts;
- renderer DOCX;
- lógica de negocio;
- Firestore schema;
- Firestore Rules;
- auth flow;
- Drive scope;
- dependencias;
- package-lock;
- provider/model;
- migración de datos;
- persistencia de API keys;
- límites funcionales;
- arquitectura distribuida.

Si ARM64 exige un cambio de dependencia: STOP y issue separado.

# 9. Estrategia de secretos y configuración

## 9.1 Configuración pública

Las variables Firebase web y Google browser son identificadores/configuración cliente, no secretos de servidor, aunque deben protegerse con restricciones adecuadas:

- `VITE_FIREBASE_API_KEY`;
- `VITE_FIREBASE_AUTH_DOMAIN`;
- `VITE_FIREBASE_PROJECT_ID`;
- `VITE_FIREBASE_APP_ID`;
- `VITE_FIREBASE_DATABASE_ID` opcional;
- `VITE_GOOGLE_OAUTH_CLIENT_ID`;
- `VITE_GOOGLE_PICKER_DEVELOPER_KEY`;
- `VITE_GOOGLE_PICKER_APP_ID`.

El Picker developer key debe estar restringido por referrer/APIs.

El Drive config actual es build-time; por eso el POC debe suministrar esas variables al build sin alterar código.

Firebase dispone además de fallback `/api/firebase-config`.

## 9.2 Secrets servidor

Potenciales variables actuales:

- `GEMINI_TEST_KEY_1`;
- `GEMINI_TEST_KEY_2`;
- `GEMINI_TEST_KEY_3`;
- `GEMINI_ALIAS_ACCESS_TOKEN`;
- `GEMINI_ALIAS_MODE`.

Estrategia mínima:

```text
/etc/g-inf-01/g-inf-01.env
owner: root
group: service group only if required
mode: 0600 preferred
systemd EnvironmentFile=
```

No incluir keys en:

- Caddyfile;
- unit file;
- shell history;
- Git;
- logs;
- screenshots;
- process args.

## 9.3 Clave temporal del usuario

El flujo actual recibe la clave temporal por request y no debe persistirla. La migración conserva esa invariantes.

# 10. Seguridad operacional

## 10.1 SSH

- sólo key auth;
- nunca password;
- public key del Humano;
- restringir TCP/22 a origen administrativo conocido cuando sea viable;
- si no hay IP admin estable, usar ventana temporal de allowlist y cerrarla después;
- root login deshabilitado o no usado;
- usuario admin separado del usuario de servicio.

## 10.2 Usuario de servicio

- `g-inf-01` sin login interactivo si es viable;
- no root;
- write sólo en directorios requeridos;
- release dirs root/admin-owned cuando corresponda;
- secretos no legibles por usuarios innecesarios.

## 10.3 Puertos

Públicos:

- TCP 80: ACME + redirect;
- TCP 443: app;
- TCP 22: restringido.

No público:

- TCP 3000.

El código escucha hoy `0.0.0.0`; por tanto, OCI security rules + host firewall son obligatorios para impedir exposición del 3000 sin cambiar código.

## 10.4 Caddy

- reverse proxy;
- Automatic HTTPS;
- cert storage persistente;
- logs con mínima información necesaria;
- no tokens;
- no request body documental.

## 10.5 Sistema

- Ubuntu LTS ARM64 soportado;
- actualizaciones de seguridad;
- reboot coordinado;
- no instalar servicios no necesarios;
- Node 24 con versión registrada;
- no `npm update` en producción.

## 10.6 Logs

Permitido:

- timestamps;
- status;
- path sin sensitive query;
- request IDs;
- systemd/Caddy errors;
- métricas básicas.

Prohibido:

- Authorization;
- x-goog-api-key;
- x-gemini-api-key;
- alias access token;
- OAuth tokens;
- contenido documental;
- credenciales.

# 11. Pruebas E2E y evidencia

## 11.1 Baseline automatizada

- CI del repo;
- npm ci;
- build;
- unit/integration tests;
- Firestore Rules tests;
- diff check.

## 11.2 Smoke OCI

- architecture ARM64;
- Node version;
- process health;
- frontend load;
- Caddy proxy;
- HTTPS;
- 3000 cerrado;
- reboot recovery.

## 11.3 Guest E2E

```text
open app
→ select supported files
→ temporary Gemini key
→ analyze
→ validated JSON
→ enriched result
→ DOCX
→ download
```

También:

- ningún archivo legible;
- invalid file;
- selección sobre límite;
- Gemini auth/quota error;
- timeout;
- DOCX invalid payload.

## 11.4 Authenticated E2E

```text
Google Sign-In
→ project
→ Firestore metadata
→ Drive authorization
→ Drive/Picker
→ documents
→ Gemini
→ validated JSON
→ DOCX
→ Drive persistence
→ Firestore history
→ reopen
```

Casos negativos:

- logout;
- revoked Drive token;
- stale Drive reference;
- otro UID no accede;
- Picker cancel;
- Firestore failure;
- Gemini failure.

## 11.5 Evidencia mínima por test

- SHA;
- hostname;
- fecha/hora;
- test name;
- resultado PASS/FAIL;
- HTTP/status si aplica;
- screenshot sanitizada cuando ayude;
- no datos personales;
- no secrets.

# 12. Rollback y continuidad

## 12.1 Principio

```text
OCI_RUNTIME = disposable
GOOGLE_DATA_SERVICES = remain source of truth
GOOGLE_HOSTING = rollback until cutover acceptance
```

## 12.2 Rollback de release

Layout futuro:

```text
/opt/g-inf-01/releases/<sha-a>
/opt/g-inf-01/releases/<sha-b>
/opt/g-inf-01/current -> releases/<sha-b>
```

Rollback:

1. apuntar `current` a SHA anterior;
2. restart;
3. health;
4. smoke.

## 12.3 Rollback POC hostname

Si DuckDNS falla:

- no afecta dominio corporativo;
- retirar Caddy site;
- retirar Google entries POC si ya fueron añadidas y el POC se abandona;
- seguir en Google hosting.

## 12.4 Rollback corporativo

Antes de cutover:

- registrar DNS anterior;
- TTL razonablemente bajo cuando el control DNS exista;
- no apagar Google;
- mantener origins previos.

Ante fallo:

1. revertir A/CNAME de `app.ingenierosasesores.cl` al destino anterior o retirar acceso OCI según diseño;
2. verificar propagación;
3. smoke Google;
4. conservar OCI para diagnóstico sin tráfico;
5. no borrar Firestore/Drive.

## 12.5 Pérdida/reclaim VM

Respuesta:

1. declarar OCI endpoint unavailable;
2. usuarios continúan/retornan al hosting Google;
3. solicitar nuevamente `HUMAN_GATE_CREATE_OCI` si se debe crear reemplazo y las condiciones económicas cambiaron;
4. crear A1 sólo si costo sigue USD 0;
5. obtener nuevo public IPv4;
6. actualizar hostname POC bajo `HUMAN_GATE_DOMAIN` si corresponde;
7. reprovisionar desde runbook;
8. reinyectar secrets;
9. health + E2E;
10. devolver tráfico sólo tras PASS.

## 12.6 Datos locales

No almacenar como único ejemplar:

- uploads;
- reportes;
- análisis;
- historial;
- API keys;
- secretos.

Los logs pueden perderse con la VM; no son fuente funcional de verdad.

# 13. Estimación de esfuerzo

Las HH son horas de ingeniería activa, no incluyen esperas de propagación DNS, disponibilidad A1, revisión humana, verificación Google ni ventanas de observación.

| Bloque | POC HH | Estable incremental HH | Notas |
|---|---:|---:|---|
| Preparación/revalidación | 1.5–2.5 | 0.5–1 | SHA, tests, checklist |
| Gate OCI/costo | 1–2 | 0.5–1 | lectura + evidencia; no provisioning en #104 |
| VM/red mínima | 1–2 | 0.5–1 | si A1 disponible |
| ARM64 real | 1.5–3 | 0.5–1 | build/test/medición |
| Runtime/systemd | 2–3 | 1–2 | permisos/restart |
| Caddy/TLS | 1.5–2.5 | 1–2 | hostname/cert |
| Hostname POC | 0.5–1.5 | — | no incluye esperas |
| Guest + DOCX | 1.5–2.5 | 0.5–1 | casos representativos |
| Google config gate/aplicación | 1–2 | 1–2 | POC y luego corporativo |
| Firebase/Firestore | 1.5–2.5 | 0.5–1 | E2E real |
| Drive/Picker | 2–3.5 | 0.5–1.5 | OAuth/referrer/revocation |
| Gemini/secrets | 1–2 | 0.5–1 | temporal/alias si autorizado |
| E2E integral | 2–3 | 1–2 | guest + authenticated |
| Reboot/rollback/recovery | 2–3.5 | 1–2 | incluye release rollback |
| Documentación/runbook | 1.5–2.5 | 1–2 | evidencia reproducible |
| Deploy reproducible automatizado | — | 3–5 | Work Item separado |
| Dominio corporativo/cutover prep | — | 1.5–3 | app.ingenierosasesores.cl |
| Observabilidad/hardening estable | — | 1.5–3 | sin paid services |
| Contingencia técnica | 2–4 | 2–4 | no incluye rediseño mayor |

### Total POC

**18–28 HH** como rango de planificación realista si:

- A1 está disponible;
- no hay incompatibilidad ARM64;
- DuckDNS/Google se acepta para prueba;
- no aparecen defects funcionales.

### Migración preparada para uso estable

**28–44 HH totales incluyendo POC**, equivalente a **10–16 HH incrementales** después de un POC limpio para:

- deploy reproducible;
- configuración corporativa;
- hardening;
- E2E final;
- cutover/rollback documentado;
- actualización documental posterior.

No incluye migrar Firebase/Firestore/Drive/Gemini porque no forma parte de la estrategia.

## 13.1 Factores que amplían HH

- A1 sin capacidad;
- ARM64 falla y exige Work Item de dependencias;
- Google exige verificación adicional del dominio;
- acceso DNS corporativo incompleto;
- defectos ya existentes descubiertos en E2E;
- necesidad de reconstrucción completa demostrada dos veces;
- OAuth consent/verification fuera del estado esperado;
- problemas de quota Gemini/Drive;
- observación de reclaim;
- cambios de política OCI.

# 14. Matriz de riesgos

| Riesgo | Probabilidad | Impacto | Mitigación | STOP |
|---|---|---|---|---|
| A1 sin capacidad | Media / externa | Alto | esperar, AD alternativo permitido, E2 sólo si free | no paid fallback |
| A1 no elegible en cuenta | Desconocida hasta consola | Alto | gate costo real | cualquier costo/PAYG |
| Incompatibilidad ARM64 | Baja-media | Alto | build/test real antes de config externa | cambio de dependency requerido |
| RAM 4 GB insuficiente | Baja-media | Medio | medir; 6 GB sólo dentro $0 | OOM sin margen free |
| E2 1 GB insuficiente | Alta para build | Medio-alto | no preferir E2 | build/runtime inestable |
| Reclaim idle | Material | Alto | disposable VM + Google rollback | reclaim observado antes de stable |
| Pérdida VM | Media vida útil | Alto | runbook/rebuild/no local state | estado único local |
| Cambio política Free Tier | Media a largo plazo | Alto | revalidar antes de create/recreate | costo deja de ser $0 |
| Crédito trial oculta gasto | Media | Alto | ignorar créditos; costo base $0 | UI no separa costo/crédito |
| Public IPv4 cobrado | Desconocida hasta account | Alto | console gate | cualquier line item > $0 |
| Hostname DuckDNS suspendido/cambia política | Baja-media | Medio | sólo POC; corporate later | servicio deja de cumplir |
| DuckDNS rechazado por Google | Media/desconocida | Medio-alto | gate Google; esperar corporate DNS | origin/domain no verificable |
| Certificado/ACME falla | Baja | Medio | DNS/80/443/Caddy checks | no HTTPS |
| OAuth origin mismatch | Media | Alto | exact scheme/host/port | login/Drive falla |
| Firebase Authorized Domain faltante | Media | Alto | checklist Google | Auth falla |
| Picker key restrictions | Media | Medio | origin + docs.google.com + APIs | key invalid |
| DNS corporativo sin acceso | Alta hoy | Alto para cutover | POC independiente | no cutover |
| WordPress afectado por DNS | Baja si aislado | Alto | sólo subdominio app; no apex | cambio toca apex/WWW |
| Secret leak | Baja si disciplina | Crítico | 0600/env/no logs | cualquier secret expuesto |
| Puerto 3000 público | Evitable | Alto | NSG/firewall | 3000 reachable |
| Dependencia Google externa | Existente | Medio | preserve error semantics | falla externa no recuperable |
| Gemini quota/billing | Existente | Medio | user key/free tier/account check | paid requirement |
| Firestore/Drive data corruption | Baja | Crítico | no migration; existing rules | write isolation falla |
| Deploy mutable no reproducible | Media POC | Medio | release SHA/runbook | no se puede identificar SHA |
| Cutover prematuro | Controlable | Crítico | HUMAN_GATE_CUTOVER | Google apagado antes de PASS |
| Retiro temprano de Google config | Controlable | Alto | coexistencia origins | rollback deja de autenticar |

# 15. Estrategia de observación para cero costo

Durante POC/stable candidate se registra:

- Cost Analysis / Usage si está disponible;
- balance de trial **sólo como dato**, nunca como criterio;
- consumo A1 OCPU/RAM allocation;
- block volume allocation;
- IP;
- CPU/RAM/network;
- eventos/reclaim;
- uptime.

Criterio económico:

```text
observed recurring OCI cost = USD 0
AND all used resources = approved allowlist
AND no trial credits required to offset charge
```

Si se observa reducción de créditos atribuible al POC o una línea facturable:

**FAIL → STOP → no cutover.**

# 16. Propuesta de Work Items posteriores

No crear estos Issues desde #104.

## WI-A — Ejecutar #103 POC bajo estrategia aprobada

Reutilizar Issue #103, no crear duplicado.

Scope:

- Fases 1–20;
- OCI/ARM64/hostname POC;
- gates;
- runbook;
- cero costo;
- no cutover.

## WI-B — Release packaging + deploy reproducible OCI

Crear sólo después del POC PASS.

Scope potencial:

- artifact/release;
- deploy script;
- release directories;
- rollback;
- GitHub Actions Environment;
- SSH least privilege;
- sin secrets Google en CI salvo necesidad demostrada.

## WI-C — Hardening OCI stable candidate

- systemd hardening;
- firewall;
- patch policy;
- log rotation;
- disaster recovery drill;
- quota controls si se verifican nombres reales;
- no paid services.

## WI-D — Preparar app.ingenierosasesores.cl

Sólo cuando exista control DNS.

- subdomain;
- Caddy/TLS;
- Firebase Authorized Domain;
- OAuth origin;
- Picker restriction;
- no cutover todavía.

## WI-E — E2E corporativo + cutover gate

- full E2E por `app.ingenierosasesores.cl`;
- observation;
- rollback rehearsal;
- `HUMAN_GATE_CUTOVER`;
- DNS cutover si aprobado;
- Google hosting se mantiene durante ventana definida.

## WI-F — Actualizar arquitectura canónica

Después de cutover aceptado:

- SOFTWARE_ARCHITECTURE;
- TECHNICAL_SPECIFICATION deployment topology;
- verification deployment wording;
- current state;
- no cambio funcional.

## WI-G — Retiro controlado de hosting Google

Sólo si el Humano decide retirar:

- verificar OCI estable;
- backup/rollback alternativo;
- costo USD 0 aún válido;
- retirar hosting, no servicios Google funcionales;
- documentación final.

# 17. Decision tree

```text
#104 accepted?
  no → STOP
  yes
    ↓
#103 explicitly reactivated?
  no → STOP
  yes
    ↓
P0 local PASS?
  no → STOP
  yes
    ↓
OCI account shows A1 1 OCPU/4 GB + ~50 GB + public IP at base USD 0?
  no → STOP
  yes
    ↓
HUMAN_GATE_CREATE_OCI approved?
  no → STOP
  yes
    ↓
Create single VM
    ↓
ARM64 PASS?
  no → STOP / separate issue
  yes
    ↓
runtime + systemd + network + Caddy PASS?
  no → rollback / STOP
  yes
    ↓
HUMAN_GATE_DOMAIN approved?
  no → STOP before DNS
  yes
    ↓
Free POC hostname + HTTPS PASS?
  no → STOP; no domain purchase
  yes
    ↓
Guest E2E PASS?
  no → rollback / STOP
  yes
    ↓
HUMAN_GATE_GOOGLE_CONFIG approved?
  no → STOP before Google
  yes
    ↓
Auth + Firestore + Drive/Picker + Gemini + DOCX + E2E PASS?
  no → rollback / STOP
  yes
    ↓
reboot + rebuild + observation PASS and cost = USD 0?
  no → STOP
  yes
    ↓
wait for corporate DNS access + separate WIs
    ↓
app.ingenierosasesores.cl E2E PASS?
  no → no cutover
  yes
    ↓
HUMAN_GATE_CUTOVER approved?
  no → keep Google
  yes → controlled cutover in separate WI
```

# 18. Open questions before POC

1. ¿La consola OCI actual muestra A1 1 OCPU/4 GB como Free/Always Free en Chile Central (Santiago)?
2. ¿El costo base, ignorando trial credits, aparece como USD 0?
3. ¿La public IPv4 se muestra sin cargo?
4. ¿A1 tiene capacidad al momento de creación?
5. ¿Ubuntu LTS ARM64 seleccionado aparece elegible?
6. ¿4 GB bastan para build y payload representativo?
7. ¿La dependencia optional LZMA x64 afecta efectivamente Rollup en ARM64?
8. ¿El proyecto OAuth actual acepta un subdominio DuckDNS para POC?
9. Si Google pide verificación, ¿el control del subdominio POC permite completarla?
10. ¿El proyecto Firebase permite añadir ese Authorized Domain sin otro cambio?
11. ¿El API key de Picker actual puede ampliar referrers sin reemplazo?
12. ¿Se autorizarán aliases Gemini del propietario o sólo clave temporal para POC?
13. ¿Cuándo se recuperará acceso DNS de `ingenierosasesores.cl`?
14. ¿Quién ejecutará el cambio DNS corporativo?
15. ¿Qué período de observación exige el Humano antes de considerar cutover?
16. ¿Qué criterio exacto de disponibilidad/reclaim se aceptará para uso estable con Always Free?

# 19. Fuentes externas revalidadas

Fecha de consulta: **2026-10-03**.

| Fuente | URL | Uso |
|---|---|---|
| Oracle Always Free Resources | https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm | A1/E2, home region, volume, idle reclaim, capacity |
| Oracle Free Tier | https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier.htm | trial vs Always Free |
| Oracle Free Tier FAQ | https://www.oracle.com/latam/cloud/free/faq/ | condiciones generales |
| Oracle Public IP Addresses | https://docs.oracle.com/en-us/iaas/Content/Network/Tasks/managingpublicIPs.htm | ephemeral/reserved, red requerida |
| Oracle Assign public IP at launch | https://docs.oracle.com/en-us/iaas/Content/Network/Tasks/assign-public-ip-instance-launch.htm | ephemeral IP |
| Oracle Budgets | https://docs.oracle.com/en-us/iaas/Content/Billing/Concepts/budgetsoverview.htm | budget = soft limit |
| Oracle Compartment Quotas | https://docs.oracle.com/en-us/iaas/Content/Quotas/home.htm | hard consumption controls |
| Oracle Quota syntax | https://docs.oracle.com/en-us/iaas/Content/Quotas/Concepts/quota_policy_syntax.htm | set/zero quotas |
| Google OAuth client-side | https://developers.google.com/identity/protocols/oauth2/javascript-implicit-flow | HTTPS/origin/IP rules |
| Google OAuth policies | https://developers.google.com/identity/protocols/oauth2/policies | domain authorization/ownership |
| Google OAuth production compliance | https://developers.google.com/identity/protocols/oauth2/production-readiness/policy-compliance | verification/production domains |
| Firebase Google Sign-In | https://firebase.google.com/docs/auth/web/google-signin | popup flow/authDomain context |
| Firebase Auth FAQ | https://firebase.google.com/docs/auth/faq-and-troubleshooting | Authorized Domains |
| Google Picker web | https://developers.google.com/workspace/drive/picker/guides/web-picker | origins/key/docs.google.com |
| Caddy HTTPS quick start | https://caddyserver.com/docs/quick-starts/https | public DNS + 80/443 |
| Caddy Automatic HTTPS | https://caddyserver.com/docs/automatic-https | cert automation |
| Node 24 archive | https://nodejs.org/en/download/archive/v24.21.0 | Linux ARM64 binary |
| DuckDNS About | https://www.duckdns.org/about.jsp | free subdomain service |
| DuckDNS API spec | https://www.duckdns.org/spec.jsp | DNS update mechanism |
| DuckDNS terms | https://www.duckdns.org/tac.jsp | service/control risk |
| Public Suffix List | https://publicsuffix.org/list/ | domain validation context |
| DuckDNS PSL addition record | https://bugzilla.mozilla.org/show_bug.cgi?id=1165730 | duckdns.org added to PSL |

## 19.1 Inconsistencias y cautelas

- Oracle mantiene documentación oficial con cifras A1 que pueden diferir de otras páginas de pricing; esta estrategia usa la cifra conservadora y exige la consola real.
- Budget OCI es alerta/soft limit, no spending kill-switch.
- La existencia de DuckDNS en PSL no garantiza por sí sola aceptación/verificación en el proyecto OAuth concreto.
- Free Tier no equivale a SLA de producción.
- “USD 0” es un objetivo condicionado a la cuenta y políticas vigentes, no una promesa permanente.

# 20. Criterios para que el Supervisor autorice #103

Antes de levantar el HOLD de #103, este documento propone que el Supervisor confirme:

- estrategia de arquitectura aceptada;
- USD 0 como hard requirement;
- A1 1 OCPU/4 GB inicial;
- créditos ignorados;
- DuckDNS sólo como POC condicional;
- cuatro HUMAN_GATES;
- no data migration;
- Google hosting rollback;
- no paid fallback;
- ARM64 como gate;
- archivo/env secret handling;
- 21 fases y STOP conditions;
- rango POC 18–28 HH;
- rango estable 28–44 HH total;
- Work Items posteriores no creados todavía.

# 21. Resultado estratégico

## Arquitectura

**DOCUMENTED.**

Se traslada sólo el runtime web/Node a una única VM A1 y se mantienen servicios Google.

## Costo

**DOCUMENTED.**

Objetivo USD 0, sin PAYG ni créditos promocionales como fundamento. A1 1 OCPU/4 GB, ~50 GB boot, ephemeral IPv4, networking mínimo; todo validado en consola antes de creación.

## ARM64

**DOCUMENTED / REQUIRES POC.**

Node 24 y toolchain muestran compatibilidad plausible; la ejecución real sigue siendo gate.

## Dominio

**DOCUMENTED.**

DuckDNS como candidato POC gratuito y condicional; `app.ingenierosasesores.cl` como hostname estable futuro cuando exista acceso DNS. Ningún cambio se hizo.

## Google

**DOCUMENTED.**

Firebase Authorized Domains, OAuth Authorized JavaScript Origins y Picker restrictions cambian sólo después de gate y sólo para el hostname aprobado.

## Seguridad

**DOCUMENTED.**

SSH keys, servicio no root, 3000 cerrado, 80/443, secrets 0600, logs sanitizados y mínimo privilegio.

## Rollback/rebuild

**DOCUMENTED.**

Google hosting se mantiene; VM no guarda estado funcional único; release/DNS/Google config tienen reversión.

## Gates

**DOCUMENTED.**

- `HUMAN_GATE_CREATE_OCI`
- `HUMAN_GATE_DOMAIN`
- `HUMAN_GATE_GOOGLE_CONFIG`
- `HUMAN_GATE_CUTOVER`

Ninguno puede aprobarse implícitamente.

## Scope final de #104

```text
EXTERNAL CHANGES PERFORMED = NONE
OCI RESOURCES CREATED = NONE
DNS CHANGES = NONE
GOOGLE CONFIG CHANGES = NONE
CODE CHANGES = NONE
DEPENDENCY CHANGES = NONE
MIGRATION EXECUTED = NO
```
