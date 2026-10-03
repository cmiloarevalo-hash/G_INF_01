# Windows Portable POC Runbook

Work Item: #112  
Accepted architecture: #111  
Target: Windows x64 internal POC  
Baseline for implementation: `1c220aa9851c36ae71375a58e3b00dd590c6c119`

## Purpose

This POC packages the existing Phase-1 guest application as a portable Windows folder/ZIP. The target PC does not need Node, npm, administrator privileges, an installer, a public server, OCI, DNS, Firebase configuration, Drive/Picker configuration, OAuth configuration, or an embedded owner secret.

The portable mode preserves the existing web deployment path. It does not modify `server.ts` or product code under `src/**`.

## Artifact layout

```text
G_INF_01_Portable-win-x64/
├─ Start.cmd
├─ README_LOCAL.txt
├─ BUILD_INFO.txt
├─ runtime/
│  ├─ node.exe
│  └─ LICENSE
└─ app/
   ├─ package.json
   ├─ package-lock.json
   ├─ portable-launcher.mjs
   ├─ node_modules/
   └─ dist/
```

The `app/node_modules` tree is created with the locked production install:

```text
npm ci --omit=dev
```

The target PC never runs npm.

## Build

Build the package on Windows x64 with the pinned Node 24 toolchain used by CI:

```text
npm ci
npm run build
npm test
npm run test:firestore-rules
npm run package:portable:win
```

The packaging command rebuilds production assets with authenticated Google/Firebase/owner-alias environment variables removed, creates a clean staging directory, installs production dependencies from the lockfile, copies the current Node runtime, validates required files, executes a smoke test with the bundled `node.exe`, and creates:

```text
portable-out/G_INF_01_Portable-win-x64/
portable-out/G_INF_01_Portable-win-x64.zip
```

The packaging output is ignored by Git.

## Launch sequence

```text
double-click Start.cmd
→ bundled runtime/node.exe
→ app/portable-launcher.mjs
→ existing createServerApp({ env: {} })
→ existing setupApp()
→ listen(0, "127.0.0.1")
→ read server.address().port
→ GET /api/health
→ only after PASS: open default browser
→ http://127.0.0.1:<assigned-port>
```

The current `startServer()` and `PORT` parsing are intentionally not used by portable mode.

## Local security boundary

Portable mode:

- binds only to the literal IPv4 loopback address `127.0.0.1`;
- asks the OS for an unused dynamic port;
- enforces the exact `Host: 127.0.0.1:<assigned-port>`;
- requires the exact same-origin `Origin` header for POST/PUT/PATCH/DELETE;
- does not enable CORS;
- passes an empty environment object to the current server app, so owner aliases and runtime Firebase configuration are unavailable;
- does not log request headers, request bodies, environment variables, or Gemini keys.

The dynamic port is collision avoidance, not authentication.

## Gemini temporary key

The existing guest flow remains unchanged:

1. the user enters a temporary Gemini key in the browser UI;
2. the key lives in React memory;
3. the browser sends it to the loopback server in the existing request header;
4. the existing backend uses it only for the Gemini HTTPS request;
5. the launcher does not persist or log it.

Closing/reloading the browser tab clears the React in-memory value. No owner Gemini key is bundled in the artifact.

## Local documents and DOCX

The current browser-native file selection remains unchanged. Only files selected by the user enter the guest flow.

The existing DOCX route remains unchanged:

```text
validated TITLE_STUDY
→ POST /api/guest/report-docx
→ Node DOCX renderer
→ DOCX response
→ browser download
```

No native filesystem bridge is introduced.

## Stop

The Express server runs inside the same foreground Node process as the portable launcher; there is no detached server child process.

Recommended clean shutdown:

```text
Ctrl+C
→ SIGINT
→ one controlled shutdown path
→ server.close()
→ process exits
```

`SIGTERM` uses the same shutdown path.

Closing the console window can terminate the process more abruptly. Phase 1 has no local persistent application datastore, but Ctrl+C is the documented clean stop.

Multiple double-clicks may create multiple independent instances on different ephemeral ports. The POC deliberately does not add single-instance infrastructure.

## Verification

Repository verification:

```text
npm ci
npm run build
npm test
npm run test:firestore-rules
git diff --check
```

Portable-specific tests verify:

- loopback-only bind;
- nonzero OS-assigned port;
- health gate before browser callback;
- Host allow/reject behavior;
- Origin allow/reject behavior;
- no CORS header;
- guest-only empty runtime environment;
- no launcher key persistence/logging;
- controlled shutdown.

The Windows CI job additionally verifies a real Windows x64 artifact, required package files, production `node_modules`, bundled runtime smoke, folder byte size, ZIP byte size, and ZIP SHA-256.

## SmartScreen and distribution

This POC does not purchase or configure code signing. It does not create a custom application executable; it ships the Node runtime plus a command launcher. Windows SmartScreen or enterprise script policies may still warn or block downloaded content.

Distribution is limited to GitHub CI evidence/artifacts authorized by #112. Test the ZIP on the intended internal Windows environment before broader use.

## Updating

There is no auto-updater. Use immutable side-by-side ZIP releases:

```text
stop old instance
→ extract new ZIP to a new folder
→ update shortcut
→ launch new version
→ retain previous folder for rollback
```

## Known POC limitations

- a console window remains visible while the local server is running;
- closing the browser does not automatically stop the server;
- closing the console window is less graceful than Ctrl+C;
- duplicate launches are allowed;
- authenticated Firebase/Google/Drive/Picker/OAuth desktop behavior is not implemented or claimed;
- no code signing, installer, auto-update, or public deployment is included.

Future Phase-2 authenticated desktop behavior requires its own Work Item.
