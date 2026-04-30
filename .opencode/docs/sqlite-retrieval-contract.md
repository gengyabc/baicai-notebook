# SQLite Retrieval Contract

Canonical reference for the vault SQLite retrieval index, schema, and the only supported first-pass retrieval entrypoint.

## Purpose

Use this document when the assistant needs to understand how vault retrieval works.

This document exists to prevent:

- guessing table names or columns
- bypassing the retrieval wrapper with improvised SQL
- mixing structured retrieval with broad text search too early

## Database File

- SQLite index path: `.opencode/frontmatter-index.sqlite`
- This database is a derived retrieval index, not the source of truth.
- Source truth remains the Markdown notes in the vault.

## Canonical First-Pass Entrypoint

- Use `vault_index_search` as the only supported first-pass retrieval entrypoint in non-debug sessions.
- Do not write ad hoc SQL as the default retrieval path.
- Manual SQL is allowed only for implementation, debugging, or verification of the retrieval layer itself.

## Schema

### `notes`

```sql
CREATE TABLE notes (
  id TEXT PRIMARY KEY,
  path TEXT NOT NULL UNIQUE,
  title TEXT,
  folder TEXT,
  frontmatter_json TEXT,
  content_text TEXT
);
```

Meaning:

- `id`: note identifier, currently aligned with vault-relative path
- `path`: vault-relative Markdown path
- `title`: resolved note title
- `folder`: vault-relative parent folder
- `frontmatter_json`: stored frontmatter snapshot
- `content_text`: note body text

### `properties`

```sql
CREATE TABLE properties (
  note_id TEXT NOT NULL,
  key TEXT NOT NULL,
  value_text TEXT,
  value_num REAL,
  value_bool INTEGER,
  value_date TEXT,
  value_type TEXT,
  is_null INTEGER NOT NULL DEFAULT 0,
  array_group TEXT,
  array_index INTEGER,
  FOREIGN KEY(note_id) REFERENCES notes(id) ON DELETE CASCADE
);
```

Meaning:

- one row per flattened frontmatter value
- `key`: flattened frontmatter field name
- `value_text`: text representation for text-style matching
- `value_num`: numeric value when applicable
- `value_bool`: boolean value when applicable
- `value_date`: normalized ISO datetime for retrieval-sensitive date fields
- `value_type`: stored type marker
- `array_group` / `array_index`: preserve array/object flattening context

## Retrieval-Relevant Fields

Primary structured fields for first-pass retrieval:

- tags: `tags`
- event time: `start_date`, `end_date`
- note timestamps: `created`, `updated`
- location: `country`, `province`, `city`
- shortlist explanation only: `description`

Additional fields may exist in the index, but they are not the default first-pass constraint families unless the retrieval workflow explicitly allows them.

## Canonical Query Contract

Follow `.opencode/workflows/query-vault.md`.

Required behavior:

1. Extract structured constraints before retrieval when possible.
2. Use SQLite structured shortlist first.
3. Intersect active constraint families in one SQL pass.
4. Read shortlisted files before reading outside the shortlist.
5. If fallback is used, state that explicitly.

## Constraint Extraction Stage

Before calling `vault_index_search`, the caller must perform a constraint-extraction pass on the user request. This stage produces a normalized constraint payload that the wrapper consumes. The extraction stage is mandatory: it must run before Stage 1 shortlist execution, and its output must be passed through the structured wrapper contract rather than allowing ad hoc raw SQL generation.

### Extraction priority order (frozen)

1. **time** - evaluate first when the request contains a usable date or time phrase
2. **location** - evaluate second when the request contains a usable place phrase
3. **tags** - evaluate third for canonical tag mappings and low-risk topic-to-tag mappings
4. **extraFields** - evaluate last for the allowlisted set of additional structured fields

No constraint family outside this priority order may be emitted in the first version.

### Constraint families

Each extracted constraint belongs to exactly one family. The four families and their allowed fields are:

#### time

- `timeMode`: `event` or `note` (frozen at extraction time, before query construction)
- `start`: inclusive start of the query window (ISO date string)
- `end`: inclusive end of the query window (ISO date string)

Use `event` mode when the request is about when an activity happened or will happen. Use `note` mode only when the request explicitly asks about note creation or update chronology.

Event-time matching: a note matches when its event interval (`start_date` through `end_date`) overlaps the requested `[start, end]` window. Do not satisfy event-time requests with `created` or `updated`.

Note-time matching: a note matches when `created` or `updated` falls inside the requested `[start, end]` window.

#### location

- `country`: canonical country value (e.g., `中国`)
- `province`: canonical province value (e.g., `江苏省`)
- `city`: canonical city value (e.g., `深圳市`)

Normalize location phrases only into `country`, `province`, and `city`. Preserve the metadata-level China default: when a note omits `country`, retrieval treats it as `中国` at the metadata/index layer. Do not inject `country = 中国` into the query when the user did not ask for a country.

When both `province` and `city` can be extracted, emit both constraints.

#### tags

- `tags`: array of canonical tag values (e.g., `topic/training`)
- `hierarchicalTags`: array of hierarchical tag prefixes (e.g., `topic/` to match `topic/subtopic`)

Prefer explicit canonical tag mappings from `.opencode/alias-registry.md` first. Allow low-risk inference only for obvious stable topic mappings that already align with retrieval and governance language. Do not use freeform title or body keywords as substitute structured tags.

#### extraFields

A keyed object limited to these first-version allowlisted fields:

- `duration`: numeric or string duration value
- `num_participant`: numeric participant count
- `organizer`: text organizer value (exact match only, no fuzzy normalization)
- `host`: text host value (exact match only, no fuzzy normalization)
- `participants`: text participants value (exact match only, no fuzzy normalization)

The first version does not introduce fuzzy person-name normalization for `organizer`, `host`, or `participants`. These fields may be emitted only when the request clearly names that field or an unambiguous synonym. No field outside this allowlist may be emitted in the first version.

### Normalization source rules (frozen)

- Common time-phrase alias tables are defined in this document (see Time-Phrase Alias Tables below) because they are retrieval-contract behavior, not note-authoring governance.
- Canonical location values and canonical tag values come from `.opencode/alias-registry.md` when an alias-backed mapping is needed.
- `query-vault.md` and `second-brain-query/SKILL.md` consume these sources; they do not become competing alias tables.

## Current Request Shape

The live `vault_index_search` tool (`.opencode/plugins/vault-query-router/index.ts`) currently accepts:

```
vault_index_search(query, limit?, folders?, constraints?)

constraints?: {
  tags?: string[],                 // canonical tag values
  hierarchicalTags?: string[],     // hierarchical tag prefixes
  country?: string[],              // array of canonical country values
  province?: string[],             // array of canonical province values
  city?: string[],                 // array of canonical city values
  timeMode?: "event" | "note",
  start?: string,                  // ISO date, inclusive
  end?: string,                    // ISO date, inclusive
}
```

All `constraints` fields are optional; the `constraints` object itself is optional. Location fields are array-valued in the current wrapper. The current wrapper does not accept `extraFields`, `structuredTrace`, or any diagnostics fields as input. When explicit constraints are not provided, the wrapper infers a limited deterministic subset from the query text following the extraction priority order.

## Planned Request Shape

Once the wrapper is updated to support the full extraction-stage contract, `vault_index_search` will accept the following additions to the `constraints` input:

```
constraints?: {
  // ... all current fields above ...

  // Extra fields family (keyed object, allowlisted keys only) -- PLANNED
  extraFields?: {
    duration?: string | number,
    num_participant?: number,
    organizer?: string,
    host?: string,
    participants?: string
  },

  // Extraction trace (caller-supplied) -- PLANNED
  structuredTrace?: [
    {
      family: "time" | "location" | "tags" | "extraFields",
      field: string,
      matchedPhrase: string,    // the user phrase that triggered this constraint
      normalizedValue: string,  // the canonical value applied
      source: "literal" | "alias" | "inference"
    }
  ]
}
```

The `extraFields` and `structuredTrace` additions are planned contract work. They are not yet supported by the live wrapper. The extraction stage and its diagnostic trace are defined here so that implementation can proceed in a later step without redesigning the contract.

When the extraction stage produces a scalar location value (e.g., `country: "中国"`), wrap it as a single-element array (`country: ["中国"]`) to match the wrapper's array-valued input shape.

## Wrapper Response Contract

The following execution diagnostics are produced by the wrapper after shortlist execution. They are response-side data: the caller must not supply them as input.

```
response: {
  appliedConstraints: string[],           // constraint field names that were applied
  inferredConstraints: string[],          // subset with source = "inference"
  rejectedStructuredHints: string[],      // structured hints the model considered but did not apply
  candidateCounts: {
    structuredPass: number,               // candidates after structured Stage 1
    [fallbackPass: string]: number        // additional passes with stable reason labels
  },
  fallbackReason: string | undefined      // stable reason label if retrieval broadened
}
```

### Diagnostics contract

The wrapper must expose:

- Which constraints were applied (`appliedConstraints`)
- Which constraints were inferred (`inferredConstraints`)
- Which structured hints were rejected (`rejectedStructuredHints`)
- The selected `timeMode`
- Candidate counts for the structured pass and for each fallback or relaxation pass (`candidateCounts`)
- Fallback state with a stable reason label (`fallbackReason`)

Diagnostics are model-facing contract data first. User-facing transparency may reuse the same diagnostics later, but this document does not define a separate user-formatting layer.

The response diagnostics contract is planned. The current wrapper returns a text-formatted shortlist and does not yet expose structured diagnostics fields. Implementation of the response contract is deferred to the wrapper implementation step.

## Current Wrapper Behavior

`vault_index_search` currently:

- Accepts `query`, `limit`, `folders`, and `constraints` (see Current Request Shape above)
- Location fields in `constraints` are array-valued (`country: string[]`, `province: string[]`, `city: string[]`)
- Does not accept `extraFields` or `structuredTrace` as input
- Does not return structured diagnostics fields; returns a text-formatted shortlist
- Infers a limited deterministic subset of constraints from the query text when explicit constraints are not provided, following the extraction priority order and family rules defined above

## Supported Time Modes

- `event`: use `start_date` and `end_date`. A note matches a requested time window when its event dates overlap that window. For single-day events, `start_date` and `end_date` may be the same day.
- `note`: use `created` and `updated`. A note matches when `created` or `updated` falls inside the requested window.

Do not satisfy an event-time request with note timestamps.

Time mode must be chosen during extraction, before SQLite query construction. Event-time requests must not be satisfied with `created` or `updated`.

## Time-Phrase Alias Tables

These tables define retrieval-contract-level mappings from common user time phrases to normalized query windows. They are part of the retrieval contract because they govern how the extraction stage normalizes time language, not because they govern how notes are authored.

### Year references

| User phrase pattern | Normalized window | Example |
| --- | --- | --- |
| `YYYY年` or `YYYY` (year only) | `[YYYY-01-01, YYYY-12-31]` | `2025年` -> `[2025-01-01, 2025-12-31]` |
| `last year` / `去年` | `[current_year-1-01-01, current_year-1-12-31]` | in 2026: `[2025-01-01, 2025-12-31]` |
| `this year` / `今年` | `[current_year-01-01, current_year-12-31]` | in 2026: `[2026-01-01, 2026-12-31]` |

### Half-year references

| User phrase pattern | Normalized window | Example |
| --- | --- | --- |
| `YYYY年上半年` / `first half of YYYY` | `[YYYY-01-01, YYYY-06-30]` | `2025年上半年` -> `[2025-01-01, 2025-06-30]` |
| `YYYY年下半年` / `second half of YYYY` | `[YYYY-07-01, YYYY-12-31]` | `2025年下半年` -> `[2025-07-01, 2025-12-31]` |

### Month references

| User phrase pattern | Normalized window | Example |
| --- | --- | --- |
| `YYYY年MM月` / `MM月` (month only) | `[YYYY-MM-01, YYYY-MM-last_day]` | `2025年3月` -> `[2025-03-01, 2025-03-31]` |
| `上个月` / `last month` | `[first_day_of_prev_month, last_day_of_prev_month]` | in 2026-04: `[2026-03-01, 2026-03-31]` |
| `这个月` / `this month` | `[first_day_of_current_month, last_day_of_current_month]` | in 2026-04: `[2026-04-01, 2026-04-30]` |

### Explicit date ranges

| User phrase pattern | Normalized window | Example |
| --- | --- | --- |
| `从X到Y` / `between X and Y` | `[normalized(X), normalized(Y)]` | `从3月到5月` -> `[YYYY-03-01, YYYY-05-31]` |
| `X之前` / `before X` (exclusive of X) | `[earliest_indexed_date, year_before_X_ends]` | `2025年之前` -> `[0001-01-01, 2024-12-31]` |
| `X之后` / `after X` (exclusive of X) | `[year_after_X_starts, latest_indexed_date]` | `2025年之后` -> `[2026-01-01, 9999-12-31]` |
| `X以来` / `since X` (inclusive of X) | `[normalized(X), latest_indexed_date]` | `2025年以来` -> `[2025-01-01, 9999-12-31]` |

All windows are inclusive on both endpoints, except that `before` and `after` are exclusive of the boundary: "before X" excludes X itself, and "after X" excludes X itself. "Since X" is inclusive of X. When only a year or month is given, infer the year from the current context or the current year.

## Canonical Matching Expectations

- Prefer canonical tag values such as `topic/training`
- Prefer canonical location values such as `深圳市` or `江苏省`
- Alias expansion is limited and should happen through the wrapper's deterministic extraction logic, not by improvised SQL patterns
- Tag canonical values and location canonical values are governed by `.opencode/alias-registry.md`
- Time-phrase normalization is governed by the Time-Phrase Alias Tables in this document

## Required Indexes

The retrieval layer expects these indexes to exist:

- `idx_notes_path`
- `idx_properties_note_key`
- `idx_properties_key_text_note`
- `idx_properties_key_date_note`

Other indexes may exist for storage or compatibility reasons.

## Anti-Patterns

Do not do these as the primary retrieval path:

- query imaginary tables like `entries`
- use `LIKE '%培训%'` as a substitute for canonical `tags`
- use `LIKE '%深圳%'` as a substitute for canonical `city`
- use `path LIKE '%2025%'` as a substitute for structured time filtering
- treat shortlist hits as confirmed facts before reading the file
- perform non-debug network search without user permission

## Verification Checklist

Before trusting a retrieval answer:

1. Did the query go through `vault_index_search` first?
2. Were structured constraints applied when available?
3. Were shortlisted files actually read?
4. Are local facts, index-only hits, and network results clearly separated?
5. In non-debug sessions, was user permission obtained before network search?
