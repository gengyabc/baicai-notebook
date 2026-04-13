# Core Vault Rules

## Folder semantics

- `my-work/` and `My-work/` are the active intent layer.
- `resources/` and `Resources/` are LLM-managed storage for captured sources, evidence, and supporting material, with guardrails.
- `brainstorm/` is the speculative thinking layer and should stay within `todo/` and `active/`.
- `wiki/` is the durable knowledge layer and should be maintained `index-first`.
- `output/` is the deliverable layer and should be maintained `index-first`.

Until the repository is normalized, treat uppercase and lowercase folder variants as aliases rather than separate destinations.

For retrieval order, promotion, and schema details, follow `.opencode/rules/query-confidence.md`, `.opencode/rules/promotion-policy.md`, and `.opencode/rules/metadata-conventions.md`.

## Knowledge standard

- External material should become Markdown in `resources/`.
- Important binaries should have a Markdown sidecar.
- Bare URLs are insufficient; keep provenance, summary, and context.
- Prefer durable notes over ephemeral references.
- Root `index.md` serves as the vault navigation hub; read it first when understanding vault structure.
- `resources/` may grow deep topic structure, but only through incremental organization; do not delete captured source files or rename original source files.
- `wiki/` and `output/` may grow freely, but new pages must remain discoverable through `index.md`.
- Attachments should live in local `attachments/` directories near the notes that use them.

## Duplicate control

- Update an existing durable page when it already covers the concept.
- Create a new note only when the subject is distinct enough to stand alone.
- If overlap exists, link notes explicitly and narrow titles and scopes.
