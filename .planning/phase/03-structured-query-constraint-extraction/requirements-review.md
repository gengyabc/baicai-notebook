---
step-folder: 03-structured-query-constraint-extraction
requirement-version: 1
step-version: 1
status: correct
reviewed-at: 2026-04-30
---

# Requirements Review: Structured Query Constraint Extraction

## Version Consistency

- `requirement.md` requirement-version: 1
- `step.md` requirement-version: 1, step-version: 1
- No existing `requirements-review.md` found
- Step key `structured-query-constraint-extraction` not in `implementedStepKeys` - new step review
- No delta.md required (new step, not a version change)

**Result**: PASS - All versions match, no stale artifacts.

---

## Success Criteria Verification

### SC1: Pre-shortlist query-intent extraction step

**Status**: PASS

Evidence:
- `sqlite-retrieval-contract.md` lines 104-166: Constraint Extraction Stage section defining mandatory pre-shortlist extraction
- `query-vault.md` lines 41-80: Stage 0 Constraint Extraction, explicitly mandatory before Stage 1
- `SKILL.md` lines 58-100: Constraint Extraction (Stage 0) section with extraction rules
- `retrieval-safety.md` lines 9-18: Structured-First Constraint section requiring Stage 0 before SQLite

### SC2: LLM must prefer structured frontmatter filters over title-first/body-first

**Status**: PASS

Evidence:
- `sqlite-retrieval-contract.md` line 98-99: "Extract structured constraints before retrieval when possible" and "Use SQLite structured shortlist first"
- `query-vault.md` line 59: "Do not use title-first or body-first search as a substitute for applying usable structured clues through SQLite"
- `query-vault.md` line 109: "Usable structured clues must be applied through SQLite before title-first or body-first search"
- `SKILL.md` line 119: "Do not use freeform title or body keyword search as a substitute for structured tag extraction"
- `retrieval-safety.md` line 13: "Usable structured clues...must be applied through SQLite before any title-first or body-first search"

### SC3: Time/date, location, tags as required first-pass constraint families

**Status**: PASS

Evidence:
- `sqlite-retrieval-contract.md` lines 110-113: Frozen priority order - time -> location -> tags -> extraFields
- `query-vault.md` lines 45-50: Same frozen priority order with explicit family rules
- `SKILL.md` lines 63-67: Same frozen priority order
- `retrieval-safety.md` line 15: "The constraint-extraction priority order is frozen: time/date -> location -> tags/topic -> allowlisted extra fields"

### SC4: Small initial allowlist of extra structured fields

**Status**: PASS

Evidence:
- `sqlite-retrieval-contract.md` lines 151-160: extraFields allowlist frozen to `duration`, `num_participant`, `organizer`, `host`, `participants` with exact-match-only constraint
- `query-vault.md` line 50: Same allowlist with same five fields
- `SKILL.md` line 93: Same allowlist
- `retrieval-safety.md` line 52: Same allowlist with prohibition on expansion

### SC5: Hybrid mapping strategy with explicit aliases plus low-risk inference

**Status**: PASS

Evidence:
- `sqlite-retrieval-contract.md` lines 252-287: Time-Phrase Alias Tables for year, half-year, month, and explicit date ranges
- `sqlite-retrieval-contract.md` lines 163-166: Normalization source rules - time-phrase aliases in contract doc, location/tag values from alias-registry.md
- `alias-registry.md` lines 7-16: Retrieval integration section documenting constraint-extraction consumption of this registry
- `query-vault.md` lines 54-57: Explicit alias table references for time and location
- `SKILL.md` lines 84-89: Explicit canonical tag mappings first, low-risk inference only for obvious stable topic mappings

### SC6: Structured wrapper or skill interface for safe SQLite

**Status**: PASS

Evidence:
- `sqlite-retrieval-contract.md` lines 22-25: `vault_index_search` as the only supported first-pass entrypoint, ad hoc SQL prohibited
- `sqlite-retrieval-contract.md` line 106: "This stage is mandatory...output must be passed through the structured wrapper contract rather than allowing ad hoc raw SQL generation"
- `retrieval-safety.md` lines 19-25: Raw-SQL Prohibition section with explicit rules

### SC7: Retrieval diagnostics for debugging and explainability

**Status**: PASS

Evidence:
- `sqlite-retrieval-contract.md` lines 198-215: Normalized Structured-Constraint Input Shape with `structuredTrace`, `appliedConstraints`, `inferredConstraints`, `rejectedStructuredHints`, `candidateCounts`, `fallbackReason`
- `sqlite-retrieval-contract.md` lines 218-229: Diagnostics contract section listing all required diagnostic fields
- `query-vault.md` lines 78-80: `structuredTrace` requirements
- `SKILL.md` lines 98-100: Diagnostics requirements

### SC8: Planning-ready without expanding into implementation

**Status**: PASS

Evidence:
- All deliverables are documentation files (sqlite-retrieval-contract.md, query-vault.md, SKILL.md, alias-registry.md, retrieval-safety.md)
- No code implementation in this step
- Scope boundaries clearly maintained in step.md lines 144-161

---

## Scope Compliance

### In Scope (step.md lines 144-152)

| Item | Status | Evidence |
|------|--------|----------|
| Define pre-shortlist constraint-extraction stage | PASS | Stage 0 defined in all four primary documents |
| Freeze extraction priority order | PASS | Frozen order (time -> location -> tags -> extraFields) in all docs |
| Define normalization rules | PASS | Time-phrase alias tables, location rules, tag inference boundaries documented |
| Define first-version boundaries for low-risk inference | PASS | sqlite-retrieval-contract.md line 148: "only for obvious stable topic mappings" |
| Define wrapper inputs and diagnostics | PASS | sqlite-retrieval-contract.md lines 168-229 |
| Freeze alias table sources | PASS | alias-registry.md lines 7-16; no competing alias tables |
| Update retrieval workflow documentation | PASS | query-vault.md and SKILL.md updated with Stage 0 |

### Out of Scope (step.md lines 154-161)

| Item | Status | Evidence |
|------|--------|----------|
| Replace vault_index_search | PASS | Not replaced; still the entrypoint |
| Redesign candidate-count thresholds | PASS | Thresholds preserved from step 01 |
| Expand to arbitrary frontmatter keys | PASS | extraFields limited to 5-field allowlist |
| Add fuzzy normalization for person fields | PASS | Prohibited in sqlite-retrieval-contract.md line 160, SKILL.md line 95, retrieval-safety.md line 53 |
| Redesign metadata governance | PASS | Only alias-registry.md integration section added |
| Implement user-facing diagnostics layer | PASS | Not implemented; diagnostics are model-facing only |

**Result**: PASS - No out-of-scope work detected.

---

## Locked Constraints Compliance

| Constraint (step.md lines 129-138) | Status | Evidence |
|-----------------------------------|--------|----------|
| Structured frontmatter filtering is default first retrieval action | PASS | retrieval-safety.md lines 9-18 |
| Constraint family priority is fixed | PASS | Frozen in all documents |
| Required time fields: created, updated, start_date, end_date | PASS | sqlite-retrieval-contract.md lines 85-86 |
| Required location fields: country, province, city | PASS | sqlite-retrieval-contract.md line 87 |
| Query-time extraction through vault_index_search | PASS | retrieval-safety.md lines 21-25 |
| Compatible with step 01 shortlist/reranking/fallback | PASS | Stages 1-5 preserved in query-vault.md |
| Compatible with step 02 metadata governance | PASS | alias-registry.md integration section |
| Must not expand to arbitrary frontmatter keys | PASS | extraFields limited to 5-field allowlist |

**Result**: PASS - All locked constraints respected.

---

## Invariants Compliance

| Invariant (step.md lines 227-233) | Status | Evidence |
|-----------------------------------|--------|----------|
| SQLite remains first retrieval layer when structured clues usable | PASS | retrieval-safety.md line 37 |
| Frontmatter remains durable source of truth | PASS | sqlite-retrieval-contract.md lines 18-19 |
| Existing shortlist/reranking/fallback stages intact | PASS | query-vault.md stages 1-5 preserved |
| Structured constraints applied as intersected families | PASS | sqlite-retrieval-contract.md line 100; query-vault.md lines 96-101 |
| Debug-mode session behavior separate | PASS | retrieval-safety.md lines 7-8 |

**Result**: PASS - All invariants maintained.

---

## TDD Batch Review

### Batch 1: Pre-shortlist extraction stage and family priority

| Test | Status | Evidence |
|------|--------|----------|
| T1.1: query-vault.md requires constraint extraction before Stage 1 | PASS | query-vault.md lines 41-44: Stage 0 mandatory |
| T1.2: Extraction stage freezes family priority | PASS | All docs state time -> location -> tags -> extraFields |
| T1.3: Usable structured clues applied through SQLite before title/body search | PASS | query-vault.md line 59, SKILL.md line 119, retrieval-safety.md line 13 |
| T1.4: Empty extraction does not authorize unbounded query | PASS | query-vault.md line 108, retrieval-safety.md line 14 |

### Batch 2: Time and location normalization rules

| Test | Status | Evidence |
|------|--------|----------|
| T2.1: event vs note time mode distinction | PASS | sqlite-retrieval-contract.md lines 127-131; all docs |
| T2.2: Year/half-year/month/date-range normalization | PASS | sqlite-retrieval-contract.md lines 252-287 |
| T2.3: Event-time uses start_date/end_date, not created/updated | PASS | All primary docs; query-vault.md lines 119-121 |
| T2.4: Location limited to country/province/city with China default | PASS | All docs; query-vault.md lines 125-130 |
| T2.5: Forbid query-time country injection | PASS | query-vault.md line 129, SKILL.md line 82, retrieval-safety.md line 17 |

### Batch 3: Tag, topic, and extra-field mapping boundaries

| Test | Status | Evidence |
|------|--------|----------|
| T3.1: Explicit canonical tag mappings first, low-risk inference for obvious topics | PASS | sqlite-retrieval-contract.md line 148; query-vault.md line 86 |
| T3.2: Inferred tag mappings distinguished from literal/alias | PASS | sqlite-retrieval-contract.md line 204-205, 208; structuredTrace with source field |
| T3.3: extraFields allowlist frozen to 5 fields | PASS | All docs consistent |
| T3.4: No fuzzy normalization for organizer/host/participants | PASS | sqlite-retrieval-contract.md line 160, SKILL.md line 95, retrieval-safety.md line 53 |
| T3.5: No title/body keyword as substitute for structured tags | PASS | query-vault.md line 110, SKILL.md line 119, retrieval-safety.md line 51 |

### Batch 4: Wrapper diagnostics and workflow alignment

| Test | Status | Evidence |
|------|--------|----------|
| T4.1: sqlite-retrieval-contract.md documents normalized input shape | PASS | sqlite-retrieval-contract.md lines 168-216 |
| T4.2: Diagnostics contract with all required fields | PASS | sqlite-retrieval-contract.md lines 218-229 |
| T4.3: query-vault.md and SKILL.md consume same contract | PASS | Both reference same extraction contract, same priority order |
| T4.4: Retrieval safety aligned with structured-first and raw-SQL prohibition | PASS | retrieval-safety.md lines 9-25 |

**Result**: PASS - All TDD batch tests verified.

---

## Internal Consistency Check

| Cross-file element | Status | Evidence |
|--------------------|--------|----------|
| Stage 0 terminology | PASS | Used consistently across all four primary documents |
| Priority order (frozen) | PASS | time -> location -> tags -> extraFields in all docs |
| extraFields allowlist | PASS | Same 5 fields in all docs |
| Time-phrase alias tables | PASS | Referenced without duplication; stored in sqlite-retrieval-contract.md |
| structuredTrace format | PASS | Consistent structure across sqlite-retrieval-contract.md, query-vault.md, SKILL.md |
| Six-stage decision chain | PASS | Referenced in query-vault.md and SKILL.md |

---

## Issues Found

### Minor Documentation Clarity Issue

**Severity**: Minor (cosmetic)

**Description**: query-vault.md line 39 states "proceeds through six stages in order" but the decision chain includes Stage 0 through Stage 5 (6 stages) plus Stage 2.5 as a conditional sub-stage, which could be counted as 7 items. This is a minor terminology inconsistency that does not affect functionality.

**Location**: query-vault.md line 39

**Impact**: None - the integration topology diagram and numbered stages are clear and consistent.

**Recommendation**: Consider revising to "proceeds through six numbered stages (Stage 0 through Stage 5) with conditional Stage 2.5" for clarity.

---

## Anti-Patterns Detected

None. The implementation follows TDD discipline for documentation artifacts and maintains proper scope boundaries.

---

## Phase Handoff Note

No archived phase-log context required for this review. The step is a new addition to the enhance-info-retrieval phase and does not modify or replace prior step behavior.

---

## Planning-Memory Follow-Up

None required. All documentation artifacts are internally consistent and aligned with requirement and step specifications.

---

## Summary

**Status**: CORRECT

The implementation fully satisfies all 8 success criteria from requirement.md. All TDD batch tests pass. The scope boundaries are respected with no out-of-scope work detected. All locked constraints and invariants are maintained. Cross-file consistency is verified.

One minor documentation clarity issue was noted (stage count terminology) but does not affect correctness or functionality. The implementation is documentation-only as specified and planning-ready.