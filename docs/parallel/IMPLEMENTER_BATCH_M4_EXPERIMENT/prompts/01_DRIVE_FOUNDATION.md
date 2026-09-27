# 01_DRIVE_FOUNDATION.md

## Objective

Implement the experimental CMP-DRIVE foundation:

- `drive.file` authorization contract;
- in-memory token state only;
- injectable authorization adapter;
- Drive REST v3 folder client;
- canonical project folder provisioning.

Canonical folder order:

```
<Application root>
→ Proyectos
→ <Project name> [<projectId>]
→ Documentos
→ Analisis
→ Informes
```

## Required behavior

- exact scope: `https://www.googleapis.com/auth/drive.file`;
- explicit user-triggered authorization;
- states: unauthorized / authorizing / authorized / error;
- token value is memory-only;
- clear/revoke local state removes token from service memory;
- no token logging;
- no Google network in tests;
- Drive folder creation uses metadata-only folder MIME:
  `application/vnd.google-apps.folder`;
- child folder creation uses one parent ID;
- folder service returns only confirmed IDs;
- intermediate failure rejects; never fabricate a completed hierarchy.

## Scope

- `src/services/drive/**`
- focused `tests/**`
- experimental docs/results only

No UI, Firestore, package changes or real platform.

## Focused evidence

Test:
1. exact drive.file scope;
2. initial unauthorized;
3. explicit auth success;
4. auth error remains non-authorized;
5. clear removes token;
6. no browser storage use;
7. folder request metadata + parent;
8. six-level/root chain creation order;
9. partial failure cannot return full success.

## Phase completion

Write `results/01_RESULT.md`, update QUEUE, commit:
`PARALLEL-01: Drive foundation`

Push.

NEXT: immediately execute `02_LOCAL_FILE_TO_DRIVE.md`.
