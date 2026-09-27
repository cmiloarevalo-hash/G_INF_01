# 04_DRIVE_REFS_FIRESTORE.md

## Objective

Persist confirmed Drive folder references in the existing project metadata without storing file bytes.

This is experimental schema work on the isolated branch only.

## Required data shape

Extend project metadata with an OPTIONAL nested object equivalent to:

```ts
driveFolders: {
  applicationRootFolderId: string;
  projectsRootFolderId: string;
  projectFolderId: string;
  documentsFolderId: string;
  analysisFolderId: string;
  reportsFolderId: string;
}
```

The exact property name may vary only if existing naming conventions clearly require it; preserve the same semantics.

## Required behavior

- low-level ProjectRepository gains a bounded update operation for confirmed Drive folder refs;
- application-facing authenticated project layer exposes the update without accepting raw owner UID;
- UID is derived from AuthSessionState exactly as existing #66 behavior;
- only complete confirmed folder-ref sets may be persisted;
- no file bytes, access token, API key, refresh token or OAuth state enters Firestore;
- create/list/get remain backward-compatible with projects lacking Drive refs;
- not-found remains distinct from repository failure;
- no Drive network operation inside Firestore repository;
- Firestore path remains `users/{uid}/projects/{projectId}`;
- existing Security Rules ownership boundary remains unchanged.

## Scope

- `src/services/firestore/**`
- focused `tests/**`
- experimental docs/results only

Do not change `firestore.rules` unless a failing rule test proves it is required. If a rule change is required for this exact project-document update, keep the same UID ownership model.

## Focused evidence

Test:
1. authenticated session UID is the only owner UID used;
2. project with no Drive refs still reads correctly;
3. complete confirmed refs can be updated/read;
4. incomplete refs are rejected before persistence;
5. caller cannot override UID;
6. tokens/credentials are absent from persisted shape;
7. not-found and repository failure remain distinct.

Run `npm run test:firestore-rules` in addition to the batch baseline checks.

## Phase completion

Write `results/04_RESULT.md`, update QUEUE, commit:
`PARALLEL-04: persist Drive folder references`

Push.

NEXT: immediately execute `05_DOCUMENTS_UI.md`.
