---
step-key: minimal-retrieval-contract
step-number: 8
step-folder: 08-minimal-retrieval-contract
phase-topic: enhance-info-retrieval
status: discovered
requirement-version: 1
updated-at: 2026-05-02
source: discover-requirements
supersedes: null
---

## Restated Request

Redesign the retrieval system so SQLite uses only broadly reusable indexed fields, keeps the full frontmatter in a generic serialized form, and stops depending on training-specific metadata as part of the global retrieval contract.

## Real Objective

Make retrieval more general and durable across varied note types by shrinking the shared metadata contract to generic fields, while preserving note-type-specific frontmatter for downstream LLM filtering and detail reads.

## Problem Statement

The current retrieval design is overfit to a training-oriented metadata model. Fields such as `country`, `province`, `city`, `timeMode`, `start`, and `end` are useful for some note types, but they do not generalize across the vault and should not define the global SQLite retrieval contract. This makes the retrieval layer brittle when frontmatter varies widely across note domains and encourages a schema that reflects one note category instead of the broader vault. A more general system should keep only reusable indexed fields for broad shortlist generation and defer note-type-specific interpretation to later LLM filtering over preserved frontmatter.

## In Scope

- Define a minimal global retrieval contract centered on `created_at`, `updated_at`, and `tags`
- Define that SQLite stores those generic retrieval fields plus a serialized full frontmatter payload
- Define the serialized frontmatter payload as a JSON object derived from note frontmatter at index time
- Define that broad SQL shortlist retrieval uses only `created_at`, `updated_at`, and `tags` as structured retrieval inputs
- Define that note-type-specific frontmatter remains allowed and may vary by domain, such as training notes carrying `country`, `province`, `city`, `start`, and `end`
- Define that note-type-specific fields are preserved inside the serialized frontmatter payload rather than elevated into the shared retrieval schema
- Define that LLM-side filtering over the serialized frontmatter happens after broad SQLite shortlist generation and before opening full files for detail reads
- Define that shortlist-size tolerance depends on available context length rather than a single fixed global threshold
- Keep the requirement focused on planning-ready contract and retrieval behavior, not implementation details

## Out of Scope

- Implementing the schema change, migration, or indexing code
- Designing note-type-specific frontmatter contracts for every domain in the vault
- Forbidding note-specific frontmatter beyond the shared minimal contract
- Defining arbitrary structured SQL filters beyond `created_at`, `updated_at`, and `tags`
- Replacing Markdown frontmatter as the note source of truth
- Designing the final LLM prompt or ranking algorithm for shortlist filtering
- Defining full-text retrieval, embeddings, or a separate semantic search system

## Constraints

- The shared retrieval contract must remain broadly applicable across varied note types
- `created_at`, `updated_at`, and `tags` are the only structured fields that the global SQLite retrieval layer may rely on for broad shortlist search
- Full frontmatter remains preserved in SQLite as a JSON object so note-type-specific metadata stays available after shortlist generation
- `tags` must remain available both as a first-class retrieval field and inside the serialized JSON frontmatter view
- Training-specific fields such as `country`, `province`, `city`, `start`, and `end` may still exist on relevant notes, but they must not be required parts of the global retrieval schema
- SQLite broad retrieval must stay intentionally coarse, with finer selection deferred to LLM reasoning over serialized frontmatter
- Early tag usage may remain flexible, and strict tag normalization is deferred until tag growth creates enough operational pressure to justify governance
- The retrieval design must support varied future note domains whose useful frontmatter fields are not known in advance
- Shortlist tolerance must be defined as a context-budget-aware policy rather than a single fixed candidate count
- The retrieval flow must remain diagnosable by surfacing lightweight filtering diagnostics across the SQL shortlist and LLM filtering stages
- The requirement must stay within the current phase topic `enhance-info-retrieval`

## Assumptions

- Converting note frontmatter into JSON during indexing is acceptable and operationally simpler than storing raw YAML for downstream filtering
- Using SQLite JSON support for optional later inspection is valuable even if the primary SQL shortlist only uses `created_at`, `updated_at`, and `tags`
- The current main risk is overfitting the retrieval schema to one note domain rather than lack of metadata entirely
- LLM-side filtering over serialized frontmatter is acceptable as long as the shortlist remains bounded relative to the active context budget

## Open Questions

- Whether context-budget-aware shortlist policy should be expressed in approximate candidate-count bands, approximate token-budget bands, or both
- Whether LLM-added tags should be stored immediately in note frontmatter, staged separately for later approval, or treated as retrieval-only working annotations until governance matures
- Whether filtering diagnostics should stay model-facing only at first, or also become visible in user-facing debug traces during later work

## Success Criteria

1. The requirement defines a minimal shared retrieval contract using `created_at`, `updated_at`, and `tags`.
2. The requirement states that SQLite stores a serialized full frontmatter JSON object in addition to those generic retrieval fields.
3. The requirement states that broad structured SQL retrieval may rely only on `created_at`, `updated_at`, and `tags`.
4. The requirement states that note-type-specific frontmatter remains allowed and is preserved for later filtering rather than prohibited.
5. The requirement states that training-specific fields such as `country`, `province`, `city`, `start`, and `end` are valid for relevant notes but are not part of the global retrieval schema.
6. The requirement states that `tags` remain both a first-class retrieval field and part of the serialized JSON frontmatter view.
7. The requirement states that early tag evolution may remain flexible and that stricter normalization can be deferred until tag growth justifies governance.
8. The requirement states that LLM filtering over serialized frontmatter happens after broad shortlist generation and before full file detail reads.
9. The requirement states that acceptable shortlist breadth should depend on available context length rather than a single hardcoded threshold.
10. The requirement states that lightweight diagnostics must be available for SQL shortlist and LLM filtering behavior.
11. The requirement remains planning-ready without expanding into migration code, implementation steps, or prompt design details.

## Suggested Planning Focus

First define the minimal shared retrieval schema and the boundary between globally indexed fields and note-type-specific frontmatter, including how `tags` exist both as a retrieval field and inside the JSON frontmatter view. Then define the broad-shortlist-to-LLM-filter retrieval flow, including context-budget-aware shortlist policy, flexible early tag evolution, and lightweight diagnostics before the system proceeds to full note reads.
