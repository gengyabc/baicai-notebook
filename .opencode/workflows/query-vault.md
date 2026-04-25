# Workflow: Query Vault

## Goal

Answer a user question from the vault with the right confidence level and provenance.

This workflow is enforced by a retrieval hook plus a SQLite-backed shortlist tool.

## Inputs

- user question
- optional topic, note, project, or file scope

## Steps

1. Unless debug mode is active, start with `vault_index_search` against `.opencode/frontmatter-index.sqlite` to build a ranked shortlist of candidate notes.
2. Apply folder priority when interpreting shortlist results: `workbook/wiki/` first, then `workbook/output/`, then `workbook/resources/`, then `workbook/brainstorm/`, then `workbook/my-work/`.
3. Read only the shortlisted files first.
4. Prefer `workbook/wiki/index.md`, `workbook/output/index.md`, and relevant `workbook/wiki/` or `workbook/output/` pages for stable answers when they appear in the shortlist.
5. Pull `workbook/resources/` for supporting evidence and provenance.
6. Use `workbook/brainstorm/` only for tentative synthesis or future directions.
7. Use `workbook/my-work/` only to understand current context and user intent.
8. If the shortlist is empty or clearly insufficient, you may read outside the shortlist, but say that the indexed results were insufficient before broadening retrieval.
9. Present the answer using the `query-confidence` rules: explicit confidence, confirmed facts vs working hypotheses, and any evidence conflicts.

## Skills

- load `second-brain-query`

## Outputs

- concise answer
- confidence label
- note or folder provenance when practical
- acknowledgement when retrieval had to expand beyond the SQLite shortlist
