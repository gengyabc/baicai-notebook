# Workflow: Query Vault

## Goal

Answer a user question from the vault with the right confidence level and provenance.

This workflow is enforced by a retrieval hook plus a SQLite-backed shortlist tool with a structured retrieval decision chain.

## Inputs

- user question
- optional topic, note, project, or file scope
- optional structured constraints: tags, time range, location

## Retrieval Decision Chain

The retrieval decision chain is the core of vault query behavior. It proceeds through five stages in order.

### Stage 1: Structured SQLite Shortlist

1. Build a SQLite query from structured frontmatter constraints:
   - **Tags**: exact match or hierarchical match (e.g., `topic/*` matches `topic/subtopic`). Tags are stored in the `properties` table with `key = 'tags'`.
   - **Time fields**: range filters on `created`, `updated`, `start_date`, `end_date`. These are stored as `value_date` in the `properties` table.
   - **Location fields**: filter on `country`, `province`, `city`. When a note's `country` field is absent in the index, treat it as `China` for retrieval purposes. Do not inject `country = China` into the query when the user does not specify a country; the default is applied at the metadata/index level when matching against notes that lack an explicit `country` value.
2. Execute query against the `notes` and `properties` tables in `.opencode/frontmatter-index.sqlite`.
3. Return a shortlist of candidate note paths with their `description` values.

**Constraint rules:**

- Mixed constraints are intersected: a candidate must satisfy all provided tag, time, and location constraints simultaneously.
- An empty constraint set returns an empty shortlist. Do not issue unbounded queries against the index.

**Tag matching detail:**

- Exact match: `tags = 'edu/child'` returns notes tagged exactly `edu/child`.
- Hierarchical match: `tags LIKE 'topic/%'` returns notes tagged with `topic/` and any subtopic beneath it.

**Time matching detail:**

- Use `value_date` column in the `properties` table with `key IN ('created', 'updated', 'start_date', 'end_date')`.
- Apply range filtering: `value_date >= ? AND value_date <= ?`.

**Location matching detail:**

- Use `value_text` column in the `properties` table with `key IN ('country', 'province', 'city')`.
- When a note's `country` field is absent in the index, treat it as `China` for retrieval purposes. Do not inject `country = China` into the query when the user omits a country; the default applies at the metadata/index level so that notes without an explicit `country` are still matched.

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
3. **Broaden location constraints third**: Remove `city` first, then remove `province`, keeping `country` as the last location constraint. When the metadata-level China default was applied (i.e., the note had no explicit `country`), retain that default until this step.
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
[Stage 1: Structured SQLite Shortlist]
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

- SQLite remains the first retrieval layer
- Frontmatter remains the source of truth; SQLite is a derived retrieval index
- Progressive relaxation order is fixed: tags -> time -> location -> unstructured. With a 3-round cap, round 3 is either location broadening or full constraint removal (the last resort before Stage 5).
- Fallback behavior is inspectable and logged
- Location defaults to China at the metadata/index level when a note's `country` field is absent; not injected at query time
- Empty constraint set produces no unbounded query
