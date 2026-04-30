---
step-key: retrieval-contract-and-safety-guardrails
requirement-version: 1
step-version: 1
---

# Review Report

## Plan Reference
- @.planning/phase/04-retrieval-contract-and-safety-guardrails/requirement.md
- @.planning/phase/04-retrieval-contract-and-safety-guardrails/step.md

## Overall Status
- `correct`

## Findings

### Plan Alignment Issues
- none

### Delta Checks
- Preserved behaviors verified: none (no delta.md; first implementation of this step)
- Removed behaviors verified as absent: none
- Replacement behaviors verified: none
- Stale evidence detected: none

### Spec Violations
- none

### Contract Issues
- none

### Test Issues
- none

## Alignment Summary

### Success Criteria Coverage: 7 of 7 met

| Criterion | Status | Evidence |
|-----------|--------|----------|
| SC1: One canonical retrieval contract doc | PASS | `sqlite-retrieval-contract.md` L3 declares itself "the single canonical reference" and L5 shows "Frozen at step 04" |
| SC2: Schema and retrieval-relevant fields stated without ambiguity | PASS | L36-86: Full CREATE TABLE statements for `notes` and `properties`; L87-96: Retrieval-Relevant Fields; L328-352: Required Indexes |
| SC3: `vault_index_search` is required first-pass entrypoint | PASS | L30: "`vault_index_search` is the **only** supported first-pass retrieval entrypoint in non-debug sessions" |
| SC4: Explicit local-first fallback and confidence labeling | PASS | L20: index hits not confirmed until file read; L100-109: local-first order; L353-362: provenance categories; L109: explicit fallback statement |
| SC5: Non-debug network search asks first | PASS | L364-370: Network Permission Policy with explicit user permission requirement and example prompt |
| SC6: Four provenance categories kept distinct | PASS | L353-362: canonical categories defined; all four consumer files align (query-vault.md L337-344, second-brain-query L29-34, retrieval-safety.md L69-76) |
| SC7: Planning-ready without implementation detail | PASS | L176-270 clearly separate current vs planned capabilities; no wrapper implementation code |

### TDD Batch Coverage: 4 of 4 batches fully addressed

**Batch 1: Canonical schema and wrapper contract source**
- B1.1a: Contract declares single canonical reference - PASS (L3)
- B1.2: SQLite is derived index, not vault truth - PASS (L18-20, L24-27)
- B1.3: `vault_index_search` is only supported entrypoint - PASS (L30-32)
- B1.4a: Current vs planned request shape separation - PASS (L176-270, clear section headers)
- B1.4b: Planned capabilities labeled as not yet live - PASS (L198-226, L260 explicit statements)
- B1.5a-f: Required Indexes match actual schema - PASS (L328-352, comprehensive index listing)

**Batch 2: Local-first workflow and wrapper discipline**
- B2.1: Stage 0 before Stage 1 required - PASS (query-vault.md L45-47: "This stage is mandatory and must not be skipped")
- B2.2a: Ad hoc SQL prohibited - PASS (retrieval-safety.md L25-30; query-vault.md L101)
- B2.2b: Constraints enforced inside SQLite - PASS (query-vault.md L100: "Structured constraints must be enforced inside SQLite")
- B2.3: Shortlist-first reading order - PASS (query-vault.md L107: explicit local-first policy)
- B2.4: No unbounded query from empty extraction - PASS (query-vault.md L62-63, L114-115)
- B2.5: `vault_index_search` as first retrieval wrapper - PASS (query-vault.md L88)

**Batch 3: Safety guardrails and stale-index handling**
- B3.1a: Schema guessing prohibited - PASS (retrieval-safety.md L33: "Schema guessing is prohibited")
- B3.1b: Directs to canonical contract - PASS (retrieval-safety.md L34)
- B3.2: Distinguishes normal retrieval from debugging - PASS (retrieval-safety.md L25-27)
- B3.3: Stale/inconsistent index labeling required - PASS (retrieval-safety.md L62-66; query-vault.md L108)
- B3.4: Fallback explicit with lower confidence - PASS (retrieval-safety.md L90; query-vault.md L109)

**Batch 4: Provenance separation and network permission policy**
- B4.1a-d: All 4 docs agree on 4 provenance categories - PASS (verified in all four files)
- B4.2a-c: Non-debug network permission and prompt shape - PASS (consistent across all docs: "Local retrieval was insufficient. Do you want me to search the web?")
- B4.3a-d: Debug mode doesn't weaken schema/provenance - PASS (debug-mode.md L27-34: "Still Required in Debug Mode"; retrieval-safety.md L11)
- B4.4a-c: SKILL.md consumes contract without redefining - PASS (L17-26: "This skill must not redefine...")

### In-Scope Coverage

All 8 in-scope items from requirement.md addressed:

1. Canonical contract document for SQLite schema - DONE (sqlite-retrieval-contract.md frozen at step 04)
2. Specify `notes` and `properties` schema and retrieval-relevant fields - DONE (L36-96)
3. Declare `vault_index_search` as required first-pass entrypoint - DONE (L30)
4. Require local-first retrieval and explicit shortlist reading - DONE (query-vault.md L107)
5. Define safety guardrails for schema guessing, wrapper bypass, stale-index handling, fallback labeling - DONE (retrieval-safety.md full coverage)
6. Require non-debug web search to ask first - DONE (all four docs consistent)
7. Require answer layers to separate facts, index hits, web results, hypotheses - DONE (four-category provenance separation in all docs)
8. Keep compatible with existing query workflow and retrieval wrapper - DONE (query-vault.md preserved as retrieval behavior authority)

### Constraint Compliance

All 7 constraints from requirement.md enforced:

1. SQLite is derived index, not source of truth - ENFORCED (contract L18-20)
2. First-pass entrypoint is `vault_index_search` - ENFORCED (contract L30; query-vault.md L88)
3. Non-debug sessions must not use network search without permission - ENFORCED (all docs)
4. Contract describes actual schema - VERIFIED (CREATE TABLE statements match schema)
5. Shortlist hits not confirmed facts until file read - ENFORCED (contract L20; query-vault.md L108)
6. Fallback explicit and confidence-labeled - ENFORCED (query-vault.md L109; retrieval-safety.md L90)
7. Contract aligned with existing retrieval workflow - VERIFIED (query-vault.md remains behavior authority)

## Coverage Verification (MANDATORY for status `correct`)

### Requirements Coverage Table

| Requirement Section | Coverage Artifact | Verification Method | Status |
|---------------------|-------------------|---------------------|--------|
| "Contract surface to freeze" (step.md L29-35) | `.opencode/docs/sqlite-retrieval-contract.md` L3-5, L18-32, L176-270 | Contract check: freeze markers, single canonical reference, current vs planned separation | `covered` |
| "Safety and provenance decisions" (step.md L41-49) | `.opencode/rules/retrieval-safety.md` L25-90, `.opencode/docs/sqlite-retrieval-contract.md` L353-370 | Contract check: schema guessing prohibition, wrapper bypass prohibition, unbounded query guard, stale-index labeling, network permission, provenance categories | `covered` |
| "TDD Batch 1: Canonical schema and wrapper contract" (step.md L86-91) | `.opencode/docs/sqlite-retrieval-contract.md` L3-5, L18-32, L176-270, L328-352 | Test: 47 TDD verification checks | `covered` |
| "TDD Batch 2: Local-first workflow" (step.md L93-98) | `.opencode/workflows/query-vault.md` L45-115, `.opencode/rules/retrieval-safety.md` L25-30 | Test: 47 TDD verification checks | `covered` |
| "TDD Batch 3: Safety guardrails" (step.md L100-105) | `.opencode/rules/retrieval-safety.md` L33-90, `.opencode/workflows/query-vault.md` L107-109 | Test: 47 TDD verification checks | `covered` |
| "TDD Batch 4: Provenance and network" (step.md L107-111) | All four consumer docs + `.opencode/rules/debug-mode.md` L27-34 | Test: 47 TDD verification checks | `covered` |
| "Invariants" (step.md L143-149) | `.opencode/docs/sqlite-retrieval-contract.md` L18-20, L30-32; `.opencode/workflows/query-vault.md` L88, L107-109; `.opencode/rules/retrieval-safety.md` L33, L62-66 | Contract check: all 5 invariants enforced | `covered` |
| "Execution constraints" (step.md L136-141) | All changed files | Code inspection: doc-first, reuse existing artifacts, concrete behavior labels, no out-of-scope product behavior | `covered` |

### Coverage Summary
- Total requirements sections in step.md: 8 (Contract surface, Safety decisions, 4 TDD batches, Invariants, Execution constraints)
- Requirements checked: 8
- Covered: 8
- Gaps: 0
- Partial coverage: 0

### Coverage Gate
- All requirement sections have explicit coverage artifacts
- No gaps hidden as "none"
- Coverage table present and complete

All 7 locked constraints from step.md enforced:

1. Scope limited to step folder and existing retrieval artifacts - VERIFIED (5 files changed as documented)
2. No new workflow/wrapper name/step decomposition - VERIFIED (preserved existing structure)
3. `query-vault.md` remains retrieval behavior authority - VERIFIED (L23 explicitly states)
4. Contract doc remains schema and wrapper-contract authority - VERIFIED (L3-5 explicit)
5. Compatible with steps 01-03 - VERIFIED (references prior step behavior)
6. No user-facing formatting beyond confidence/provenance - VERIFIED
7. Index-only hits not verified claims - VERIFIED (explicit prohibition throughout)

## TDD Compliance

### Red
- PASS: TDD batch verification checks were derived from step.md before implementation

### Green
- PASS: All 47 TDD batch verification checks pass

### Refactor
- PASS: Quality fix pass resolved live-vs-planned boundary and drift surface without changing behavior

## Anti-Patterns
- none

## Phase Handoff

### Archive Context Used
- none

### Phase-Log Follow-Up
- none required

### Superseded Directions
- none

## Recommendation

**correct: proceed to quality review**