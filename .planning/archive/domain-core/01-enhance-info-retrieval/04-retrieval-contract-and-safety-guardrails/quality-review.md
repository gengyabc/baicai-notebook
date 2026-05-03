---
schema: review-result-v1
skill: quality-review
phase: enhance-info-retrieval
step_folder: 04-retrieval-contract-and-safety-guardrails
step-folder: 04-retrieval-contract-and-safety-guardrails
result_file: .planning/phase/04-retrieval-contract-and-safety-guardrails/quality-review.md
finding_id_scope: phase
append_only: true
step-version: 1
requirement-version: 1
review-mode: full
round: 1
---

## Round 1

```yaml
round: 1
mode: full
assessment: mixed
base_sha: 98cc132fb55667ee062d3e97ed2693b4c83c5b25
head_sha: c9df63d5aaa173fecb2be80d3388d7e2a12c27af
scope:
  - .opencode/docs/sqlite-retrieval-contract.md
  - .opencode/workflows/query-vault.md
  - .opencode/skills/second-brain-query/SKILL.md
  - .opencode/rules/retrieval-safety.md
  - .opencode/rules/debug-mode.md
stop_reason: none
manual_intervention_required: false
active_batch_under_review: none
open_findings: 2
batch_count: 1
repeated_findings: []
repeated_root_cause_clusters: []
```

### Code Review Summary

The step mostly aligns the contract, workflow, skill, and rules around local-first retrieval and provenance labeling. One required inconsistency remains: the workflow and runtime skill still describe "matched phrases" as wrapper inputs even though the canonical current request shape does not support them, which blurs the live-vs-planned boundary this step was supposed to freeze.

### Findings

#### Finding Q1
- **severity**: required
- **category**: correctness
- **description**: `query-vault.md` and `second-brain-query/SKILL.md` both say Stage 0 produces normalized constraint values and matched phrases "to be passed to the wrapper", but the canonical current request shape only accepts `query`, `limit`, `folders`, and `constraints`. `matchedPhrase` appears only inside the planned `structuredTrace` addition, which is explicitly not yet supported by the live wrapper. This contradicts the contract's current-vs-planned boundary and can mislead later callers into assuming the live wrapper consumes extra extraction metadata.
- **location**: `.opencode/workflows/query-vault.md` section "Diagnostics"; `.opencode/skills/second-brain-query/SKILL.md` section "Diagnostics"; cross-check `.opencode/docs/sqlite-retrieval-contract.md` sections "Current Request Shape" and "Planned Request Shape"
- **recommendation**: Change both consumer docs to say that Stage 0 currently passes only the normalized constraint payload through the live request shape. Keep matched phrases as caller-side artifacts unless and until they are carried through an explicitly supported field such as the planned `structuredTrace` input.
- **status**: open

#### Finding Q2
- **severity**: optional
- **category**: maintainability
- **description**: The step declares `.opencode/docs/sqlite-retrieval-contract.md` as the single canonical schema reference, and `retrieval-safety.md` says other files must reference rather than redefine schema details. However, `query-vault.md` still embeds concrete table and column details plus example SQL, and `second-brain-query/SKILL.md` still names the `notes` and `properties` tables directly. The copies are currently aligned, but keeping schema details in multiple consumer docs recreates the drift surface this step is trying to reduce.
- **location**: `.opencode/workflows/query-vault.md` sections "Location matching detail" and "SQL implementation patterns" plus the SQL examples; `.opencode/skills/second-brain-query/SKILL.md` section "Retrieval Decision Chain"
- **recommendation**: Trim consumer docs back to behavior requirements and point concrete schema and SQL-shape details back to the contract doc, so future schema changes only need one canonical update.
- **status**: optional

### Normalized Findings

- ID: `QR-enhance-info-retrieval-P2-001`
  Priority: `P2`
  Required: `yes`
  Status: `open`
  Title: Live wrapper inputs are overstated as including matched phrases
  Location: `.opencode/workflows/query-vault.md` Diagnostics; `.opencode/skills/second-brain-query/SKILL.md` Diagnostics
  Root Cause Cluster: `live-vs-planned-contract-boundary`
  Batch Candidate: `QB-001`
  Summary: Consumer docs say matched phrases are passed to the wrapper even though the canonical current request shape does not support that input.
  Impact: Later callers can implement against a non-existent live wrapper field and reintroduce confusion about which diagnostics are caller-side versus wrapper-side.
  Recommended Fix: Limit live wrapper input documentation to the current `constraints` payload and explicitly keep matched phrases caller-side until an input field is actually supported.

- ID: `QR-enhance-info-retrieval-P3-002`
  Priority: `P3`
  Required: `no`
  Status: `optional`
  Title: Consumer docs still duplicate schema details outside the canonical contract
  Location: `.opencode/workflows/query-vault.md` structured SQL sections; `.opencode/skills/second-brain-query/SKILL.md` Stage 1 description
  Root Cause Cluster: `canonical-contract-drift-surface`
  Batch Candidate: `QB-001`
  Summary: Multiple consumer docs still restate table, column, and SQL-shape details after declaring the contract doc the single schema authority.
  Impact: The docs are aligned today, but future schema or wrapper changes will require synchronized edits in several places and increase drift risk.
  Recommended Fix: Replace duplicated schema details with references back to the canonical contract and keep consumer docs focused on behavior.

### Suggested Required Fix Batches

- Batch ID: `QB-001`
  Selection Order: `1`
  Findings:
    - `QR-enhance-info-retrieval-P2-001`
    - `QR-enhance-info-retrieval-P3-002`
  Reason: Both findings come from consumer documents drifting away from the intended canonical contract boundary and can be resolved together by tightening what downstream docs restate.

### Previous Findings Verification

- ID: none
  Previous Status: none
  Current Status: optional
  Notes: First review round for this step; no prior quality-review state exists.

## Summary

- total findings: 2
- required findings: 1
- optional findings: 1
- assessment: mixed
- stop_reason: none

## Round 2

```yaml
round: 2
mode: delta
assessment: mixed
base_sha: 98cc132fb55667ee062d3e97ed2693b4c83c5b25
head_sha: c9df63d5aaa173fecb2be80d3388d7e2a12c27af
scope:
  - .planning/phase/04-retrieval-contract-and-safety-guardrails/quality-review.md
  - .opencode/workflows/query-vault.md
  - .opencode/skills/second-brain-query/SKILL.md
  - .opencode/docs/sqlite-retrieval-contract.md
stop_reason: none
manual_intervention_required: false
active_batch_under_review: none
open_findings: 1
batch_count: 0
repeated_findings: []
repeated_root_cause_clusters: []
```

### Code Review Summary

The required contract-boundary issue is resolved: both consumer docs now clearly separate caller-side matched phrases from the live wrapper's current input shape. The optional drift-reduction cleanup improved substantially, but `query-vault.md` still hardcodes one schema detail (`description` coming from the `properties` table with key `description`) instead of fully deferring that detail to the canonical contract.

### Delta Review

- Q1 verification: `.opencode/workflows/query-vault.md` and `.opencode/skills/second-brain-query/SKILL.md` now both say Stage 0 passes normalized constraint values through the current request shape, while matched phrases remain caller-side artifacts until the planned `structuredTrace` input exists. This matches the current and planned request-shape split in `.opencode/docs/sqlite-retrieval-contract.md`.
- Q2 verification: the fix removed the inline SQL examples and most direct schema restatement, and the skill now points Stage 1 behavior back to the contract for schema and table conventions. However, `.opencode/workflows/query-vault.md` Stage 2.5 still says to use the `description` field from the `properties` table (`key = description`), which is still a concrete schema restatement in a consumer doc.
- New issues introduced by the fix: none found in the reviewed delta.

### Normalized Findings

- ID: `QR-enhance-info-retrieval-P2-001`
  Priority: `P2`
  Required: `yes`
  Status: `closed`
  Title: Live wrapper inputs are overstated as including matched phrases
  Location: `.opencode/workflows/query-vault.md` Diagnostics; `.opencode/skills/second-brain-query/SKILL.md` Diagnostics
  Root Cause Cluster: `live-vs-planned-contract-boundary`
  Batch Candidate: `QB-001`
  Summary: Consumer docs no longer imply that matched phrases are passed through a live wrapper input field.
  Impact: The current-vs-planned wrapper boundary is now documented consistently, reducing the risk that callers implement against unsupported live inputs.
  Recommended Fix: None; verified closed in this delta round.

- ID: `QR-enhance-info-retrieval-P3-002`
  Priority: `P3`
  Required: `no`
  Status: `optional`
  Title: Consumer docs still duplicate schema details outside the canonical contract
  Location: `.opencode/workflows/query-vault.md` Stage 2.5 description reranking guidance
  Root Cause Cluster: `canonical-contract-drift-surface`
  Batch Candidate: `QB-001`
  Summary: Most schema duplication was removed, but `query-vault.md` still names the `properties` table and `description` key directly instead of fully referencing the canonical contract.
  Impact: The remaining duplication is small, but it still leaves one consumer-doc drift point if the shortlist explanation field changes later.
  Recommended Fix: Replace the Stage 2.5 table/key wording with a contract reference so all schema details remain centralized in `.opencode/docs/sqlite-retrieval-contract.md`.

### Suggested Required Fix Batches

None. No required findings remain open in this delta round.

### Previous Findings Verification

- ID: `QR-enhance-info-retrieval-P2-001`
  Previous Status: `open`
  Current Status: `closed`
  Notes: Verified fixed. Both consumer docs now document matched phrases as caller-side extraction artifacts only and limit live wrapper inputs to the current request shape supported by the contract.

- ID: `QR-enhance-info-retrieval-P3-002`
  Previous Status: `optional`
  Current Status: `optional`
  Notes: Partially improved but not fully resolved. The major SQL and schema duplication was removed, yet `query-vault.md` still directly names the `properties` table and `description` key in Stage 2.5 instead of fully deferring schema details to the canonical contract.

## Round 3

```yaml
round: 3
mode: verification
assessment: clean
base_sha: 98cc132fb55667ee062d3e97ed2693b4c83c5b25
head_sha: c9df63d5aaa173fecb2be80d3388d7e2a12c27af
scope:
  - .opencode/docs/sqlite-retrieval-contract.md
  - .opencode/workflows/query-vault.md
  - .opencode/skills/second-brain-query/SKILL.md
  - .opencode/rules/retrieval-safety.md
  - .opencode/rules/debug-mode.md
stop_reason: clean
manual_intervention_required: false
active_batch_under_review: none
open_findings: 1
batch_count: 0
repeated_findings: []
repeated_root_cause_clusters: []
```

### Code Review Summary

Final verification is clean. The previously required contract-boundary issue remains closed, the reviewed retrieval contract documents stay aligned on local-first wrapper usage, provenance separation, stale-index labeling, and non-debug network permission, and no new P0-P2 issues were introduced in the reviewed scope.

### Verification

<details>

- Verified `.opencode/workflows/query-vault.md` and `.opencode/skills/second-brain-query/SKILL.md` still treat matched phrases as caller-side extraction artifacts rather than live wrapper input.
- Verified the canonical contract, workflow, skill, safety rule, and debug-mode rule consistently preserve required guardrails for schema discipline, stale-index handling, provenance separation, and non-debug network permission.
- Checked the previously optional drift item in Stage 2.5 of `query-vault.md`; it remains optional and does not create a new required issue for this verification pass.
- No new required regressions found in the reviewed files.

</details>

### Normalized Findings

- ID: `QR-enhance-info-retrieval-P2-001`
  Priority: `P2`
  Required: `yes`
  Status: `closed`
  Title: Live wrapper inputs are overstated as including matched phrases
  Location: `.opencode/workflows/query-vault.md` Diagnostics; `.opencode/skills/second-brain-query/SKILL.md` Diagnostics
  Root Cause Cluster: `live-vs-planned-contract-boundary`
  Batch Candidate: `QB-001`
  Summary: The consumer docs continue to keep matched phrases caller-side and limit live wrapper inputs to the current request shape.
  Impact: The current-vs-planned wrapper boundary remains clear, so downstream callers are less likely to implement against unsupported live inputs.
  Recommended Fix: None; verified closed.

- ID: `QR-enhance-info-retrieval-P3-002`
  Priority: `P3`
  Required: `no`
  Status: `optional`
  Title: Consumer docs still duplicate schema details outside the canonical contract
  Location: `.opencode/workflows/query-vault.md` Stage 2.5 description reranking guidance
  Root Cause Cluster: `canonical-contract-drift-surface`
  Batch Candidate: `QB-001`
  Summary: `query-vault.md` still directly references the `properties` table and `description` key in Stage 2.5 instead of fully deferring that schema detail to the canonical contract.
  Impact: This leaves a small future doc-drift surface, but it does not materially affect correctness or safety in the verified scope.
  Recommended Fix: Optional only. Replace the remaining table/key wording with a contract reference if doc-centralization cleanup is desired later.

### Suggested Required Fix Batches

None. No required findings remain open.

### Previous Findings Verification

- ID: `QR-enhance-info-retrieval-P2-001`
  Previous Status: `closed`
  Current Status: `closed`
  Notes: Re-verified closed. The live wrapper input boundary remains documented consistently across the workflow, skill, and canonical contract.

- ID: `QR-enhance-info-retrieval-P3-002`
  Previous Status: `optional`
  Current Status: `optional`
  Notes: Still optional only. The remaining Stage 2.5 schema detail duplication does not introduce a required correctness, safety, or regression issue.
