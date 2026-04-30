---
schema: quality-review-v1
step-key: semantic-query-mapping-expansion
step-folder: 05-semantic-query-mapping-expansion
round: 6
mode: verification
overall-assessment: clean
stop-reason: clean
---

## Findings

### Finding Q05-001
- severity: required
- category: bug
- location: .opencode/plugins/vault-query-router/extraction-logic.ts:403
- description: `detectUnresolvedHints` can report a phrase as unresolved even when the same query was already deterministically mapped to a governed tag. For example, `agent-native-cli` matches `topic/ai-tools`, but the unresolved-hint scan still matches the `Agent`/`agent` entries and reports them as unresolved because the suppression logic only checks exact alias equality, not overlapping matched text. That makes the new diagnostics contradict the applied constraints.
- recommendation: Track matched source phrases during tag extraction and suppress unresolved hints when they are covered by an accepted mapping, or make unresolved-hint matching phrase-aware instead of substring-based.

### Finding Q05-002
- severity: required
- category: maintainability
- location: .opencode/plugins/vault-query-router/index.ts:15
- description: `index.ts` now imports `StructuredConstraintsInput` and `ExtractedConstraints` from `extraction-logic.ts` and then redeclares both types locally. `tsc` reports `TS2440: Import declaration conflicts with local declaration`, so the live router surface no longer type-checks cleanly even though the extracted helper tests pass.
- recommendation: Remove the duplicate local type declarations and reuse the imported types, then add at least one smoke test or type-check path that exercises `index.ts` so integration regressions are caught.

### Finding Q05-003
- severity: required
- category: test-gap
- location: .opencode/plugins/vault-query-router/extraction.test.ts:78
- description: The new time-phrase tests hardcode the current date context (`2026` and `2026-04`). They will start failing when the calendar month or year changes even if the implementation is still correct, which makes this step's regression suite time-fragile.
- recommendation: Inject a controllable clock into the extraction helpers or compute expectations from `new Date()` inside the tests so the suite stays stable across months and years.

## Batches

### Batch 1
- selection_order: 1
- findings: [Q05-001]
- status: open

### Batch 2
- selection_order: 2
- findings: [Q05-002, Q05-003]
- status: open

## Summary
The extraction refactor is directionally good and the documentation alignment is mostly consistent, but the first review pass found three delivery-relevant issues. The new unresolved-hint diagnostics can contradict successful tag mappings, the live router file no longer type-checks cleanly after the refactor, and the added time tests are brittle against calendar drift. The current test suite validates the pure helper module well, but it does not cover the router integration surface strongly enough to catch the `index.ts` regression.

## Stop Reason
none

---

## Round 2 (delta)

### Q05-001 Status
- status: partially-fixed
- notes: The new `findMatchRange()` plus overlap suppression correctly fixes the original `agent-native-cli` false positive path, and the added tests cover that case. However, `findMatchRange()` only returns the first matching occurrence for a hint, so `detectUnresolvedHints()` can still suppress a real standalone unresolved hint when an overlapping mapped alias appears earlier in the query. Example: `agent-native-cli for Agent` would incorrectly hide the trailing standalone `Agent` hint because the first `agent` occurrence is inside the mapped alias.

### New Issues
- none

### Updated Batches
- Batch 1: open
- Batch 2: open (Q05-002, Q05-003)

### Overall Assessment
mixed

### Stop Reason
none

---

## Round 3 (delta)

### Q05-001 Status
- status: fixed
- notes: `detectUnresolvedHints()` now checks all hint occurrences via `findAllMatchRanges()` and only suppresses the occurrences overlapped by mapped alias ranges. The new `agent-native-cli Agent` regression test passes, `agent-native-cli usage` still suppresses the embedded `Agent` false positive, and no new contradiction was found in the reviewed extraction paths.

### New Issues
- none

### Updated Batches
- Batch 1: closed
- Batch 2: open (Q05-002, Q05-003)

### Overall Assessment
mixed

### Stop Reason
none

---

## Round 4 (delta)

### Q05-002 Status
- status: fixed
- notes: `index.ts` now imports `StructuredConstraintsInput` and `ExtractedConstraints` from `extraction-logic.ts` without redeclaring either type locally. The conflicting local aliases called out in round 1 are gone, so the reviewed file no longer contains the `TS2440` collision source.

### Q05-003 Status
- status: fixed
- notes: The time-phrase expectations now derive `currentYear`, `currentMonth`, and prior-period values from `new Date()` helpers instead of hardcoded `2026` literals. Running `bun test ./.opencode/plugins/vault-query-router/extraction.test.ts` from the repo root passed with 56 tests, so the calendar-fragile assertions from round 1 are no longer present.

### New Issues
none

### Updated Batches
- Batch 1: closed
- Batch 2: closed

### Overall Assessment
clean

### Stop Reason
clean

### Review State
- assessment: clean
- manual_intervention_required: false
- active_batch_under_review: Batch 2
- repeated_findings: none
- repeated_root_cause_clusters: none
- normalized_findings: none open
- suggested_batches: none

---

## Round 5 (verification)

### Verification of Previous Fixes
- Q05-001: confirmed-fixed
- Q05-002: confirmed-fixed
- Q05-003: confirmed-fixed

### New Issues
- Q05-004 (required, bug, `.opencode/plugins/vault-query-router/index.ts:17`): the new helper-module import uses `"./extraction-logic"` without a file extension. Under Node's ESM resolver this fails with `ERR_MODULE_NOT_FOUND`, so the live router surface no longer imports cleanly outside the Bun-only helper test path. Use the runtime-compatible specifier expected by the plugin loader and add a load-smoke check for `index.ts`.

### Overall Assessment
mixed

### Stop Reason
blocked

### Review State
- assessment: mixed
- manual_intervention_required: false
- active_batch_under_review: Batch 3
- repeated_findings: none
- repeated_root_cause_clusters: module-loading
- normalized_findings:
  - Q05-004: open
- suggested_batches:
  - Batch 3: [Q05-004]

---

## Round 6 (verification)

### Previous Findings
- Q05-001: confirmed-fixed
- Q05-002: confirmed-fixed
- Q05-003: confirmed-fixed
- Round 5 ESM finding: false-positive

### New Issues
none

### Overall Assessment
clean

### Stop Reason
clean
