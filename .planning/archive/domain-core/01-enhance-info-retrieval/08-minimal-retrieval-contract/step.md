---
step-key: minimal-retrieval-contract
step-version: 1
requirement-version: 1
---

# Minimal Retrieval Contract

---

## Objective

Make the retrieval layer durable across mixed note types by shrinking the shared SQLite retrieval contract to broadly reusable indexed fields, preserving full note frontmatter as JSON, and moving note-type-specific filtering after the coarse SQL shortlist stage.

---

## Shared retrieval boundary

This step must freeze one minimal global contract for broad SQLite shortlist generation:

- The shared retrieval fields are conceptually `created_at`, `updated_at`, and `tags`.
- `tags` remain available both as a first-class retrieval field and inside the serialized full frontmatter payload.
- All other frontmatter fields remain note-type-specific data unless a later reviewed step explicitly promotes them into the shared retrieval contract.
- Training-shaped fields such as `country`, `province`, `city`, `start`, and `end` may still be present on relevant notes, but they are not required parts of the global SQLite retrieval schema.
- The index must preserve the complete note frontmatter as a JSON object so downstream filtering can still inspect note-type-specific metadata after shortlist generation.

For this step, the contract must also freeze the field-name mapping needed to avoid an unnecessary rename during implementation:

- Contract language may describe note chronology generically as `created_at` and `updated_at`.
- The live index and note metadata continue to use the existing property names `created` and `updated` in version 1.
- Any retrieval-facing contract artifact updated in this step must state that `created_at -> created` and `updated_at -> updated` is an explicit compatibility mapping, not an implementer choice.

This step replaces the current contract language that treats time, location, and other training-oriented fields as first-class global structured retrieval inputs.

---

## Retrieval flow boundary

The retrieval flow for this step must be planned around a two-stage boundary:

1. Broad SQLite shortlist generation uses only the minimal shared retrieval contract.
2. LLM-side filtering evaluates the preserved serialized frontmatter on shortlisted candidates before full file detail reads.

Planning and implementation surfaces updated by this step must stay aligned on these rules:

- `vault_index_search` remains the only SQLite shortlist entrypoint.
- Broad structured retrieval must stop depending on globally indexed `country`, `province`, `city`, `timeMode`, `start`, and `end` inputs.
- The full frontmatter JSON payload remains available for later note-type-specific interpretation and filtering.
- Full file reads still happen only after shortlist generation and any frontmatter-based LLM filtering.
- Existing text-fallback behavior remains available when the minimal structured pass is unavailable, empty, or explicitly broadened by the existing retrieval workflow.
- When the structured path is insufficient, the fallback discovery path still uses repository file discovery and content matching tools such as `glob` and `grep`; this step does not replace those tools with a new fallback mechanism.
- Existing bounded tag-expansion behavior from earlier reviewed steps remains part of tag retrieval behavior because it is still a tags-only concern inside the minimal contract.

This step does not require inventing a new semantic ranking system. It only freezes the new contract boundary between coarse SQLite filtering and later note-type-aware reasoning.

---

## Wrapper shape and stage behavior

This step must freeze one exact broad-retrieval wrapper shape so a later coding model does not invent the replacement for the removed training-oriented fields:

```ts
vault_index_search(query, limit?, folders?, constraints?)

constraints?: {
  tags?: string[]
  hierarchicalTags?: string[]
  createdStart?: string
  createdEnd?: string
  updatedStart?: string
  updatedEnd?: string
}
```

Implementation and contract artifacts updated by this step must follow these rules:

- `tags` and `hierarchicalTags` remain the only tag constraint inputs.
- `createdStart` and `createdEnd` filter against the indexed `created` field.
- `updatedStart` and `updatedEnd` filter against the indexed `updated` field.
- `country`, `province`, `city`, `timeMode`, `start`, and `end` are removed from the broad structured wrapper contract for this step.
- `limit` and `folders` remain unchanged as shortlist controls rather than retrieval-schema fields.
- A request may provide a created window, an updated window, or both; when both are present, the broad structured pass applies them as an intersection.
- If no supported structured constraints are present, the wrapper may continue to the existing text-fallback mode rather than treating the call as a structured-pass success.
- The first-version minimal contract does not add any new non-tag structured constraint families beyond created-window and updated-window chronology filters.

---

## Diagnostics and shortlist policy

This step must keep the retrieval flow diagnosable without re-expanding the global schema:

- Retrieval artifacts must distinguish coarse SQL shortlist behavior from later LLM-side filtering behavior.
- Diagnostics may stay lightweight, but they must be explicit enough to show which stage filtered candidates and why.
- Shortlist acceptance policy must be described as context-budget-aware rather than as one fixed global candidate-count threshold.
- The first version does not need to freeze one universal token-to-candidate conversion formula, but it must clearly prohibit a single hardcoded global shortlist threshold as the contract rule.
- Stage diagnostics for this step must use a small stable label set: `[structured]`, `[frontmatter-filter]`, `[text-fallback]`, and `[unavailable]`.
- `[structured]` reports the minimal contract constraints applied and candidate count returned.
- `[frontmatter-filter]` reports whether serialized frontmatter narrowed or skipped shortlisted candidates before full file reads.
- `[text-fallback]` reports that the flow left the broad structured path and used the existing text search fallback.
- `[unavailable]` reports wrapper or index unavailability, or unusable serialized frontmatter needed for the planned filtering stage.

Minimum failure behavior for this step must also be explicit:

- If the wrapper or SQLite index is unavailable, the retrieval flow reports `[unavailable]` and does not claim a structured shortlist succeeded.
- If a shortlisted note lacks usable serialized frontmatter JSON, the flow reports `[unavailable]` for frontmatter filtering on that note and may continue with full file reads or later fallback behavior without inventing JSON-derived facts.
- If the structured pass returns no candidates, the flow may continue into the existing text-fallback behavior and must report that transition.

This keeps the requirement planning-ready without forcing prompt-level or model-specific implementation details into the contract.

---

## Locked constraints

- Keep scope limited to the resolved step folder and the retrieval artifacts that define or consume the shared retrieval contract.
- Keep the shared SQLite shortlist contract centered on `created_at`, `updated_at`, and `tags` only.
- Preserve complete note frontmatter in SQLite as JSON rather than flattening note-type-specific fields into the shared contract.
- Keep `tags` duplicated intentionally: first-class retrieval field plus JSON-preserved frontmatter field.
- Do not forbid note-specific frontmatter on notes that need it.
- Do not redesign this step into schema migration mechanics, embedding search, prompt design, or domain-by-domain metadata contracts.
- Do not retain training-specific fields as mandatory global structured inputs just to preserve backward compatibility in the contract language.

---

## Scope

### In

- Updating `.opencode/docs/sqlite-retrieval-contract.md` so the shared retrieval contract, wrapper shape, and retrieval rules reflect the minimal field set.
- Updating retrieval workflow and skill docs so they stop presenting training-oriented fields as the durable global contract.
- Updating the live wrapper and indexer contract surfaces so stored and queried fields match the minimal contract and its explicit `created_at`/`updated_at` to `created`/`updated` mapping.
- Preserving full frontmatter JSON in the index for downstream filtering.
- Freezing a coarse-shortlist then frontmatter-filter then full-read retrieval order.
- Defining lightweight stage-aware diagnostics for SQL shortlist and LLM filtering.

### Out

- Building a migration for existing indexed data.
- Designing note-type-specific metadata contracts across the whole vault.
- Defining a final model prompt or ranking heuristic for LLM filtering.
- Replacing Markdown frontmatter as source of truth.
- Introducing full-text, embedding, or separate semantic retrieval systems.

---

# TDD Batches

## Batch 1: Freeze the minimal shared retrieval contract

- Test: `.opencode/docs/sqlite-retrieval-contract.md` names only `created_at`, `updated_at`, and `tags` as the conceptual shared structured retrieval fields for broad SQLite shortlist generation.
- Test: the contract explicitly maps `created_at -> created` and `updated_at -> updated` for version 1 so later implementation does not invent a rename.
- Test: retrieval-facing docs no longer describe `country`, `province`, `city`, `timeMode`, `start`, or `end` as required parts of the durable global contract.
- Test: the contract explicitly states that note-type-specific frontmatter remains allowed and is not prohibited by the minimal shared schema.

## Batch 2: Preserve full frontmatter as JSON while keeping tags first-class

- Test: indexer and contract surfaces state that SQLite stores a serialized frontmatter JSON payload derived from note frontmatter.
- Test: `tags` remain queryable as a first-class retrieval field and also remain present inside the serialized frontmatter payload.
- Test: training-specific fields remain preserved in JSON when present on notes rather than being required global schema columns.

## Batch 3: Align wrapper request shape and shortlist execution with the minimal contract

- Test: `vault_index_search` remains the retrieval wrapper entrypoint.
- Test: the live wrapper request shape for this step is frozen as `tags`, `hierarchicalTags`, `createdStart`, `createdEnd`, `updatedStart`, and `updatedEnd` plus existing `query`, `limit`, and `folders` parameters.
- Test: the live wrapper structured execution path no longer depends on global `country`, `province`, `city`, `timeMode`, `start`, or `end` filters for broad shortlist retrieval.
- Test: retrieval docs and implementation surfaces agree on the same minimal structured input set.

## Batch 4: Freeze post-shortlist frontmatter filtering order

- Test: retrieval workflow docs state that LLM-side filtering over serialized frontmatter happens after SQLite shortlist generation and before full file detail reads.
- Test: note-type-specific metadata inspection is described as a downstream filtering responsibility rather than a shared-schema responsibility.
- Test: full file reads are still deferred until after shortlist generation and later frontmatter-based narrowing.

## Batch 5: Context-budget-aware shortlist policy and diagnostics

- Test: retrieval docs prohibit a single fixed global shortlist threshold as the contract rule.
- Test: shortlist tolerance is described as depending on available context budget.
- Test: diagnostics distinguish SQL shortlist behavior from later LLM filtering behavior with lightweight stage-aware reporting using `[structured]`, `[frontmatter-filter]`, `[text-fallback]`, and `[unavailable]` labels.
- Test: wrapper or index unavailability, empty structured passes, and unusable frontmatter JSON all have defined stage-level reporting behavior.

## Batch 6: Keep early tag evolution flexible

- Test: retrieval-facing docs keep early tag usage flexible and do not introduce stricter tag governance as a hidden dependency of this step.
- Test: no artifact in this step makes global retrieval correctness depend on fully normalized or human-approved tag governance beyond the minimal contract language already frozen by prior steps.

---

## Files

- `.planning/phase/08-minimal-retrieval-contract/requirement.md` - step-local scope authority
- `.planning/phase/08-minimal-retrieval-contract/step.md` - reviewed implementation plan for this step
- `.opencode/docs/sqlite-retrieval-contract.md` - canonical retrieval contract that must be rewritten around the minimal shared schema
- `.opencode/workflows/query-vault.md` - retrieval workflow that must stop presenting training-shaped fields as the durable global contract
- `.opencode/skills/second-brain-query/SKILL.md` - retrieval skill that must align with the revised contract boundary
- `.opencode/plugins/vault-query-router/index.ts` - live wrapper surface that must align its accepted structured inputs and diagnostics with the new contract
- `.opencode/plugins/frontmatter-index/sqlite-index.mjs` - indexer surface that must preserve full frontmatter JSON while indexing the minimal shared retrieval fields
- `.opencode/plugins/vault-query-router/index.test.ts` - wrapper contract coverage
- `.opencode/plugins/frontmatter-index/config.json` - index configuration surface if schema-facing defaults need alignment

## Symbols

- `vault_index_search`
- `frontmatter_json`
- `created_at`
- `updated_at`
- `created`
- `updated`
- `tags`
- `hierarchicalTags`
- `createdStart`
- `createdEnd`
- `updatedStart`
- `updatedEnd`
- `country`
- `province`
- `city`
- `timeMode`
- `start`
- `end`

## Execution constraints

- Prefer removing training-oriented global contract language over layering a second overlapping contract on top of it.
- Keep the plan focused on shared-contract alignment across docs, wrapper inputs, and index storage rather than on migration or rollout mechanics.
- Preserve enough diagnostics that later debugging can distinguish SQLite shortlist filtering from downstream LLM filtering.
- Keep all planned behavior traceable to the same-folder requirement without inventing note-domain policies the requirement did not freeze.

## Invariants

- Markdown files remain the source of truth.
- SQLite remains a derived retrieval index.
- Shared broad retrieval stays intentionally coarse.
- Note-type-specific metadata remains available after shortlist generation through preserved frontmatter JSON.
- The retrieval contract must remain broadly reusable across future note domains.

## Deferred follow-up

- Exact context-budget heuristics for converting available model context into shortlist tolerance if later implementation needs a more formal formula.
- Any future decision about whether LLM-suggested tags are written directly to note frontmatter, staged for approval, or kept as transient retrieval annotations.
- Any later promotion of additional broadly reusable structured fields into the shared retrieval contract after cross-domain evidence justifies it.
