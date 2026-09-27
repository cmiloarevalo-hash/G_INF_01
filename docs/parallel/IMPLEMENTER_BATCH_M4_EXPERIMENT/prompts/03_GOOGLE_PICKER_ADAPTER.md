# 03_GOOGLE_PICKER_ADAPTER.md

## Objective

Implement an experimental Google Picker boundary without real credentials or script/platform configuration.

The goal is a browser-facing adapter contract that can later be connected to Google Picker while remaining fully fake-testable now.

## Required behavior

Introduce:
- typed Picker configuration input:
  - access token;
  - API key;
  - app/project number identifier;
- typed selected-file metadata:
  - Drive file ID;
  - name;
  - MIME type when supplied;
- Picker factory/gateway interface injected into the application service;
- explicit `openPicker(...)` call only;
- selected file must come from Picker callback/result;
- cancellation is distinct from error;
- multiple-selection is NOT required in this phase;
- the access token remains transient/in-memory;
- no credential constants in repository;
- no global Google script loader in this phase;
- no real Picker/network in tests.

The adapter contract must remain compatible with `drive.file`.

## Scope

- `src/services/drive/**`
- focused `tests/**`
- experimental docs/results only

## Focused evidence

Test:
1. Picker is opened only on explicit operation;
2. access token is handed transiently to injected gateway;
3. selected Drive ID/name are returned;
4. cancel returns controlled cancellation;
5. Picker error propagates as controlled failure;
6. token/key values are not persisted;
7. no Google network/global script required by tests.

## Phase completion

Write `results/03_RESULT.md`, update QUEUE, commit:
`PARALLEL-03: Google Picker adapter boundary`

Push.

NEXT: immediately execute `04_DRIVE_REFS_FIRESTORE.md`.


PROMPT MATERIALIZATION — FILES 04–06
