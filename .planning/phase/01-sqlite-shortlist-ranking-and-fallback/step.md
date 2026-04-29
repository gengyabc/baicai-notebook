---
step-key: sqlite-shortlist-ranking-and-fallback
step-version: 1
requirement-version: 1
---

# SQLite Shortlist Ranking and Fallback

---

## Objective

Make vault retrieval meaningfully more precise and efficient by turning SQLite from a weak shortlist into a structured retrieval gate with controlled fallback behavior.

---

## Problem Statement

The current retrieval flow can query the SQLite index, but it does not yet fully exploit structured frontmatter or use description-driven candidate narrowing. This causes too many low-value candidates, unnecessary full-note reads, and weak control over what happens when the first structured pass fails to find the requested information.

---

## Locked constraints

- SQLite frontmatter filtering remains the first retrieval layer for vault search
- Frontmatter stays the source of truth; SQLite acts as a derived retrieval index
- Time is modeled primarily through dedicated fields: `created`, `updated`, `start_date`, `end_date`
- Location is modeled primarily through dedicated fields: `country`, `province`, `city`, with `country` defaulting to China when absent
- `description` is for candidate narrowing and reranking, not for replacing full document reads in general
- Progressive relaxation must happen before broadening to wider text retrieval whenever the indexed structured pass is insufficient
- The requirement must remain compatible with a future separate governance step for metadata normalization and tag discipline

---

## Scope

### In

- Define a frontmatter-first retrieval decision chain for SQLite-backed vault search
- Treat structured constraints such as `tags`, time fields, and location fields as primary shortlist inputs
- Use `description` as a second-stage candidate reranking and note-opening decision input
- Define progressive fallback behavior when the first structured shortlist is empty or insufficient
- Clarify how structured filtering should relax over successive retrieval passes before broader text retrieval is used
- Include location-aware retrieval using dedicated fields for `country`, `province`, and `city`
- Keep body-text retrieval as a later fallback layer
- Encode the retrieval decision chain into `query-vault.md` and `second-brain-query/SKILL.md` so the agent runtime follows it

### Out

- Replacing Markdown frontmatter as the source of truth
- Requiring full-text search as a mandatory part of this step
- Redesigning the entire vault metadata policy beyond what retrieval behavior strictly depends on
- Using `description` to fully replace full-note reading for answer generation
- Designing unrelated ranking features outside vault retrieval

---

## Retrieval Decision Chain

### Stage 1: Structured SQLite Shortlist

1. Build SQLite query from structured frontmatter constraints:
   - `tags`: exact or hierarchical match (e.g., `topic/*` matches `topic/subtopic`)
   - Time fields: range filters on `created`, `updated`, `start_date`, `end_date`
   - Location fields: filter on `country`, `province`, `city` with `country` defaulting to China when absent
2. Execute query against `notes` and `properties` tables in `.opencode/frontmatter-index.sqlite`
3. Return shortlist of candidate note paths with their `description` values

### Stage 2: Candidate Count Decision

Based on shortlist size after Stage 1:

| Count | Action |
|-------|--------|
| 0 | Skip to Progressive Relaxation (Stage 3) |
| 1-19 | Read all candidates directly (Stage 4) |
| 20-100 | Description-based reranking (Stage 2.5) then read top candidates (Stage 4) |
| 101+ | Another round of structural narrowing (repeat Stage 1 with stricter constraints) or relax to broader pass |

### Stage 2.5: Description-Based Reranking

When shortlist is 20-100 candidates:

1. Score each candidate by description relevance to the query
2. Rank candidates by description score
3. Read top N candidates where N = min(20, count)
4. If top N are insufficient, fall back to Progressive Relaxation (Stage 3)

### Stage 3: Progressive Relaxation

When structured shortlist is empty or Stage 2.5 is insufficient, relax constraints in this priority order:

1. **Remove low-value tag constraints first**: Drop tags that are least selective (based on tag frequency in the vault or query specificity)
2. **Broaden time constraints second**: Expand date ranges (e.g., extend by 30 days on each side, then by 90 days)
3. **Broaden location constraints third**: Remove `city`, then `province`, keeping `country` last
4. **Remove all structured constraints**: Fall back to unstructured pass

After each relaxation step, retry Stage 1 with the relaxed constraints.

Maximum relaxation rounds: 3 before falling back to broader text retrieval.

### Stage 4: Full Note Read

Read the full content of selected candidates and generate the answer.

### Stage 5: Broader Text Retrieval (Optional Fallback)

If progressive relaxation exhausts without finding sufficient information:

1. Use grep or FTS (when available) as a broader text-based pass
2. This is optional and should be a later fallback, not the primary path

---

## Fallback Visibility

When fallback happens, log or expose:

- Which relaxation step triggered (tag removal, time broadening, location broadening, or full constraint removal)
- How many candidates were found after each pass
- Why the final answer may have lower confidence (e.g., "relaxed to unstructured pass")

This makes retrieval behavior inspectable and debuggable for later planning.

---

## Frozen Thresholds

| Threshold | Value | Rationale |
|-----------|-------|-----------|
| Direct read threshold | <= 19 candidates | Small enough to read all without reranking |
| Description rerank threshold | 20-100 candidates | Too many for direct read, but manageable for description scoring |
| Structural narrowing threshold | > 100 candidates | Too many candidates; need stricter filtering |
| Max relaxation rounds | 3 | Prevent infinite relaxation loops |
| Top N after reranking | 20 | Balance between recall and efficiency |
| Time broadening increment | 30 days, then 90 days | Reasonable expansion for date ranges |

---

## Integration Topology

```
User Query
    |
    v
[Stage 1: Structured SQLite Shortlist]
    |
    v
[Candidate Count Decision]
    |
    +-- 0 candidates --> [Stage 3: Progressive Relaxation] --> retry Stage 1
    |
    +-- 1-19 candidates --> [Stage 4: Full Note Read]
    |
    +-- 20-100 candidates --> [Stage 2.5: Description Reranking] --> [Stage 4: Full Note Read]
    |
    +-- 101+ candidates --> [Stricter Stage 1 or Progressive Relaxation]
```

---

## Success Criteria

1. SQLite shortlist uses frontmatter as primary filter layer
2. Description is used for reranking when shortlist is moderately sized (20-100)
3. Progressive relaxation happens in defined order before broader text retrieval
4. Location uses dedicated fields, not tags
5. Body-text retrieval is optional later support
6. Fallback reasons are exposed for debugging

---

# TDD Batches

## Batch 1: Structured SQLite Shortlist

- Test: Query with only tag constraints returns correct shortlist
- Test: Query with only time constraints returns correct shortlist
- Test: Query with only location constraints returns correct shortlist
- Test: Query with mixed constraints returns intersection
- Test: Empty constraint set returns empty shortlist (no unbounded query)
- Test: Hierarchical tag matching works (`topic/*` matches `topic/subtopic`)
- Test: Location defaults to China when `country` absent

## Batch 2: Candidate Count Decision

- Test: Shortlist of 0 triggers progressive relaxation
- Test: Shortlist of 1-19 triggers direct read
- Test: Shortlist of 20 triggers description reranking
- Test: Shortlist of 100 triggers description reranking
- Test: Shortlist of 101 triggers stricter filtering or relaxation

## Batch 3: Progressive Relaxation

- Test: First relaxation removes low-value tags
- Test: Second relaxation broadens time range
- Test: Third relaxation broadens location (city -> province -> country)
- Test: Fourth relaxation removes all structured constraints
- Test: Max 3 relaxation rounds before broader text fallback
- Test: Each relaxation step logs which constraints were relaxed

## Batch 4: Description Reranking

- Test: Description score orders candidates correctly
- Test: Top N candidates are selected for full read (N = 20)
- Test: If top N insufficient after read, triggers relaxation

## Batch 5: Integration and Fallback Visibility

- Test: Full query flow from structured shortlist to answer
- Test: Fallback reason is exposed when relaxation happens
- Test: Candidate count after each pass is exposed
- Test: Confidence is marked lower when broader text retrieval used

---

## Files

- `.opencode/frontmatter-index.sqlite` - SQLite index (existing)
- `.opencode/workflows/query-vault.md` - Vault query workflow (to be updated)
- `.opencode/skills/second-brain-query/SKILL.md` - Query skill (to be updated if needed)

## Symbols

- `vault_index_search` - Function to query SQLite index
- `properties` table - Key-value store for frontmatter
- `notes` table - Note metadata and content

## Execution constraints

- All thresholds and relaxation rules must be frozen in this step
- `query-vault.md` and `second-brain-query/SKILL.md` must be updated within this step

## Invariants

- SQLite remains the first retrieval layer
- Frontmatter remains the source of truth
- Progressive relaxation order is fixed: tags -> time -> location -> unstructured
- Fallback behavior is inspectable and logged

## Deferred follow-up

- Metadata governance and normalization (step 02-frontmatter-tag-governance)
- Full-text search integration
- Performance optimization for large vaults