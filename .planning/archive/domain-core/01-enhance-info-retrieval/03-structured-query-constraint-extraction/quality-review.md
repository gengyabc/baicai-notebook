---
schema: review-result-v1
skill: quality-review
phase: enhance-info-retrieval
step_folder: 03-structured-query-constraint-extraction
result_file: .planning/phase/03-structured-query-constraint-extraction/quality-review.md
finding_id_scope: phase
append_only: true
step-version: 1
requirement-version: 1
---

## Round 1

```yaml
round: 1
mode: full
reviewed_at: 2026-04-30T00:00:00Z
assessment: mixed
base_sha: 98cc132fb55667ee062d3e97ed2693b4c83c5b25
head_sha: f8324366786bfb5235b2b6017352bd4d6a4bbfe4
scope: >-
  .opencode/docs/sqlite-retrieval-contract.md,
  .opencode/workflows/query-vault.md,
  .opencode/skills/second-brain-query/SKILL.md,
  .opencode/alias-registry.md,
  .opencode/rules/retrieval-safety.md
stop_reason: none
manual_intervention_required: false
active_batch_under_review: none
open_findings: 4
batch_count: 3
repeated_findings: []
repeated_root_cause_clusters: []
```

### Code Review Summary

Reviewed the five step-owned retrieval docs plus the live `vault_index_search` tool schema in `.opencode/plugins/vault-query-router/index.ts` for contract alignment. The structured-first direction is coherent, but the step currently publishes two contract bugs and one time-normalization bug that would mislead downstream implementations.

### Normalized Findings

- ID: `QR-enhance-info-retrieval-P1-001`
  - Priority: `P1`
  - Required: `yes`
  - Status: `open`
  - Title: Published wrapper contract does not match the live `vault_index_search` schema
  - Location: `.opencode/docs/sqlite-retrieval-contract.md:168-240`, `.opencode/workflows/query-vault.md:84-92`, `.opencode/skills/second-brain-query/SKILL.md:36-37`, `.opencode/plugins/vault-query-router/index.ts:1027-1042`
  - Root Cause Cluster: contract-drift-between-docs-and-wrapper
  - Batch Candidate: `QB-001`
  - Summary: The new docs state that `vault_index_search` accepts scalar `country`/`province`/`city`, `extraFields`, `structuredTrace`, and multiple diagnostics fields, but the live tool schema still accepts only tags, hierarchicalTags, array-valued location fields, and time window fields. Agents that follow the new docs will send unsupported arguments or assume diagnostics that the wrapper does not return.
  - Impact: This is a behavior-breaking documentation contract. It can cause invalid tool calls, ignored constraints, and false confidence that the retrieval wrapper already supports the new structured payload.
  - Recommended Fix: Either implement the documented schema in the wrapper now, or rewrite the docs to mark the expanded shape as planned/future contract work and keep all current-behavior sections aligned with the live tool schema.

- ID: `QR-enhance-info-retrieval-P2-002`
  - Priority: `P2`
  - Required: `yes`
  - Status: `open`
  - Title: Input and output responsibilities are conflated inside the `constraints` payload
  - Location: `.opencode/docs/sqlite-retrieval-contract.md:168-229`
  - Root Cause Cluster: contract-boundary-ambiguity
  - Batch Candidate: `QB-001`
  - Summary: The “Normalized Structured-Constraint Input Shape” mixes caller-supplied extraction data with wrapper-produced execution diagnostics. `candidateCounts` and `fallbackReason` are generated only after shortlist execution, yet they are documented as part of the input object that `vault_index_search` accepts.
  - Impact: This makes the contract internally inconsistent, creates impossible caller obligations, and invites competing implementations of what belongs in request vs response.
  - Recommended Fix: Split the contract into separate request and response shapes. Keep extraction outputs such as `structuredTrace` in the request only if the caller truly supplies them, and move execution diagnostics (`appliedConstraints`, `candidateCounts`, `fallbackReason`, etc.) into an explicit wrapper response contract.

- ID: `QR-enhance-info-retrieval-P1-003`
  - Priority: `P1`
  - Required: `yes`
  - Status: `open`
  - Title: The `X之后` time alias normalizes “after” queries inclusively instead of after the boundary
  - Location: `.opencode/docs/sqlite-retrieval-contract.md:282-284`
  - Root Cause Cluster: time-range-semantics
  - Batch Candidate: `QB-002`
  - Summary: The alias table maps `X之后` / `after X` to `[normalized(X), latest_indexed_date]`, and the example `2025年之后 -> [2025-01-01, 9999-12-31]` still includes 2025. That contradicts the plain-language meaning of “after 2025” and is inconsistent with the exclusive example used for `X之前`.
  - Impact: Implementations that follow the contract will over-match entire boundary periods and return incorrect notes for after/before queries.
  - Recommended Fix: Define whether `before/after` are exclusive or inclusive, then make both table rows and examples consistent. For `2025年之后`, the likely window is `[2026-01-01, 9999-12-31]` if the phrase is exclusive.

- ID: `QR-enhance-info-retrieval-P3-004`
  - Priority: `P3`
  - Required: `no`
  - Status: `optional`
  - Title: Stage-count wording still claims six stages while the skill enumerates seven numbered items
  - Location: `.opencode/workflows/query-vault.md:39`, `.opencode/skills/second-brain-query/SKILL.md:34-45`
  - Root Cause Cluster: terminology-drift
  - Batch Candidate: `QB-003`
  - Summary: The workflow text says “six stages” while the skill lists Stage 0, 1, 2, 2.5, 3, 4, and 5 as seven numbered bullets. Readers can still recover the intended flow, but the wording is not internally crisp.
  - Impact: Minor readability and onboarding friction.
  - Recommended Fix: Use one consistent phrasing everywhere, such as “six numbered stages plus conditional Stage 2.5” or renumber the list to match the claim.

### Suggested Required Fix Batches

- Batch ID: `QB-001`
  - Selection Order: `1`
  - Findings: `QR-enhance-info-retrieval-P1-001`, `QR-enhance-info-retrieval-P2-002`
  - Reason: Align the published retrieval contract with the actual wrapper boundary before other docs build on top of it.

- Batch ID: `QB-002`
  - Selection Order: `2`
  - Findings: `QR-enhance-info-retrieval-P1-003`
  - Reason: Fix time-window semantics so future implementations do not encode incorrect after/before behavior.

- Batch ID: `QB-003`
  - Selection Order: `3`
  - Findings: `QR-enhance-info-retrieval-P3-004`
  - Reason: Cleanup-only terminology pass after required contract issues are resolved.

### Previous Findings Verification

- ID: `none`
  - Previous Status: `none`
  - Current Status: `closed`
  - Notes: First review round; no prior findings to verify.

## Round 2

```yaml
round: 2
mode: delta
reviewed_at: 2026-04-30T06:22:49Z
assessment: mixed
base_sha: f8324366786bfb5235b2b6017352bd4d6a4bbfe4
head_sha: f8324366786bfb5235b2b6017352bd4d6a4bbfe4
scope: >-
  .opencode/docs/sqlite-retrieval-contract.md,
  .opencode/workflows/query-vault.md,
  .opencode/skills/second-brain-query/SKILL.md,
  .opencode/rules/retrieval-safety.md,
  .opencode/plugins/vault-query-router/index.ts
stop_reason: none
manual_intervention_required: false
active_batch_under_review: QB-001
open_findings: 4
batch_count: 3
repeated_findings:
  - QR-enhance-info-retrieval-P1-001
  - QR-enhance-info-retrieval-P2-002
repeated_root_cause_clusters:
  - contract-drift-between-docs-and-wrapper
  - contract-boundary-ambiguity
```

### Code Review Summary

Reviewed the QB-001 fix pass against the current wrapper schema and behavior in `.opencode/plugins/vault-query-router/index.ts`. The pass made real progress by splitting current versus planned request/response contracts, but both targeted findings remain open: the docs still promise empty-constraint structured-shortlist behavior that the live wrapper does not support, and the skill still blurs extraction output versus wrapper-produced diagnostics.

Verified this round:

- Not fixed: `QR-enhance-info-retrieval-P1-001`
- Not fixed: `QR-enhance-info-retrieval-P2-002`
- Still valid and unchanged: `QR-enhance-info-retrieval-P1-003`, `QR-enhance-info-retrieval-P3-004`

### Normalized Findings

- ID: `QR-enhance-info-retrieval-P1-001`
  - Priority: `P1`
  - Required: `yes`
  - Status: `open`
  - Title: Published wrapper contract does not match the live `vault_index_search` schema
  - Location: `.opencode/docs/sqlite-retrieval-contract.md:187-188,255-263`, `.opencode/workflows/query-vault.md:58-59,108-109`, `.opencode/skills/second-brain-query/SKILL.md:109`, `.opencode/plugins/vault-query-router/index.ts:902-921`
  - Root Cause Cluster: contract-drift-between-docs-and-wrapper
  - Batch Candidate: `QB-001`
  - Summary: The fix aligned the argument shape better, but the published contract still says empty structured extraction proceeds through Stage 1 as an empty structured shortlist before relaxation. The live wrapper does not support that boundary: when normalized constraints are absent it immediately switches to text fallback (`searchIndex` returns `mode: "text-fallback"` and never emits an empty structured shortlist).
  - Impact: Agents following the current docs will still assume a structured-first empty-shortlist path that the wrapper cannot execute, which keeps the retrieval contract behaviorally inaccurate even after the schema wording cleanup.
  - Recommended Fix: Either document the current wrapper truthfully as "infer constraints when possible, otherwise text fallback" or change the wrapper so an empty constraint set yields an empty structured shortlist that Stage 3 can handle explicitly.

- ID: `QR-enhance-info-retrieval-P2-002`
  - Priority: `P2`
  - Required: `yes`
  - Status: `open`
  - Title: Input and output responsibilities are conflated inside the `constraints` payload
  - Location: `.opencode/skills/second-brain-query/SKILL.md:98-100`
  - Root Cause Cluster: contract-boundary-ambiguity
  - Batch Candidate: `QB-001`
  - Summary: The contract doc now separates request and response responsibilities, but the skill still says "The extraction pass must produce a `structuredTrace` and the full diagnostics payload" before immediately saying execution diagnostics are response-side. That leaves the request/response ownership boundary internally inconsistent in one of the step's live consumer documents.
  - Impact: Downstream agents can still infer that wrapper execution diagnostics belong to extraction-time caller output, which preserves the ambiguity QB-001 was meant to remove.
  - Recommended Fix: Update the skill so Stage 0 produces only caller-side extraction artifacts such as `structuredTrace`; reserve `appliedConstraints`, `candidateCounts`, `fallbackReason`, and similar fields exclusively for the wrapper response contract.

- ID: `QR-enhance-info-retrieval-P1-003`
  - Priority: `P1`
  - Required: `yes`
  - Status: `open`
  - Title: The `X之后` time alias normalizes “after” queries inclusively instead of after the boundary
  - Location: `.opencode/docs/sqlite-retrieval-contract.md:305-307`
  - Root Cause Cluster: time-range-semantics
  - Batch Candidate: `QB-002`
  - Summary: The time alias table still maps `X之后` / `after X` to a window beginning at `normalized(X)`, and the example `2025年之后 -> [2025-01-01, 9999-12-31]` still includes the boundary year.
  - Impact: Future implementations will continue to over-match boundary periods for "after" queries.
  - Recommended Fix: Make before/after exclusivity explicit and update both the table row and example consistently.

- ID: `QR-enhance-info-retrieval-P3-004`
  - Priority: `P3`
  - Required: `no`
  - Status: `optional`
  - Title: Stage-count wording still claims six stages while the skill enumerates seven numbered items
  - Location: `.opencode/workflows/query-vault.md:39`, `.opencode/skills/second-brain-query/SKILL.md:34-45`
  - Root Cause Cluster: terminology-drift
  - Batch Candidate: `QB-003`
  - Summary: The workflow still says "six stages" while the skill still presents seven numbered bullets because Stage 2.5 is numbered as its own list item.
  - Impact: Minor readability and onboarding friction.
  - Recommended Fix: Use one consistent phrasing everywhere, such as "six stages plus conditional Stage 2.5," or renumber the skill list.

### Suggested Required Fix Batches

- Batch ID: `QB-001`
  - Selection Order: `1`
  - Findings: `QR-enhance-info-retrieval-P1-001`, `QR-enhance-info-retrieval-P2-002`
  - Reason: Finish the contract-boundary cleanup by aligning wrapper behavior semantics and the remaining diagnostics ownership wording.

- Batch ID: `QB-002`
  - Selection Order: `2`
  - Findings: `QR-enhance-info-retrieval-P1-003`
  - Reason: Fix time-window semantics so future implementations do not encode incorrect after/before behavior.

- Batch ID: `QB-003`
  - Selection Order: `3`
  - Findings: `QR-enhance-info-retrieval-P3-004`
  - Reason: Cleanup-only terminology pass after required contract issues are resolved.

### Previous Findings Verification

- ID: `QR-enhance-info-retrieval-P1-001`
  - Previous Status: `open`
  - Current Status: `open`
  - Notes: Partially improved. Argument-shape drift was reduced, but the docs still promise an empty-constraint structured-shortlist path that the live wrapper does not support.

- ID: `QR-enhance-info-retrieval-P2-002`
  - Previous Status: `open`
  - Current Status: `open`
  - Notes: Partially improved. Request and response sections were split in the contract doc, but `second-brain-query/SKILL.md` still says Stage 0 produces the full diagnostics payload, which reintroduces the same ownership ambiguity.

- ID: `QR-enhance-info-retrieval-P1-003`
  - Previous Status: `open`
  - Current Status: `open`
  - Notes: Not part of QB-001 and still present unchanged in the time alias table.

- ID: `QR-enhance-info-retrieval-P3-004`
  - Previous Status: `optional`
  - Current Status: `optional`
  - Notes: Still valid. The workflow says six stages while the skill still enumerates seven numbered bullets.

## Round 4

```yaml
round: 4
mode: delta
reviewed_at: 2026-04-30T06:33:47Z
assessment: mixed
base_sha: f8324366786bfb5235b2b6017352bd4d6a4bbfe4
head_sha: f8324366786bfb5235b2b6017352bd4d6a4bbfe4
scope: >-
  .opencode/rules/retrieval-safety.md,
  .opencode/workflows/query-vault.md,
  .opencode/skills/second-brain-query/SKILL.md
stop_reason: none
manual_intervention_required: false
active_batch_under_review: none
open_findings: 2
batch_count: 2
repeated_findings: []
repeated_root_cause_clusters: []
```

### Code Review Summary

Reviewed the Round 3 follow-up for `QR-enhance-info-retrieval-P2-005` in `retrieval-safety.md` and spot-checked the paired workflow and skill surfaces for consistency. The targeted safety-rule drift is resolved: the rule now matches the live wrapper's empty-constraint behavior and stays aligned with the workflow and skill on text fallback versus structured relaxation. No new P0-P2 regressions were introduced in the reviewed delta. `QB-001` is now fully closed, while `QB-002` still remains open because the `X之后` time-window semantics issue is unchanged.

Verified this round:

- Fixed: `QR-enhance-info-retrieval-P2-005`
- Still valid and unchanged: `QR-enhance-info-retrieval-P1-003`, `QR-enhance-info-retrieval-P3-004`
- No new findings in reviewed paths

### Normalized Findings

- ID: `QR-enhance-info-retrieval-P1-001`
  - Priority: `P1`
  - Required: `yes`
  - Status: `closed`
  - Title: Published wrapper contract does not match the live `vault_index_search` schema
  - Location: `.opencode/docs/sqlite-retrieval-contract.md:187-188,255-263`, `.opencode/workflows/query-vault.md:58-59,108-109`, `.opencode/skills/second-brain-query/SKILL.md:109`, `.opencode/plugins/vault-query-router/index.ts:902-921`
  - Root Cause Cluster: contract-drift-between-docs-and-wrapper
  - Batch Candidate: `QB-001`
  - Summary: Previously reviewed contract surfaces continue to describe the live wrapper truthfully: empty or unusable structured extraction falls back to text search instead of producing an empty structured shortlist.
  - Impact: No remaining mismatch for this finding in the reviewed step-owned contract surfaces.
  - Recommended Fix: None. Remains closed.

- ID: `QR-enhance-info-retrieval-P2-002`
  - Priority: `P2`
  - Required: `yes`
  - Status: `closed`
  - Title: Input and output responsibilities are conflated inside the `constraints` payload
  - Location: `.opencode/workflows/query-vault.md:80`, `.opencode/skills/second-brain-query/SKILL.md:100`
  - Root Cause Cluster: contract-boundary-ambiguity
  - Batch Candidate: `QB-001`
  - Summary: The reviewed workflow and skill still keep extraction artifacts on the caller side and wrapper execution diagnostics on the response side only.
  - Impact: No current request/response boundary ambiguity remains in the reviewed surfaces.
  - Recommended Fix: None. Remains closed.

- ID: `QR-enhance-info-retrieval-P1-003`
  - Priority: `P1`
  - Required: `yes`
  - Status: `open`
  - Title: The `X之后` time alias normalizes “after” queries inclusively instead of after the boundary
  - Location: `.opencode/docs/sqlite-retrieval-contract.md:305-307`
  - Root Cause Cluster: time-range-semantics
  - Batch Candidate: `QB-002`
  - Summary: The time alias table still maps `X之后` / `after X` to a window beginning at `normalized(X)`, and the example `2025年之后 -> [2025-01-01, 9999-12-31]` still includes the boundary year.
  - Impact: Future implementations will continue to over-match boundary periods for "after" queries.
  - Recommended Fix: Make before/after exclusivity explicit and update both the table row and example consistently.

- ID: `QR-enhance-info-retrieval-P3-004`
  - Priority: `P3`
  - Required: `no`
  - Status: `optional`
  - Title: Stage-count wording still claims six stages while the skill enumerates seven numbered items
  - Location: `.opencode/workflows/query-vault.md:39`, `.opencode/skills/second-brain-query/SKILL.md:34-45`
  - Root Cause Cluster: terminology-drift
  - Batch Candidate: `QB-003`
  - Summary: The workflow still says "six stages" while the skill still presents seven numbered bullets because Stage 2.5 is numbered as its own list item.
  - Impact: Minor readability and onboarding friction.
  - Recommended Fix: Use one consistent phrasing everywhere, such as "six stages plus conditional Stage 2.5," or renumber the skill list.

- ID: `QR-enhance-info-retrieval-P2-005`
  - Priority: `P2`
  - Required: `yes`
  - Status: `closed`
  - Title: Retrieval safety rule still documents a no-constraint fallback path that the live wrapper does not implement
  - Location: `.opencode/rules/retrieval-safety.md:14`, `.opencode/workflows/query-vault.md:58`, `.opencode/skills/second-brain-query/SKILL.md:109`
  - Root Cause Cluster: contract-drift-between-docs-and-wrapper
  - Batch Candidate: `QB-001`
  - Summary: `retrieval-safety.md` now says that empty or unusable structured extraction falls back to text search (`mode: "text-fallback"`) and only proceeds to progressive relaxation if that fallback is insufficient, which matches the reviewed workflow and skill wording.
  - Impact: The remaining QB-001 rule-level wrapper-behavior drift is cleared.
  - Recommended Fix: None. Verified closed in this round.

### Suggested Required Fix Batches

- Batch ID: `QB-002`
  - Selection Order: `2`
  - Findings: `QR-enhance-info-retrieval-P1-003`
  - Reason: Fix time-window semantics so future implementations do not encode incorrect after/before behavior.

- Batch ID: `QB-003`
  - Selection Order: `3`
  - Findings: `QR-enhance-info-retrieval-P3-004`
  - Reason: Cleanup-only terminology pass after required contract issues are resolved.

### Previous Findings Verification

- ID: `QR-enhance-info-retrieval-P1-001`
  - Previous Status: `closed`
  - Current Status: `closed`
  - Notes: Still closed. The empty-constraint behavior remains aligned across the reviewed contract surfaces.

- ID: `QR-enhance-info-retrieval-P2-002`
  - Previous Status: `closed`
  - Current Status: `closed`
  - Notes: Still closed. Caller-side extraction artifacts and wrapper-side diagnostics remain clearly separated.

- ID: `QR-enhance-info-retrieval-P1-003`
  - Previous Status: `open`
  - Current Status: `open`
  - Notes: Not part of this delta and still present unchanged in the time alias table.

- ID: `QR-enhance-info-retrieval-P3-004`
  - Previous Status: `optional`
  - Current Status: `optional`
  - Notes: Still valid. The workflow says six stages while the skill still enumerates seven numbered bullets.

- ID: `QR-enhance-info-retrieval-P2-005`
  - Previous Status: `open`
  - Current Status: `closed`
  - Notes: Fixed. The safety rule now matches the live wrapper behavior and the paired workflow/skill wording for empty or unusable structured extraction.

## Round 3

```yaml
round: 3
mode: delta
reviewed_at: 2026-04-30T06:30:29Z
assessment: mixed
base_sha: f8324366786bfb5235b2b6017352bd4d6a4bbfe4
head_sha: f8324366786bfb5235b2b6017352bd4d6a4bbfe4
scope: >-
  .opencode/docs/sqlite-retrieval-contract.md,
  .opencode/workflows/query-vault.md,
  .opencode/skills/second-brain-query/SKILL.md,
  .opencode/rules/retrieval-safety.md,
  .opencode/plugins/vault-query-router/index.ts
stop_reason: none
manual_intervention_required: false
active_batch_under_review: QB-001
open_findings: 3
batch_count: 3
repeated_findings: []
repeated_root_cause_clusters: []
```

### Code Review Summary

Reviewed the second QB-001 fix pass against the live `vault_index_search` wrapper and the updated contract consumers. Both targeted findings are now resolved: the docs and workflow no longer promise an empty-constraint structured-shortlist path, and the extraction-versus-response diagnostics boundary is now clearly separated in the live skill and workflow. One new required doc-rule drift remains in `retrieval-safety.md`, which still describes a no-constraint fallback path that does not match the live wrapper.

Verified this round:

- Fixed: `QR-enhance-info-retrieval-P1-001`
- Fixed: `QR-enhance-info-retrieval-P2-002`
- Still valid and unchanged: `QR-enhance-info-retrieval-P1-003`, `QR-enhance-info-retrieval-P3-004`
- New: `QR-enhance-info-retrieval-P2-005`

### Normalized Findings

- ID: `QR-enhance-info-retrieval-P1-001`
  - Priority: `P1`
  - Required: `yes`
  - Status: `closed`
  - Title: Published wrapper contract does not match the live `vault_index_search` schema
  - Location: `.opencode/docs/sqlite-retrieval-contract.md:187-188,255-263`, `.opencode/workflows/query-vault.md:58-59,108-109`, `.opencode/skills/second-brain-query/SKILL.md:109`, `.opencode/plugins/vault-query-router/index.ts:902-921`
  - Root Cause Cluster: contract-drift-between-docs-and-wrapper
  - Batch Candidate: `QB-001`
  - Summary: The updated contract docs, workflow, and skill now consistently describe the live wrapper behavior: when no usable structured constraints exist, `vault_index_search` falls back to text search rather than returning an empty structured shortlist.
  - Impact: The previously published no-constraint structured-shortlist path is no longer advertised in the reviewed step-owned contract surfaces.
  - Recommended Fix: None. Verified closed in this round.

- ID: `QR-enhance-info-retrieval-P2-002`
  - Priority: `P2`
  - Required: `yes`
  - Status: `closed`
  - Title: Input and output responsibilities are conflated inside the `constraints` payload
  - Location: `.opencode/workflows/query-vault.md:80`, `.opencode/skills/second-brain-query/SKILL.md:100`
  - Root Cause Cluster: contract-boundary-ambiguity
  - Batch Candidate: `QB-001`
  - Summary: The extraction-stage docs now limit Stage 0 outputs to caller-side artifacts such as `structuredTrace` and normalized constraints, while wrapper execution diagnostics are explicitly documented as response-side only.
  - Impact: The caller/wrapper boundary is now internally consistent across the reviewed contract consumers.
  - Recommended Fix: None. Verified closed in this round.

- ID: `QR-enhance-info-retrieval-P1-003`
  - Priority: `P1`
  - Required: `yes`
  - Status: `open`
  - Title: The `X之后` time alias normalizes “after” queries inclusively instead of after the boundary
  - Location: `.opencode/docs/sqlite-retrieval-contract.md:305-307`
  - Root Cause Cluster: time-range-semantics
  - Batch Candidate: `QB-002`
  - Summary: The time alias table still maps `X之后` / `after X` to a window beginning at `normalized(X)`, and the example `2025年之后 -> [2025-01-01, 9999-12-31]` still includes the boundary year.
  - Impact: Future implementations will continue to over-match boundary periods for "after" queries.
  - Recommended Fix: Make before/after exclusivity explicit and update both the table row and example consistently.

- ID: `QR-enhance-info-retrieval-P3-004`
  - Priority: `P3`
  - Required: `no`
  - Status: `optional`
  - Title: Stage-count wording still claims six stages while the skill enumerates seven numbered items
  - Location: `.opencode/workflows/query-vault.md:39`, `.opencode/skills/second-brain-query/SKILL.md:34-45`
  - Root Cause Cluster: terminology-drift
  - Batch Candidate: `QB-003`
  - Summary: The workflow still says "six stages" while the skill still presents seven numbered bullets because Stage 2.5 is numbered as its own list item.
  - Impact: Minor readability and onboarding friction.
  - Recommended Fix: Use one consistent phrasing everywhere, such as "six stages plus conditional Stage 2.5," or renumber the skill list.

- ID: `QR-enhance-info-retrieval-P2-005`
  - Priority: `P2`
  - Required: `yes`
  - Status: `open`
  - Title: Retrieval safety rule still documents a no-constraint fallback path that the live wrapper does not implement
  - Location: `.opencode/rules/retrieval-safety.md:14`
  - Root Cause Cluster: contract-drift-between-docs-and-wrapper
  - Batch Candidate: `QB-001`
  - Summary: The updated contract doc, workflow, and skill now correctly say that empty or unusable structured extraction causes the live wrapper to fall back to text search. `retrieval-safety.md` still instructs agents to "proceed to progressive relaxation" instead, which preserves the same wrapper-behavior drift in one remaining live rule.
  - Impact: Agents that rely on the safety rule can still reason about a non-existent no-constraint relaxation path and miss the real current fallback semantics exposed by `vault_index_search`.
  - Recommended Fix: Align `retrieval-safety.md` with the live wrapper and the updated workflow: say that empty or unusable structured extraction must not trigger an unbounded structured query and currently falls back to text search, with later relaxation only if that fallback remains insufficient.

### Suggested Required Fix Batches

- Batch ID: `QB-001`
  - Selection Order: `1`
  - Findings: `QR-enhance-info-retrieval-P2-005`
  - Reason: Finish the remaining contract-drift cleanup by aligning the safety rule with the now-correct wrapper docs and live behavior.

- Batch ID: `QB-002`
  - Selection Order: `2`
  - Findings: `QR-enhance-info-retrieval-P1-003`
  - Reason: Fix time-window semantics so future implementations do not encode incorrect after/before behavior.

- Batch ID: `QB-003`
  - Selection Order: `3`
  - Findings: `QR-enhance-info-retrieval-P3-004`
  - Reason: Cleanup-only terminology pass after required contract issues are resolved.

### Previous Findings Verification

- ID: `QR-enhance-info-retrieval-P1-001`
  - Previous Status: `open`
  - Current Status: `closed`
  - Notes: Fixed. The reviewed contract surfaces now consistently describe the live wrapper's empty-constraint fallback as text fallback instead of an empty structured shortlist.

- ID: `QR-enhance-info-retrieval-P2-002`
  - Previous Status: `open`
  - Current Status: `closed`
  - Notes: Fixed. Stage 0 output is now limited to caller-side extraction artifacts, while wrapper diagnostics are consistently documented as response-side only.

- ID: `QR-enhance-info-retrieval-P1-003`
  - Previous Status: `open`
  - Current Status: `open`
  - Notes: Not part of QB-001 and still present unchanged in the time alias table.

- ID: `QR-enhance-info-retrieval-P3-004`
  - Previous Status: `optional`
  - Current Status: `optional`
  - Notes: Still valid. The workflow says six stages while the skill still enumerates seven numbered bullets.

## Round 5

```yaml
round: 5
mode: verification
reviewed_at: 2026-04-30T06:37:50Z
assessment: clean
base_sha: f8324366786bfb5235b2b6017352bd4d6a4bbfe4
head_sha: f8324366786bfb5235b2b6017352bd4d6a4bbfe4
scope: >-
  .opencode/docs/sqlite-retrieval-contract.md
stop_reason: no-open-required-findings
manual_intervention_required: false
active_batch_under_review: none
open_findings: 1
batch_count: 1
repeated_findings: []
repeated_root_cause_clusters: []
```

### Code Review Summary

Reviewed the QB-002 fix in `.opencode/docs/sqlite-retrieval-contract.md` and then ran a verification pass for remaining required findings. `QR-enhance-info-retrieval-P1-003` is resolved: the explicit date-range alias table now defines `before` and `after` as exclusive of the boundary, updates the `2025年之后` example to start at `2026-01-01`, adds `X以来` / `since X` as the inclusive alternative, and states the exclusivity rule explicitly below the table. No new P0-P2 regressions were introduced in the reviewed path. All required findings are now closed; the step is clean from a required-quality perspective.

Verified this round:

- Fixed: `QR-enhance-info-retrieval-P1-003`
- Still closed: `QR-enhance-info-retrieval-P1-001`, `QR-enhance-info-retrieval-P2-002`, `QR-enhance-info-retrieval-P2-005`
- Still optional: `QR-enhance-info-retrieval-P3-004`
- No new findings in reviewed paths

### Normalized Findings

- ID: `QR-enhance-info-retrieval-P1-001`
  - Priority: `P1`
  - Required: `yes`
  - Status: `closed`
  - Title: Published wrapper contract does not match the live `vault_index_search` schema
  - Location: `.opencode/docs/sqlite-retrieval-contract.md:187-188,255-263`, `.opencode/workflows/query-vault.md:58-59,108-109`, `.opencode/skills/second-brain-query/SKILL.md:109`, `.opencode/plugins/vault-query-router/index.ts:902-921`
  - Root Cause Cluster: contract-drift-between-docs-and-wrapper
  - Batch Candidate: `QB-001`
  - Summary: The reviewed contract surfaces continue to describe the live wrapper truthfully, including text fallback for empty or unusable structured extraction.
  - Impact: No remaining mismatch for this finding in the reviewed step-owned contract surfaces.
  - Recommended Fix: None. Remains closed.

- ID: `QR-enhance-info-retrieval-P2-002`
  - Priority: `P2`
  - Required: `yes`
  - Status: `closed`
  - Title: Input and output responsibilities are conflated inside the `constraints` payload
  - Location: `.opencode/workflows/query-vault.md:80`, `.opencode/skills/second-brain-query/SKILL.md:100`
  - Root Cause Cluster: contract-boundary-ambiguity
  - Batch Candidate: `QB-001`
  - Summary: Caller-side extraction artifacts and wrapper-side execution diagnostics remain clearly separated in the reviewed workflow and skill surfaces.
  - Impact: No current request/response boundary ambiguity remains in the reviewed surfaces.
  - Recommended Fix: None. Remains closed.

- ID: `QR-enhance-info-retrieval-P1-003`
  - Priority: `P1`
  - Required: `yes`
  - Status: `closed`
  - Title: The `X之后` time alias normalizes “after” queries inclusively instead of after the boundary
  - Location: `.opencode/docs/sqlite-retrieval-contract.md:306-310`
  - Root Cause Cluster: time-range-semantics
  - Batch Candidate: `QB-002`
  - Summary: The time alias table now defines `X之前` / `before X` and `X之后` / `after X` as exclusive of the boundary, updates `2025年之后` to `[2026-01-01, 9999-12-31]`, introduces `X以来` / `since X` as the inclusive alternative, and makes the endpoint rule explicit below the table.
  - Impact: The reviewed contract no longer instructs downstream implementations to over-match the boundary period for "after" queries.
  - Recommended Fix: None. Verified closed in this round.

- ID: `QR-enhance-info-retrieval-P3-004`
  - Priority: `P3`
  - Required: `no`
  - Status: `optional`
  - Title: Stage-count wording still claims six stages while the skill enumerates seven numbered items
  - Location: `.opencode/workflows/query-vault.md:39`, `.opencode/skills/second-brain-query/SKILL.md:34-45`
  - Root Cause Cluster: terminology-drift
  - Batch Candidate: `QB-003`
  - Summary: The workflow still says "six stages" while the skill still presents seven numbered bullets because Stage 2.5 is numbered as its own list item.
  - Impact: Minor readability and onboarding friction.
  - Recommended Fix: Use one consistent phrasing everywhere, such as "six stages plus conditional Stage 2.5," or renumber the skill list.

- ID: `QR-enhance-info-retrieval-P2-005`
  - Priority: `P2`
  - Required: `yes`
  - Status: `closed`
  - Title: Retrieval safety rule still documents a no-constraint fallback path that the live wrapper does not implement
  - Location: `.opencode/rules/retrieval-safety.md:14`, `.opencode/workflows/query-vault.md:58`, `.opencode/skills/second-brain-query/SKILL.md:109`
  - Root Cause Cluster: contract-drift-between-docs-and-wrapper
  - Batch Candidate: `QB-001`
  - Summary: The safety rule remains aligned with the live wrapper behavior and the paired workflow/skill wording for empty or unusable structured extraction.
  - Impact: No remaining rule-level wrapper-behavior drift remains in the reviewed step-owned surfaces.
  - Recommended Fix: None. Remains closed.

### Suggested Required Fix Batches

- Batch ID: `QB-003`
  - Selection Order: `3`
  - Findings: `QR-enhance-info-retrieval-P3-004`
  - Reason: Optional terminology cleanup only. No required fix batches remain.

### Previous Findings Verification

- ID: `QR-enhance-info-retrieval-P1-001`
  - Previous Status: `closed`
  - Current Status: `closed`
  - Notes: Still closed. The empty-constraint behavior remains aligned across the reviewed contract surfaces.

- ID: `QR-enhance-info-retrieval-P2-002`
  - Previous Status: `closed`
  - Current Status: `closed`
  - Notes: Still closed. Caller-side extraction artifacts and wrapper-side diagnostics remain clearly separated.

- ID: `QR-enhance-info-retrieval-P1-003`
  - Previous Status: `open`
  - Current Status: `closed`
  - Notes: Fixed. The alias table and the explanatory rule now consistently make `before` and `after` exclusive, and the `2025年之后` example no longer includes the boundary year.

- ID: `QR-enhance-info-retrieval-P3-004`
  - Previous Status: `optional`
  - Current Status: `optional`
  - Notes: Still valid but non-blocking. No review expansion was needed beyond carrying forward the existing optional wording issue.

- ID: `QR-enhance-info-retrieval-P2-005`
  - Previous Status: `closed`
  - Current Status: `closed`
  - Notes: Still closed. The safety rule remains aligned with the live wrapper behavior and paired workflow/skill wording.
