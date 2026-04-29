---
schema: implementation-result-v1
step-key: frontmatter-tag-governance
step-folder: 02-frontmatter-tag-governance
requirement-version: 1
step-version: 1
result-version: 2
implementation-status: complete
---

# Implementation Result: 02-frontmatter-tag-governance

## Plan Source

- @.planning/phase/02-frontmatter-tag-governance/step.md

## Based On

- @.planning/phase/02-frontmatter-tag-governance/quality-review.md (Round 1 findings)

## Summary

- Step: 02-frontmatter-tag-governance
- Status: complete
- Result Scope: quality-review fix pass (Round 1)

## Files Changed

- `.opencode/rules/metadata-conventions.md`
- `docs/metadata-field-matrix.md`
- `docs/metadata-alias-registry.md`
- `.opencode/workflows/lint-vault.md`
- `.opencode/skills/second-brain-lint/SKILL.md`
- `.opencode/workflows/query-vault.md`
- `.opencode/skills/second-brain-query/SKILL.md`

## Behavior Implemented

### Original implementation (v1)

- Added "Structured fields versus tags" policy section to `metadata-conventions.md` defining that time and location belong in structured fields, tags are controlled retrieval aids, hierarchical tags are preserved, and first-stage governance is advisory
- Added `country`, `province`, `city` rows and `G` (governed) legend to the field matrix in both `metadata-conventions.md` and `metadata-field-matrix.md`
- Updated human-managed domain note template to use `country`, `province`, `city` instead of freeform `location`
- Created `docs/metadata-alias-registry.md` with three sections (Tag aliases, Location aliases, Canonical topic aliases), each row containing governed surface, canonical value, accepted aliases, and review rationale
- Added alias review flow documentation: lint finds, human decides, registry updated, notes not auto-rewritten
- Updated `lint-vault.md` with three new governance checks (alias drift, tag growth, non-canonical retrieval metadata) and advisory governance section
- Updated `second-brain-lint/SKILL.md` with governance check descriptions and advisory-only constraints
- Updated `query-vault.md` with governance assumptions section referencing structured-field policy, alias registry, and China default
- Updated `second-brain-query/SKILL.md` with governance alignment section matching the same structured-field-versus-tag rules

### Quality-review fix pass (v2)

- **QR-02-P1-001**: Added all missing canonical tags from policy and templates to the alias registry: `state/reviewed`, `state/draft`, `source/generated`, `source/local`, `source/chat`, `source/manual`, `role/synthesis`, `role/topic`, `role/entity`, `role/draft`, `role/index`, `role/log`. These correspond to values already required by the `status` enum, `source_type` enum, `content_role` enum, and the LLM-managed brainstorm template.
- **QR-02-P2-002**: Replaced freeform `location` in the "When tags are allowed as retrieval aids" positive example with "structured location fields `country` / `province` / `city`".
- **QR-02-P2-003**: Updated governance assumptions in `query-vault.md` and governance alignment in `second-brain-query/SKILL.md` to clarify that alias-aware query-time expansion is a future enhancement, the current Stage 1 retrieval flow reads canonical values directly, and the alias registry is the governance reference for human review (not yet an automated query-time expansion mechanism).

## Tests Added

- `verify-step.sh` (54 content-structure assertions across 4 TDD batches, including 17 new assertions for the three quality fixes)

## Canonical E2E Path

- none

## E2E Run Result

- not run

## Commands Run

- `bash .planning/phase/02-frontmatter-tag-governance/verify-step.sh` (passed: 54/54)

## Known Risks

- The alias registry contains initial seed entries plus policy-aligned canonical tags; real-world usage will require expanding the registry through human review
- The advisory governance model relies on human review discipline; without periodic lint runs, alias drift may accumulate silently
- The `location` freeform field is still mentioned for backward compatibility; future steps may need to deprecate it
- Alias-aware query-time expansion is deferred; until implemented, lint findings against non-canonical values are advisory and will not automatically broaden retrieval matches

## Next Suggested Review Focus

- Verify that the alias registry now covers all canonical tags referenced in policy and templates
- Confirm the retrieval docs no longer over-promise alias-aware matching
- Check that the freeform `location` example has been fully replaced
