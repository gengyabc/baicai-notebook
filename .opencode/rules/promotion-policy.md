# Promotion Policy

For folder semantics and duplicate control, see `.opencode/rules/core-vault.md`. For retrieval confidence and answer style, see `.opencode/rules/query-confidence.md`.

## Brainstorm versus wiki

`workbook/brainstorm/` is allowed to be:

- wrong
- incomplete
- associative
- exploratory
- contradictory

`workbook/wiki/` is expected to be:

- grounded
- traceable
- clearer
- conflict-aware
- relatively stable

## Promotion test

Default promotion flow is `workbook/my-work -> workbook/resources -> workbook/brainstorm -> workbook/wiki -> workbook/output`.

Do not promote material directly from `workbook/my-work/` or `workbook/resources/` into `workbook/wiki/` by default. Entry into `workbook/wiki/` must go through the explicit `solidify` gate.

Promote content from `workbook/brainstorm/` to `workbook/wiki/` only when most of the following are true:

- the claim has repeated support from `workbook/resources/` or strong user-authored evidence
- the note can be normalized without losing important uncertainty
- provenance can be attached directly in the wiki note
- the content will likely be useful as durable memory later

## Promotion behavior

- `solidify` is the only promotion gate into `workbook/wiki/`.
- Prefer promoting selected grounded claims, not entire speculative notes.
- Preserve a backlink from the wiki page to the brainstorm source when helpful.
- If source material from `workbook/resources/` is strong, distill the grounded claims through `workbook/brainstorm/` or an explicit solidify review before updating `workbook/wiki/`.
- If the evidence is mixed, keep the synthesis in `workbook/brainstorm/` and record the tension explicitly.
