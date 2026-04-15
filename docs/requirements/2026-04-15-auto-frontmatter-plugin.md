# Auto Frontmatter Plugin

**Status:** ready  
**Key:** auto-frontmatter-plugin  
**Created:** 2026-04-15

---

## Title

Auto Frontmatter Plugin for Vault Content Folders

## Focus

Automatically add or complete YAML frontmatter for new or modified Markdown files in vault content folders via an OpenCode file watcher plugin, using the canonical metadata schema from `.opencode/rules/metadata-conventions.md`.

## In Scope

- Watch `resources/`, `brainstorm/`, `wiki/`, `output/`, and `my-work/` plus case variants for new or modified `.md` files
- Auto-generate `image_key` derived from filename
- Apply folder-specific default schema using `type`, `kind`, `source_type`, and `content_role`
- Populate standard lifecycle fields: `created`, `updated`, `status`, `trust_level`, `verification`, `llm_stage`
- Populate optional structural fields when missing: `canonical_topic`, `source_ref`, `derived_from`, `entity_refs`, `topic_refs`
- Synchronize required tags from frontmatter: one `state/*`, one `source/*`, one `role/*`
- Preserve up to two existing `topic/*` tags
- Merge with existing frontmatter: add missing fields, preserve existing fields, preserve unknown custom fields
- Create frontmatter for files that have none

## Out of Scope

- Auto-tagging based on content analysis
- Generating summaries, entities, topics, or wiki pages
- Promotion into `wiki/`
- Deleting or renaming files
- Large batch retroactive processing beyond normal watcher behavior
- Overwriting user-authored semantic fields without a deterministic mapping

## Constraints

- Must use OpenCode plugin system with `file.watcher.updated` event hook
- Must follow `.opencode/rules/metadata-conventions.md` as the schema source of truth
- Must handle case-variant folders as aliases
- Must be idempotent for repeated same-day runs
- Must use a real YAML parser instead of line-based parsing to avoid dropping arrays or nested structures
- Must not conflict with existing ingest workflows or promotion rules

## Assumptions

- OpenCode `file.watcher.updated` fires reliably for file creation and modification
- Filename sanitization produces valid `image_key` values using lowercase alphanumeric hyphens
- Plugin runtime can load dependencies from `.opencode/package.json`
- Existing notes may include extra frontmatter fields that should be preserved verbatim

## Success Criteria

- Every new `.md` file created in target folders has complete frontmatter within seconds
- `image_key` is present and valid
- `type`, `kind`, `source_type`, and `content_role` exist and match the folder defaults unless already set
- `updated` refreshes on plugin writes without causing runaway churn
- Required `state/*`, `source/*`, and `role/*` tags are always present and consistent with the fields
- Existing nested arrays or objects in frontmatter are preserved
- Plugin does not throw errors on empty files, malformed files, or files outside the watched scope

---

## Decomposition

1. Update canonical metadata and tag conventions.
2. Refactor the plugin to use safe YAML parsing and folder-scoped templates.
3. Align example/index notes with the new schema.
4. Validate config and plugin behavior.

---

## Open Questions

None.

## Planning Risks

- Rapid successive file writes may trigger duplicate processing, mitigated by idempotent merge logic and same-day `updated` behavior
- Rewriting frontmatter may normalize formatting, mitigated by preserving unknown fields and using stable field ordering
