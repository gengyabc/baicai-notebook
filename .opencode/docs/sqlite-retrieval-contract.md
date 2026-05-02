# SQLite Retrieval Contract

## Purpose

`.opencode/frontmatter-index.sqlite` is a **derived retrieval index**. The Markdown vault files are the source of truth. Index hits are not confirmed facts until the source file is read.

## Schema

```sql
CREATE TABLE notes (
  id TEXT PRIMARY KEY,
  path TEXT NOT NULL UNIQUE,
  title TEXT,
  folder TEXT,
  frontmatter_json TEXT,
  content_text TEXT
);

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

## Retrieval rules

1. Use `vault_index_search` as the first-pass entrypoint. No ad hoc SQL in normal retrieval flows.
2. Extract structured constraints before calling: time, location, tags (in that priority order).
3. Normalize tags via `canonical-tags.json` + `tag-aliases.json`, locations via `location-aliases.json`, expansions via `tag-expansions.json`.
4. Read shortlisted files before citing them. Index-only hits are not confirmed facts.
5. If retrieval broadens beyond structured shortlist, state that explicitly.
6. Ask before using web search in non-debug sessions.

## Time modes

- **event**: match `start_date`/`end_date` overlap with query window. For event-time requests, do not use `created`/`updated`.
- **note**: match `created`/`updated` falling inside query window.

## Constraint families

- **time**: `timeMode` (`event`|`note`), `start`, `end` (ISO dates, inclusive)
- **location**: `country`, `province`, `city` (canonical values)
- **tags**: `tags` (canonical values), `hierarchicalTags` (prefixes like `topic/`)
- **extraFields** (allowlisted): `duration`, `num_participant`, `organizer`, `host`, `participants`

## Current wrapper shape

```
vault_index_search(query, limit?, folders?, constraints?)

constraints?: {
  tags?: string[],
  hierarchicalTags?: string[],
  country?: string[],
  province?: string[],
  city?: string[],
  timeMode?: "event" | "note",
  start?: string,
  end?: string
}
```

## Provenance

Keep these distinct: file-backed facts, index-only hits, network-derived info, and hypotheses.
