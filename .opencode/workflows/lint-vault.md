# Workflow: Lint Vault

## Goal

Audit the knowledge vault for metadata drift, missing provenance, orphan notes, duplicate concepts, and promotion opportunities.

## Inputs

- full vault or user-selected folder scope

## Steps

1. Check frontmatter coverage and schema fit for `resources/`, `brainstorm/`, and `wiki/` notes.
2. Identify orphan notes, duplicate topics, and weakly linked pages.
3. Flag wiki claims that lack supporting sources.
4. Flag brainstorm notes that have enough support to consider promotion.
5. Flag resource notes that lack summaries, provenance, or link targets.
6. Report findings in order of severity and suggest the smallest corrective next steps.

## Skills

- load `second-brain-lint`

## Subagents

- use `provenance-auditor` for evidence gaps and wiki support issues
- use `wiki-curator` for duplicate or structure-related findings

## Outputs

- prioritized findings
- promotion candidates
- concrete cleanup suggestions
