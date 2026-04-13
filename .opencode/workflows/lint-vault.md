# Workflow: Lint Vault

## Goal

Audit the knowledge vault for metadata drift, missing provenance, indexing gaps, attachment locality issues, structural drift, and promotion opportunities.

## Inputs

- full vault or user-selected folder scope

## Steps

1. Check frontmatter coverage and schema fit for `resources/`, `brainstorm/`, `wiki/`, and `output/` notes.
2. Flag missing `image_key` fields.
3. Check whether `wiki/` and `output/` pages are represented in `wiki/index.md` and `output/index.md` when those indexes exist.
4. Identify orphan notes, duplicate topics, weakly linked pages, and missing or stale index entries.
5. Flag wiki claims that lack supporting sources.
6. Flag brainstorm notes that drift away from the `todo/active` structure.
7. Flag attachment patterns that break locality, such as cross-directory attachment reuse or global asset dependencies.
8. Flag brainstorm notes that have enough support to consider promotion.
9. Flag resource notes that lack summaries, provenance, or link targets.
10. Check whether `wiki/log.md` entries use a consistent date-prefixed format when the file exists.
11. Report findings in order of severity and suggest the smallest corrective next steps.

## Skills

- load `second-brain-lint`

## Subagents

- use `provenance-auditor` for evidence gaps and wiki support issues
- use `wiki-curator` for duplicate or structure-related findings

## Outputs

- prioritized findings
- promotion candidates
- concrete cleanup suggestions
