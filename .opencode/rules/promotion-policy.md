# Promotion Policy

For folder semantics and duplicate control, see `.opencode/rules/core-vault.md`. For retrieval confidence and answer style, see `.opencode/rules/query-confidence.md`.

## Brainstorm versus wiki

`brainstorm/` is allowed to be:

- wrong
- incomplete
- associative
- exploratory
- contradictory

`wiki/` is expected to be:

- grounded
- traceable
- clearer
- conflict-aware
- relatively stable

## Promotion test

Default promotion flow is `my-work/resources -> brainstorm -> wiki -> output`.

Do not promote material directly from `my-work/` or `resources/` into `wiki/` by default. Entry into `wiki/` must go through the explicit `solidify` gate.

Promote content from `brainstorm/` to `wiki/` only when most of the following are true:

- the claim has repeated support from `resources/` or strong user-authored evidence
- the note can be normalized without losing important uncertainty
- provenance can be attached directly in the wiki note
- the content will likely be useful as durable memory later

## Promotion behavior

- `solidify` is the only promotion gate into `wiki/`.
- Prefer promoting selected grounded claims, not entire speculative notes.
- Preserve a backlink from the wiki page to the brainstorm source when helpful.
- If source material from `resources/` is strong, distill the grounded claims through `brainstorm/` or an explicit solidify review before updating `wiki/`.
- If the evidence is mixed, keep the synthesis in `brainstorm/` and record the tension explicitly.
