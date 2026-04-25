# Core Vault Rules

## Folder semantics

- `workbook/my-work/` is the active intent layer.
- `workbook/resources/` is LLM-managed storage for captured sources, evidence, and supporting material, with guardrails.
- `workbook/brainstorm/` is the speculative thinking layer and is human-managed by default.
- `workbook/brainstorm/todo/` and `workbook/brainstorm/active/` are the default lightweight brainstorm areas.
- `workbook/brainstorm/managed/` is the explicit opt-in area for LLM-managed brainstorm notes.
- `workbook/wiki/` is the durable knowledge layer and should be maintained `index-first`.
- `workbook/output/` is the deliverable layer and should be maintained `index-first`.

For retrieval order, promotion, and schema details, follow `.opencode/rules/query-confidence.md`, `.opencode/rules/promotion-policy.md`, and `.opencode/rules/metadata-conventions.md`.

## Knowledge standard

- External material should become Markdown in `workbook/resources/`.
- Important binaries should have a Markdown sidecar.
- Bare URLs are insufficient; keep provenance, summary, and context.
- Prefer durable notes over ephemeral references.
- Root `index.md` serves as the vault navigation hub; read it first when understanding vault structure.
- `workbook/resources/` may grow deep topic structure, but only through incremental organization; do not delete captured source files or rename original source files.
- `workbook/wiki/` and `workbook/output/` may grow freely, but new pages must remain discoverable through `index.md`.
- Attachments should live in local `attachments/` directories near the notes that use them.

## Duplicate control

- Update an existing durable page when it already covers the concept.
- Create a new note only when the subject is distinct enough to stand alone.
- If overlap exists, link notes explicitly and narrow titles and scopes.
