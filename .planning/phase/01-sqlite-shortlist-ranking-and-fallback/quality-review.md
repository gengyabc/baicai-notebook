---
schema: review-result-v1
skill: quality-review
phase: enhance-info-retrieval
step_folder: 01-sqlite-shortlist-ranking-and-fallback
result_file: .planning/phase/01-sqlite-shortlist-ranking-and-fallback/quality-review.md
finding_id_scope: phase
append_only: true
step-version: 1
requirement-version: 1
---

## Round 1

```yaml
round: 1
mode: full
assessment: mixed
base_sha: 8dab6fc81a906765daca43de0ca803667a19ae2f
head_sha: 8dab6fc81a906765daca43de0ca803667a19ae2f
scope: .opencode/skills/second-brain-query/SKILL.md, .opencode/workflows/query-vault.md
stop_reason: none
manual_intervention_required: false
active_batch_under_review: none
open_findings: 3
batch_count: 2
repeated_findings: []
repeated_root_cause_clusters: []
```

### Code Review Summary

The update captures most of the step's retrieval ladder, thresholds, and fallback visibility requirements, but three material consistency issues remain. The largest problems are an incorrect China-default rule that rewrites the query instead of the indexed metadata semantics, and an unresolved contradiction between the four documented relaxation steps and the three-round cap. `second-brain-query/SKILL.md` also omits Stage 4 entirely, so the agent-level instructions no longer explicitly require full-note reads after shortlist selection.

### Normalized Findings

- ID: `QR-enhance-info-retrieval-P1-001`
  - Priority: `P1`
  - Required: `yes`
  - Status: `open`
  - Title: China default is applied to the query, not to missing note metadata
  - Location: `.opencode/workflows/query-vault.md:24,46-47`; `.opencode/skills/second-brain-query/SKILL.md:45`
  - Root Cause Cluster: `location-default-semantics`
  - Batch Candidate: `QB-001`
  - Summary: The workflow says "when `country` is absent from the query, default to `China`", but the step and requirement freeze the rule as "`country` defaulting to China when absent" for the structured location model itself. Those are not equivalent semantics.
  - Impact: Rewriting every location query without an explicit country into `country = China` silently excludes non-China notes and bakes a retrieval bias into the query path. It also conflicts with the step's intent that location be modeled via dedicated metadata fields, with defaults handled at the metadata/index layer rather than by narrowing the user query.
  - Recommended Fix: Clarify that the China default applies to note metadata/index semantics when `country` is missing, or explicitly justify query-time defaulting if that is truly intended. Update both documents to use the same rule and examples.

- ID: `QR-enhance-info-retrieval-P1-002`
  - Priority: `P1`
  - Required: `yes`
  - Status: `open`
  - Title: Progressive relaxation sequence is not executable under the frozen 3-round cap
  - Location: `.opencode/workflows/query-vault.md:80-92,124-128`; `.opencode/skills/second-brain-query/SKILL.md:27-28,37`
  - Root Cause Cluster: `relaxation-sequence-ambiguity`
  - Batch Candidate: `QB-001`
  - Summary: Both documents define four ordered relaxation states (`tags -> time -> location -> unstructured`) but also say broader text retrieval starts after at most 3 relaxation rounds. That leaves `full_constraint_removal` without a clear reachable place in the sequence.
  - Impact: An implementer cannot tell whether the fourth state should happen inside round 3, whether Stage 5 starts immediately after location broadening, or whether the round cap should actually be 4. This blocks a consistent implementation of the frozen fallback order and its logging.
  - Recommended Fix: Reconcile the round budget and the ordered states explicitly. For example, either define `full_constraint_removal` as the third and final relaxation state before Stage 5, or change the cap/wording so all documented states can occur. Mirror the same wording in both files.

- ID: `QR-enhance-info-retrieval-P2-003`
  - Priority: `P2`
  - Required: `yes`
  - Status: `open`
  - Title: `second-brain-query` skips Stage 4 full-note reads in its decision chain
  - Location: `.opencode/skills/second-brain-query/SKILL.md:22-28`
  - Root Cause Cluster: `skill-workflow-drift`
  - Batch Candidate: `QB-002`
  - Summary: The skill says it follows the retrieval chain from `query-vault.md`, but its numbered chain jumps from Stage 3 directly to Stage 5 and never states the Stage 4 full-note-read step.
  - Impact: At the agent-instruction layer, that weakens the guardrail that `description` only narrows candidates and does not replace full document reads. It also makes the two documents internally inconsistent.
  - Recommended Fix: Add Stage 4 explicitly to the skill and show that both the 1-19 path and the reranked 20-100 path proceed to full-note reads before answer generation or later fallback.

### Suggested Required Fix Batches

- Batch ID: `QB-001`
  - Selection Order: `1`
  - Findings: `QR-enhance-info-retrieval-P1-001`, `QR-enhance-info-retrieval-P1-002`
  - Reason: Both issues are core retrieval-contract ambiguities in the workflow specification and should be resolved together before downstream implementation or further review.

- Batch ID: `QB-002`
  - Selection Order: `2`
  - Findings: `QR-enhance-info-retrieval-P2-003`
  - Reason: Once the workflow contract is corrected, the skill can be brought back into exact alignment with the canonical query workflow.

### Previous Findings Verification

N/A (first round)

## Round 2

```yaml
round: 2
mode: delta
assessment: mixed
base_sha: 8dab6fc81a906765daca43de0ca803667a19ae2f
head_sha: 8dab6fc
scope: .opencode/workflows/query-vault.md, .opencode/skills/second-brain-query/SKILL.md
stop_reason: none
manual_intervention_required: false
active_batch_under_review: QB-001
open_findings: 1
batch_count: 1
repeated_findings: []
repeated_root_cause_clusters: []
```

### Code Review Summary

Delta review of the QB-001 fixes is clean. The updated workflow and skill now consistently describe the China default as a metadata/index-level rule rather than a query rewrite, and they explicitly reconcile the 3-round cap with the ordered relaxation sequence. No new P0-P2 issues were introduced in the touched paths. One previously known required issue remains open because `second-brain-query/SKILL.md` still skips Stage 4 in its numbered decision chain.

### Normalized Findings

- ID: `QR-enhance-info-retrieval-P1-001`
  - Priority: `P1`
  - Required: `yes`
  - Status: `closed`
  - Title: China default is applied to the query, not to missing note metadata
  - Location: `.opencode/workflows/query-vault.md:24,46-47`; `.opencode/skills/second-brain-query/SKILL.md:48`
  - Root Cause Cluster: `location-default-semantics`
  - Batch Candidate: `QB-001`
  - Summary: Both documents now state that the China default applies when a note's `country` field is absent in indexed metadata, and explicitly forbid injecting `country = China` into the query when the user omits a country.
  - Impact: Resolved. The retrieval contract no longer rewrites user queries in a way that would silently exclude non-China notes.
  - Recommended Fix: None.

- ID: `QR-enhance-info-retrieval-P1-002`
  - Priority: `P1`
  - Required: `yes`
  - Status: `closed`
  - Title: Progressive relaxation sequence is not executable under the frozen 3-round cap
  - Location: `.opencode/workflows/query-vault.md:89-97,187`; `.opencode/skills/second-brain-query/SKILL.md:27-30,50`
  - Root Cause Cluster: `relaxation-sequence-ambiguity`
  - Batch Candidate: `QB-001`
  - Summary: The updated wording now gives an explicit 3-round mapping and defines round 3 as the final relaxation attempt, with location broadening or full constraint removal used as the last pre-Stage-5 action depending on applicability.
  - Impact: Resolved. The fallback contract is now implementable without the earlier round-count contradiction.
  - Recommended Fix: None.

- ID: `QR-enhance-info-retrieval-P2-003`
  - Priority: `P2`
  - Required: `yes`
  - Status: `open`
  - Title: `second-brain-query` skips Stage 4 full-note reads in its decision chain
  - Location: `.opencode/skills/second-brain-query/SKILL.md:22-31`
  - Root Cause Cluster: `skill-workflow-drift`
  - Batch Candidate: `QB-002`
  - Summary: The skill still says it follows the five-stage chain, but its numbered list jumps from Stage 3 directly to Stage 5 and still does not include Stage 4 full-note reads.
  - Impact: The agent-level instructions remain inconsistent with the canonical workflow and still weaken the guardrail that shortlisted notes must be read in full before answer generation.
  - Recommended Fix: Add Stage 4 explicitly to the skill and show that both the 1-19 path and the reranked 20-100 path proceed to full-note reads before answer generation or later fallback.

### Suggested Required Fix Batches

- Batch ID: `QB-002`
  - Selection Order: `2`
  - Findings: `QR-enhance-info-retrieval-P2-003`
  - Reason: The remaining required issue is isolated to the skill's decision-chain drift from the canonical query workflow.

### Previous Findings Verification

- ID: `QR-enhance-info-retrieval-P1-001`
  - Previous Status: `open`
  - Current Status: `closed`
  - Notes: Verified fixed in both files. The China default is now documented as a metadata/index-level default for notes missing `country`, not a query-time rewrite.

- ID: `QR-enhance-info-retrieval-P1-002`
  - Previous Status: `open`
  - Current Status: `closed`
  - Notes: Verified fixed. The documents now define an explicit round-budget mapping for the 3-round cap and describe the final pre-Stage-5 relaxation path.

- ID: `QR-enhance-info-retrieval-P2-003`
  - Previous Status: `open`
  - Current Status: `open`
  - Notes: Not part of QB-001. Still present because the skill's numbered retrieval chain omits Stage 4.

## Round 3

```yaml
round: 3
mode: delta
assessment: clean
base_sha: 8dab6fc
head_sha: 8dab6fc
scope: .opencode/skills/second-brain-query/SKILL.md
stop_reason: clean
manual_intervention_required: false
active_batch_under_review: QB-002
open_findings: 0
batch_count: 0
repeated_findings: []
repeated_root_cause_clusters: []
```

### Code Review Summary

Delta review of QB-002 is clean. `second-brain-query/SKILL.md` now restores Stage 4 explicitly in the retrieval decision chain and keeps the downstream Stage 5 fallback sequencing aligned with `query-vault.md`. I checked the touched decision-chain wording for regressions and found no new P0-P2 issues in the changed path.

### Normalized Findings

- ID: `QR-enhance-info-retrieval-P2-003`
  - Priority: `P2`
  - Required: `yes`
  - Status: `closed`
  - Title: `second-brain-query` skips Stage 4 full-note reads in its decision chain
  - Location: `.opencode/skills/second-brain-query/SKILL.md:22-32`
  - Root Cause Cluster: `skill-workflow-drift`
  - Batch Candidate: `QB-002`
  - Summary: The skill now includes Stage 4 explicitly between progressive relaxation and broader text fallback, and the numbered chain correctly shows full-note reads before answer generation or Stage 5 fallback.
  - Impact: Resolved. The skill-level instructions are back in sync with the canonical retrieval workflow and preserve the full-read guardrail.
  - Recommended Fix: None.

### Suggested Required Fix Batches

None. No open required findings remain.

### Previous Findings Verification

- ID: `QR-enhance-info-retrieval-P2-003`
  - Previous Status: `open`
  - Current Status: `closed`
  - Notes: Verified fixed. Stage 4 full-note reads are now explicitly present in the skill's retrieval decision chain, and Stage 5 remains the later fallback after relaxation is exhausted.
