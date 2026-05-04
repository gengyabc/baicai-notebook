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

### Path storage convention

The `notes.path` column stores paths **relative to `vaultRoot`** (defined in `.opencode/vault-config.json`). The full filesystem path to a note file is:

```
{vaultRoot}/{notes.path}
```

Example: If `vaultRoot = "workbook"` and `notes.path = "resources/web/file.md"`, the full path is `workbook/resources/web/file.md`.

The wrapper (`vault_index_search`) automatically prepends `vaultRoot` when returning results. Direct SQL queries must apply this transformation when reading files.

## Minimal shared retrieval contract

The broad SQLite shortlist generation uses only three conceptual shared retrieval fields:

| Contract field | Indexed property key | Description |
|---|---|---|
| `created_at` | `created` | Note creation timestamp |
| `updated_at` | `updated` | Note update timestamp |
| `tags` | `tags` | Canonical tag values |

### Field-name compatibility mapping (version 1)

The contract language describes note chronology generically as `created_at` and `updated_at`. The live index and note metadata continue to use the existing property names `created` and `updated`. This is an explicit compatibility mapping, not an implementer choice:

- `created_at` -> `created`
- `updated_at` -> `updated`

No rename of existing note frontmatter or indexed property keys is required or implied by this contract.

### Note-type-specific frontmatter

Note-type-specific frontmatter fields remain allowed and are not prohibited by the minimal shared schema. Fields such as `country`, `province`, `city`, `start_date`, `end_date`, `duration`, `organizer`, and others may exist on relevant notes. These fields are preserved inside the serialized `frontmatter_json` payload for downstream LLM-side filtering after shortlist generation. They are not required parts of the global SQLite retrieval schema.

## Serialized frontmatter JSON

The `notes.frontmatter_json` column stores the complete note frontmatter as a JSON object derived from the note's YAML frontmatter at index time. This preserves all note-type-specific metadata for downstream filtering without requiring those fields to be elevated into the shared retrieval schema.

`tags` are intentionally duplicated: they exist both as a first-class retrieval field (queryable via the `properties` table with `key = 'tags'`) and inside the serialized `frontmatter_json` payload. This dual presence is by design, not redundancy.

Training-specific fields such as `country`, `province`, `city`, `start_date`, and `end_date` are preserved in `frontmatter_json` when present on notes rather than being required global schema columns.

## Retrieval rules

1. Use `vault_index_search` as the first-pass entrypoint. No ad hoc SQL in normal retrieval flows.
2. Broad structured retrieval uses only the minimal shared retrieval contract: `tags`, `created_at` (chronology), and `updated_at` (chronology).
3. Normalize tags via `canonical-tags.json` + `tag-aliases.json`, expansions via `tag-expansions.json`.
4. Read shortlisted files before citing them. Index-only hits are not confirmed facts.
5. If retrieval broadens beyond structured shortlist, state that explicitly.
6. Ask before using web search in non-debug sessions.
7. Note-type-specific metadata inspection is a downstream filtering responsibility, not a shared-schema responsibility. LLM-side filtering over serialized frontmatter happens after SQLite shortlist generation and before full file detail reads.

## Wrapper shape

```
vault_index_search(query, limit?, folders?, constraints?)

constraints?: {
  tags?: string[],
  hierarchicalTags?: string[],
  createdStart?: string,
  createdEnd?: string,
  updatedStart?: string,
  updatedEnd?: string
}
```

- `tags` and `hierarchicalTags` are the only tag constraint inputs.
- `createdStart` and `createdEnd` filter against the indexed `created` property.
- `updatedStart` and `updatedEnd` filter against the indexed `updated` property.
- A request may provide a created window, an updated window, or both; when both are present, they are applied as an intersection.
- `limit` and `folders` are shortlist controls, not retrieval-schema fields.
- If no supported structured constraints are present, the wrapper falls back to text-fallback mode rather than treating the call as a structured-pass success.

### Fields removed from the global structured contract

The following fields are no longer part of the broad structured retrieval contract. They remain preserved in `frontmatter_json` for downstream LLM-side filtering:

- `country`, `province`, `city` (location-specific)
- `timeMode`, `start`, `end` (event-time-specific)

## Retrieval flow

The retrieval flow is a two-stage boundary:

1. **Broad SQLite shortlist generation** uses only the minimal shared retrieval contract (`tags`, `created_at`, `updated_at`).
2. **LLM-side filtering** evaluates the preserved serialized frontmatter on shortlisted candidates before full file detail reads.

Full file reads happen only after shortlist generation and any frontmatter-based LLM filtering.

## Shortlist policy

Shortlist acceptance is context-budget-aware rather than a single fixed global candidate-count threshold. The first version does not freeze one universal token-to-candidate conversion formula, but it clearly prohibits a single hardcoded global shortlist threshold as the contract rule. Shortlist tolerance depends on available context budget.

## Diagnostics

Stage diagnostics use a small stable label set:

| Label | Meaning |
|---|---|
| `[structured]` | The minimal contract constraints were applied and candidates returned |
| `[frontmatter-filter]` | Serialized frontmatter narrowed or skipped shortlisted candidates before full file reads |
| `[text-fallback]` | The flow left the broad structured path and used text search fallback |
| `[unavailable]` | Wrapper or index unavailability, or unusable serialized frontmatter |

### Minimum failure behavior

- If the wrapper or SQLite index is unavailable, the retrieval flow reports `[unavailable]` and does not claim a structured shortlist succeeded.
- If a shortlisted note lacks usable serialized frontmatter JSON, the flow reports `[unavailable]` for frontmatter filtering on that note and may continue with full file reads or later fallback behavior without inventing JSON-derived facts.
- If the structured pass returns no candidates, the flow may continue into text-fallback behavior and must report that transition.

## Tag evolution

Early tag usage remains flexible. No artifact in the current contract makes global retrieval correctness depend on fully normalized or human-approved tag governance beyond the minimal contract language already frozen by prior steps. Stricter tag normalization is deferred until tag growth creates enough operational pressure to justify governance.

## Provenance

Keep these distinct: file-backed facts, index-only hits, network-derived info, and hypotheses.
