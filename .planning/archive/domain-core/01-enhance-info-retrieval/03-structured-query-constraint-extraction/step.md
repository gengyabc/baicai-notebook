---
step-key: structured-query-constraint-extraction
step-version: 1
requirement-version: 1
---

# Structured Query Constraint Extraction

---

## Objective

Make structured vault retrieval more deterministic and debuggable by forcing a normalized constraint-extraction pass before `vault_index_search`, so obvious time, location, tag, and allowlisted structured signals are applied in SQLite before broader search behavior begins.

---

## Integration topology

```
User request
    |
    v
[Constraint extraction]
    |
    +-- identify structured phrases and map them to normalized constraints
    +-- record which phrases were matched literally, by alias, or by low-risk inference
    |
    v
[vault_index_search]
    |
    +-- receive normalized constraints through the structured wrapper contract
    +-- execute Stage 1 SQLite shortlist with intersection semantics
    |
    v
[Existing shortlist, reranking, and fallback flow]
```

The extraction layer is part of retrieval control flow, not a separate fallback path. If usable structured clues are present, SQLite filtering remains the first retrieval action.

---

## Constraint extraction contract

Before Stage 1 shortlist generation, retrieval must produce a normalized constraint payload with four ordered families:

1. `time`
2. `location`
3. `tags`
4. `extraFields`

The payload must preserve, at minimum:

- canonical field names
- canonical values or normalized ranges
- source of normalization: `literal`, `alias`, or `inference`
- matched user phrase for each extracted constraint
- omitted or rejected structured hints when the model considered but did not apply them

Family rules are frozen for the first version:

- `time` is mandatory to evaluate first whenever the request contains a usable date or time phrase.
- `location` is mandatory to evaluate second whenever the request contains a usable place phrase.
- `tags` includes canonical tag mappings and low-risk topic-to-tag mappings only when the intent is obvious.
- `extraFields` is limited to `duration`, `num_participant`, `organizer`, `host`, and `participants`.
- No family outside this allowlist may be emitted in the first version.

Alias and canonical-value sources are also frozen:

- Common time-phrase alias tables belong in `.opencode/docs/sqlite-retrieval-contract.md` because they are retrieval-contract behavior, not note-authoring governance.
- Canonical location values and canonical tag values continue to come from `.opencode/alias-registry.md` when an alias-backed mapping is needed.
- `query-vault.md` and `second-brain-query/SKILL.md` consume those sources; they do not become competing alias tables.

---

## Explicit implementation decisions

### Time normalization

- `timeMode` must be chosen during extraction, before SQLite query construction.
- Use `event` mode when the request is about when an activity happened or will happen.
- Use `note` mode only when the request explicitly asks about note creation or update chronology.
- In `event` mode, normalize year, half-year, month, and explicit date-range phrases into an inclusive `[start, end]` window.
- In `event` mode, a note matches when its event interval overlaps the requested window using `start_date` and `end_date`.
- In `note` mode, a note matches when `created` or `updated` falls inside the requested window.
- Event-time requests must not be satisfied with `created` or `updated`.

### Location normalization

- Normalize location phrases only into `country`, `province`, and `city`.
- Preserve the existing metadata-level China default behavior when a note omits `country`.
- Do not invent a query-time `country = 中国` filter when the user did not ask for a country.
- When both province and city can be extracted, emit both constraints.

### Tag and topic normalization

- Prefer explicit canonical tag mappings first.
- Allow low-risk inference only for obvious stable topic mappings that already align with retrieval and governance language.
- Record inferred tag mappings separately from literal or alias-based mappings in diagnostics.
- Do not use freeform title or body keywords as substitute structured tags.

### Extra-field normalization

- The initial extra-field allowlist is exact-field only.
- `duration`, `num_participant`, `organizer`, `host`, and `participants` may be emitted only when the request clearly names that field or an unambiguous synonym.
- The first version does not introduce fuzzy person-name normalization for `organizer`, `host`, or `participants`.

---

## Wrapper contract and diagnostics

`vault_index_search` remains the only first-pass retrieval entrypoint. This step freezes the retrieval-facing contract additions around it:

- The caller must pass normalized structured constraints rather than relying on ad hoc raw SQL.
- The normalized input shape extends the existing `constraints` contract with these first-version fields:
  - `timeMode`, `start`, `end`
  - `country`, `province`, `city`
  - `tags`, `hierarchicalTags`
  - `extraFields` as a keyed object limited to `duration`, `num_participant`, `organizer`, `host`, and `participants`
  - `structuredTrace` as an array of extracted items with `family`, `field`, `matchedPhrase`, `normalizedValue`, and `source`
- The wrapper must expose which constraints were applied, which were inferred, and which structured hints were rejected.
- The wrapper must expose candidate counts for the structured pass and for each fallback or relaxation pass that follows.
- The wrapper must expose the selected `timeMode` and the active field families used in the SQLite pass.
- The wrapper must expose fallback state with stable reason labels, including whether retrieval stayed structured or broadened later.

Diagnostics are model-facing contract data first. User-facing transparency may reuse the same diagnostics later, but this step does not require a separate user-formatting layer.

---

## Locked constraints

- Structured frontmatter filtering remains the default first retrieval action whenever usable structured clues are present.
- Constraint family priority is fixed: time/date, location, tags/topic, then allowlisted extra structured fields.
- Required time fields remain `created`, `updated`, `start_date`, and `end_date`.
- Required location fields remain `country`, `province`, and `city`.
- Query-time extraction must run through `vault_index_search` and its documented contract rather than ad hoc raw SQL generation.
- The first version must stay compatible with the existing shortlist, reranking, and fallback chain from step 01.
- The first version must stay compatible with the metadata governance assumptions from step 02.
- The first version must not expand support to arbitrary frontmatter keys or redesign metadata governance.

---

## Scope

### In

- Define the pre-shortlist constraint-extraction stage for retrieval.
- Freeze the extraction priority order across time, location, tags/topic, and allowlisted extra structured fields.
- Define normalization rules for common time phrases, location phrases, and low-risk topic-to-tag mappings.
- Define the first-version boundaries for low-risk inference versus explicit alias mapping.
- Define the retrieval-facing wrapper inputs and diagnostics needed for inspectable structured search behavior.
- Freeze where alias tables and canonical values are sourced so later implementation does not invent competing lookup surfaces.
- Update retrieval workflow documentation so the extraction stage is required before shortlist execution.

### Out

- Replacing `vault_index_search` with a different first-pass entrypoint.
- Redesigning candidate-count thresholds, reranking thresholds, or progressive-relaxation order from step 01.
- Expanding the first-pass constraint surface to arbitrary frontmatter keys.
- Adding fuzzy normalization for person-like structured fields in the first version.
- Redesigning metadata governance, alias review workflow, or note-authoring policy from step 02.
- Implementing a separate user-facing diagnostics presentation layer.

---

# TDD Batches

## Batch 1: Pre-shortlist extraction stage and family priority

- Test: `query-vault.md` requires constraint extraction before any Stage 1 SQLite shortlist execution.
- Test: the extraction stage freezes family priority as time/date -> location -> tags/topic -> allowlisted extra fields.
- Test: retrieval documentation states that usable structured clues must be applied through SQLite before title-first or body-first search.
- Test: empty or unusable structured extraction does not authorize an unbounded structured query.

## Batch 2: Time and location normalization rules

- Test: the retrieval contract distinguishes `event` versus `note` time mode and freezes when each is allowed.
- Test: year, half-year, month, and explicit date-range phrases are normalized into inclusive query windows.
- Test: event-time matching uses event-interval overlap with `start_date` and `end_date`, not `created` or `updated`.
- Test: location extraction is limited to `country`, `province`, and `city` and preserves metadata-level China default semantics.
- Test: retrieval docs forbid query-time injection of `country = 中国` when the user omitted country.

## Batch 3: Tag, topic, and extra-field mapping boundaries

- Test: retrieval docs require explicit canonical tag mappings first and allow low-risk inference only for obvious topic mappings.
- Test: inferred tag mappings are distinguished from literal or alias-based mappings in diagnostics.
- Test: the first-version extra-field allowlist is frozen to `duration`, `num_participant`, `organizer`, `host`, and `participants`.
- Test: the first version forbids fuzzy normalization for `organizer`, `host`, and `participants`.
- Test: retrieval docs do not reintroduce title or body keyword search as a substitute for structured tag extraction.

## Batch 4: Wrapper diagnostics and workflow alignment

- Test: `.opencode/docs/sqlite-retrieval-contract.md` documents the normalized structured-constraint input shape expected by `vault_index_search`.
- Test: the contract requires diagnostics for applied constraints, inferred constraints, rejected structured hints, selected `timeMode`, candidate counts, and fallback reason.
- Test: `.opencode/workflows/query-vault.md` and `.opencode/skills/second-brain-query/SKILL.md` consume the same extraction-stage contract and do not describe conflicting retrieval behavior.
- Test: retrieval safety guidance stays aligned with the structured-first contract and raw-SQL prohibition.

---

## Files

- `.opencode/workflows/query-vault.md` - retrieval workflow source of truth
- `.opencode/skills/second-brain-query/SKILL.md` - retrieval runtime behavior
- `.opencode/docs/sqlite-retrieval-contract.md` - wrapper and schema contract
- `.opencode/alias-registry.md` - canonical location and tag values used by retrieval mappings
- `.opencode/rules/retrieval-safety.md` - structured-first safety constraints

## Symbols

- `vault_index_search`
- `timeMode`
- `constraints`
- `extraFields`
- `structuredTrace`
- `appliedConstraints`
- `inferredConstraints`
- `rejectedStructuredHints`
- `candidateCounts`
- `fallbackReason`

## Execution constraints

- Keep the step contract-first and retrieval-doc-first.
- Reuse the existing `vault_index_search` entrypoint rather than introducing a parallel wrapper name.
- Keep the extraction logic deterministic enough that later implementation and tests do not need to guess matching semantics.
- Do not widen the step into metadata-governance redesign or broader ranking changes.

## Invariants

- SQLite remains the first retrieval layer when structured clues are usable.
- Frontmatter remains the durable source of truth.
- Existing shortlist, reranking, and fallback stages remain intact after the new extraction stage is added.
- Structured constraints are applied as intersected families inside SQLite, not as broad post-filtering after a loose search.
- Debug-mode session behavior remains separate from the non-debug retrieval contract planned here.

## Deferred follow-up

- Query-time alias lifecycle expansion beyond the first fixed extraction tables.
- Fuzzy normalization or entity resolution for person-like structured fields.
- User-facing rendering conventions for retrieval diagnostics.
- Additional structured fields beyond the first allowlist when real usage justifies them.
