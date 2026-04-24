# Workflow: Query Vault

## Goal

Answer a user question from the vault with the right confidence level and provenance.

This workflow is enforced by a retrieval hook plus a SQLite-backed shortlist tool.

## Inputs

- user question
- optional topic, note, project, or file scope

## Steps

1. Unless debug mode is active, start with `vault_index_search` against `.opencode/frontmatter-index.sqlite` to build a ranked shortlist of candidate notes.
2. Apply folder priority when interpreting shortlist results: `wiki/` first, then `output/`, then `resources/`, then `brainstorm/`, then `my-work/`.
3. Read only the shortlisted files first.
4. Prefer `wiki/index.md`, `output/index.md`, and relevant `wiki/` or `output/` pages for stable answers when they appear in the shortlist.
5. Pull `resources/` for supporting evidence and provenance.
6. Use `brainstorm/` only for tentative synthesis or future directions.
7. Use `my-work/` only to understand current context and user intent.
8. If the shortlist is empty or clearly insufficient, you may read outside the shortlist, but say that the indexed results were insufficient before broadening retrieval.
9. Present the answer using the `query-confidence` rules: explicit confidence, confirmed facts vs working hypotheses, and any evidence conflicts.

## Skills

- load `second-brain-query`

## Outputs

- concise answer
- confidence label
- note or folder provenance when practical
- acknowledgement when retrieval had to expand beyond the SQLite shortlist
