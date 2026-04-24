# Metadata Field Matrix

This matrix is the operational companion to `.opencode/rules/metadata-conventions.md`.

Legend:

- `R`: required
- `O`: optional
- `D`: domain-specific
- `-`: not needed by default

| Field | `my-work/` | `brainstorm/todo` + `active` | `brainstorm/managed` | `resources/` | generated `wiki/` | human `output/` | generated `output/` |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `type` | R | R | R | R | R | R | R |
| `kind` | R | R | R | R | R | R | R |
| `created` | R | R | R | R | R | R | R |
| `updated` | R | R | R | R | R | R | R |
| `image_key` | R | R | R | R | R | R | R |
| `description` | R | R | R | R | R | R | R |
| `status` | R | R | R | R | R | R | R |
| `tags` | R | R | R | R | R | R | R |
| `source_type` | - | - | R | R | R | - | R |
| `content_role` | - | - | R | R | R | - | R |
| `trust_level` | - | - | R | R | R | - | R |
| `verification` | - | - | R | R | R | - | R |
| `llm_stage` | - | - | R | R | R | - | R |
| `source_ref` | O | O | O | O | O | O | O |
| `source` | O | O | O | O | O | O | O |
| `canonical_topic` | - | O | O | O | O | - | O |
| `derived_from` | O | O | O | O | O | O | O |
| `entity_refs` | - | - | O | O | O | - | O |
| `topic_refs` | - | - | O | O | O | - | O |
| `llm_description_done` | - | - | R | R | - | - | - |
| `ingest_status` | - | - | R | R | - | - | - |
| `normalized_at` | - | - | R | R | - | - | - |
| `source_hash` | - | - | R | R | - | - | - |
| `source_path` | - | - | R | R | - | - | - |
| domain-specific fields | D | D | D | D | D | D | D |

## Notes

- `brainstorm/` is human-minimal by default.
- `brainstorm/managed/` is the explicit opt-in area for LLM-managed brainstorm notes.
- Human-managed notes should preserve useful domain fields instead of being flattened into generic metadata.
- LLM-managed notes should only carry provenance and pipeline fields that a workflow actually uses.
