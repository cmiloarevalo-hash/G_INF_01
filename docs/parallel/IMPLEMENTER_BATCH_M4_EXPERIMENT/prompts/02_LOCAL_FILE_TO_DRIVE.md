# 02_LOCAL_FILE_TO_DRIVE.md

## Objective

Extend the experimental Drive layer with local-document upload into a confirmed project's `Documentos` folder.

Use Drive API v3 multipart upload semantics through the existing injectable transport.

## Required behavior

Add a typed operation equivalent to:

`uploadLocalDocument(token, documentsFolderId, file)`

where file contains:
- name;
- MIME type;
- bytes/blob data.

Requirements:
- upload endpoint uses Drive v3 `/upload/drive/v3/files?uploadType=multipart`;
- multipart metadata precedes media;
- metadata includes `name` and exactly one parent: `documentsFolderId`;
- media content type is preserved;
- Bearer token is transient and not logged/persisted;
- success requires confirmed Drive file ID;
- malformed/non-2xx/missing-ID response is failure;
- no fake fallback ID;
- do not add arbitrary file-size policy in this phase;
- no Firestore write yet;
- no real network in tests.

## Scope

- `src/services/drive/**`
- focused `tests/**`
- experimental docs/results only

## Focused evidence

Test:
1. correct upload URL;
2. auth header is supplied to transport but never persisted;
3. multipart metadata includes name + parent;
4. file MIME/bytes are included;
5. success returns confirmed id/name/mime metadata;
6. error response rejects;
7. missing ID rejects;
8. no real network.

## Phase completion

Write `results/02_RESULT.md`, update QUEUE, commit:
`PARALLEL-02: local file Drive upload`

Push.

NEXT: immediately execute `03_GOOGLE_PICKER_ADAPTER.md`.
