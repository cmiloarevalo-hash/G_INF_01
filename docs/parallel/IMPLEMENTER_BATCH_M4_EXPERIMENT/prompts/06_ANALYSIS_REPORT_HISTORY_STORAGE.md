# 06_ANALYSIS_REPORT_HISTORY_STORAGE.md

## Objective

Implement experimental persistent metadata for authenticated analysis/report history while keeping large content bytes in Drive.

## Fixed experimental schema

Use these Firestore subcollections:

```
users/{uid}/projects/{projectId}/analyses/{analysisId}
users/{uid}/projects/{projectId}/reports/{reportId}
```

Analysis metadata must contain only the minimum needed to identify/reopen the result, including:
- id;
- reportType;
- createdAt / updatedAt;
- Drive JSON file ID/reference when available.

Report metadata must contain only the minimum needed to identify/reopen the report, including:
- id;
- analysisId;
- reportType;
- createdAt / updatedAt;
- Drive DOCX file ID/reference when available.

Do NOT put PDF/DOCX/document bytes in Firestore.

## Required behavior

- typed repository contracts for create/list/get analysis metadata;
- typed repository contracts for create/list/get report metadata;
- application-facing authenticated layer derives UID from AuthSessionState;
- projectId remains explicit;
- not-found is `null`, external failure remains failure;
- no owner override;
- no LLM/API/OAuth credentials persisted;
- preserve existing project repository behavior.

## Security Rules

Extend `firestore.rules` explicitly for:
- `analyses/{analysisId}`;
- `reports/{reportId}`;

using the same rule:
authenticated AND `request.auth.uid == userId`.

Do not use a broad recursive wildcard to authorize arbitrary future project subcollections.

Extend Emulator tests to prove:
- own analysis/report read/write allowed;
- cross-user analysis/report read/write denied;
- unrelated nested paths remain denied.

## Scope

- `src/services/firestore/**`
- `firestore.rules`
- focused `tests/**`
- experimental docs/results only

## Focused evidence

Test:
1. authenticated create/list/get for analyses;
2. authenticated create/list/get for reports;
3. UID derived from session;
4. no binary content/token fields;
5. not-found distinct from failure;
6. Emulator own-user allow;
7. Emulator cross-user deny;
8. unrelated nested collection deny.

Run `npm run test:firestore-rules`.

## Phase completion

Write `results/06_RESULT.md`, update QUEUE, commit:
`PARALLEL-06: analysis and report history storage`

Push.

NEXT: immediately execute `07_HISTORY_REOPEN_UI.md`.


PROMPT MATERIALIZATION — FILES 07–09
