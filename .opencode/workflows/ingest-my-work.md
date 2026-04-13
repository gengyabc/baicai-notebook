# Workflow: Ingest My Work

## Goal

Turn active notes from `my-work/` or `My-work/` into better-organized downstream artifacts without flattening the user's intent.

## Inputs

- target paths, note names, or user scope
- existing related notes in `my-work/`, `brainstorm/`, `wiki/`, and `resources/`

## Steps

1. Read the target note or notes and identify the note's role: active work, decision, project context, question, or hypothesis.
2. Preserve active wording in place when the note is still live working material.
3. Extract durable ideas, repeated themes, and explicit open questions.
4. Route derived material by default into `brainstorm/`, not `wiki/`.
5. If source references are mentioned but not captured, create or request `resources/` notes with provenance and `image_key`.
6. Only send clearly grounded material toward `wiki/` through the explicit `solidify` workflow.
7. Add links between the active note and any derived brainstorm or wiki notes.
8. If derived material is ready for `wiki/`, hand it off to `solidify` and let that workflow handle `wiki/` maintenance.

## Skills

- load `second-brain-ingest` for routing and note extraction
- load `solidify-to-wiki` only if grounded material clearly belongs in `wiki/`

## Subagents

- use `brainstorm-catalyst` for clustering or idea expansion when the material is exploratory
- use `wiki-curator` when promotion requires careful deduplication or normalization

## Outputs

- preserved active note
- linked brainstorm updates and optional wiki promotion candidates
- optional source capture tasks or resource stubs
