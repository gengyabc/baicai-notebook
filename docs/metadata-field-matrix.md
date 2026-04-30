# Metadata Field Matrix

This matrix is the operational companion to `.opencode/rules/metadata-conventions.md`.

Legend:

- `R`: required
- `O`: optional
- `D`: domain-specific
- `G`: governed by alias registry (see `.opencode/alias-registry.md`)
- `-`: not needed by default

| Field | `workbook/my-work/` | `workbook/brainstorm/todo` + `active` | `workbook/brainstorm/managed` | `workbook/resources/` | generated `workbook/wiki/` | human `workbook/output/` | generated `workbook/output/` |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `type` | R | R | R | R | R | R | R |
| `kind` | R | R | R | R | R | R | R |
| `created` | R | R | R | R | R | R | R |
| `updated` | R | R | R | R | R | R | R |
| `imageNameKey` | R | R | R | R | R | R | R |
| `description` | R | R | R | R | R | R | R |
| `status` | R | R | R | R | R | R | R |
| `tags` | R/G | R/G | R/G | R/G | R/G | R/G | R/G |
| `source_type` | - | - | R | R | R | - | R |
| `content_role` | - | - | R | R | R | - | R |
| `trust_level` | - | - | R | R | R | - | R |
| `verification` | - | - | R | R | R | - | R |
| `llm_stage` | - | - | R | R | R | - | R |
| `source_ref` | O | O | O | O | O | O | O |
| `source` | O | O | O | O | O | O | O |
| `canonical_topic` | - | O/G | O/G | O/G | O/G | - | O/G |
| `derived_from` | O | O | O | O | O | O | O |
| `entity_refs` | - | - | O | O | O | - | O |
| `topic_refs` | - | - | O | O | O | - | O |
| `country` | D/G | D/G | D/G | D/G | D/G | D/G | D/G |
| `province` | D/G | D/G | D/G | D/G | D/G | D/G | D/G |
| `city` | D/G | D/G | D/G | D/G | D/G | D/G | D/G |
| `llm_description_done` | - | - | R | R | - | - | - |
| `ingest_status` | - | - | R | R | - | - | - |
| `normalized_at` | - | - | R | R | - | - | - |
| `source_hash` | - | - | R | R | - | - | - |
| `source_path` | - | - | R | R | - | - | - |
| domain-specific fields | D | D | D | D | D | D | D |

## Notes

- `workbook/brainstorm/` is human-minimal by default.
- `workbook/brainstorm/managed/` is the explicit opt-in area for LLM-managed brainstorm notes.
- Human-managed notes should preserve useful domain fields instead of being flattened into generic metadata.
- LLM-managed notes should only carry provenance and pipeline fields that a workflow actually uses.
- Fields marked `G` are governed by the alias registry at `.opencode/alias-registry.md`. Lint checks report non-canonical values as advisory findings.
- `tags` are governed for retrieval consistency: canonical tag values and accepted aliases are defined in the alias registry. Tags remain a retrieval aid; time and location semantics belong in structured fields.
- `country`, `province`, and `city` are domain-specific (`D`) for most note families but governed (`G`) when present. When `country` is absent from a note, retrieval defaults to `中国` at the metadata/index layer per the policy in `metadata-conventions.md`.
- `canonical_topic` is optional and governed (`G`) only where a retrieval workflow materially depends on it. It is not a universal required field.
