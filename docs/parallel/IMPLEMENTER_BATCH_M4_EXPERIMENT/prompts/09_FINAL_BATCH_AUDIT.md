# 09_FINAL_BATCH_AUDIT.md

## Objective

Perform the final integrity audit of the entire parallel experiment.

This phase must not add new product capability.

## Required audit

1. Re-read Issue #73 authority boundary.
2. Compare entire experimental branch against frozen base:
   `dccf75921c6eb38ffcdd17677d4968679e74112c`.
3. Confirm forbidden paths were not modified.
4. Confirm no canonical progress/status files were modified.
5. Confirm no workflow/CI/package/server/firebase configuration changes.
6. Search aggregate diff for:
   - access tokens;
   - refresh tokens;
   - API keys/secrets;
   - real Google/Firebase credential values;
   - localStorage/sessionStorage credential persistence;
   - fake success/fallback IDs.
7. Run:
   - `npm run build`
   - `npm test`
   - `npm run test:firestore-rules`
   - `git diff --check <frozen-base>...HEAD`
8. Review all phase result files.
9. Create an inventory:
   - phase;
   - status;
   - exact commit;
   - changed paths;
   - dependencies on previous phases;
   - known blockers/uncertainties;
   - whether commit appears independently reusable or cumulative.
10. Do NOT rewrite/squash earlier phase commits.
11. Do NOT rebase onto newer main.
12. Do NOT merge.

## Required final result

`results/09_RESULT.md` must contain:

- frozen base;
- final HEAD;
- all phase commit SHAs;
- PASS/BLOCKED table;
- aggregate changed paths;
- forbidden-path check;
- secret/persistence check;
- build/test/rules-test results;
- unresolved external/platform dependencies;
- explicit statement:
  `CANONICAL ADOPTION = NOT DECIDED`.

Update QUEUE so every phase is PASS or BLOCKED.

Commit:
`PARALLEL-09: final batch audit`

Push.

Leave the single draft PR unmerged.

Then STOP and return the Issue #73 final handoff format.
