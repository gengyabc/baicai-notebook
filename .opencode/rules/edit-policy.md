# Edit Policy

For note schemas and `image_key`, see `.opencode/rules/metadata-conventions.md`. For folder semantics, duplicate control, and index expectations, see `.opencode/rules/core-vault.md`.

## By folder

- `workbook/my-work/`: preserve the user's writing voice, structure, and unfinished thinking; prefer additive edits
- `workbook/resources/`: normalize metadata, summaries, provenance, and grouping; do not rewrite source content misleadingly, delete captured files, rename original files, or do large tree-wide refactors
- `workbook/brainstorm/`: cluster, refactor, expand, or split ideas freely while preserving traceability, but keep the structure within `todo/` and `active/`
- `workbook/wiki/`: make conservative edits that improve clarity, support, and link quality while keeping claims stable, traceable, and indexed
- `workbook/output/`: shape content around the user's requested deliverable and keep new pages indexed

## Logging

- When a change materially restructures `workbook/wiki/`, append a short note to `workbook/wiki/log.md` if that file exists.
- When creating or materially changing `workbook/wiki/` or `workbook/output/` pages, update the relevant `index.md`.
- When creating new brainstorm items, update `workbook/brainstorm/index.md`.
- Root `index.md` should reflect structural changes but does not require frequent updates.
