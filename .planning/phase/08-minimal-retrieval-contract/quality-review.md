---
step-key: minimal-retrieval-contract
step-number: 8
step-folder: 08-minimal-retrieval-contract
requirement-version: 1
step-version: 1
assessment: clean
round: 2
updated-at: 2026-05-02
---

## Round 1

```yaml
round: 1
mode: full
assessment: mixed
base_sha: 98cc132
head_sha: 4ab82a6
scope: .opencode/plugins/vault-query-router/index.ts, .opencode/plugins/vault-query-router/extraction-logic.ts, .opencode/plugins/vault-query-router/extraction.test.ts, .opencode/plugins/vault-query-router/index.test.ts, .opencode/docs/sqlite-retrieval-contract.md, .opencode/workflows/query-vault.md, .opencode/skills/second-brain-query/SKILL.md
stop_reason: none
manual_intervention_required: false
active_batch_under_review: none
open_findings: 4
batch_count: 3
repeated_findings: []
repeated_root_cause_clusters: []
```

### Code Review Summary

The step mostly aligns docs and wrapper inputs around the minimal contract, but four issues remain. Two are correctness/contract problems in live retrieval behavior, and two are test/coverage gaps that currently mask those problems.

### Normalized Findings

- ID: QR-enhance-info-retrieval-P1-001
  Priority: P1
  Required: yes
  Status: open
  Title: Note-chronology queries incorrectly constrain both created and updated timestamps
  Location: `.opencode/plugins/vault-query-router/extraction-logic.ts:516-520`, `.opencode/plugins/vault-query-router/extraction.test.ts:88-97`
  Root Cause Cluster: chronology-semantics
  Batch Candidate: QB-001
  Summary: Any note-time query currently emits both `created*` and `updated*` windows. A query like "2025年创建的笔记" should constrain creation time only, but the implementation also requires `updated` to fall inside the same window.
  Impact: Valid notes are dropped whenever their created timestamp matches but their updated timestamp falls outside the requested range, and vice versa for update-focused queries. The current test locks in the wrong behavior by asserting both windows are always present.
  Recommended Fix: Distinguish created-only, updated-only, and dual-chronology intent during extraction, then emit only the requested window fields. Add tests for created-only, updated-only, and both.

- ID: QR-enhance-info-retrieval-P1-002
  Priority: P1
  Required: yes
  Status: open
  Title: The documented frontmatter-filter stage is not executable through the live wrapper surface
  Location: `.opencode/plugins/vault-query-router/index.ts:223-231`, `.opencode/plugins/vault-query-router/index.ts:467-476`, `.opencode/workflows/query-vault.md:237-243`
  Root Cause Cluster: contract-surface-mismatch
  Batch Candidate: QB-002
  Summary: The workflow and skill now require an LLM-side `[frontmatter-filter]` stage before full file reads, but `vault_index_search` still returns only formatted shortlist text and never exposes `frontmatter_json` for shortlisted rows.
  Impact: The new retrieval order cannot actually be followed by callers. Agents must either skip the promised frontmatter-filter stage or read full files early, which breaks the step's stated boundary.
  Recommended Fix: Either expose serialized frontmatter for shortlisted candidates through the wrapper/tool contract, or scale the docs back so they do not require a stage the tool surface cannot support yet.

- ID: QR-enhance-info-retrieval-P2-003
  Priority: P2
  Required: yes
  Status: open
  Title: Router still uses a fixed shortlist sufficiency threshold that the updated contract now forbids
  Location: `.opencode/plugins/vault-query-router/index.ts:397-427`
  Root Cause Cluster: shortlist-policy-drift
  Batch Candidate: QB-002
  Summary: `searchIndex` treats `primaryRows.length >= 3` as the cutoff for accepting the structured result before expansion or fallback.
  Impact: This reintroduces a hardcoded global threshold in live behavior even though the updated contract says shortlist tolerance must be context-budget-aware rather than fixed. Small but sufficient shortlists can be expanded or downgraded unexpectedly.
  Recommended Fix: Move the sufficiency decision to a context-budget-aware policy or caller-controlled heuristic, and add explicit tests for the chosen behavior.

- ID: QR-enhance-info-retrieval-P2-004
  Priority: P2
  Required: yes
  Status: open
  Title: The updated router tests do not actually exercise the explicit constraints path
  Location: `.opencode/plugins/vault-query-router/index.test.ts:11-20`, `.opencode/plugins/vault-query-router/index.test.ts:30-39`, `.opencode/plugins/vault-query-router/index.test.ts:63-72`
  Root Cause Cluster: false-positive-test-coverage
  Batch Candidate: QB-003
  Summary: The tests call `searchIndex` with an extra positional `undefined`, so the intended constraints object is passed as a sixth argument and ignored. The assertions therefore validate query-side inference and general non-failure, not the new explicit constraint contract.
  Impact: The suite passes even if `createdStart`/`createdEnd`, tag constraints, or legacy-field rejection regress. This masks contract breakage in the most important changed path.
  Recommended Fix: Update the calls to match the 5-argument signature, then assert on outputs that prove the explicit constraints were applied, especially for chronology windows.

### Suggested Required Fix Batches

- Batch ID: QB-001
  Selection Order: 1
  Findings: QR-enhance-info-retrieval-P1-001
  Reason: Fix chronology extraction semantics first because it directly changes which notes are returned for note-time questions.

- Batch ID: QB-002
  Selection Order: 2
  Findings: QR-enhance-info-retrieval-P1-002, QR-enhance-info-retrieval-P2-003
  Reason: These findings are both contract/runtime alignment issues in the live wrapper and should be resolved together.

- Batch ID: QB-003
  Selection Order: 3
  Findings: QR-enhance-info-retrieval-P2-004
  Reason: Repair the tests after the runtime contract is corrected so coverage proves the intended behavior.

### Previous Findings Verification

- ID: none
  Previous Status: none
  Current Status: optional
  Notes: No prior quality-review round exists for this step.

## Round 2

```yaml
round: 2
mode: delta
assessment: clean
base_sha: 4ab82a6
head_sha: 4ab82a6
scope: .opencode/plugins/vault-query-router/index.ts, .opencode/plugins/vault-query-router/extraction-logic.ts, .opencode/plugins/vault-query-router/extraction.test.ts, .opencode/plugins/vault-query-router/index.test.ts, .opencode/docs/sqlite-retrieval-contract.md, .opencode/workflows/query-vault.md, .opencode/skills/second-brain-query/SKILL.md
stop_reason: clean
manual_intervention_required: false
active_batch_under_review: none
open_findings: 0
batch_count: 0
repeated_findings: []
repeated_root_cause_clusters: []
```

### Code Review Summary

Round 1's four required findings are adequately addressed. The delta keeps the live wrapper, extraction logic, tests, and contract docs aligned on the minimal retrieval contract, and I did not find any new P0-P2 regressions in the reviewed scope.

### Normalized Findings

- ID: QR-enhance-info-retrieval-P1-001
  Priority: P1
  Required: yes
  Status: closed
  Title: Note-chronology queries incorrectly constrain both created and updated timestamps
  Location: `.opencode/plugins/vault-query-router/extraction-logic.ts:535-553`, `.opencode/plugins/vault-query-router/extraction.test.ts:88-127`
  Root Cause Cluster: chronology-semantics
  Batch Candidate: QB-001
  Summary: Extraction now distinguishes created-only, updated-only, both, and ambiguous note-chronology intent, and tests cover each case.
  Impact: Created-only and updated-only note-time queries no longer over-constrain the shortlist by forcing both timestamp families at once.
  Recommended Fix: None.

- ID: QR-enhance-info-retrieval-P1-002
  Priority: P1
  Required: yes
  Status: closed
  Title: The documented frontmatter-filter stage is not executable through the live wrapper surface
  Location: `.opencode/plugins/vault-query-router/index.ts:223-225`, `.opencode/plugins/vault-query-router/index.ts:306-320`, `.opencode/workflows/query-vault.md:239-254`
  Root Cause Cluster: contract-surface-mismatch
  Batch Candidate: QB-002
  Summary: The structured shortlist now selects and emits `frontmatter_json`, and the workflow/skill/docs consistently describe frontmatter-based narrowing as the downstream stage after shortlist generation.
  Impact: Callers now have the serialized frontmatter payload needed to perform the documented `[frontmatter-filter]` stage before full file reads.
  Recommended Fix: None.

- ID: QR-enhance-info-retrieval-P2-003
  Priority: P2
  Required: yes
  Status: closed
  Title: Router still uses a fixed shortlist sufficiency threshold that the updated contract now forbids
  Location: `.opencode/plugins/vault-query-router/index.ts:399-433`
  Root Cause Cluster: shortlist-policy-drift
  Batch Candidate: QB-002
  Summary: The hardcoded `>= 3` acceptance gate is gone. Structured results are accepted when present, and the docs now frame shortlist sufficiency as context-budget-aware contract guidance rather than a fixed candidate-count rule.
  Impact: The live wrapper no longer violates the step's prohibition on a single global shortlist threshold.
  Recommended Fix: None.

- ID: QR-enhance-info-retrieval-P2-004
  Priority: P2
  Required: yes
  Status: closed
  Title: The updated router tests do not actually exercise the explicit constraints path
  Location: `.opencode/plugins/vault-query-router/index.test.ts:92-136`
  Root Cause Cluster: false-positive-test-coverage
  Batch Candidate: QB-003
  Summary: The test calls now use the correct 5-argument signature, and the explicit-constraints test verifies structured execution even when query text is unrelated.
  Impact: The suite now exercises the intended contract path instead of silently relying on query-side inference.
  Recommended Fix: None.

### Suggested Required Fix Batches

- Batch ID: none
  Selection Order: 0
  Findings: none
  Reason: No open required findings remain in the reviewed delta.

### Previous Findings Verification

- ID: QR-enhance-info-retrieval-P1-001
  Previous Status: open
  Current Status: closed
  Notes: Verified created-only, updated-only, both, and ambiguous note-time extraction behavior plus targeted tests.

- ID: QR-enhance-info-retrieval-P1-002
  Previous Status: open
  Current Status: closed
  Notes: Verified `frontmatter_json` is selected from SQLite and surfaced in structured shortlist output for downstream filtering.

- ID: QR-enhance-info-retrieval-P2-003
  Previous Status: open
  Current Status: closed
  Notes: Verified the `>= 3` gate was removed and the contract/docs no longer rely on a single fixed shortlist threshold.

- ID: QR-enhance-info-retrieval-P2-004
  Previous Status: open
  Current Status: closed
  Notes: Verified the corrected test signature and explicit-constraints coverage path; targeted Bun tests pass.
