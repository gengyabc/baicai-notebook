---
schema: review-result-v1
skill: quality-review
phase: enhance-info-retrieval
step_folder: 07-constrained-query-orchestration
result_file: .planning/phase/07-constrained-query-orchestration/quality-review.md
finding_id_scope: phase
append_only: true
step-version: 1
requirement-version: 1
---

## Round 1

```yaml
round: 1
mode: full
assessment: blocked
base_sha: 98cc132fb55667ee062d3e97ed2693b4c83c5b25
head_sha: 79d7f01aedcfbc515940633a545d331d50fd79a9
scope: .opencode/canonical-tags.json, .opencode/tag-aliases.json, .opencode/tag-expansions.json, .opencode/location-aliases.json, .opencode/plugins/vault-query-router/governed-artifacts.ts, .opencode/plugins/vault-query-router/governed.test.ts, .opencode/plugins/vault-query-router/extraction-logic.ts, .opencode/plugins/vault-query-router/index.ts, .opencode/plugins/vault-query-router/extraction.test.ts, .opencode/docs/sqlite-retrieval-contract.md, .opencode/workflows/query-vault.md, .opencode/skills/second-brain-query/SKILL.md
stop_reason: blocked
manual_intervention_required: false
active_batch_under_review: QB-001
open_findings: 4
batch_count: 3
repeated_findings: []
repeated_root_cause_clusters: []
```

### Code Review Summary

Reviewed the step-local planning docs, the governed retrieval artifacts, the router implementation, and the related contract/workflow/skill docs. `bun test` passes, but the live router entrypoint does not build, the new expansion policy is not wired into runtime execution, and the implementation still relies on duplicated in-code governance tables instead of the new JSON artifacts.

### Normalized Findings

- ID: QR-enhance-info-retrieval-P1-001
  Priority: P1
  Required: yes
  Status: open
  Title: Vault query router entrypoint no longer parses
  Location: .opencode/plugins/vault-query-router/index.ts:759
  Root Cause Cluster: entrypoint-not-covered-by-runtime-checks
  Batch Candidate: QB-001
  Summary: `searchIndex()` contains a malformed statement (`const normalizedConstraints = ...  if (!normalizedConstraints) {`) that prevents `index.ts` from building or loading.
  Impact: The live `vault_index_search` plugin entrypoint is broken even though the unit suite passes. I confirmed this with `bun build ./index.ts`, which fails with `Expected ";" but found "if"` at line 759.
  Recommended Fix: Restore the missing statement separator/newline, then add at least one runtime-facing check that parses/builds the entrypoint so syntax regressions in `index.ts` cannot slip past helper-only tests again.

- ID: QR-enhance-info-retrieval-P1-002
  Priority: P1
  Required: yes
  Status: open
  Title: Live router still skips the required expansion structured pass
  Location: .opencode/plugins/vault-query-router/index.ts:779-822
  Root Cause Cluster: planned-policy-not-wired-into-runtime
  Batch Candidate: QB-002
  Summary: The step freezes a two-pass policy (`primary-structured-pass` then bounded `expansion-structured-pass` when candidate count < 3), but `searchIndex()` never calls `buildExpandedConstraints()` and jumps straight from the first structured attempt to text fallback.
  Impact: Actual retrieval behavior does not match the step contract, implementation-result claims, or diagnostics model. Queries that should broaden through approved neighbors will never do so in the live wrapper.
  Recommended Fix: Run the primary structured query first, invoke the bounded expansion pass when the primary candidate count is below 3, and record pass-level diagnostics before falling back to broader text retrieval.

- ID: QR-enhance-info-retrieval-P1-003
  Priority: P1
  Required: yes
  Status: open
  Title: JSON governance artifacts are not the live runtime source of truth
  Location: .opencode/plugins/vault-query-router/extraction-logic.ts:16-24,26-102,509-537; .opencode/plugins/vault-query-router/index.ts:22-30
  Root Cause Cluster: duplicate-governance-sources
  Batch Candidate: QB-002
  Summary: The new governed helpers are imported but unused, while tag and location normalization still runs from hardcoded `TAG_KEYWORDS` and `LOCATION_ALIASES` tables inside `extraction-logic.ts`.
  Impact: `canonical-tags.json`, `tag-aliases.json`, and `location-aliases.json` are documented as the only legal runtime sources, but runtime behavior can still drift from them silently. Any future artifact update can leave the live router inconsistent with the governed files.
  Recommended Fix: Derive runtime normalization from the JSON artifacts directly, or generate the in-memory tables from them at module load time. Remove or strictly generate the duplicated tables, and add tests that fail when alias sets drift rather than only checking canonical-tag membership.

- ID: QR-enhance-info-retrieval-P2-004
  Priority: P2
  Required: yes
  Status: open
  Title: Retrieval docs and skill remain internally inconsistent about governance and live diagnostics
  Location: .opencode/workflows/query-vault.md:35-38,70,144-145; .opencode/skills/second-brain-query/SKILL.md:38,101,107; .opencode/docs/sqlite-retrieval-contract.md:312-324,333-334
  Root Cause Cluster: contract-and-prompt-drift
  Batch Candidate: QB-003
  Summary: Several docs still instruct callers to use `.opencode/alias-registry.md` for runtime tag/location mappings, the skill contains a broken contract path typo (`sqlite-retrieval-contrieval-contract.md`), and the contract simultaneously labels structured diagnostics as both "currently exposed" and "not yet exposed".
  Impact: Caller-side normalization guidance is contradictory, which is especially risky here because the workflow and skill are part of the retrieval control surface. The docs currently overstate live capabilities and point some consumers back to the wrong governance source.
  Recommended Fix: Make all retrieval-facing docs consistently reference the JSON artifacts as runtime governance sources, fix the broken contract path, and resolve the live-vs-planned diagnostics contradiction so the contract stays honest about current wrapper behavior.

### Suggested Required Fix Batches

- Batch ID: QB-001
  Selection Order: 1
  Findings:
    - QR-enhance-info-retrieval-P1-001
  Reason: Restore the live plugin entrypoint first; the current code cannot build, so no runtime validation is trustworthy until this is fixed.

- Batch ID: QB-002
  Selection Order: 2
  Findings:
    - QR-enhance-info-retrieval-P1-002
    - QR-enhance-info-retrieval-P1-003
  Reason: These two findings share the same root problem: the new governed orchestration exists mostly as helper code and docs, but the live router still executes the old path.

- Batch ID: QB-003
  Selection Order: 3
  Findings:
    - QR-enhance-info-retrieval-P2-004
  Reason: Clean up retrieval-facing contract/workflow/skill drift after runtime behavior is corrected so prompts and docs stop steering callers toward outdated behavior.

### Previous Findings Verification

- ID: none
  Previous Status: none
  Current Status: optional
  Notes: First quality round; no prior findings to verify.

## Findings

### QR-enhance-info-retrieval-P1-001: Vault query router entrypoint no longer parses

- **Severity**: required
- **Category**: correctness
- **Location**: `.opencode/plugins/vault-query-router/index.ts:759`
- **Description**: The live router contains a syntax error that prevents the entrypoint from building or loading.
- **Recommendation**: Fix the malformed statement and add an entrypoint build/import check to the test suite.

### QR-enhance-info-retrieval-P1-002: Live router still skips the required expansion structured pass

- **Severity**: required
- **Category**: correctness
- **Location**: `.opencode/plugins/vault-query-router/index.ts:779-822`
- **Description**: The runtime never executes the bounded expansion pass required by the step and instead falls straight to text fallback.
- **Recommendation**: Wire `buildExpandedConstraints()` into `searchIndex()` and record pass-level diagnostics before any fallback.

### QR-enhance-info-retrieval-P1-003: JSON governance artifacts are not the live runtime source of truth

- **Severity**: required
- **Category**: architecture
- **Location**: `.opencode/plugins/vault-query-router/extraction-logic.ts:16-24,26-102,509-537`
- **Description**: Runtime normalization still depends on duplicated hardcoded tables instead of the new governed JSON artifacts.
- **Recommendation**: Make the JSON artifacts the actual runtime input and remove or generate the duplicate tables.

### QR-enhance-info-retrieval-P2-004: Retrieval docs and skill remain internally inconsistent about governance and live diagnostics

- **Severity**: required
- **Category**: maintainability
- **Location**: `.opencode/workflows/query-vault.md:35-38,70,144-145`; `.opencode/skills/second-brain-query/SKILL.md:38,101,107`; `.opencode/docs/sqlite-retrieval-contract.md:312-324,333-334`
- **Description**: The retrieval-facing docs still mix old alias-registry guidance with the new JSON governance model and overstate live diagnostics support.
- **Recommendation**: Align all retrieval docs and prompts to the same contract truth and correct the broken path typo.

## Batch Summary

- **QB-001**: Restore buildable router entrypoint.
- **QB-002**: Wire governed runtime orchestration into the live router.
- **QB-003**: Align retrieval-facing docs and prompts with actual live behavior.

## Assessment

- **Open required findings**: 4
- **Open optional findings**: 0
- **Quality assessment**: blocked
- **Stop reason**: blocked

## Round 2

```yaml
round: 2
mode: delta
assessment: clean
base_sha: 98cc132fb55667ee062d3e97ed2693b4c83c5b25
head_sha: 79d7f01aedcfbc515940633a545d331d50fd79a9
scope: .opencode/canonical-tags.json, .opencode/tag-aliases.json, .opencode/tag-expansions.json, .opencode/location-aliases.json, .opencode/plugins/vault-query-router/governed-artifacts.ts, .opencode/plugins/vault-query-router/governed.test.ts, .opencode/plugins/vault-query-router/extraction-logic.ts, .opencode/plugins/vault-query-router/extraction.test.ts, .opencode/plugins/vault-query-router/index.ts, .opencode/docs/sqlite-retrieval-contract.md, .opencode/workflows/query-vault.md, .opencode/skills/second-brain-query/SKILL.md, .planning/phase/07-constrained-query-orchestration/implementation-result.md
stop_reason: clean
manual_intervention_required: false
active_batch_under_review: none
open_findings: 0
repeated_findings: []
repeated_root_cause_clusters: []
```

### Finding Verification

- ID: QR-enhance-info-retrieval-P1-001
  Previous Status: open
  Current Status: fixed
  Evidence: `.opencode/plugins/vault-query-router/index.ts:752-753` now has the missing statement break before `if (!normalizedConstraints)`. `bun build .opencode/plugins/vault-query-router/index.ts --no-bundle` succeeds.

- ID: QR-enhance-info-retrieval-P1-002
  Previous Status: open
  Current Status: fixed
  Evidence: `.opencode/plugins/vault-query-router/index.ts:785-835` now records a `primary-structured-pass`, calls `buildExpandedConstraints(normalizedConstraints.tags, primaryRows.length)` when the primary pass returns fewer than 3 candidates, and records an `expansion-structured-pass` with `expansionTriggerReason` and `candidateCount` before fallback/return.

- ID: QR-enhance-info-retrieval-P1-003
  Previous Status: open
  Current Status: fixed
  Evidence: `.opencode/plugins/vault-query-router/extraction-logic.ts:23-64` now builds `TAG_KEYWORDS` from `loadCanonicalTags()` and `loadTagAliases()` and builds `LOCATION_ALIASES` from `loadLocationAliases()`. Drift-detection coverage exists in `.opencode/plugins/vault-query-router/governed.test.ts:373-460`.

- ID: QR-enhance-info-retrieval-P2-004
  Previous Status: open
  Current Status: fixed
  Evidence: `.opencode/workflows/query-vault.md:35-37,70` now names JSON artifacts as runtime sources and keeps `alias-registry.md` as bootstrap-only context; `.opencode/skills/second-brain-query/SKILL.md:38-47,100-107` fixes the contract path and removes runtime-source guidance drift; `.opencode/docs/sqlite-retrieval-contract.md:283,312-324,333` now consistently marks structured diagnostics as planned/not yet live.

### New Findings

none

### Assessment

Delta verification is clean. All four previously open required findings are addressed in the reviewed scope, `bun build` succeeds for the live entrypoint, and `bun test` passes with 112 passing tests and 0 failures.
