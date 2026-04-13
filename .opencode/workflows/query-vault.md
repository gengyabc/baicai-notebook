# Workflow: Query Vault

## Goal

Answer a user question from the vault with the right confidence level and provenance.

## Inputs

- user question
- optional topic, note, project, or file scope

## Steps

1. Read `wiki/index.md` first when it exists.
2. Search the relevant `wiki/` pages for stable answers.
3. Pull `resources/` for supporting evidence and provenance.
4. Use `brainstorm/` only for tentative synthesis or future directions.
5. Use `my-work/` only to understand current context and user intent.
6. Present the answer using the `query-confidence` rules: explicit confidence, confirmed facts vs working hypotheses, and any evidence conflicts.

## Skills

- load `second-brain-query`

## Subagents

- use `vault-researcher` for broad evidence gathering
- use `provenance-auditor` if the answer depends on conflicting or weak support

## Outputs

- concise answer
- confidence label
- note or folder provenance when practical
