# 05_DOCUMENTS_UI.md

## Objective

Implement an experimental authenticated project Documents UI over the services created in phases 01–04.

Do not connect to real Google configuration.

## Required behavior

Add a project Documents surface reachable from the existing authenticated project flow.

The UI must support controlled states for:
- session checking;
- unauthenticated;
- Drive authorization unavailable/unauthorized;
- authorizing;
- authorized;
- operation pending;
- operation error;
- empty document state.

Actions:
- explicit “Autorizar Drive” style action through the authorization service;
- local file selection and upload through phase 02 service;
- existing Drive file selection through phase 03 Picker abstraction;
- show confirmed document metadata only after successful operation;
- do not show fake success/fake documents;
- double-submit while an operation is pending is prevented;
- Drive failure remains recoverable and does not erase already confirmed UI state.

Project ownership:
- use authenticated project/session contracts;
- no raw owner UID in UI.

Runtime boundary:
- real Google adapter/configuration may remain unavailable;
- UI must represent that state honestly rather than fabricate integration.

## Scope

- `src/pages/**`
- `src/components/**`
- `src/app/**`
- `src/services/drive/**` only for small UI-facing orchestration/provider glue
- focused `tests/**`
- experimental docs/results only

Do not modify Sidebar labels solely to claim completion if navigation semantics do not require it.
Do not use localStorage/sessionStorage for Drive/project documents.

## Focused evidence

Test:
1. unauthenticated does not call Drive;
2. authorization is user-triggered;
3. pending action blocks duplicate submission;
4. successful local upload appears only after confirmed ID;
5. failed upload does not appear as success;
6. Picker cancel differs from Picker error;
7. selected Drive metadata appears only after selection success;
8. unavailable runtime is explicit;
9. no raw UID/token persistence.

## Phase completion

Write `results/05_RESULT.md`, update QUEUE, commit:
`PARALLEL-05: authenticated Documents UI`

Push.

NEXT: immediately execute `06_ANALYSIS_REPORT_HISTORY_STORAGE.md`.
