# Workflow: Query Vault

## Goal

Answer a user question from the vault with the right confidence level and provenance.

## Inputs

- user question
- optional topic, note, project, or file scope

## Steps

1. Search `wiki/` first for stable answers.
2. Pull `resources/` for supporting evidence and provenance.
3. Use `brainstorm/` only for tentative synthesis or future directions.
4. Use `my-work/` to understand current context and user intent.
5. Present the answer with explicit confidence and note any evidence conflicts.

## Skills

- load `second-brain-query`

## Subagents

- use `vault-researcher` for broad evidence gathering
- use `provenance-auditor` if the answer depends on conflicting or weak support

## Outputs

- concise answer
- confidence label
- note or folder provenance when practical
