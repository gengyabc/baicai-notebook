---
type: vault
kind: index
created: 2026-04-13
updated: 2026-04-24
image_key: vault-root-index
description: Root navigation hub for the knowledge vault and its content layers.
status: active
canonical_topic: vault-navigation
source_ref: ""
derived_from: []
entity_refs: []
topic_refs: []
tags:
  - state/active
  - topic/navigation
---

# Knowledge Vault Index

Personal knowledge system organized by content layers.

## Content Layers

### Active Intent
- `my-work/` — User-authored drafts, decisions, meetings, project thinking (user-owned)
- `brainstorm/` — Speculative synthesis, hypotheses, exploratory ideas (human-managed by default)
  - `todo/` — Placeholder for queued ideas
  - `active/` — Placeholder for active ideas
  - `managed/` — Explicit opt-in area for LLM-managed brainstorm notes

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
| brainstorm | Exploration | Human by default |
| wiki | Durable memory | LLM |
| resources | Source archive | LLM |
| output | Deliverables | User |

## Empty State

- No durable pages registered yet.
- No output artifacts registered yet.
- Brainstorm folders are placeholders until ideas are added.
