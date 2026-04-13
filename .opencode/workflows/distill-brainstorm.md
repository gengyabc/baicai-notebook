# Workflow: Distill Brainstorm

## Goal

Turn messy idea material into clearer hypotheses, clusters, questions, and next steps while keeping it explicitly speculative.

## Inputs

- one or more brainstorm notes
- related `my-work/` and `resources/` notes when available

## Steps

1. Read the target brainstorm material and identify topic clusters.
2. Separate observations, hypotheses, tensions, and open questions.
3. Rewrite or split notes for clarity while preserving speculative status.
4. Add `derived_from`, `confidence`, and `status` metadata where missing.
5. Create links to supporting resources and adjacent brainstorm themes.
6. Mark promotion candidates, but do not promote automatically unless the user or workflow explicitly requests it.

## Skills

- load `brainstorm-distill`
- load `second-brain-ingest` if routing decisions are needed

## Subagents

- use `brainstorm-catalyst` for larger thematic clustering or fresh synthesis
- use `vault-researcher` if missing evidence should be gathered before refining claims

## Outputs

- cleaner brainstorm notes
- explicit hypotheses and questions
- optional promotion candidates for later wiki solidification
