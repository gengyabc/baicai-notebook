---
step-key: minimal-retrieval-contract
step-number: 8
step-folder: 08-minimal-retrieval-contract
requirement-version: 1
step-version: 1
review-status: correct
updated-at: 2026-05-02
---

# Review Report

## Plan Reference
- @.planning/phase/08-minimal-retrieval-contract/requirement.md
- @.planning/phase/08-minimal-retrieval-contract/step.md

## Overall Status
- `correct`

## Findings

### Plan Alignment Issues
- none

### Delta Checks
- Preserved behaviors verified: none (no delta.md present, first implementation)
- Removed behaviors verified as absent: Training-specific fields (`country`, `province`, `city`, `timeMode`, `start`, `end`) removed from StructuredConstraints type, SQL queries, and extraction logic. Verified via grep: no references to these fields as constraint inputs in index.ts, extraction-logic.ts, or extraction.test.ts.
- Replacement behaviors verified: Chronology windows (`createdStart`/`createdEnd`, `updatedStart`/`updatedEnd`) replace training-oriented time fields. Note-time queries emit chronology constraints; event-time queries do not. Verified in extraction-logic.ts:512-521 and extraction.test.ts:88-105.
- Stale evidence detected: none

### Spec Violations
- none

### Contract Issues
- none

### Test Issues
- none

## Coverage Verification (MANDATORY for status `correct`)

### Requirements Coverage Table
| Requirement Section | Coverage Artifact | Verification Method | Status |
|---------------------|-------------------|---------------------|--------|
| "Minimal shared retrieval contract: created_at, updated_at, tags" | sqlite-retrieval-contract.md:34-50 | Contract check: names only these 3 fields | covered |
| "Field-name compatibility mapping (created_at -> created, updated_at -> updated)" | sqlite-retrieval-contract.md:44-49 | Contract check: explicit mapping stated | covered |
| "Note-type-specific frontmatter allowed" | sqlite-retrieval-contract.md:53-56 | Contract check: explicitly stated as allowed | covered |
| "Serialized frontmatter JSON payload" | sqlite-index.mjs:551, 580, 624 | Code inspection: frontmatter_json column + JSON.stringify(note.frontmatter) | covered |
| "Tags first-class AND in serialized frontmatter" | sqlite-retrieval-contract.md:61-63 | Contract check: intentional duplication stated | covered |
| "Training-specific fields removed from global contract" | sqlite-retrieval-contract.md:97-103 | Contract check: removal section present | covered |
| "vault_index_search remains entrypoint" | index.ts:452-481, sqlite-retrieval-contract.md:67 | Code + contract check: tool definition + rule 1 | covered |
| "Wrapper request shape: tags, hierarchicalTags, createdStart/End, updatedStart/End" | index.ts:38-45, 458-465 | Code inspection: StructuredConstraints type + tool schema | covered |
| "Structured path no longer depends on country/province/city/timeMode/start/end" | index.ts:184-232, extraction-logic.ts:348-355 | Code inspection: buildStructuredSearchQuery uses only minimal fields; StructuredConstraintsInput excludes legacy | covered |
| "LLM-side filtering after shortlist, before full reads" | query-vault.md:52-56, 237-243 | Workflow check: two-stage boundary + Stage 4a/4b order | covered |
| "Context-budget-aware shortlist policy (no single fixed threshold)" | sqlite-retrieval-contract.md:115, query-vault.md:196-207 | Contract + workflow check: explicit prohibition stated | covered |
| "Diagnostic labels: [structured], [frontmatter-filter], [text-fallback], [unavailable]" | sqlite-retrieval-contract.md:119-132, index.ts:305-335 | Contract + code inspection: labels defined and used in formatStructuredResults/formatResults | covered |
| "Early tag evolution flexible (no governance dependency)" | sqlite-retrieval-contract.md:134-136, query-vault.md:434 | Contract + workflow check: explicit flexibility stated | covered |
| "Test: extraction does not emit location constraints" | extraction.test.ts:53-62 | Test: city/country/province undefined in constraints | covered |
| "Test: note-chronology windows for note-time, not event-time" | extraction.test.ts:88-105 | Test: createdStart defined for note-time; undefined for event-time | covered |
| "Test: wrapper rejects legacy fields" | index.test.ts:79-95 | Test: legacy fields ignored, tags still work | covered |
| "Test: diagnostic labels in output" | index.test.ts:29-60 | Test: [structured] and [text-fallback] in output | covered |

### Coverage Summary
- Total requirements sections in step.md: 6 TDD batches + 17 explicit tests
- Requirements checked: 17 coverage rows
- Covered: 17
- Gaps: 0
- Partial coverage: 0

### Coverage Gate
- Coverage table present: yes
- All rows covered: yes
- No gaps hidden as "none": yes

## TDD Compliance

### Red
- pass - Tests written to verify contract removal of training-specific fields, minimal constraint shape, chronology window emission, and diagnostic labels

### Green
- pass - 17 tests pass (76 expect calls) covering all 6 TDD batches

### Refactor
- pass - Implementation consolidated constraint types in index.ts and extraction-logic.ts without redundancy

## Anti-Patterns
- none

## Phase Handoff

### Archive Context Used
- none (first implementation, no prior archived context needed)

### Phase-Log Follow-Up
- Update branch-phase.toml to add `minimal-retrieval-contract` to `implementedStepKeys` after review approval

### Superseded Directions
- none - Prior training-oriented global contract language has been cleanly removed without requiring superseded decision capture