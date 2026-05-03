---
schema: quality-review-v1
step-key: frontmatter-tag-governance
step-folder: 02-frontmatter-tag-governance
step-version: 1
requirement-version: 1
---

# Quality Review: 02-frontmatter-tag-governance

## Round 1 - Full Review

### Review State

- round: 1
- mode: full
- assessment: mixed
- stop_reason: required_findings_open
- manual_intervention_required: false
- active_batch_under_review: none
- repeated_findings: []
- repeated_root_cause_clusters: []

### Findings

<QR-02-P1-001> severity: required
**Summary**: The alias registry omits canonical tags that the policy and templates already bless, so first-party metadata would be reported as drift.
**Priority**: P1
**Status**: open
**Details**: `metadata-conventions.md` requires LLM-managed notes to carry one `state/*`, one `source/*`, and one `role/*` tag, and its templates already use `source/generated` and `role/synthesis`. But `.opencode/alias-registry.md` only defines a small subset of canonical `source/*` and `role/*` tags. Because `lint-vault.md` says alias drift should flag tags that do not match canonical entries in the registry, valid repo-owned tags would be misclassified as non-canonical. That makes the governance surface internally inconsistent and would create false-positive lint findings against approved templates.
**Location**: `.opencode/alias-registry.md:Tag aliases`; `.opencode/rules/metadata-conventions.md:Tag rules`; `.opencode/rules/metadata-conventions.md:LLM-managed brainstorm note`
**Fix guidance**: Add all currently sanctioned canonical `state/*`, `source/*`, and `role/*` tags that appear in policy/templates to the registry, or narrow the lint/query wording so tags are only checked against an explicitly governed subset instead of the full allowed tag surface.

<QR-02-P2-002> severity: required
**Summary**: The structured-fields policy still uses freeform `location` in a positive example, which reintroduces the ambiguity this step was meant to remove.
**Priority**: P2
**Status**: open
**Details**: The new policy says location semantics belong in `country`, `province`, and `city`, and step batch 1 explicitly requires examples to stop implying that a single freeform `location` field is the primary retrieval shape. But the “When tags are allowed as retrieval aids” section still gives `topic/training` alongside `start_date` and `location` fields as a good example. That undercuts the new policy and conflicts with the updated domain-note template.
**Location**: `.opencode/rules/metadata-conventions.md:When tags are allowed as retrieval aids`
**Fix guidance**: Replace the `location` example with `country` / `province` / `city` or with a generic phrase like “structured location fields”.

<QR-02-P2-003> severity: required
**Summary**: Retrieval docs now promise alias-aware matching, but the Stage 1 retrieval rules never define how alias expansion happens.
**Priority**: P2
**Status**: open
**Details**: `query-vault.md` and `second-brain-query/SKILL.md` both state that retrieval should match canonical values plus accepted aliases for tags and location fields. However, the actual Stage 1 shortlist rules still describe only exact or hierarchical tag matching and direct field filters on `country`, `province`, and `city`, with no documented alias-expansion step, no normalization step, and no note on whether SQLite stores canonicalized values. That leaves the governance assumptions and the frozen retrieval flow out of sync, and it effectively introduces new retrieval behavior without specifying where it occurs.
**Location**: `.opencode/workflows/query-vault.md:Governance assumptions`; `.opencode/workflows/query-vault.md:Stage 1: Structured SQLite Shortlist`; `.opencode/skills/second-brain-query/SKILL.md:Governance alignment`
**Fix guidance**: Either document the exact Stage 1 alias-expansion behavior in the retrieval flow, or soften the governance wording so it does not claim alias-aware matching until the retrieval path actually defines it.

### Suggested Batches

- `QB-001` selection_order: 1
  - finding_ids: [`QR-02-P1-001`]
  - theme: Align governed tag registry with already-approved canonical tags.

- `QB-002` selection_order: 2
  - finding_ids: [`QR-02-P2-002`, `QR-02-P2-003`]
  - theme: Remove structured-location ambiguity and make retrieval-governance wording internally consistent.

### Previous Findings Verification

- No previous round exists for this step.

### Assessment

The step captures the intended advisory-only governance direction, preserves the no-auto-rewrite constraint, and aligns the main documents around structured time/location fields. However, the current doc set is not yet clean enough to track as complete: the registry does not cover tags already sanctioned elsewhere, one policy example still falls back to freeform `location`, and the retrieval docs now promise alias-aware matching without defining where that behavior occurs.

### Verdict

mixed

## Round 2 - Delta Review

```yaml
round: 2
mode: delta
assessment: clean
base_sha: 98cc132fb55667ee062d3e97ed2693b4c83c5b25
head_sha: 7b3155eb03483d9e182b8a52b728dc3e2383a69f
scope:
  - .opencode/alias-registry.md
  - .opencode/rules/metadata-conventions.md
  - .opencode/workflows/query-vault.md
  - .opencode/skills/second-brain-query/SKILL.md
stop_reason: clean
manual_intervention_required: false
active_batch_under_review: none
open_findings: 0
batch_count: 0
repeated_findings: []
repeated_root_cause_clusters: []
```

### Code Review Summary

Verified the delta for the three required findings. The alias registry now covers the sanctioned canonical `state/*`, `source/*`, and `role/*` tags used by the policy/templates, the retrieval-aid example now uses structured location fields instead of a freeform `location` field, and the query docs now clearly describe alias-aware expansion as future work rather than current Stage 1 behavior. No new issues were introduced in the reviewed paths.

### Normalized Findings

- ID: `QR-02-P1-001`
  - Priority: `P1`
  - Required: `yes`
  - Status: `closed`
  - Title: Alias registry omitted sanctioned canonical tags
  - Location: `.opencode/alias-registry.md:20-40`
  - Root Cause Cluster: `registry-policy-drift`
  - Batch Candidate: `QB-001`
  - Summary: Verified fixed. The registry now includes the canonical `state/*`, `source/*`, and `role/*` tags already sanctioned by the policy, enums, and templates, including `source/generated` and `role/synthesis`.
  - Impact: Approved first-party tags are no longer misclassified as drift by the governance surface described in this step.
  - Recommended Fix: None. Verified resolved.

- ID: `QR-02-P2-002`
  - Priority: `P2`
  - Required: `yes`
  - Status: `closed`
  - Title: Positive example still used freeform location
  - Location: `.opencode/rules/metadata-conventions.md:221-224`
  - Root Cause Cluster: `structured-location-policy-drift`
  - Batch Candidate: `QB-002`
  - Summary: Verified fixed. The positive retrieval-aid example now pairs `topic/training` with `start_date` and structured location fields `country` / `province` / `city`.
  - Impact: The policy no longer reintroduces a conflicting example that suggests freeform `location` is the preferred retrieval shape.
  - Recommended Fix: None. Verified resolved.

- ID: `QR-02-P2-003`
  - Priority: `P2`
  - Required: `yes`
  - Status: `closed`
  - Title: Retrieval docs claimed undefined alias-aware matching
  - Location: `.opencode/workflows/query-vault.md:13-16`; `.opencode/skills/second-brain-query/SKILL.md:20-22`
  - Root Cause Cluster: `retrieval-governance-overclaim`
  - Batch Candidate: `QB-002`
  - Summary: Verified fixed. Both retrieval docs now state that alias-aware query-time expansion is a future enhancement and that the current Stage 1 flow matches values as stored in the index.
  - Impact: Retrieval-facing documentation is back in sync with the currently defined Stage 1 behavior.
  - Recommended Fix: None. Verified resolved.

### Suggested Required Fix Batches

- None. All required findings in the reviewed delta are closed.

### Previous Findings Verification

- ID: `QR-02-P1-001`
  - Previous Status: `open`
  - Current Status: `closed`
  - Notes: `.opencode/alias-registry.md` now contains the sanctioned canonical `state/*`, `source/*`, and `role/*` tags referenced by policy/templates.

- ID: `QR-02-P2-002`
  - Previous Status: `open`
  - Current Status: `closed`
  - Notes: The positive example in `.opencode/rules/metadata-conventions.md` now points to structured location fields instead of `location`.

- ID: `QR-02-P2-003`
  - Previous Status: `open`
  - Current Status: `closed`
  - Notes: `query-vault.md` and `second-brain-query/SKILL.md` now scope alias-aware query expansion as future behavior rather than current Stage 1 behavior.

### Assessment

Round 2 delta verification is clean. The three required findings from Round 1 are resolved, and no new required issues were found in the reviewed files.

### Verdict

clean
