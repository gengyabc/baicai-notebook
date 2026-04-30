---
name: second-brain-query
description: Answer vault questions using folder-aware confidence and provenance
compatibility: opencode
---
## What I do

- Answer vault questions by following the structured retrieval decision chain defined in `query-vault.md`
- Perform constraint extraction (Stage 0) before any SQLite shortlist, mapping user phrases to the normalized constraint payload
- Start with `vault_index_search` against `.opencode/frontmatter-index.sqlite` as the first retrieval layer, passing structured constraints through the wrapper contract
- Apply frontmatter-structured filtering (tags, time, location, allowlisted extra fields) before description-based reranking or unstructured fallback
- Read `workbook/wiki/index.md` first and answer from `workbook/wiki/` when possible
- Pull supporting evidence from `workbook/resources/`
- Use `workbook/brainstorm/` only for tentative synthesis
- Call out uncertainty, conflict, and support level clearly

## Governance alignment

Retrieval follows the metadata governance policy from `.opencode/rules/metadata-conventions.md`:

- Time and location are retrieved via dedicated structured fields (`created`, `updated`, `start_date`, `end_date`, `country`, `province`, `city`), not via tags. Tags are a retrieval aid, not the primary carrier for time or location semantics.
- Tag values are governed by the alias registry at `.opencode/alias-registry.md`, which defines canonical values and accepted aliases for human review and lint checks. Alias-aware query-time expansion is a future enhancement; the current retrieval flow matches canonical values as stored in the index.
- Location values (`country`, `province`, `city`) are governed by the alias registry, which serves as the governance reference for human review and normalization guidance. Alias-aware location matching at query time is a future enhancement; the current retrieval flow matches values as stored in the index.
- `canonical_topic` is governed by the alias registry only where a retrieval workflow materially depends on it; it is not universally required.
- Hierarchical tags (`topic/*`, `state/*`, `source/*`, `role/*`) remain valid retrieval aids.
- The China default for missing `country` values is applied at the metadata/index level, not at query time.

## When to use me

Use this for vault Q&A that needs confidence-aware retrieval and provenance.

## Retrieval Decision Chain

Follow the six-stage retrieval decision chain from `query-vault.md`:

1. **Stage 0 - Constraint Extraction**: Before any SQLite shortlist, extract structured constraints from the user request. Map user phrases to the normalized constraint payload defined in `.opencode/docs/sqlite-retrieval-contract.md`. Follow the frozen extraction priority: time -> location -> tags -> extraFields. Record each extraction in the `structuredTrace` with family, field, matched phrase, normalized value, and source (`literal`, `alias`, or `inference`). Note: `structuredTrace` is a planned input field; produce it during extraction so it is ready when the wrapper is updated.
2. **Stage 1 - Structured SQLite Shortlist**: Pass the normalized constraint payload to `vault_index_search` using the current request shape (location fields are array-valued; wrap scalar extraction outputs as single-element arrays). Build a frontmatter query from time, location, tags, and allowlisted extra-field constraints. Note: `extraFields` is planned contract work not yet accepted by the live wrapper. Execute against `notes` and `properties` tables with intersection semantics.
3. **Stage 2 - Candidate Count Decision**: Route based on shortlist size using frozen thresholds.
4. **Stage 2.5 - Description Reranking**: When shortlist is 20-100, score by description relevance and read top N.
5. **Stage 3 - Progressive Relaxation**: When shortlist is empty or insufficient, relax constraints in order: tags -> time -> location -> unstructured. The cap of 3 rounds means `full_constraint_removal` is the action of round 3 (the last round before Stage 5). Concretely:
   - **Round 1**: Remove low-value tag constraints.
   - **Round 2**: Broaden time constraints (30 days, then 90 days).
   - **Round 3**: Broaden location constraints (remove `city`, then `province`, keep `country`) **OR** remove all structured constraints (`full_constraint_removal`) if location constraints are not applicable or already fully relaxed. This is the last relaxation attempt before Stage 5.
6. **Stage 4 - Full Note Read**: Read the full content of selected candidates and generate the answer. Apply folder priority: wiki/ first, output/ second, resources/ third, brainstorm/ fourth, my-work/ fifth.
7. **Stage 5 - Broader Text Retrieval**: After 3 relaxation rounds exhausted, fall back to grep or FTS. Mark confidence lower.

## Frozen Thresholds

| Threshold | Value |
|-----------|-------|
| Direct read | <= 19 candidates |
| Description rerank | 20-100 candidates |
| Structural narrowing | > 100 candidates |
| Max relaxation rounds | 3 |
| Top N after reranking | 20 |
| Time broadening | 30 days, then 90 days |

## Constraint Extraction (Stage 0)

Before running any SQLite shortlist, perform constraint extraction:

### Extraction priority order (frozen)

1. **time** - evaluate first when the request contains a usable date or time phrase
2. **location** - evaluate second when the request contains a usable place phrase
3. **tags** - evaluate third for canonical tag mappings and low-risk topic-to-tag mappings
4. **extraFields** - evaluate last for the allowlisted set of additional structured fields

### Time extraction

- Choose `timeMode` (`event` or `note`) during extraction, before query construction.
- Use `event` mode when the request is about when an activity happened or will happen.
- Use `note` mode only when the request explicitly asks about note creation or update chronology.
- Normalize year, half-year, month, and explicit date-range phrases into inclusive `[start, end]` windows using the time-phrase alias tables in `.opencode/docs/sqlite-retrieval-contract.md`.
- Event-time requests must not be satisfied with `created` or `updated`.

### Location extraction

- Normalize location phrases only into `country`, `province`, and `city`.
- Use canonical values from `.opencode/alias-registry.md` for alias-backed mappings.
- When both `province` and `city` can be extracted, emit both constraints.
- Do not inject `country = 中国` into the query when the user omitted a country. The metadata-level default applies at the index layer.

### Tag and topic extraction

- Prefer explicit canonical tag mappings from `.opencode/alias-registry.md` first.
- Allow low-risk inference only for obvious stable topic mappings that already align with retrieval and governance language.
- Record inferred tag mappings with `source: "inference"` in the `structuredTrace`, separate from `literal` or `alias` sources.
- Do not use freeform title or body keywords as substitute structured tags.

### Extra-field extraction

- The first-version allowlist is frozen: `duration`, `num_participant`, `organizer`, `host`, `participants`.
- These fields may be emitted only when the request clearly names that field or an unambiguous synonym.
- The first version does not introduce fuzzy person-name normalization for `organizer`, `host`, or `participants`.
- No field outside this allowlist may be emitted in the first version.

### Diagnostics

The extraction pass (Stage 0) produces caller-side extraction artifacts only: a `structuredTrace` array recording each extracted constraint with its family, field, matched user phrase, normalized value, and normalization source (`literal`, `alias`, or `inference`). It also produces the normalized constraint values and matched phrases that will be passed to the wrapper. Note: `structuredTrace` is a planned input field not yet accepted by the live wrapper; produce it during extraction so it is ready when the wrapper is updated. Execution diagnostics such as `appliedConstraints`, `inferredConstraints`, `rejectedStructuredHints`, `candidateCounts`, and `fallbackReason` are response-side data produced exclusively by the wrapper after shortlist execution; they are defined in the wrapper response contract and must not be confused with extraction-stage outputs. The current wrapper does not yet expose these as structured fields.

## Constraint Rules

- Constraint extraction (Stage 0) must run before any Stage 1 shortlist
- Tags: exact or hierarchical match (`topic/*` matches `topic/subtopic`)
- Time: choose `timeMode` during extraction. Use `start_date` and `end_date` for event-time questions, and use `created` and `updated` only for explicit note-timestamp questions.
- Location: filter on `country`, `province`, `city`; when a note's `country` field is absent, it defaults to `中国` at the metadata/index level. Do not inject `country = 中国` into the query when the user omits a country.
- Extra fields: filter on allowlisted fields only when extracted in Stage 0
- Mixed constraints are intersected; an empty constraint set causes the live wrapper to fall back to text search (`mode: "text-fallback"`) rather than returning an empty structured shortlist
- Progressive relaxation order is fixed: tags -> time -> location -> unstructured. With a 3-round cap, round 3 is either location broadening or full constraint removal (the last resort before Stage 5).

## Structured Query Contract

- Translate user questions into explicit structured constraints using the Stage 0 extraction process before running SQLite. For example, `2025年在江苏的培训` maps to `tags = topic/training`, a 2025 event-date window, and `province = 江苏省`.
- Pass the normalized constraint payload to `vault_index_search` using the current request shape defined in `.opencode/docs/sqlite-retrieval-contract.md`. Wrap scalar location values as single-element arrays to match the wrapper's array-valued input. Do not use ad hoc raw SQL generation.
- Enforce each active constraint family inside the SQLite shortlist query. Do not read a broad result set and manually filter it in the model.
- Combine time, location, tag, and extra-field families with intersection semantics, not broad `OR` semantics.
- Do not use note-path hints such as `path LIKE '%2025%'` as a substitute for structured time filtering when the user asked for a time range.
- Do not use freeform title or body keyword search as a substitute for structured tag extraction.
- For event-like notes, treat `start_date` and `end_date` as mandatory when those fields exist. Do not satisfy event-time questions with `created` or `updated`.
- Only after the structured shortlist is produced may you read note contents to answer the question.
- Do not restate or improvise an alternative SQL recipe here. Reuse the Stage 1 execution contract and SQL implementation patterns from `query-vault.md`.

## Fallback Visibility

When fallback happens, expose:

- Which relaxation step triggered (`tag_removal`, `time_broadening`, `location_broadening`, `full_constraint_removal`)
- How many candidates were found after each pass
- Why the final answer may have lower confidence
- The `fallbackReason` from the wrapper response diagnostics (planned; not yet exposed by the current wrapper)

## Constraints

- separate confirmed facts from hypotheses
- prefer traceability over fluency
- frontmatter is the source of truth; SQLite is a derived index
- never issue unbounded queries when constraints are empty
- constraint extraction must run before any SQLite shortlist
- constraint family priority is frozen: time -> location -> tags -> extraFields
