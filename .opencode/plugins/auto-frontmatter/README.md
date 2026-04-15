# Auto Frontmatter Plugin

Automatically adds or completes YAML frontmatter for Markdown files in vault content folders.

## Target Folders

- `resources/` and `Resources/`
- `brainstorm/`
- `wiki/`
- `output/`
- `my-work/` and `My-work/`

## Behavior

- Watches for `file.watcher.updated` and `file.edited` events on `.md` files
- Derives `image_key` from filename using lowercase alphanumeric hyphenation
- Applies a folder-specific default schema
- Uses standard YAML parsing and writing instead of line-based parsing
- Adds missing core fields from `.opencode/rules/metadata-conventions.md`
- Synchronizes required `state/*`, `source/*`, and `role/*` tags from frontmatter values
- Preserves topic tags and any unknown frontmatter fields
- Refreshes `updated` on each write day and remains idempotent for repeated same-day runs
- Generates a short `description` from the note body when missing
- Records `llm_description_done` and `llm_rename_done` so expensive passes can be skipped later
- Ensures managed resource buckets exist under `resources/` and `Resources/`

## Schema Mapping

| Folder | Default `type` |
|--------|----------------|
| `resources/` | `resource` |
| `brainstorm/` | `brainstorm` |
| `wiki/` | `wiki` |
| `output/` | `output` |
| `my-work/` | `my-work` |

## Managed resource buckets

- `resources/inbox/`
- `resources/web/`
- `resources/local/`
- `resources/archive/`
- Case-variant aliases are handled the same way under `Resources/`

## Constraints

- Does not overwrite existing non-empty frontmatter fields except `updated`, which is refreshed automatically
- Skips non-Markdown files
- Skips files outside target folders
- Logs warnings on YAML parse failures or read/write errors
- Does not perform content analysis, promotion, summarization, or entity extraction
