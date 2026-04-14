# Workflow: Distill Brainstorm

## Goal

Turn messy idea material in `brainstorm/todo` and `brainstorm/active` into clearer hypotheses, clusters, questions, and next steps while keeping it explicitly speculative.

## Inputs

- one or more brainstorm notes
- related `my-work/` and `resources/` notes when available

## Steps

1. Read the target brainstorm material and confirm it lives in `brainstorm/todo` or `brainstorm/active`.
2. Separate observations, hypotheses, tensions, and open questions.
3. Rewrite or split notes for clarity while preserving speculative status.
4. Move notes between `todo/` and `active/` as their state becomes clearer.
5. Normalize metadata to the brainstorm schema, including `derived_from`, `confidence`, `status`, and `image_key`.
6. Create links to supporting resources and adjacent brainstorm themes.
7. Mark promotion candidates, but do not promote automatically or write `wiki/` as part of this workflow.

## Skills

- load `brainstorm-distill`
- load `second-brain-ingest` if routing decisions are needed

## Outputs

- cleaner brainstorm notes within `todo/` and `active/`
- explicit hypotheses and questions
- optional promotion candidates for later wiki solidification
