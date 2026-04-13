# Edit Policy

For note schemas and `image_key`, see `.opencode/rules/metadata-conventions.md`. For folder semantics, duplicate control, and index expectations, see `.opencode/rules/core-vault.md`.

## By folder

- `my-work/` or `My-work/`: preserve the user's writing voice, structure, and unfinished thinking; prefer additive edits
- `resources/` or `Resources/`: normalize metadata, summaries, provenance, and grouping; do not rewrite source content misleadingly, delete captured files, rename original files, or do large tree-wide refactors
- `brainstorm/`: cluster, refactor, expand, or split ideas freely while preserving traceability, but keep the structure within `todo/` and `active/`
- `wiki/`: make conservative edits that improve clarity, support, and link quality while keeping claims stable, traceable, and indexed
- `output/`: shape content around the user's requested deliverable and keep new pages indexed

## Writing behavior

- Distinguish fact, interpretation, and hypothesis.
- When support is weak, mark uncertainty instead of overstating.
- Prefer concise additions over large rewrites unless the task explicitly asks for restructuring.
- Preserve useful backlinks and local-file or Zotero links.
- Use local `attachments/` directories instead of shared global asset folders.

## Logging

- When a change materially restructures `wiki/`, append a short note to `wiki/log.md` if that file exists.
- When creating or materially changing `wiki/` or `output/` pages, update the relevant `index.md`.
- When creating new brainstorm items, update `brainstorm/index.md`.
- Root `index.md` should reflect structural changes but does not require frequent updates.
