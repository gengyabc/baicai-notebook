---
step-key: minimal-retrieval-contract
step-number: 8
step-folder: 08-minimal-retrieval-contract
test-layer-mode: lower-level
---

# Test Checklist

## Batch 1: Freeze the minimal shared retrieval contract

- [DOC] sqlite-retrieval-contract.md names only `created_at`, `updated_at`, and `tags` as shared retrieval fields
- [DOC] Contract explicitly maps `created_at -> created` and `updated_at -> updated` for version 1
- [DOC] Retrieval-facing docs no longer describe `country`, `province`, `city`, `timeMode`, `start`, or `end` as required parts of the durable global contract
- [DOC] Contract states note-type-specific frontmatter remains allowed and is not prohibited

## Batch 2: Preserve full frontmatter as JSON while keeping tags first-class

- [DOC] Indexer and contract surfaces state SQLite stores serialized frontmatter JSON payload
- [DOC] `tags` remain queryable as first-class retrieval field and inside serialized frontmatter
- [DOC] Training-specific fields preserved in JSON when present rather than being required global schema columns

## Batch 3: Align wrapper request shape and shortlist execution

- [CODE] `vault_index_search` remains the retrieval wrapper entrypoint
- [CODE] Live wrapper accepts `tags`, `hierarchicalTags`, `createdStart`, `createdEnd`, `updatedStart`, `updatedEnd` plus `query`, `limit`, `folders`
- [CODE] Live wrapper structured path no longer depends on `country`, `province`, `city`, `timeMode`, `start`, `end`
- [CODE] `StructuredConstraintsInput` type removes location and timeMode fields, adds chronology windows
- [CODE] SQL query filters on `created` property for createdStart/createdEnd and `updated` property for updatedStart/updatedEnd
- [CODE] When both created and updated windows are provided, they are intersected
- [CODE] Extraction logic no longer extracts country/province/city
- [CODE] Extraction logic produces created/updated chronology windows instead of timeMode+start+end

## Batch 4: Freeze post-shortlist frontmatter filtering order

- [DOC] Workflow docs state LLM-side filtering over serialized frontmatter happens after shortlist, before full reads
- [DOC] Note-type-specific metadata inspection is downstream filtering responsibility
- [DOC] Full file reads deferred until after shortlist and frontmatter narrowing

## Batch 5: Context-budget-aware shortlist policy and diagnostics

- [DOC] Retrieval docs prohibit single fixed global shortlist threshold as contract rule
- [DOC] Shortlist tolerance depends on available context budget
- [CODE] Structured output includes `[structured]` label with constraints and candidate count
- [CODE] Text-fallback output includes `[text-fallback]` label
- [CODE] Unavailability output includes `[unavailable]` label
- [DOC] Empty structured pass transitions to text-fallback with reporting
- [DOC] Unusable frontmatter JSON reports `[unavailable]` for that note

## Batch 6: Keep early tag evolution flexible

- [DOC] Retrieval docs keep early tag usage flexible
- [DOC] No artifact makes global retrieval correctness depend on fully normalized tag governance beyond minimal contract
