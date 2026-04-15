---
type: vault
kind: index
source_type: manual
content_role: index
created: 2026-04-13
updated: 2026-04-15
image_key: vault-root-index
status: active
trust_level: verified
verification: verified
llm_stage: integrated
canonical_topic: vault-navigation
source_ref: ""
derived_from: []
entity_refs: []
topic_refs: []
tags:
  - state/active
  - source/manual
  - role/index
---

# Knowledge Vault Index

Personal knowledge system organized by content layers.

## Content Layers

### Active Intent
- `my-work/` — User-authored drafts, decisions, meetings, project thinking (user-owned)
- `brainstorm/` — Speculative synthesis, hypotheses, exploratory ideas (LLM-assisted)
  - `todo/` — Placeholder for queued ideas
  - `active/` — Placeholder for active ideas

### Durable Knowledge
- `wiki/` — Stable, grounded, cross-referenced knowledge (index-first)
  - See `wiki/index.md` for page catalog
  - See `wiki/log.md` for change history
- `resources/` — Captured sources, evidence, supporting material (LLM-managed, immutable sources)

### Deliverables
- `output/` — Polished outputs, presentations, reports (index-first)
  - See `output/index.md` for deliverable catalog

### Supporting Material
- `build/` — Build and architecture notes
- `docs/` — Documentation

## Quick Navigation

| Layer | Purpose | Owner |
|-------|---------|-------|
| my-work | Active intent | User |
| brainstorm | Exploration | Mixed |
| wiki | Durable memory | LLM |
| resources | Source archive | LLM |
| output | Deliverables | User |

## Empty State

- No durable pages registered yet.
- No output artifacts registered yet.
- Brainstorm folders are placeholders until ideas are added.
