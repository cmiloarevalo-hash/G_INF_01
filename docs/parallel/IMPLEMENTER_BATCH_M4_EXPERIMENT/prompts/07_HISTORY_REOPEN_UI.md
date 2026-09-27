# 07_HISTORY_REOPEN_UI.md

## Objective

Implement an experimental authenticated history/reopen UI for analysis and report metadata created by phase 06.

This phase reopens persisted metadata/reference state only. It does not fetch real Drive bytes or claim full historical document restoration.

## Required behavior

For the selected authenticated project:
- list analysis history;
- list report history;
- show loading / empty / failure distinctly;
- select an analysis and load it by persisted analysisId;
- select a report and load it by persisted reportId;
- show report type, stable IDs, dates when available and Drive reference availability;
- `null` from repository becomes controlled not-found;
- repository failure becomes controlled error;
- no fabricated historical records;
- no raw UID supplied by UI;
- no direct Firestore calls from page/component code;
- already confirmed history remains visible when a later operation fails where practical.

Navigation should reuse the smallest existing project navigation mechanism and must not claim unrelated product completion.

## Scope

- `src/pages/**`
- `src/components/**`
- `src/app/**`
- minimal UI-facing orchestration in `src/services/firestore/**`
- focused `tests/**`
- experimental docs/results only

No Drive network, no document bytes, no analysis execution, no report regeneration.

## Focused evidence

Test:
1. unauthenticated/checking does not load history;
2. authenticated project loads analysis metadata;
3. authenticated project loads report metadata;
4. empty histories are distinct;
5. failures are distinct;
6. analysis reopen uses selected analysisId;
7. report reopen uses selected reportId;
8. not-found is distinct from failure;
9. no raw UID/fake records.

## Phase completion

Write `results/07_RESULT.md`, update QUEUE, commit:
`PARALLEL-07: authenticated history reopen UI`

Push.

NEXT: immediately execute `08_PROVIDER_MODEL_PREFERENCES.md`.
