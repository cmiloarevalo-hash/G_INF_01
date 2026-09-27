# 08_PROVIDER_MODEL_PREFERENCES.md

## Objective

Implement an experimental authenticated preferences foundation and settings UI for provider/model choice without persisting any API key.

## Fixed experimental persistence path

Use:

`users/{uid}/preferences/ai`

Persist ONLY non-sensitive preference data.

Minimum data:
- provider;
- model;
- updatedAt.

Supported provider identifiers for this experimental contract:
- `gemini`
- `openai`
- `anthropic`
- `openrouter`

A model remains a non-empty string selected/entered by the user. Do not fabricate availability from external providers.

## Required behavior

Repository/service:
- get preferences;
- set preferences;
- authenticated application-facing layer derives UID from AuthSessionState;
- unauthenticated/checking fails closed;
- no raw owner UID override;
- API key/credential fields are absent from persistence contracts.

Session-only credential state:
- provide a minimal in-memory credential holder suitable for the selected provider;
- never persist credentials;
- clearing removes credential from memory;
- do not log credentials;
- do not connect new LLM providers in this phase.

UI:
- settings surface for provider + model preference;
- session-only API key input/state may be provided but must clearly remain non-persistent;
- saved success only after repository confirmation;
- loading / save pending / failure controlled;
- do not claim provider connectivity merely because preference saved.

## Security Rules

Add an explicit rule for:

`users/{userId}/preferences/{preferenceId}`

requiring authenticated request and matching UID.

Do not broaden arbitrary user subpaths.

Extend Emulator tests:
- own preference read/write allowed;
- cross-user preference read/write denied.

## Scope

- `src/services/firestore/**`
- `src/services/ai/**` only for session-only credential/preference-facing types if required
- `src/pages/**`
- `src/components/**`
- `src/app/**`
- `firestore.rules`
- focused `tests/**`
- experimental docs/results only

No provider API integration, model discovery network, secrets, server or dependency changes.

## Focused evidence

Test:
1. checking/unauthenticated fail before repository access;
2. authenticated preference read/write derives UID;
3. provider/model persist;
4. no API key field can be persisted through preference API;
5. credential holder is memory-only;
6. clearing credential removes it;
7. UI save success requires confirmed repository write;
8. provider runtime availability is not fabricated;
9. own-user preference rules allow;
10. cross-user preference rules deny.

Run `npm run test:firestore-rules`.

## Phase completion

Write `results/08_RESULT.md`, update QUEUE, commit:
`PARALLEL-08: provider and model preferences`

Push.

NEXT: immediately execute `09_FINAL_BATCH_AUDIT.md`.
