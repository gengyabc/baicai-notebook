# Workflow: Lint Vault

## Goal

Audit the knowledge vault for metadata drift, missing provenance, indexing gaps, attachment locality issues, structural drift, promotion opportunities, and metadata governance compliance.

## Inputs

- full vault or user-selected folder scope

## Exclusions

Skip files that are:
- Excalidraw drawings (files with `excalidraw-plugin` frontmatter key or `.excalidraw` extension)
- Obsidian plugin files under `.obsidian/plugins/`
- Templates under `workbook/Templates/`

## Steps

1. Check frontmatter coverage and schema fit for `workbook/resources/`, `workbook/brainstorm/`, `workbook/wiki/`, and `workbook/output/` notes.
2. Flag missing `imageNameKey` fields.
3. Check whether `workbook/wiki/` and `workbook/output/` pages are represented in `workbook/wiki/index.md` and `workbook/output/index.md` when those indexes exist.
4. Identify orphan notes, duplicate topics, weakly linked pages, and missing or stale index entries.
5. Flag wiki claims that lack supporting sources.
6. Flag brainstorm notes that drift away from the `todo/active` structure.
7. Flag attachment patterns that break locality, such as cross-directory attachment reuse or global asset dependencies.
8. Flag brainstorm notes that have enough support to consider promotion.
9. Flag resource notes that lack summaries, provenance, or link targets.
10. Check whether `workbook/wiki/log.md` entries use a consistent date-prefixed format when the file exists.
11. Check for alias drift: flag tags, location values (`country`, `province`, `city`), and `canonical_topic` values that do not match canonical entries in `.opencode/alias-registry.md`. Report as advisory findings, not hard-blocking errors.
12. Check for uncontrolled tag growth: flag notes with unusually large tag lists or tags that appear only once in the vault, suggesting drift rather than intentional categorization.
13. Check for non-canonical retrieval metadata: flag notes where time or location semantics have been duplicated into tags rather than expressed through dedicated structured fields (`created`, `updated`, `start_date`, `end_date`, `country`, `province`, `city`).
14. Check tag cap threshold: if `canonical-tags.json` tag count exceeds `tagCapThreshold` in `.opencode/vault-config.json`, flag as advisory warning.
15. Suggest tag consolidation opportunities:
    - Tags used by fewer than 3 notes (candidates for removal or alias consolidation)
    - Semantically overlapping tags (alias candidates for `tag-aliases.json`)
    - Unused expansion relationships in `tag-expansions.json`
16. Suggest alias additions: identify non-canonical tags that match existing canonical semantics.
17. Report findings in order of severity and suggest the smallest corrective next steps.

## Governance checks

The lint workflow includes advisory governance checks based on the metadata policy in `.opencode/rules/metadata-conventions.md` and the alias registry in `.opencode/alias-registry.md`.

These checks are advisory during first-stage governance:

- Alias drift findings suggest normalization but do not block note authoring.
- Tag growth findings suggest consolidation but do not prevent note creation.
- Non-canonical metadata findings suggest alignment with structured fields but do not auto-rewrite frontmatter.

Stronger whitelist-style admission control may be introduced later when scale and drift justify it. Until then, all governance findings are reported for human review rather than enforced automatically.

## Skills

- load `second-brain-lint`

## Outputs

- prioritized findings
- promotion candidates
- concrete cleanup suggestions
- advisory governance findings (alias drift, tag growth, non-canonical retrieval metadata)
