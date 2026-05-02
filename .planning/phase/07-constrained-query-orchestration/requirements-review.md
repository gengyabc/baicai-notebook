---
step-key: constrained-query-orchestration
step-folder: 07-constrained-query-orchestration
requirement-version: 1
step-version: 1
review-status: correct
reviewed-at: 2026-05-02
---

## Review Summary

Implementation is correct. All 10 success criteria are met, all constraints are satisfied, all 7 TDD batches pass, and deferred items are acceptable and well-documented. The governance artifacts (canonical-tags.json, tag-aliases.json, tag-expansions.json, location-aliases.json) are properly created with integrity validation, the orchestration protocol is defined in contract and workflow, and the multi-pass retrieval policy is implemented through pure functions with bounded expansion logic.

## Success Criteria Alignment

### SC1: Caller-side orchestration rule requires explicit structured query analysis before structured SQLite retrieval when usable structured clues exist

**Status: MET**

Evidence:
- `.opencode/workflows/query-vault.md` Stage 0 mandates constraint extraction before Stage 1 shortlist execution (lines 52-76)
- Governed normalization requirement added to Stage 0 (line 56)
- `.opencode/skills/second-brain-query/SKILL.md` reinforces Stage 0 extraction before any SQLite shortlist (lines 9-10)

### SC2: LLM may output only retrieval-contract-supported fields and may not invent arbitrary structured keys or arbitrary tag values

**Status: MET**

Evidence:
- `.opencode/docs/sqlite-retrieval-contract.md` defines frozen constraint families (lines 126-169)
- `.opencode/skills/second-brain-query/SKILL.md` Governance alignment section states "The model must emit only retrieval-contract-supported fields and only governed canonical tag values" (line 41)
- No artifact permits arbitrary structured keys or freeform tag values

### SC3: Canonical tag outputs must come only from a dedicated machine-readable canonical tag artifact

**Status: MET**

Evidence:
- `.opencode/canonical-tags.json` created with 25 canonical tags (lines 1-31)
- `.opencode/docs/sqlite-retrieval-contract.md` states "Canonical tag values come only from `.opencode/canonical-tags.json`, which is the unique legal runtime source for final canonical tag outputs" (line 174)
- `isCanonicalTag()` function in governed-artifacts.ts uses canonical-tags.json as runtime source (lines 100-103)

### SC4: canonical-tags.json is the unique legal source of canonical tag values

**Status: MET**

Evidence:
- Contract explicitly states "canonical-tags.json is the unique legal runtime source for final canonical tag outputs" (lines 174)
- Integrity validation functions confirm all tag-aliases and tag-expansions reference only canonical-tags entries (governed-artifacts.ts lines 155-188)
- Test confirms contract matches this requirement pattern (governed.test.ts lines 59-61)

### SC5: tag-aliases.json, tag-expansions.json, and location-aliases.json are separate dedicated machine-readable artifacts with distinct responsibilities

**Status: MET**

Evidence:
- `.opencode/tag-aliases.json` created with alias-to-canonical mappings (lines 1-58)
- `.opencode/tag-expansions.json` created with approved neighbor relationships (lines 1-8)
- `.opencode/location-aliases.json` created with country/province/city mappings (lines 1-68)
- Contract defines distinct responsibilities for each artifact (lines 175-177)

### SC6: Aliases are input normalization tools, not final structured outputs

**Status: MET**

Evidence:
- tag-aliases.json description states "Aliases are valid only as input forms, never as final structured outputs" (line 3)
- location-aliases.json description states "Location aliases are valid only as input forms, never as final structured outputs" (line 3)
- `resolveTagAlias()` returns canonical values only, with source distinction (governed-artifacts.ts lines 105-119)
- Contract reinforces this rule (lines 175, 177)

### SC7: Controlled broadened structured retrieval may use only explicitly approved expansion relationships and must remain bounded

**Status: MET**

Evidence:
- `.opencode/tag-expansions.json` defines approved relationships (training <-> education) (lines 4-6)
- `shouldExpand()` returns true only when primaryCandidateCount < 3 (governed-artifacts.ts lines 190-192)
- `buildExpandedConstraints()` adds only approved neighbors from tag-expansions.json (lines 194-223)
- expansionTriggerReason explains which neighbors were added (line 221)

### SC8: Wrapper remains responsible for SQL generation and execution; LLM remains responsible for governed constraint analysis and normalization

**Status: MET**

Evidence:
- Contract states "vault_index_search is the only supported first-pass retrieval entrypoint" (line 30)
- Contract states "The caller owns normalization, governed artifact lookup, and the decision to attempt the bounded expansion pass. The wrapper owns SQL generation, execution, shortlist ranking inputs, and reporting candidate counts" (lines 294)
- No retrieval artifact claims raw SQL generation is permitted as a substitute for governed structured constraints (test verified, governed.test.ts lines 165-168)

### SC9: Diagnostics must distinguish the first structured pass from any later expansion pass and report the reason for broadening

**Status: MET**

Evidence:
- `PassDiagnostics` type distinguishes `primary-structured-pass` from `expansion-structured-pass` (governed-artifacts.ts lines 38-44)
- `expansionTriggerReason` field reports reason for broadening (lines 42, 221)
- Contract defines pass-level diagnostics with pass state, constraints, and candidate counts (lines 296-305)
- Test confirms diagnostics distinguish pass types (governed.test.ts lines 228-232)

### SC10: Requirement remains planning-ready without expanding into implementation steps, code design, or schema redesign

**Status: MET**

Evidence:
- Requirement focuses on governance artifact definitions and orchestration protocol
- No schema redesign mentioned in requirement or implementation
- Implementation aligned with governance artifact creation and policy function definitions
- Scope stayed within constraint extraction, normalization, and bounded expansion policy

## Constraint Compliance

All constraints satisfied:

| Constraint | Status | Evidence |
|------------|--------|----------|
| LLM must output only retrieval-contract-supported fields | MET | Contract defines fields; skill instructs model |
| Canonical tag outputs must come only from canonical-tags.json | MET | Contract states this; isCanonicalTag() uses it |
| Alias normalization must come from tag-aliases.json | MET | resolveTagAlias() uses it; integrity validated |
| Tag-neighbor expansion must come only from tag-expansions.json | MET | getExpansionNeighbors() uses it; integrity validated |
| location-aliases.json for location normalization | MET | resolveLocationAlias() uses it |
| canonical-tags.json is the only legal source | MET | Contract explicitly states; test verifies |
| tag-aliases.json only maps to canonical-tags.json | MET | Integrity validation confirms all targets exist |
| tag-expansions.json only broadens among canonical tags | MET | Integrity validation confirms all tags exist |
| location-aliases.json only maps to canonical locations | MET | Location values are canonical |
| Separate artifacts for separate concerns | MET | Four distinct JSON files created |
| Human approval for canonical tag additions | MET | Contract documents propose-approve-reject workflow |
| Wrapper is only structured SQLite execution path | MET | vault_index_search is sole entrypoint |
| First pass prefers primary constraints without expansion | MET | buildExpandedConstraints only expands when < 3 |
| Broadened pass is bounded and explainable | MET | expansionTriggerReason explains; max 2-3 neighbors |
| Retrieval diagnostics distinguish passes | MET | PassDiagnostics type defined |

## TDD Batch Coverage

| Batch | Status | Evidence |
|-------|--------|----------|
| Batch 1: Freeze governance artifact boundaries | COVERED | Four JSON artifacts created; contract updated; integrity validation functions implemented |
| Batch 2: Enforce caller-side normalization | COVERED | query-vault.md and SKILL.md updated; resolveTagAlias/resolveLocationAlias implemented |
| Batch 3: Freeze bounded primary-pass and expansion-pass policy | COVERED | shouldExpand() and buildExpandedConstraints() implemented with < 3 threshold |
| Batch 4: Distinguish literal, alias, inference, and pass-level diagnostics | COVERED | TraceEntry, PassDiagnostics, GovernedRetrievalDiagnostics types defined |
| Batch 5: Align implementation surfaces with governance source of truth | COVERED | governed-artifacts module loads and validates; TAG_KEYWORDS/LOCATION_ALIASES verified aligned |
| Batch 6: Human-review workflow for governed artifact changes | COVERED | Contract documents propose-approve-reject workflow; canonical additions require human approval |
| Batch 7: Machine-readable wrapper response diagnostics | COVERED | Contract defines diagnostics fields; honest live vs planned distinction |

Test execution: **102 pass, 0 fail, 321 expect() calls** (verified via `bun test`)

## Findings

No issues found. Implementation is correct and fully aligned with requirement and step plan.

## Deferred Items Assessment

The deferred items from implementation-result.md are acceptable:

1. **Wiring buildExpandedConstraints into searchIndex function** - Acceptable because:
   - Requires DB-dependent integration tests
   - Core policy functions are implemented and tested as pure functions
   - Multi-pass retrieval policy is defined in contract

2. **Emitting GovernedRetrievalDiagnostics from wrapper response** - Acceptable because:
   - Contract honestly marks fields as "planned" vs "live" (lines 312-324)
   - Types are defined for future implementation
   - Backward compatibility preserved

3. **Removing old TAG_KEYWORDS and LOCATION_ALIASES exports** - Acceptable because:
   - Test verified entries are present in governed artifacts
   - Migration path documented
   - No breaking change until consumers migrated

4. **Implementing propose-approve-reject workflow in tooling** - Acceptable because:
   - Workflow documented in contract
   - First-version scope focused on governance artifact definitions
   - Tooling can be added incrementally

E2E intentionally skipped with clear rationale (test-checklist.md lines 11): multi-pass retrieval policy tested through pure functions; end-to-end testing would require live SQLite database and is deferred to wrapper implementation steps.

## Verdict

**correct**

The implementation fully addresses all 10 success criteria, satisfies all constraints, covers all 7 TDD batches, and the deferred items are acceptable and well-documented. The governance artifacts are properly created with integrity validation, the orchestration protocol is defined in contract and workflow, and the multi-pass retrieval policy is implemented through pure functions with bounded expansion logic. The contract honestly distinguishes live vs planned diagnostics fields, preserving backward compatibility while defining the future response contract.

## Phase Handoff Note

None - this step is complete and ready for integration into implementedStepKeys.

## Planning-memory Follow-up Note

None required - implementation aligned with requirement without unmet needs.