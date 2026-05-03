---
name: second-brain-lint
description: Audit the vault for metadata issues, provenance gaps, duplicates, and promotion candidates
compatibility: opencode
---
## What I do

- check metadata consistency (excluding Excalidraw drawings and Obsidian plugin files)
- identify orphan notes, missing index entries, and duplicate concepts
- spot wiki notes with weak sourcing
- spot brainstorm notes that are candidates for promotion
- check attachment locality and `imageNameKey` coverage
- check for alias drift against the alias registry at `.opencode/alias-registry.md`
- check for uncontrolled tag growth and non-canonical retrieval metadata
- flag tags, location values, and `canonical_topic` values that do not match canonical entries
- check tag cap threshold and suggest consolidation when exceeded
- suggest alias additions for semantically matching tags
- identify unused expansion relationships

## Exclusions

Skip:
- Excalidraw drawings (`excalidraw-plugin` frontmatter or `.excalidraw` extension)
- Obsidian plugin files under `.obsidian/plugins/`
- Template files under `workbook/Templates/`

## When to use me

Use this for periodic quality review, duplicate finding, promotion screening, or metadata governance drift detection.

## Governance checks

Advisory governance checks are based on the metadata policy in `.opencode/rules/metadata-conventions.md` and the alias registry in `.opencode/alias-registry.md`.

- Alias drift: flag non-canonical tag, location, and `canonical_topic` values as advisory findings.
- Tag growth: flag unusually large tag lists or singleton tags that suggest drift.
- Non-canonical retrieval metadata: flag time or location semantics duplicated into tags instead of structured fields.
- Tag cap: flag when `canonical-tags.json` exceeds threshold configured in `vault-config.json`.
- Alias consolidation: suggest adding aliases to `tag-aliases.json` when tags match existing canonical semantics.
- Expansion cleanup: flag unused entries in `tag-expansions.json`.

All governance findings are advisory during first-stage governance. They suggest normalization and alignment but do not block note authoring or auto-rewrite frontmatter. Hard-blocking admission control is deferred until scale and drift justify it.

## Constraints

- report findings before recommendations
- prefer the smallest corrective action
- governance findings are advisory, not hard-blocking
- do not auto-rewrite note frontmatter based on governance findings
