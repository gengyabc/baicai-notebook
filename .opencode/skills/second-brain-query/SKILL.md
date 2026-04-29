---
name: second-brain-query
description: Answer vault questions using folder-aware confidence and provenance
compatibility: opencode
---
## What I do

- Answer vault questions by following the structured retrieval decision chain defined in `query-vault.md`
- Start with `vault_index_search` against `.opencode/frontmatter-index.sqlite` as the first retrieval layer
- Apply frontmatter-structured filtering (tags, time, location) before description-based reranking or unstructured fallback
- Read `workbook/wiki/index.md` first and answer from `workbook/wiki/` when possible
- Pull supporting evidence from `workbook/resources/`
- Use `workbook/brainstorm/` only for tentative synthesis
- Call out uncertainty, conflict, and support level clearly

## Governance alignment

Retrieval follows the metadata governance policy from `.opencode/rules/metadata-conventions.md`:

- Time and location are retrieved via dedicated structured fields (`created`, `updated`, `start_date`, `end_date`, `country`, `province`, `city`), not via tags. Tags are a retrieval aid, not the primary carrier for time or location semantics.
- Tag values are governed by the alias registry at `docs/metadata-alias-registry.md`, which defines canonical values and accepted aliases for human review and lint checks. Alias-aware query-time expansion is a future enhancement; the current retrieval flow matches canonical values as stored in the index.
- Location values (`country`, `province`, `city`) are governed by the alias registry, which serves as the governance reference for human review and normalization guidance. Alias-aware location matching at query time is a future enhancement; the current retrieval flow matches values as stored in the index.
- `canonical_topic` is governed by the alias registry only where a retrieval workflow materially depends on it; it is not universally required.
- Hierarchical tags (`topic/*`, `state/*`, `source/*`, `role/*`) remain valid retrieval aids.
- The China default for missing `country` values is applied at the metadata/index level, not at query time.

## When to use me

Use this for vault Q&A that needs confidence-aware retrieval and provenance.

## Retrieval Decision Chain

Follow the five-stage retrieval decision chain from `query-vault.md`:

1. **Stage 1 - Structured SQLite Shortlist**: Build a frontmatter query from tags, time, and location constraints. Execute against `notes` and `properties` tables.
2. **Stage 2 - Candidate Count Decision**: Route based on shortlist size using frozen thresholds.
3. **Stage 2.5 - Description Reranking**: When shortlist is 20-100, score by description relevance and read top N.
4. **Stage 3 - Progressive Relaxation**: When shortlist is empty or insufficient, relax constraints in order: tags -> time -> location -> unstructured. The cap of 3 rounds means `full_constraint_removal` is the action of round 3 (the last round before Stage 5). Concretely:
   - **Round 1**: Remove low-value tag constraints.
   - **Round 2**: Broaden time constraints (30 days, then 90 days).
   - **Round 3**: Broaden location constraints (remove `city`, then `province`, keep `country`) **OR** remove all structured constraints (`full_constraint_removal`) if location constraints are not applicable or already fully relaxed. This is the last relaxation attempt before Stage 5.
5. **Stage 4 - Full Note Read**: Read the full content of selected candidates and generate the answer. Apply folder priority: wiki/ first, output/ second, resources/ third, brainstorm/ fourth, my-work/ fifth.
6. **Stage 5 - Broader Text Retrieval**: After 3 relaxation rounds exhausted, fall back to grep or FTS. Mark confidence lower.

## Frozen Thresholds

| Threshold | Value |
|-----------|-------|
| Direct read | <= 19 candidates |
| Description rerank | 20-100 candidates |
| Structural narrowing | > 100 candidates |
| Max relaxation rounds | 3 |
| Top N after reranking | 20 |
| Time broadening | 30 days, then 90 days |

## Constraint Rules

- Tags: exact or hierarchical match (`topic/*` matches `topic/subtopic`)
- Time: range filters on `created`, `updated`, `start_date`, `end_date`
- Location: filter on `country`, `province`, `city`; when a note's `country` field is absent, it defaults to China at the metadata/index level. Do not inject `country = China` into the query when the user omits a country.
- Mixed constraints are intersected; empty constraint set returns empty shortlist
- Progressive relaxation order is fixed: tags -> time -> location -> unstructured. With a 3-round cap, round 3 is either location broadening or full constraint removal (the last resort before Stage 5).

## Fallback Visibility

When fallback happens, expose:

- Which relaxation step triggered (`tag_removal`, `time_broadening`, `location_broadening`, `full_constraint_removal`)
- How many candidates were found after each pass
- Why the final answer may have lower confidence

## Constraints

- separate confirmed facts from hypotheses
- prefer traceability over fluency
- frontmatter is the source of truth; SQLite is a derived index
- never issue unbounded queries when constraints are empty
