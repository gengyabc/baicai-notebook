---
step-key: constrained-query-orchestration
step-version: 1
derived-from: step.md
---

# Test Checklist

## Test-layer mode

`lower-level` -- tests are pure-unit and doc-content checks against governed artifacts, policy functions, and document alignment. No E2E tests needed because the retrieval wrapper requires a live SQLite database and multi-pass retrieval policy is tested through pure functions.

## Checklist

### Batch 1: Freeze machine-readable governance artifact boundaries

- [x] Contract names all four governance artifacts (canonical-tags.json, tag-aliases.json, tag-expansions.json, location-aliases.json) with distinct responsibilities
- [x] Contract states canonical-tags.json is the only legal runtime source for final canonical tag outputs
- [x] Contract no longer describes alias-registry.md as the legal runtime source for final canonical tag outputs
- [x] Every canonical tag referenced by tag-aliases.json or tag-expansions.json exists in canonical-tags.json
- [x] canonical-tags.json contains expected governed tags
- [x] tag-aliases.json contains expected alias mappings from alias-registry.md
- [x] tag-expansions.json contains training/education expansion pair
- [x] location-aliases.json contains country, province, and city mappings

### Batch 2: Enforce caller-side normalization before structured execution

- [x] Workflow requires caller-side governed normalization before vault_index_search
- [x] Skill instructs to emit only retrieval-contract-supported fields
- [x] Skill instructs to emit only governed canonical tag values
- [x] resolveTagAlias returns correct canonical for literal matches
- [x] resolveTagAlias returns correct canonical for alias matches
- [x] resolveTagAlias returns null for unknown aliases
- [x] resolveLocationAlias resolves city aliases correctly
- [x] resolveLocationAlias resolves literal city matches
- [x] No retrieval artifact claims raw SQL generation is permitted

### Batch 3: Freeze the bounded primary-pass and expansion-pass policy

- [x] Primary structured pass uses only primary canonical constraints with no auto-expansion
- [x] Automatic broadening may run only after a primary pass with fewer than 3 candidates
- [x] Broadened pass uses only approved neighbors from tag-expansions.json
- [x] Broadened pass does not invent new canonical tags
- [x] 3 or more candidates do not trigger first-version automatic expansion
- [x] Expansion trigger reason explains why broadening was triggered

### Batch 4: Distinguish literal, alias, inference, and pass-level diagnostics

- [x] resolveTagAlias distinguishes literal and alias mappings
- [x] resolveLocationAlias distinguishes literal and alias mappings
- [x] TraceEntry type supports literal, alias, and inference source values
- [x] PassDiagnostics distinguishes primary-structured-pass from expansion-structured-pass
- [x] PassDiagnostics reports constraints used and candidate counts per pass
- [x] Unresolved/ambiguous hints are reported rather than silently converted

### Batch 5: Align implementation surfaces with governance source of truth

- [x] governed-artifacts module loads and validates all JSON artifacts
- [x] isCanonicalTag uses canonical-tags.json as the runtime source of truth
- [x] TAG_KEYWORDS entries are all present in canonical-tags.json
- [x] LOCATION_ALIASES values are all present in location-aliases.json
- [x] alias-registry.md remains aligned with the JSON artifacts for seeding
- [x] Contract references JSON artifacts as runtime governance sources
- [x] Existing shortlist-first retrieval and fallback behavior remain intact

### Batch 6: Human-review workflow for governed artifact changes

- [x] Governance artifacts document a propose-approve-reject workflow
- [x] Canonical tag additions require explicit human approval
- [x] Alias and expansion additions are reviewable before merging
- [x] Workflow is documented in at least one retrieval-facing artifact

### Batch 7: Machine-readable wrapper response diagnostics

- [x] Contract defines machine-readable diagnostics fields for the wrapper response
- [x] Diagnostics fields distinguish primary-structured-pass from expansion-structured-pass
- [x] Wrapper response contract stays backward-compatible
- [x] Contract honestly marks which diagnostics fields are live vs planned
- [x] GovernedRetrievalDiagnostics type supports multi-pass diagnostics

### Batch 8: Extraction logic derives from JSON governance artifacts (P1-003 fix)

- [x] TAG_KEYWORDS canonical set matches canonical-tags.json exactly
- [x] Every TAG_KEYWORDS alias exists in tag-aliases.json or canonical-tags.json
- [x] No alias in tag-aliases.json targeting a topic canonical tag is missing from TAG_KEYWORDS
- [x] LOCATION_ALIASES country keys match location-aliases.json country keys exactly
- [x] LOCATION_ALIASES province keys match location-aliases.json province keys exactly
- [x] LOCATION_ALIASES city keys match location-aliases.json city keys exactly
- [x] LOCATION_ALIASES country values match location-aliases.json country values exactly
- [x] LOCATION_ALIASES province values match location-aliases.json province values exactly
- [x] LOCATION_ALIASES city values match location-aliases.json city values exactly
- [x] refreshGovernedDerivedTables rebuilds tables from current artifacts

### P1-002 fix: Live router executes expansion structured pass

- [x] Primary structured pass runs first with no auto-expansion
- [x] Expansion pass runs when primary returns fewer than 3 candidates
- [x] Expansion uses only approved neighbors from tag-expansions.json
- [x] 3+ candidates do not trigger expansion
- [x] Pass-level diagnostics recorded (passType, constraints, candidateCount)
- [x] Expansion results returned when found; primary results returned otherwise
- [x] Text fallback only when both passes yield zero results
