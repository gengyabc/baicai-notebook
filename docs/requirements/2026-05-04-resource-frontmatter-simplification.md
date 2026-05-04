## Status

- ready

## Title

Simplify Resource Frontmatter And Tag Responsibilities

## Focus

Simplify `workbook/resources/` frontmatter by removing low-value or redundant fields, keeping the current retrieval mechanism unchanged, and clarifying that provenance, status, and source classification each have one clear carrier.

## In Scope

- Simplify the frontmatter schema used for notes under `workbook/resources/`
- Keep the current retrieval mechanism unchanged
- Keep `status` as a structured field
- Keep `source/*` tags as the source classification mechanism
- Keep external provenance in `source`
- Remove fields whose meaning is redundant with file path, tags, or existing pipeline flags
- Update the auto-frontmatter plugin behavior to match the new schema
- Ensure migrated or newly generated resource notes do not drift between structured fields and tags for source semantics

## Out Of Scope

- Changing the SQLite retrieval contract
- Changing `vault_index_search` behavior
- Redesigning tags beyond the resource-source simplification discussed here
- Changing non-resource note families such as `workbook/wiki/`, `workbook/my-work/`, or human-managed notes
- Full implementation details for migration rollout unless required by the implementation step

## Constraints

- Keep the current retrieval mechanism unchanged
- `status` must remain as a structured field
- `source/*` tags must remain
- `source_path` must be removed
- Frontmatter should avoid duplicate carriers for the same meaning where possible
- The resource pipeline should preserve enough metadata for provenance, pipeline status, and lightweight automation

## Assumptions

- For `workbook/resources/`, file path already conveys enough container/location information, so `source_path` is unnecessary
- `type` and `kind` provide little value for ordinary resource notes relative to folder location and filename conventions
- `llm_stage`, `content_role`, `trust_level`, `verification`, and `canonical_topic` are not providing enough operational value to justify their ongoing maintenance cost in this note family
- Source classification does not need a separate `source_type` field if `source/*` tags remain the canonical carrier
- External resource notes should keep `source` when provenance is available and relevant

## Success Criteria

- Resource notes no longer carry `type`, `kind`, `source_type`, `content_role`, `trust_level`, `verification`, `llm_stage`, `canonical_topic`, or `source_path`
- Resource notes continue to carry `created`, `updated`, `imageNameKey`, `description`, `status`, `tags`, `llm_description_done`, `llm_tags`, `ingest_status`, and `source_hash`
- External resources can carry `source` as the provenance field
- Source classification is represented via `source/*` tags only, not duplicated in a separate `source_type` field
- Status remains represented as a structured `status` field
- The auto-frontmatter plugin generates and preserves the simplified schema consistently for new and updated resource notes
- Existing retrieval and filtering flows continue to work without requiring changes to the shared retrieval contract

## Decomposition

1. Audit current resource frontmatter generation and identify all places that write or depend on removed fields.
2. Update the auto-frontmatter plugin schema generation for `workbook/resources/` to stop writing removed fields.
3. Define how `source/*` tags are derived and synchronized without `source_type`.
4. Ensure `source` is preserved or added when external provenance is available.
5. Update any resource-specific workflows or docs that still describe removed fields.
6. Decide whether and how to backfill existing resource notes to the simplified schema.
7. Verify that existing retrieval behavior and resource enhancement workflows still operate correctly.

## Key

- resource-frontmatter-simplification
