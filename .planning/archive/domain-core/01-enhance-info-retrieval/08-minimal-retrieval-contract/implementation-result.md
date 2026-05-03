---
step-key: minimal-retrieval-contract
step-number: 8
step-folder: 08-minimal-retrieval-contract
requirement-version: 1
step-version: 1
implementation-status: complete
updated-at: 2026-05-02
---

# Implementation Result

## Summary

Shrank the shared SQLite retrieval contract to the minimal field set (`tags`, `created_at`, `updated_at`), preserved full frontmatter as JSON, and moved note-type-specific filtering after the coarse SQL shortlist stage. All 6 TDD batches implemented.

## Changed files

- `.opencode/docs/sqlite-retrieval-contract.md` - Rewritten around the minimal shared schema with explicit `created_at -> created` / `updated_at -> updated` mapping, wrapper shape, retrieval flow, diagnostics labels, and tag evolution policy
- `.opencode/workflows/query-vault.md` - Removed training-oriented global contract language (time/location/extraFields families), updated extraction priority to tags->chronology, added frontmatter filtering stage, made shortlist policy context-budget-aware, added diagnostic labels, updated examples and invariants
- `.opencode/skills/second-brain-query/SKILL.md` - Aligned with minimal contract; removed location-aliases pre-read, updated extraction priority, query summary template, and key rules
- `.opencode/plugins/vault-query-router/index.ts` - Removed `country/province/city/timeMode/start/end` from `StructuredConstraints`, `normalizeStructuredConstraints`, `buildStructuredSearchQuery`, `formatConstraints`, and tool schema. Added `createdStart/createdEnd/updatedStart/updatedEnd` chronology windows. Added `[structured]`, `[text-fallback]`, `[unavailable]` diagnostic labels to output
- `.opencode/plugins/vault-query-router/extraction-logic.ts` - Updated `StructuredConstraintsInput` type to remove location/timeMode fields and add chronology windows. Updated `inferStructuredConstraints` to no longer extract location constraints and to emit note-chronology windows only for note-time queries
- `.opencode/plugins/vault-query-router/extraction.test.ts` - Updated tests for new constraint shape; added tests for note-chronology windows, event-time non-emission, and location non-extraction
- `.opencode/plugins/vault-query-router/index.test.ts` - Updated wrapper tests for new constraint shape; added tests for diagnostic labels, chronology windows, and legacy field rejection

## What changed

### Batch 1: Freeze the minimal shared retrieval contract
- Contract names only `created_at`, `updated_at`, and `tags` as shared retrieval fields
- Explicit `created_at -> created` and `updated_at -> updated` compatibility mapping
- Removed `country`, `province`, `city`, `timeMode`, `start`, `end` from global contract
- Stated note-type-specific frontmatter remains allowed

### Batch 2: Preserve full frontmatter as JSON while keeping tags first-class
- Contract states SQLite stores serialized frontmatter JSON payload
- `tags` remain queryable as first-class field and inside serialized frontmatter
- Training-specific fields preserved in JSON rather than required global schema columns

### Batch 3: Align wrapper request shape and shortlist execution
- `vault_index_search` remains the entrypoint
- Wrapper accepts `tags`, `hierarchicalTags`, `createdStart`, `createdEnd`, `updatedStart`, `updatedEnd`
- Structured path no longer depends on `country/province/city/timeMode/start/end`
- SQL query filters on `created` and `updated` properties separately with intersection
- Extraction logic no longer extracts location; produces chronology windows only for note-time queries

### Batch 4: Freeze post-shortlist frontmatter filtering order
- Workflow docs state LLM-side filtering over serialized frontmatter happens after shortlist, before full reads
- Note-type-specific metadata is downstream filtering responsibility
- Full file reads deferred until after shortlist and frontmatter narrowing

### Batch 5: Context-budget-aware shortlist policy and diagnostics
- Retrieval docs prohibit single fixed global shortlist threshold
- Shortlist tolerance depends on available context budget
- Output includes `[structured]`, `[text-fallback]`, `[unavailable]` diagnostic labels
- Wrapper/index unavailability and empty structured pass have defined reporting behavior

### Batch 6: Keep early tag evolution flexible
- Retrieval docs keep early tag usage flexible
- No artifact makes global retrieval correctness depend on fully normalized tag governance

## Tests

- `bun test ./.opencode/plugins/vault-query-router/` - 17 pass, 0 fail (76 expect calls)

## Files not modified (confirmed no changes needed)

- `.opencode/plugins/frontmatter-index/sqlite-index.mjs` - Already stores `frontmatter_json` via `JSON.stringify(note.frontmatter)`; no changes needed
- `.opencode/plugins/frontmatter-index/config.json` - No schema-facing defaults to align

## Open items

- None within step scope. All 6 TDD batches pass their test criteria.
- E2E tests: test-layer mode is `lower-level`; no E2E test created per policy.
