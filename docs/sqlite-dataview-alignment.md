# SQLite Frontmatter Index

## Goal

Build a weak-structure SQLite layer for effective frontmatter filtering across Markdown notes without forcing a rigid shared schema.

## Core Idea

Do not force all notes into one fixed table shape.

Instead:

- keep Markdown frontmatter as the source of truth
- store the full parsed frontmatter as JSON in SQLite
- flatten frontmatter into queryable key-value rows
- preserve enough type information for exact, boolean, numeric, date, and missing-field queries
- treat Dataview-style views as optional extensions, not core dependencies

This allows notes with different frontmatter shapes to coexist without schema churn.

## Current Implementation

The current implementation lives in:

- `.opencode/plugins/frontmatter-index/sqlite-index.mjs`
- `.opencode/plugins/frontmatter-index/config.json`

Available commands:

- `npm --prefix .opencode run frontmatter:index:scan`
- `npm --prefix .opencode run frontmatter:index:rebuild`
- `npm --prefix .opencode run frontmatter:index:reconcile`
- `npm --prefix .opencode run frontmatter:index:watch`

Current scope:

- indexes configured vault roots only
- stores `notes` and `properties`
- does not create `views` or `view_rows` yet

## Identity Rule

Use `path` as the canonical note identity for the first implementation.

- `notes.id` should equal `notes.path`
- `properties.note_id` should store the same path value
- delete and rename handling should operate on the old path directly

This avoids introducing a second identity system before there is a proven need for one.

## Data Model

### `notes`

One row per note.

| column | meaning |
|---|---|
| `id` | stable note id |
| `path` | vault-relative or absolute path |
| `title` | display title |
| `folder` | parent folder |
| `frontmatter_json` | full parsed frontmatter as JSON |
| `content_text` | note body text |

### `properties`

Flattened frontmatter index with preserved value types.

| column | meaning |
|---|---|
| `note_id` | foreign key to `notes.id` |
| `key` | flattened field name, e.g. `source.kind` or `authors[].name` |
| `value_text` | string representation for exact-match text queries |
| `value_num` | numeric representation for range queries |
| `value_bool` | boolean representation as `0` or `1` |
| `value_date` | normalized ISO date/time text |
| `value_type` | original type hint |
| `is_null` | whether the stored value is explicitly null |
| `array_group` | stable identifier for one object inside an array |
| `array_index` | original array position when relevant |

### `views`

Optional Dataview-aligned index definitions.

| column | meaning |
|---|---|
| `view_id` | stable id |
| `path` | index page path |
| `name` | human-readable name |
| `query_spec` | structured view definition |

### `view_rows`

Optional materialized or cached rows for a view.

| column | meaning |
|---|---|
| `view_id` | referenced view |
| `note_id` | matched note |
| `group_key` | grouping bucket |
| `sort_key` | ordering key |

## Why This Works

- Different notes can have different frontmatter shapes.
- Common fields are directly searchable.
- Nested objects can be queried through flattened keys.
- Raw frontmatter remains recoverable through JSON.
- Boolean, numeric, date, null, and missing-field queries can be handled without guesswork.
- Index-page alignment can be added later without changing the core filtering model.

## Example Mapping

Input frontmatter:

```yaml
type: resource
resource_kind: note
status: active
trust_level: raw
tags: [ai, opencode]
source:
  kind: github
  url: https://github.com/example/repo
authors:
  - name: Alice
    role: lead
  - name: Bob
    role: reviewer
```

Stored data:

```text
notes.frontmatter_json = full YAML as JSON

properties:
note_id | key             | value_text | array_group | array_index
1       | type            | resource   | null        | null
1       | resource_kind   | note       | null        | null
1       | status          | active     | null        | null
1       | trust_level     | raw        | null        | null
1       | tags            | ai         | null        | 0
1       | tags            | opencode   | null        | 1
1       | source.kind     | github     | null        | null
1       | source.url      | https://github.com/example/repo | null | null
1       | authors[].name  | Alice      | authors#0   | 0
1       | authors[].role  | lead       | authors#0   | 0
1       | authors[].name  | Bob        | authors#1   | 1
1       | authors[].role  | reviewer   | authors#1   | 1
```

## Query Flow

Primary path for frontmatter filtering:

1. Parse the user request into field constraints, entities, categories, and time hints.
2. Query `properties` for structured frontmatter matches.
3. Use `frontmatter_json` as a fallback for rare or irregular fields.
4. Run `grep`, FTS, or similar text matching on the narrowed candidate set when body-text precision is needed.
5. Use `views` and `view_rows` only as an optional alignment layer for index pages.

## Operational Modes

Use three complementary modes:

1. Full rebuild: scan all Markdown notes and rebuild the database from scratch.
2. Incremental sync: on file create or modify, resync the affected note.
3. Reconcile repair: periodically compare database paths with filesystem paths and remove drift.

This avoids long-term corruption when watchers miss events or schemas evolve.

For the first implementation, a full rebuild should either:

- write to a fresh SQLite file and atomically replace the old one, or
- clear `properties` and `notes` before rescanning

Do not treat a normal incremental rescan as a true rebuild.

## Recommended Indexes

```sql
CREATE INDEX idx_notes_path
ON notes(path);

CREATE INDEX idx_properties_note_key
ON properties(note_id, key);

CREATE INDEX idx_properties_key_type_text
ON properties(key, value_type, value_text);

CREATE INDEX idx_properties_key_type_num
ON properties(key, value_type, value_num);

CREATE INDEX idx_properties_key_type_bool
ON properties(key, value_type, value_bool);

CREATE INDEX idx_properties_key_type_date
ON properties(key, value_type, value_date);

CREATE INDEX idx_properties_array_group
ON properties(note_id, array_group, key);
```

## Ingestion Strategy

1. Read Markdown.
2. Parse YAML frontmatter into an object.
3. Write the full object to `notes.frontmatter_json`.
4. Flatten each frontmatter field into `properties`.
5. Delete old properties for the note before inserting new ones.
6. Remove rows when a note is deleted or renamed away.
7. Reconcile periodically to remove stale rows.

Date handling rule:

- if the parser returns a `Date`, store its ISO string in `value_date`
- if the parser returns a string that matches the vault's accepted ISO date pattern, normalize it into `value_date`
- otherwise keep it only in `value_text`

## Implementation Sketch

This is the smallest useful schema for a weak-structure index.

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
  FOREIGN KEY(note_id) REFERENCES notes(id)
);

CREATE TABLE views (
  view_id TEXT PRIMARY KEY,
  path TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  query_spec TEXT NOT NULL
);

CREATE TABLE view_rows (
  view_id TEXT NOT NULL,
  note_id TEXT NOT NULL,
  group_key TEXT,
  sort_key TEXT,
  FOREIGN KEY(view_id) REFERENCES views(view_id),
  FOREIGN KEY(note_id) REFERENCES notes(id)
);

CREATE INDEX idx_notes_path
ON notes(path);

CREATE INDEX idx_properties_note_key
ON properties(note_id, key);

CREATE INDEX idx_properties_key_type_text
ON properties(key, value_type, value_text);

CREATE INDEX idx_properties_key_type_num
ON properties(key, value_type, value_num);

CREATE INDEX idx_properties_key_type_bool
ON properties(key, value_type, value_bool);

CREATE INDEX idx_properties_key_type_date
ON properties(key, value_type, value_date);

CREATE INDEX idx_properties_array_group
ON properties(note_id, array_group, key);
```

`views` and `view_rows` are optional. A first version focused only on frontmatter filtering may omit both tables entirely.

## Reference Code

The core idea is: parse Markdown, keep raw JSON, flatten fields with type preservation, then upsert both tables inside a transaction.

```js
import fs from "fs"
import matter from "gray-matter"
import Database from "better-sqlite3"

const db = new Database("obsidian-index.db")

function flatten(frontmatter) {
  const rows = []

  for (const [key, value] of Object.entries(frontmatter)) {
    rows.push(...flattenValue(value, key))
  }

  return rows
}

function flattenValue(value, key, arrayGroup = null, arrayIndex = null) {
  const rows = []

  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const item = value[index]

      if (item && typeof item === "object" && !Array.isArray(item)) {
        const groupId = `${key}#${index}`
        for (const [childKey, childValue] of Object.entries(item)) {
          rows.push(...flattenValue(childValue, `${key}[].${childKey}`, groupId, index))
        }
      } else if (Array.isArray(item)) {
        rows.push(...flattenValue(item, `${key}[]`, `${key}#${index}`, index))
      } else {
        rows.push(toPropertyRow(key, item, null, index))
      }
    }

    return rows
  }

  if (value && typeof value === "object") {
    for (const [childKey, childValue] of Object.entries(value)) {
      rows.push(...flattenValue(childValue, `${key}.${childKey}`, arrayGroup, arrayIndex))
    }

    return rows
  }

  rows.push(toPropertyRow(key, value, arrayGroup, arrayIndex))
  return rows
}

function toPropertyRow(key, value, arrayGroup = null, arrayIndex = null) {
  if (value === null || value === undefined) {
    return {
      key,
      value_text: null,
      value_num: null,
      value_bool: null,
      value_date: null,
      value_type: value === null ? "null" : "undefined",
      is_null: 1,
      array_group: arrayGroup,
      array_index: arrayIndex,
    }
  }

  if (typeof value === "boolean") {
    return {
      key,
      value_text: value ? "true" : "false",
      value_num: null,
      value_bool: value ? 1 : 0,
      value_date: null,
      value_type: "boolean",
      is_null: 0,
      array_group: arrayGroup,
      array_index: arrayIndex,
    }
  }

  if (typeof value === "number") {
    return {
      key,
      value_text: String(value),
      value_num: value,
      value_bool: null,
      value_date: null,
      value_type: "number",
      is_null: 0,
      array_group: arrayGroup,
      array_index: arrayIndex,
    }
  }

  if (value instanceof Date) {
    const isoDate = value.toISOString()
    return {
      key,
      value_text: isoDate,
      value_num: null,
      value_bool: null,
      value_date: isoDate,
      value_type: "date",
      is_null: 0,
      array_group: arrayGroup,
      array_index: arrayIndex,
    }
  }

  if (typeof value === "string" && isIsoLikeDate(value)) {
    const normalized = new Date(value).toISOString()
    return {
      key,
      value_text: value,
      value_num: null,
      value_bool: null,
      value_date: normalized,
      value_type: "date_string",
      is_null: 0,
      array_group: arrayGroup,
      array_index: arrayIndex,
    }
  }

  return {
    key,
    value_text: String(value),
    value_num: null,
    value_bool: null,
    value_date: null,
    value_type: typeof value,
    is_null: 0,
    array_group: arrayGroup,
    array_index: arrayIndex,
  }
}

function isIsoLikeDate(value) {
  return /^\d{4}-\d{2}-\d{2}(?:[Tt ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})?)?$/.test(value)
}

const upsertNote = db.prepare(`
  INSERT OR REPLACE INTO notes
  (id, path, title, folder, frontmatter_json, content_text)
  VALUES (?, ?, ?, ?, ?, ?)
`)

const deleteProps = db.prepare(`DELETE FROM properties WHERE note_id = ?`)

const insertProp = db.prepare(`
  INSERT INTO properties
  (note_id, key, value_text, value_num, value_bool, value_date, value_type, is_null, array_group, array_index)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`)

const deleteNote = db.transaction((noteId) => {
  db.prepare(`DELETE FROM properties WHERE note_id = ?`).run(noteId)
  db.prepare(`DELETE FROM notes WHERE id = ?`).run(noteId)
})

const syncNote = db.transaction((noteId, path) => {
  const md = fs.readFileSync(path, "utf-8")
  const parsed = matter(md)
  const frontmatter = parsed.data
  const content = parsed.content
  const title = frontmatter.title ?? path.split("/").pop()?.replace(/\.md$/, "") ?? noteId
  const folder = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : ""

  upsertNote.run(
    noteId,
    path,
    title,
    folder,
    JSON.stringify(frontmatter),
    content
  )

  deleteProps.run(noteId)

  for (const row of flatten(frontmatter)) {
    insertProp.run(
      noteId,
      row.key,
      row.value_text,
      row.value_num,
      row.value_bool,
      row.value_date,
      row.value_type,
      row.is_null,
      row.array_group,
      row.array_index
    )
  }
})

syncNote("note_1", "example.md")
deleteNote("deleted_note")
```

## Flattening Rules

- Objects become dotted keys, e.g. `source.kind`.
- Arrays of scalars become repeated rows with the same key.
- Arrays of objects are expanded with wildcard-style keys such as `authors[].name`.
- Rows from the same object inside an array share the same `array_group`, so related fields can be queried together without relying on position.
- Scalar arrays do not need `array_group`; storing `array_index` is enough.
- Scalars become one row with preserved type slots.
- Missing keys produce no row; explicit `null` values produce a row with `is_null = 1`.
- Preserve raw JSON so nothing is lost.

## Query Examples

Find all raw resources:

```sql
SELECT n.path
FROM notes n
JOIN properties p ON p.note_id = n.id
WHERE p.key = 'trust_level'
  AND p.value_text = 'raw';
```

Find resource notes that are active:

```sql
SELECT n.path
FROM notes n
WHERE EXISTS (
  SELECT 1 FROM properties p
  WHERE p.note_id = n.id
    AND p.key = 'type'
    AND p.value_text = 'resource'
)
AND EXISTS (
  SELECT 1 FROM properties p
  WHERE p.note_id = n.id
    AND p.key = 'status'
    AND p.value_text = 'active'
);
```

Find notes from GitHub sources:

```sql
SELECT n.path
FROM notes n
JOIN properties p ON p.note_id = n.id
WHERE p.key = 'source.kind'
  AND p.value_text = 'github';
```

Find boolean fields:

```sql
SELECT n.path
FROM notes n
JOIN properties p ON p.note_id = n.id
WHERE p.key = 'published'
  AND p.value_bool = 1;
```

Find numeric ranges:

```sql
SELECT n.path
FROM notes n
JOIN properties p ON p.note_id = n.id
WHERE p.key = 'priority'
  AND p.value_num >= 3;
```

Find explicit null values:

```sql
SELECT n.path
FROM notes n
JOIN properties p ON p.note_id = n.id
WHERE p.key = 'reviewed_by'
  AND p.is_null = 1;
```

Find notes missing a field entirely:

```sql
SELECT n.path
FROM notes n
WHERE NOT EXISTS (
  SELECT 1 FROM properties p
  WHERE p.note_id = n.id
    AND p.key = 'image_key'
);
```

Find any author named Alice:

```sql
SELECT DISTINCT n.path
FROM notes n
JOIN properties p ON p.note_id = n.id
WHERE p.key = 'authors[].name'
  AND p.value_text = 'Alice';
```

Find an author object where `name = Alice` and `role = lead` in the same array element:

```sql
SELECT DISTINCT n.path
FROM notes n
JOIN properties p1 ON p1.note_id = n.id
JOIN properties p2 ON p2.note_id = n.id
WHERE p1.array_group = p2.array_group
  AND p1.key = 'authors[].name'
  AND p1.value_text = 'Alice'
  AND p2.key = 'authors[].role'
  AND p2.value_text = 'lead';
```

## Missing-Field Semantics

- Missing field: no row exists in `properties`.
- Explicit `null`: row exists with `is_null = 1`.
- Empty string: row exists with `value_text = ''` and `is_null = 0`.

Use `NOT EXISTS` for missing-field checks. Do not treat missing, null, and empty string as equivalent.

## Drift And Deletion Handling

To keep query results correct over time:

- create or modify event: run `syncNote(noteId, path)`
- delete or rename-away event: run `deleteNote(noteId)`
- rename event: treat as `delete old path` plus `sync new path`
- periodic reconcile: scan filesystem paths, compare with `notes.path`, and remove stale rows

Because `note_id = path` in the first implementation, delete and rename handlers can use the old path directly as the record key.

Without this cleanup step, frontmatter queries can return deleted notes.

## Practical Scope

This design is sufficient for long-term frontmatter filtering when the main need is:

- exact matching
- multi-field filtering
- tag membership
- nested-object filtering
- object-array filtering without position dependence
- boolean checks
- numeric ranges
- date ranges with normalized ISO values
- missing-field audits

`views` and `view_rows` remain useful if index-page alignment matters later, but they are optional for effective frontmatter filtering.

## Non-Goals

- Replacing Markdown.
- Making SQLite the source of truth.
- Forcing all notes into one canonical frontmatter schema.

## Open Questions

- Whether Dataview-aligned `views` are needed at all for this vault.
- Should `content_text` be stored for all notes or only searchable subsets?
