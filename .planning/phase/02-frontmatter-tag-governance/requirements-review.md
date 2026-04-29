---
schema: requirements-review-v1
step-key: frontmatter-tag-governance
step-folder: 02-frontmatter-tag-governance
requirement-version: 1
step-version: 1
review-status: correct
---

# Requirements Review: 02-frontmatter-tag-governance

## Requirement Coverage

All in-scope items from `requirement.md` are covered:

1. **Governance boundary between structured fields and tags**: Defined in `metadata-conventions.md` lines 209-248, explicitly stating time and location belong in structured fields, tags are controlled retrieval aids.

2. **Time and location in structured fields**: Explicitly stated in "Structured fields versus tags" section - `created`, `updated`, `start_date`, `end_date` for time; `country`, `province`, `city` for location (lines 213-217).

3. **Hierarchical tags preserved**: Obsidian-style `topic/*`, `state/*`, `source/*`, `role/*` forms explicitly supported (lines 235-239).

4. **Alias-based normalization model**: Complete in `metadata-alias-registry.md` with three sections (Tag aliases, Location aliases, Canonical topic aliases) and clear review flow (lines 7-12).

5. **Location governance for country/province/city**: Location aliases section keeps fields distinct with separate subsections for Country aliases, Province aliases, City aliases (lines 30-57).

6. **Canonical_topic normalization**: Covered in dedicated section with explicit note that it's optional and only governed where retrieval depends on it (lines 59-67).

7. **Staged policy with human review**: Advisory-first approach documented in metadata-conventions.md (lines 243-248), alias-registry.md (lines 7-14), and lint-vault.md (lines 32-38).

8. **Compatible with existing conventions**: Human-managed domain note template updated to use `country`, `province`, `city` instead of freeform `location` (lines 280-302).

All out-of-scope items correctly avoided:
- No auto-migration or frontmatter rewriting code
- No global whitelist for arbitrary frontmatter keys
- No forcing domain fields into tags
- No retrieval algorithm changes (only governance alignment)
- No complete ontology design

## Constraint Compliance

All locked constraints respected:

1. **Frontmatter as source of truth**: Preserved in query-vault.md line 197 ("Frontmatter remains the source of truth; SQLite is a derived retrieval index").

2. **Time in dedicated fields**: Explicit in metadata-conventions.md lines 213-215.

3. **Location in dedicated fields**: Explicit in metadata-conventions.md lines 216-217 with China default at metadata/index layer.

4. **Tags as retrieval aid**: Explicit in metadata-conventions.md lines 221-232, with clear "must not" list.

5. **Hierarchical tags supported**: Explicit in metadata-conventions.md lines 235-239.

6. **First-stage normalization scope**: Covers only `tags`, location values, and `canonical_topic` as specified.

7. **Advisory governance**: Multiple documents explicitly state first-stage is advisory, not hard-blocking.

8. **No auto-rewrite**: Explicitly stated in alias-registry.md line 12 ("Notes are not auto-rewritten by this step").

All execution constraints respected:
- Doc-first and advisory-first approach maintained
- No automation that mutates frontmatter
- No widening to arbitrary metadata ontology
- Alias registry centralized, domain splits deferred
- Existing retrieval assumptions preserved

## TDD Batch Coverage

### Batch 1: Structured Fields Versus Tags Policy

- **Test 1**: `metadata-conventions.md` explicitly states time and location in structured fields - PASS (verified lines 213-217)
- **Test 2**: `metadata-conventions.md` defines tags as retrieval aids and preserves hierarchical tags - PASS (verified lines 221-239)
- **Test 3**: `metadata-field-matrix.md` aligned with policy language - PASS (verified `country`, `province`, `city` rows with `G` legend)
- **Test 4**: No single freeform `location` field implied as primary retrieval shape - PASS (lines 302 explicitly state structured fields are retrieval-standard)

### Batch 2: Alias Registry And Canonicalization Rules

- **Test 1**: Single alias registry with three sections - PASS (verified Tag aliases, Location aliases, Canonical topic aliases)
- **Test 2**: Registry defines governed surface, canonical value, aliases, rationale - PASS (verified table structure lines 18-67)
- **Test 3**: Policy explains human review requirement - PASS (verified lines 7-14)
- **Test 4**: Location alias rows keep fields distinct - PASS (separate subsections for Country/Province/City)
- **Test 5**: `canonical_topic` defined only where retrieval depends on it - PASS (line 61 explicitly states this)

### Batch 3: Advisory Lint Consumption

- **Test 1**: `lint-vault.md` includes alias drift, tag growth, non-canonical checks - PASS (lines 23-25)
- **Test 2**: `second-brain-lint/SKILL.md` reflects same advisory behavior - PASS (lines 13-15, 21-29)
- **Test 3**: Lint distinguishes advisory from hard-blocking - PASS (lines 32-38 explicitly state advisory nature)
- **Test 4**: Existing metadata checks intact - PASS (lines 13-22 preserve imageNameKey, frontmatter, etc.)

### Batch 4: Retrieval Consumer Alignment

- **Test 1**: `query-vault.md` has governance assumptions section - PASS (lines 9-18)
- **Test 2**: `second-brain-query/SKILL.md` aligned with structured-field rules - PASS (lines 16-25 Governance alignment section)
- **Test 3**: Hierarchical tag matching preserved - PASS (query-vault.md line 47, query-skill lines 58-59)
- **Test 4**: No retrieval doc reintroduces tags as primary carrier - PASS (explicitly contradicted in multiple places)

## TDD Compliance

### Red Phase

The `verify-step.sh` script defines 37 assertions across 4 TDD batches, establishing clear test criteria for all required behaviors before implementation was considered complete.

### Green Phase

All 37 assertions pass per `implementation-result.md` (37/37). All implemented files contain the required content:
- `metadata-conventions.md`: Structured fields section, tag governance, updated templates
- `metadata-field-matrix.md`: Country/province/city rows with `G` legend
- `metadata-alias-registry.md`: Three-section structure with distinct location fields
- `lint-vault.md`: Governance checks (lines 23-25, 30-38)
- `second-brain-lint/SKILL.md`: Governance checks section
- `query-vault.md`: Governance assumptions section
- `second-brain-query/SKILL.md`: Governance alignment section

### Refactor Phase

Implementation remains doc-first and advisory-first as specified. No over-engineering. Clear separation of concerns between policy document (`metadata-conventions.md`), operational matrix (`metadata-field-matrix.md`), and registry (`metadata-alias-registry.md`).

## Issues

None identified. All in-scope items covered, all out-of-scope items avoided, all constraints respected, all TDD batches satisfied.

## Anti-patterns Detected

None. Implementation correctly:
- Avoids auto-rewrite temptation
- Avoids hard-blocking enforcement
- Maintains backward compatibility note for `location` field without making it primary
- Keeps governance focused on specific surfaces rather than arbitrary expansion

## Verdict

**correct**

All requirement in-scope items are implemented. All locked constraints are respected. All TDD batch tests pass. No out-of-scope items were incorrectly included. No in-scope items were missed. The implementation correctly follows the doc-first, advisory-first approach specified in the execution constraints.

## Phase Handoff Note

No archived context used. Review performed directly on live step folder artifacts.

## Planning-Memory Follow-up Note

None required. Step is complete and ready for implementation key addition to `branch-phase.toml`.