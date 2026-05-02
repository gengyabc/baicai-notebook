---
step-key: constrained-query-orchestration
step-folder: 07-constrained-query-orchestration
requirement-version: 1
step-version: 1
implementation-status: complete
---

# Implementation Result

## Summary

Implemented governed query orchestration for vault retrieval: created machine-readable JSON governance artifacts (canonical-tags.json, tag-aliases.json, tag-expansions.json, location-aliases.json), built the governed-artifacts module with types and functions for governed normalization, multi-pass retrieval policy, and structured diagnostics, updated retrieval contract and documentation to reference the new governance artifacts, and aligned the existing extraction logic and router to consume governed artifacts.

## TDD Batch Results

### Batch 1: Freeze machine-readable governance artifact boundaries

- Status: PASS
- Created four JSON governance artifacts under `.opencode/`
- Updated `sqlite-retrieval-contract.md` to reference JSON artifacts with distinct responsibilities
- Contract states canonical-tags.json is the only legal runtime source for final canonical tag outputs
- Integrity validation functions confirm tag-aliases and tag-expansions reference only canonical-tags entries

### Batch 2: Enforce caller-side normalization before structured execution

- Status: PASS
- Updated `query-vault.md` with governed normalization requirement before vault_index_search
- Updated `second-brain-query/SKILL.md` with governed canonical tag and location references
- Implemented `resolveTagAlias` and `resolveLocationAlias` with literal/alias source distinction
- Verified no retrieval artifact claims raw SQL generation is permitted

### Batch 3: Freeze the bounded primary-pass and expansion-pass policy

- Status: PASS
- Implemented `shouldExpand` (returns true when primaryCandidateCount < 3)
- Implemented `buildExpandedConstraints` (adds approved neighbors from tag-expansions.json)
- Expansion only uses explicitly approved canonical tags; no invention of new tags
- 3+ candidates do not trigger automatic expansion

### Batch 4: Distinguish literal, alias, inference, and pass-level diagnostics

- Status: PASS
- Defined `TraceEntry`, `PassDiagnostics`, `GovernedRetrievalDiagnostics` types
- `resolveTagAlias` and `resolveLocationAlias` return source: "literal" | "alias"
- PassDiagnostics distinguishes primary-structured-pass from expansion-structured-pass
- Unresolved semantic hints reported rather than silently converted

### Batch 5: Align implementation surfaces with governance source of truth

- Status: PASS
- `governed-artifacts.ts` loads all JSON artifacts with caching and cache invalidation
- `isCanonicalTag` uses canonical-tags.json as runtime source of truth
- TAG_KEYWORDS entries verified present in canonical-tags.json
- LOCATION_ALIASES values verified present in location-aliases.json
- alias-registry.md remains aligned for seeding; runtime no longer depends on it for final canonical outputs

### Batch 6: Human-review workflow for governed artifact changes

- Status: PASS
- Contract documents propose-approve-reject workflow for governed artifact changes
- Canonical tag additions require explicit human approval
- Alias and expansion additions must be reviewable before merging
- Workflow documented in contract and verified in skill/workflow artifacts

### Batch 7: Machine-readable wrapper response diagnostics

- Status: PASS
- Contract defines machine-readable diagnostics fields (appliedConstraints, inferredConstraints, rejectedStructuredHints, candidateCounts, fallbackReason)
- Contract distinguishes primary-structured-pass from expansion-structured-pass in diagnostics
- Wrapper response contract stays backward-compatible (text output continues alongside planned structured diagnostics)
- Contract honestly marks which diagnostics fields are live vs planned
- GovernedRetrievalDiagnostics type supports multi-pass diagnostics with structured data

### Batch 8: Extraction logic derives from JSON governance artifacts (P1-003 fix)

- Status: PASS
- TAG_KEYWORDS is now derived from canonical-tags.json + tag-aliases.json at module load time
- LOCATION_ALIASES is now derived from location-aliases.json at module load time
- Drift-detection tests verify TAG_KEYWORDS canonical set matches canonical-tags.json exactly
- Drift-detection tests verify all TAG_KEYWORDS aliases exist in tag-aliases.json or canonical-tags.json
- Drift-detection tests verify no tag-aliases.json topic alias is missing from TAG_KEYWORDS
- Drift-detection tests verify LOCATION_ALIASES keys and values match location-aliases.json exactly
- `refreshGovernedDerivedTables()` allows runtime cache invalidation and table rebuild

## Quality Review Fix Pass (QR-enhance-info-retrieval-P1-002 and P1-003)

### P1-002: Live router now executes the expansion structured pass

- `searchIndex()` in `index.ts` now follows the two-pass policy:
  1. Primary structured pass runs first with no auto-expansion
  2. If primary returns fewer than 3 candidates, `buildExpandedConstraints()` is called
  3. If expansion has approved neighbors, a second structured search runs with expanded tags
  4. Pass-level diagnostics are recorded for both primary and expansion passes
  5. If expansion finds results, they are returned; otherwise primary results (if any) are returned
  6. Only if both passes yield zero results does text fallback occur
  7. When primary returns 3+ candidates, no expansion is attempted

### P1-003: JSON governance artifacts are now the live runtime source of truth

- `extraction-logic.ts` no longer contains hardcoded `TAG_KEYWORDS` and `LOCATION_ALIASES` tables
- Both tables are now built from JSON artifacts at module load time via `buildTagKeywordsFromArtifacts()` and `buildLocationAliasesFromArtifacts()`
- `refreshGovernedDerivedTables()` invalidates governed artifact cache and rebuilds derived tables
- Drift-detection tests in Batch 8 ensure extraction logic stays aligned with JSON artifacts (tests fail when alias sets drift)
- Unused imports removed from `index.ts` (LOCATION_ALIASES, TAG_KEYWORDS, isCanonicalTag, resolveTagAlias, resolveLocationAlias, GovernedRetrievalDiagnostics, TraceEntry)

## Quality Review Fix Pass (QR-enhance-info-retrieval-P2-004)

### P2-004: Retrieval docs and skill aligned with JSON governance artifacts and honest diagnostics

- **query-vault.md**: Replaced three `alias-registry.md` runtime governance references (lines 36-38, 70, 144) with explicit JSON artifact references (`canonical-tags.json`, `tag-aliases.json`, `tag-expansions.json`, `location-aliases.json`). `alias-registry.md` is now described only as a human-reviewed bootstrap/migration reference, not a runtime governance source.
- **SKILL.md**: Fixed the broken contract path typo `sqlite-retrieval-contrieval-contract.md` to `sqlite-retrieval-contract.md` (line 38). Replaced two `alias-registry.md` references (lines 101, 107) with explicit JSON artifact references for location and tag canonical values.
- **sqlite-retrieval-contract.md**: Replaced `alias-registry.md` reference in the tags constraint family section (line 157) with `canonical-tags.json` / `tag-aliases.json` references. Resolved the live-vs-planned diagnostics contradiction: restructured the machine-readable diagnostics section (lines 312-324) to label all fields as "Planned diagnostics fields" (Phase 1 and Phase 2), each clearly marked "not yet supported by the live wrapper". This is now consistent with the "Current Wrapper Behavior" section (line 333) that states "Does not return structured diagnostics fields".

## Files Changed

### Created

- `.opencode/canonical-tags.json` -- 25 canonical tags seeded from alias-registry.md
- `.opencode/tag-aliases.json` -- alias-to-canonical mapping seeded from alias-registry.md
- `.opencode/tag-expansions.json` -- training/education expansion pair
- `.opencode/location-aliases.json` -- country/province/city alias mappings seeded from alias-registry.md
- `.opencode/plugins/vault-query-router/governed-artifacts.ts` -- types and functions for governed normalization, multi-pass policy, structured diagnostics
- `.opencode/plugins/vault-query-router/governed.test.ts` -- 56 tests covering all 8 batches
- `.planning/phase/07-constrained-query-orchestration/test-checklist.md` -- test checklist with test-layer mode

### Modified

- `.opencode/plugins/vault-query-router/extraction-logic.ts` -- replaced hardcoded TAG_KEYWORDS and LOCATION_ALIASES with artifact-derived tables; added `buildTagKeywordsFromArtifacts()`, `buildLocationAliasesFromArtifacts()`, `refreshGovernedDerivedTables()`
- `.opencode/plugins/vault-query-router/index.ts` -- wired `buildExpandedConstraints()` into `searchIndex()` with two-pass policy and pass-level diagnostics; removed unused imports
- `.opencode/plugins/vault-query-router/governed.test.ts` -- added Batch 8 drift-detection tests (11 tests); added `refreshGovernedDerivedTables` import
- `.opencode/plugins/vault-query-router/extraction.test.ts` -- fixed path resolution for 3 doc file paths; updated Batch 1 test to match updated contract language
- `.opencode/docs/sqlite-retrieval-contract.md` -- added governed artifact references, multi-pass retrieval policy, pass-level diagnostics, machine-readable wrapper response diagnostics section, updated normalization source rules; P2-004: replaced alias-registry.md runtime reference in tags constraint family, resolved live-vs-planned diagnostics contradiction
- `.opencode/workflows/query-vault.md` -- added governed normalization requirement to Stage 0; P2-004: replaced three alias-registry.md runtime governance references with explicit JSON artifact references
- `.opencode/skills/second-brain-query/SKILL.md` -- updated governance alignment section with JSON artifact references; P2-004: fixed broken contract path typo (contrieval->retrieval), replaced two alias-registry.md references with JSON artifact references

## Verification

- `bun test` from `.opencode/plugins/vault-query-router/`: **112 pass, 0 fail, 520 expect() calls** (verified after P2-004 fix)
- `bun build .opencode/plugins/vault-query-router/index.ts --no-bundle`: **succeeds**
- All 8 batches pass with no regressions

## E2E

- Test-layer mode: `lower-level` (no E2E)
- E2E intentionally skipped: multi-pass retrieval policy and governed normalization are tested through pure functions and document content checks; end-to-end testing would require a live SQLite database and is deferred to wrapper implementation steps

## Deferred Items

- Emitting `GovernedRetrievalDiagnostics` from the wrapper response as structured metadata (passDiagnostics array is computed but not yet exposed in the tool response)
- Implementing the actual propose-approve-reject workflow in tooling (currently documented in contract only)
