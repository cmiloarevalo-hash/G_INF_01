# Implementer Batch M4 Experiment

Work Item: #73

Frozen base: `dccf75921c6eb38ffcdd17677d4968679e74112c`
Branch: `experiment/m4-parallel-batch-01`

Parallel, non-canonical implementation experiment. Execute prompts 01–09 in order with one verified pushed commit per phase and one draft PR.

Authority boundaries:
- never merge or write `main`;
- do not modify canonical Issue state, roadmap percentages, V status, current state, roadmap control, workflow, AI Studio contract, package/server/firebase configuration;
- no new dependencies;
- no real Google/Firebase platform mutation, publication/deployment or AI Studio;
- tokens and credentials remain transient and must not be persisted;
- experimental evidence does not imply canonical adoption.

After prompt 09: STOP → Supervisor.
