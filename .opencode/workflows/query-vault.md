# Workflow: Query Vault

## Goal

Answer a user question from the vault with the right confidence level and provenance.

This workflow is enforced by a retrieval hook plus a SQLite-backed shortlist tool with a structured retrieval decision chain.

## Canonical Contract

Treat `.opencode/docs/sqlite-retrieval-contract.md` as the canonical reference for:

- the SQLite database path
- the `notes` and `properties` schema
- retrieval-relevant indexed fields
- the required first-pass wrapper entrypoint: `vault_index_search`

This workflow remains the source of truth for retrieval behavior, decision order, thresholds, and fallback policy.

## Governance assumptions

This workflow relies on the metadata governance policy defined in `.opencode/rules/metadata-conventions.md`:

- **Structured fields are the primary retrieval carriers**: time semantics are in `created`, `updated`, `start_date`, and `end_date`; location semantics are in `country`, `province`, and `city`. Tags are a retrieval aid, not the primary carrier for time or location.
- **Tags follow the alias registry**: canonical tag values and accepted aliases are defined in `.opencode/alias-registry.md`. The alias registry is the governance reference for human review and lint checks. Alias-aware query-time expansion (matching notes by alias as well as canonical value) is a future enhancement; the current Stage 1 retrieval flow reads canonical values directly from the index.
- **Location values follow the alias registry**: `country`, `province`, and `city` values may have aliases defined in the registry. Alias-aware location matching at query time is a future enhancement; the current Stage 1 retrieval flow matches location values as stored in the index. The alias registry serves as the governance reference for human review and normalization guidance.
- **`canonical_topic` is optional and governed only where retrieval depends on it**: not all note families require `canonical_topic`; it is governed by the alias registry only when a workflow materially depends on it.
- **Hierarchical tags remain valid**: `topic/*`, `state/*`, `source/*`, and `role/*` forms are supported by the SQLite retrieval layer.
- **China default is metadata-level**: when a note's `country` field is absent, retrieval treats it as `中国` (canonical for China) at the metadata/index layer, not at query time.

## Inputs

- user question
- optional topic, note, project, or file scope
- optional structured constraints: tags, time range, location

## Retrieval Decision Chain

The retrieval decision chain is the core of vault query behavior. It proceeds through six stages in order, beginning with constraint extraction before any SQLite shortlist execution.

### Stage 0: Constraint Extraction

Before any Stage 1 shortlist execution, the retrieval flow must perform a constraint-extraction pass on the user request. This stage is mandatory and must not be skipped.

**Extraction priority order (frozen):**

1. **time** - evaluate first when the request contains a usable date or time phrase
2. **location** - evaluate second when the request contains a usable place phrase
3. **tags** - evaluate third for canonical tag mappings and low-risk topic-to-tag mappings
4. **extraFields** - evaluate last for the allowlisted set of additional structured fields (`duration`, `num_participant`, `organizer`, `host`, `participants`)

**Extraction rules:**

- Map user phrases into the normalized constraint payload defined in `.opencode/docs/sqlite-retrieval-contract.md`.
- Record which phrases were matched literally, by alias, or by low-risk inference.
- Use the time-phrase alias tables in `.opencode/docs/sqlite-retrieval-contract.md` for common time normalization.
- Use canonical location and tag values from `.opencode/alias-registry.md` for alias-backed mappings.
- Empty or unusable structured extraction does not authorize an unbounded structured query. If no usable structured clues are found, the live wrapper falls back to text search (`mode: "text-fallback"`) rather than returning an empty structured shortlist. Proceed to progressive relaxation if the text fallback is insufficient.
- Do not use title-first or body-first search as a substitute for applying usable structured clues through SQLite.
- Low-risk inference for tags is allowed only for obvious stable topic mappings that already align with retrieval and governance language. Inferred tag mappings must be recorded separately from literal or alias-based mappings in the diagnostic trace.
- Extra fields may be emitted only when the request clearly names that field or an unambiguous synonym. The first version does not introduce fuzzy person-name normalization.
- Do not expand the extra-field allowlist beyond `duration`, `num_participant`, `organizer`, `host`, and `participants` in the first version.
- No constraint family outside the four ordered families may be emitted in the first version.

**Time-mode selection:**

- Choose `timeMode` (`event` or `note`) during extraction, before SQLite query construction.
- Use `event` mode when the request is about when an activity happened or will happen.
- Use `note` mode only when the request explicitly asks about note creation or update chronology.
- Event-time requests must not be satisfied with `created` or `updated`.

**Location normalization:**

- Normalize location phrases only into `country`, `province`, and `city`.
- Preserve the metadata-level China default when a note omits `country`. Do not invent a query-time `country = 中国` filter when the user did not ask for a country.
- When both province and city can be extracted, emit both constraints.

**Diagnostics:**

The extraction pass produces caller-side extraction artifacts: a `structuredTrace` array recording each extracted constraint with its family, field, matched user phrase, normalized value, and normalization source (`literal`, `alias`, or `inference`), plus the normalized constraint values and matched phrases to be passed to the wrapper. Note: `structuredTrace` is a planned input field not yet accepted by the live wrapper; the extraction stage should produce it so it is ready when the wrapper is updated. Execution diagnostics (`appliedConstraints`, `candidateCounts`, `fallbackReason`, `inferredConstraints`, `rejectedStructuredHints`) are response-side data produced exclusively by the wrapper after shortlist execution; they are defined in the wrapper response contract and must not be confused with extraction-stage outputs.

### Stage 1: Structured SQLite Shortlist

1. Use `vault_index_search` as the required first-pass wrapper for structured SQLite shortlist generation.
2. Pass the normalized constraint payload from Stage 0 extraction to `vault_index_search` through the current request shape defined in `.opencode/docs/sqlite-retrieval-contract.md`. Wrap scalar location values as single-element arrays to match the wrapper's array-valued input (e.g., `country: "中国"` becomes `country: ["中国"]`).
3. Build the shortlist from structured frontmatter constraints as defined in the contract:
   - **Time**: filter using `timeMode`, `start`, and `end` from the extracted time constraints. Use event-time filtering (`start_date`, `end_date`) for dated activities. Use note-timestamp filtering (`created`, `updated`) only for explicit note-chronology questions. Do not satisfy event-time requests with note timestamps.
   - **Tags**: exact match or hierarchical match (e.g., `topic/*` matches `topic/subtopic`).
   - **Location**: filter on `country`, `province`, `city` (array-valued in the current wrapper) from the extracted location constraints, preserving the documented metadata-level China default behavior.
   - **Extra fields**: filter on allowlisted extra fields (`duration`, `num_participant`, `organizer`, `host`, `participants`) only when extracted in Stage 0. Note: `extraFields` is planned contract work not yet accepted by the live wrapper.
4. Execute the shortlist against the SQLite index defined in the contract document.
5. Return a shortlist of candidate note paths with their `description` values. The current wrapper returns a text-formatted shortlist; structured diagnostics are planned (see wrapper response contract in `.opencode/docs/sqlite-retrieval-contract.md`).

**Stage 1 execution contract:**

- Structured constraints must be enforced inside SQLite, not by reading a broad result set and manually filtering afterward.
- Structured constraints must come from the Stage 0 extraction pass, passed through the current request shape defined in `.opencode/docs/sqlite-retrieval-contract.md`. Do not use ad hoc raw SQL generation.
- Mixed constraints must be combined as an intersection. Use `JOIN`, `EXISTS`, `GROUP BY ... HAVING`, or an equivalent SQL pattern that guarantees one candidate note satisfies every active constraint.
- Determine the time-filter mode before building the shortlist query. Use event-time filtering for dated activities such as training, meetings, talks, or trips. Use note-timestamp filtering only when the user is asking about note creation or update time.
- Do not substitute path heuristics such as `n.path LIKE '%2025%'` for time filtering when a time constraint is present.
- Do not use `OR` to combine unrelated tag, time, and location constraint families in the same shortlist pass. `OR` is only valid within a single family when expressing alternatives, such as multiple accepted time keys.
- If a user asks for `2025年在江苏的培训`, the shortlist query must apply the training tag, the 2025 time window, and the Jiangsu location constraint in the same SQL pass before any note reads.

**Constraint rules:**

- Constraint extraction must run before Stage 1 shortlist (Stage 0). All constraints passed to `vault_index_search` must follow the current request shape from `.opencode/docs/sqlite-retrieval-contract.md`. Scalar extraction outputs must be wrapped as single-element arrays for location fields.
- Mixed constraints are intersected: a candidate must satisfy all provided tag, time, location, and extra-field constraints simultaneously.
- An empty constraint set causes the live wrapper to fall back to text search (`mode: "text-fallback"`), not to return an empty structured shortlist. Do not issue unbounded queries against the index.
- Usable structured clues must be applied through SQLite before title-first or body-first search.
- Do not use freeform title or body keyword search as a substitute for structured tag extraction.

**Tag matching detail:**

- Exact match: `tags = 'edu/child'` returns notes tagged exactly `edu/child`.
- Hierarchical match: `tags LIKE 'topic/%'` returns notes tagged with `topic/` and any subtopic beneath it.

**Time matching detail:**

- Event-time queries: use `start_date` and `end_date` when the user is asking when something happened. A note matches a requested time window when its event interval overlaps that window (i.e., `start_date <= window.end AND end_date >= window.start`). For single-day events, `start_date` and `end_date` may be the same day.
- Note-timestamp queries: use `created` and `updated` only when the user explicitly asks about note creation time, note update time, or other document-management chronology.
- Do not satisfy an event-time query with `created` or `updated` merely because those fields also fall inside the requested window.
- Normalize year, half-year, month, and explicit date-range phrases into inclusive `[start, end]` windows using the time-phrase alias tables in `.opencode/docs/sqlite-retrieval-contract.md`.
- Use `value_date` from the `properties` table for all time filtering.

**Location matching detail:**

- Use `value_text` column in the `properties` table with `key IN ('country', 'province', 'city')`.
- Normalize location phrases only into `country`, `province`, and `city` using canonical values from `.opencode/alias-registry.md`.
- When a note's `country` field is absent in the index, treat it as `中国` for retrieval purposes. Do not inject `country = 中国` into the query when the user omits a country; the default applies at the metadata/index level so that notes without an explicit `country` are still matched.
- When both `province` and `city` can be extracted from the user request, emit both constraints.

**SQL implementation patterns:**

- `query-vault.md` is the source of truth for structured shortlist behavior. Use `.opencode/docs/sqlite-retrieval-contract.md` for schema and wrapper contract details instead of restating them elsewhere.
- Preferred pattern: one `EXISTS` block per active constraint family so each family stays independently testable and the whole query remains an intersection.
- Acceptable alternative: `JOIN` once per active family, with a final `SELECT DISTINCT n.path`.
- For answer-generation reads, run a shortlist query first, then read only the shortlisted notes.

Example shortlist for `2025年在江苏的培训`:

```sql
SELECT DISTINCT n.path
FROM notes n
WHERE EXISTS (
  SELECT 1
  FROM properties pt
  WHERE pt.note_id = n.id
    AND pt.key = 'tags'
    AND pt.value_text = 'topic/training'
)
AND EXISTS (
  SELECT 1
  FROM properties pp
  WHERE pp.note_id = n.id
    AND pp.key = 'province'
    AND pp.value_text = '江苏省'
)
AND EXISTS (
  SELECT 1
  FROM properties ps
  WHERE ps.note_id = n.id
    AND ps.key = 'start_date'
    AND ps.value_date <= '2025-12-31'
)
AND EXISTS (
  SELECT 1
  FROM properties pe
  WHERE pe.note_id = n.id
    AND pe.key = 'end_date'
    AND pe.value_date >= '2025-01-01'
);
```

Example anti-pattern that must not be used for structured shortlist generation:

```sql
SELECT n.path, p.key, p.value_text, p.value_date
FROM notes n
JOIN properties p ON n.id = p.note_id
WHERE p.value_text LIKE '%培训%'
   OR p.value_date BETWEEN '2025-01-01' AND '2025-12-31'
   OR n.path LIKE '%2025%';
```

### Stage 2: Candidate Count Decision

Based on the shortlist size after Stage 1, choose the next action:

| Candidate Count | Action |
|-----------------|--------|
| 0 | Skip to Progressive Relaxation (Stage 3) |
| 1-19 | Read all candidates directly (Stage 4) |
| 20-100 | Description-based reranking (Stage 2.5) then read top candidates (Stage 4) |
| 101+ | Apply stricter structural narrowing (repeat Stage 1 with tighter constraints) or proceed to Progressive Relaxation (Stage 3) |

**Frozen thresholds:**

- Direct read threshold: <= 19 candidates
- Description rerank threshold: 20-100 candidates
- Structural narrowing threshold: > 100 candidates

### Stage 2.5: Description-Based Reranking

When the shortlist contains 20-100 candidates:

1. Score each candidate by description relevance to the query. Use the `description` field from the `properties` table (key = `description`).
2. Rank candidates by description score in descending order.
3. Read the top N candidates where N = min(20, total candidate count).
4. If the top N candidates are insufficient to answer the query, fall back to Progressive Relaxation (Stage 3).

**Frozen threshold:**

- Top N after reranking: 20

### Stage 3: Progressive Relaxation

When the structured shortlist is empty or Stage 2.5 is insufficient, relax constraints in this fixed priority order:

1. **Remove low-value tag constraints first**: Drop tags that are least selective (i.e., tags that match the largest number of notes in the vault, or tags that are least specific to the query).
2. **Broaden time constraints second**: Expand date ranges. First extend by 30 days on each side of the current range. If still insufficient, extend by 90 days on each side.
3. **Broaden location constraints third**: Remove `city` first, then remove `province`, keeping `country` as the last location constraint. When the metadata-level `中国` default was applied (i.e., the note had no explicit `country`), retain that default until this step.
4. **Remove all structured constraints**: Fall back to unstructured pass.

After each relaxation step, retry Stage 1 with the relaxed constraints. Evaluate the candidate count decision (Stage 2) again.

**Round budget mapping (3 rounds max):**

The relaxation order is fixed as tags -> time -> location -> unstructured, but the cap of 3 rounds means `full_constraint_removal` is the action of round 3 (the last round before Stage 5). Concretely:

- **Round 1**: Remove low-value tag constraints.
- **Round 2**: Broaden time constraints (30 days, then 90 days).
- **Round 3**: Broaden location constraints (remove `city`, then `province`, keep `country`) **OR** remove all structured constraints (`full_constraint_removal`) if location constraints are not applicable or have already been fully relaxed. This is the last relaxation attempt before Stage 5.

After 3 rounds without sufficient results, proceed to Stage 5 (broader text retrieval).

**Relaxation logging (Fallback Visibility):**

Each relaxation step must log or expose:

- Which relaxation step triggered: `tag_removal`, `time_broadening`, `location_broadening`, or `full_constraint_removal`.
- How many candidates were found after the relaxed pass.
- The specific constraints that were relaxed (e.g., which tags were dropped, how much the time range was broadened).

### Stage 4: Full Note Read

Read the full content of the selected candidates and generate the answer.

Apply folder priority when interpreting candidates:

1. `workbook/wiki/` first
2. `workbook/output/` second
3. `workbook/resources/` third
4. `workbook/brainstorm/` fourth
5. `workbook/my-work/` fifth

Prefer `workbook/wiki/index.md`, `workbook/output/index.md`, and relevant `workbook/wiki/` or `workbook/output/` pages for stable answers when they appear in the shortlist.

Pull `workbook/resources/` for supporting evidence and provenance.

Use `workbook/brainstorm/` only for tentative synthesis or future directions.

Use `workbook/my-work/` only to understand current context and user intent.

### Stage 5: Broader Text Retrieval (Optional Fallback)

If progressive relaxation exhausts its 3 rounds without finding sufficient information:

1. Use `grep` or FTS (when available) as a broader text-based pass.
2. This is a later fallback, not the primary retrieval path.
3. When this fallback is used, mark the answer confidence as lower and explicitly state: "Retrieval was relaxed to an unstructured text pass; answer confidence may be reduced."

## Integration Topology

```
User Query
     |
     v
[Stage 0: Constraint Extraction]
     |
     +-- identify structured phrases and map them to normalized constraints
     +-- record which phrases were matched literally, by alias, or by low-risk inference
     |
     v
[Stage 1: Structured SQLite Shortlist]
     |
     +-- receive normalized constraints through the structured wrapper contract
     +-- execute Stage 1 SQLite shortlist with intersection semantics
     |
     v
[Stage 2: Candidate Count Decision]
    |
    +-- 0 candidates -----> [Stage 3: Progressive Relaxation] --> retry Stage 1
    |
    +-- 1-19 candidates --> [Stage 4: Full Note Read]
    |
    +-- 20-100 candidates -> [Stage 2.5: Description Reranking] --> [Stage 4: Full Note Read]
    |                                                   |
    |                                                   +-- insufficient --> [Stage 3]
    |
    +-- 101+ candidates --> [Stricter Stage 1 or Stage 3: Progressive Relaxation]
    |
    v
[Stage 5: Broader Text Retrieval] (after 3 relaxation rounds exhausted)
```

## Frozen Thresholds Summary

| Threshold | Value | Rationale |
|-----------|-------|-----------|
| Direct read threshold | <= 19 candidates | Small enough to read all without reranking |
| Description rerank threshold | 20-100 candidates | Too many for direct read, manageable for description scoring |
| Structural narrowing threshold | > 100 candidates | Too many candidates; need stricter filtering |
| Max relaxation rounds | 3 | Prevent infinite relaxation loops |
| Top N after reranking | 20 | Balance between recall and efficiency |
| Time broadening increment | 30 days, then 90 days | Reasonable expansion for date ranges |

## Skills

- load `second-brain-query`

## Outputs

- concise answer
- confidence label
- note or folder provenance when practical
- fallback reason when retrieval was relaxed (which relaxation step, how many candidates found, why confidence may be lower)
- acknowledgement when retrieval had to expand beyond the SQLite shortlist

## Invariants

- Constraint extraction (Stage 0) must run before any SQLite shortlist execution
- SQLite remains the first retrieval layer when structured clues are usable
- Frontmatter remains the source of truth; SQLite is a derived retrieval index
- Structured constraints are applied as intersected families inside SQLite, not as broad post-filtering after a loose search
- Progressive relaxation order is fixed: tags -> time -> location -> unstructured. With a 3-round cap, round 3 is either location broadening or full constraint removal (the last resort before Stage 5).
- Fallback behavior is inspectable and logged
- Location defaults to `中国` at the metadata/index level when a note's `country` field is absent; not injected at query time
- Empty constraint set produces no unbounded query
- Constraint family priority is fixed: time/date -> location -> tags/topic -> allowlisted extra fields
- Time mode is chosen at extraction time, before query construction
