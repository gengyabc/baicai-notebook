# Core Vault Rules

## Folder semantics

- `my-work/` and `My-work/` are the active intent layer.
- `resources/` and `Resources/` are the evidence layer.
- `brainstorm/` is the speculative layer.
- `wiki/` is the durable knowledge layer.
- `output/` is the deliverable layer.

Until the repository is normalized, treat uppercase and lowercase folder variants as aliases rather than separate destinations.

## Knowledge standard

- External material should become Markdown in `resources/`.
- Important binaries should have a Markdown sidecar.
- Bare URLs are insufficient; keep provenance, summary, and context.
- Prefer durable notes over ephemeral references.

## Decision priority

1. Preserve active user intent.
2. Preserve source provenance.
3. Keep uncertain synthesis in `brainstorm/`.
4. Promote only grounded knowledge into `wiki/`.

## Duplicate control

- Update an existing durable page when it already covers the concept.
- Create a new note only when the subject is distinct enough to stand alone.
- If overlap exists, link notes explicitly and narrow titles and scopes.
