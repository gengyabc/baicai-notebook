---
step-key: constrained-query-orchestration
step-number: 7
step-folder: 07-constrained-query-orchestration
phase-topic: enhance-info-retrieval
status: discovered
requirement-version: 1
updated-at: 2026-05-02
source: discover-requirements
supersedes: null
---

## Restated Request

Define a retrieval orchestration requirement where the LLM first normalizes user queries into governed canonical tags and structured constraints, then passes those normalized constraints to the SQLite retrieval wrapper instead of relying primarily on router-local keyword extraction.

## Real Objective

Make vault retrieval more accurate, governable, and debuggable by separating query understanding from SQL execution and by forcing both the LLM and runtime retrieval path to consume the same controlled metadata vocabulary.

## Problem Statement

The current retrieval flow has structured SQLite shortlist support and a governed tag registry, but the live path still depends heavily on router-local deterministic extraction logic and inconsistent caller behavior. The LLM often sends only the raw user query, while runtime extraction relies on code-local alias tables that are difficult to extend safely and may drift from the governed canonical tag set. This creates recall gaps for natural-language variants, blurs responsibility between analysis and execution, and makes it hard to debug whether misses are caused by vocabulary governance, caller-side extraction, or SQL retrieval behavior.

## In Scope

- Define a caller-side retrieval orchestration protocol that requires explicit structured query analysis before structured SQLite execution when the request contains usable retrieval clues
- Require the LLM to normalize query intent into the existing retrieval contract fields rather than inventing freeform fields or freeform tag values
- Require tag outputs to come only from a governed canonical tag list stored in a dedicated machine-readable artifact
- Require alias-to-canonical tag mappings to be stored in a dedicated machine-readable artifact separate from the canonical tag list
- Require controlled tag-neighbor expansion relationships to be stored in a dedicated machine-readable artifact separate from alias mappings
- Require location alias mappings to be stored in a dedicated machine-readable artifact so location normalization is governed outside code-local tables
- Define `canonical-tags.json` as the unique legal source of canonical tag values
- Define `tag-aliases.json` as the source of alias-to-canonical-tag mappings
- Define `tag-expansions.json` as the source of controlled neighboring canonical-tag expansion relationships
- Define `location-aliases.json` as the source of alias-to-canonical-location mappings
- Define how literal, alias-based, and inference-based mappings are distinguished and surfaced for debugging
- Define a bounded multi-pass retrieval strategy where the first pass uses the primary canonical constraints and a later pass may use only explicitly approved expansion relationships when the first pass is empty or clearly insufficient
- Keep SQL generation and execution inside the wrapper layer so the LLM passes normalized constraints rather than raw SQL
- Keep the orchestration behavior compatible with the existing `vault_index_search` contract, shortlist-first reading policy, and fallback decision chain

## Out of Scope

- Implementing the new governance artifacts, wrapper changes, or caller logic in code
- Redesigning the SQLite schema, shortlist ranking, or fallback thresholds
- Allowing the LLM to generate arbitrary SQL for retrieval
- Building a universal ontology or open-ended semantic retrieval engine
- Allowing unrestricted tag invention, unrestricted alias growth, or unrestricted expansion of semantic neighbors at query time
- Replacing the existing retrieval contract or existing phase topic

## Constraints

- The LLM must output only retrieval-contract-supported structured fields when preparing structured retrieval constraints
- Canonical tag outputs must come only from a dedicated machine-readable canonical tag artifact, and no non-canonical tag string may be sent to the wrapper as a structured tag constraint
- Alias normalization must come from a dedicated machine-readable alias artifact, and aliases are valid only as input forms, never as final structured outputs
- Tag-neighbor expansion must come only from a dedicated machine-readable expansion artifact, and only explicitly listed expansion relationships may be used in broadened structured retrieval passes
- `canonical-tags.json` is the only legal source for final canonical tag outputs
- `tag-aliases.json` is used only to map user-facing alias forms into canonical tags from `canonical-tags.json`
- `tag-expansions.json` is used only to broaden retrieval among already-approved canonical tags from `canonical-tags.json`
- `location-aliases.json` is used only to map user-facing location aliases into canonical location values used by the retrieval contract
- Canonical tag governance, alias governance, and expansion governance must remain separate concerns with separate artifacts so they can evolve at different rates
- Human and LLM collaboration may propose updates to canonical tags, aliases, and expansions, but canonical tag additions require explicit human approval by default
- The governance model may be permissive early in adoption, but it must support later tightening so the canonical set and expansion rules can become progressively more constrained over time
- The wrapper remains the only structured SQLite execution path, and the LLM must not bypass it by generating raw SQL
- The first structured retrieval pass must prefer the primary canonical constraints without automatic broad semantic expansion
- If a broadened structured pass is allowed, it must be bounded, explainable, and limited to a small approved candidate set derived from the expansion artifact
- Retrieval diagnostics must distinguish at least the initial pass from any expansion pass, including which constraints were used, why expansion was triggered, and how many candidates each pass returned
- The requirement must remain aligned with the existing retrieval contract, tag governance work, semantic mapping work, and retrieval safety rules in the current phase

## Assumptions

- The existing governed tags in `.opencode/alias-registry.md` are a valid starting point for extracting a canonical tag artifact
- The current router-local keyword tables are better treated as consumers of governed artifacts than as the source of governance truth
- A small controlled set of expansion relationships will cover the most valuable retrieval broadening cases without making behavior opaque
- Separating canonical tags, aliases, expansions, and location aliases into machine-readable artifacts will make both LLM prompting and runtime implementation easier to keep aligned

## Open Questions

- For broadened structured retrieval, use one small candidate set per expansion pass, typically one neighboring canonical tag and at most two to three approved canonical tags when the expansion artifact defines multiple close neighbors
- Approve the first controlled expansion pairs explicitly and keep them narrow, starting with obvious stable neighbors such as training and education
- Expose diagnostics at least in model-facing retrieval traces first, and keep user-facing formatting separate unless a later requirement explicitly broadens it

## Success Criteria

1. The requirement defines a caller-side orchestration rule that requires explicit structured query analysis before structured SQLite retrieval when usable structured clues exist.
2. The requirement states that the LLM may output only retrieval-contract-supported fields and may not invent arbitrary structured keys or arbitrary tag values.
3. The requirement states that canonical tag outputs must come only from a dedicated machine-readable canonical tag artifact.
4. The requirement states that `canonical-tags.json` is the unique legal source of canonical tag values.
5. The requirement states that `tag-aliases.json`, `tag-expansions.json`, and `location-aliases.json` are separate dedicated machine-readable artifacts with distinct responsibilities.
6. The requirement states that aliases are input normalization tools, not final structured outputs.
7. The requirement states that controlled broadened structured retrieval may use only explicitly approved expansion relationships and must remain bounded.
8. The requirement states that the wrapper remains responsible for SQL generation and execution, while the LLM remains responsible for governed constraint analysis and normalization.
9. The requirement states that diagnostics must distinguish the first structured pass from any later expansion pass and report the reason for broadening.
10. The requirement remains planning-ready without expanding into implementation steps, code design, or schema redesign.

## Suggested Planning Focus

First define the dedicated machine-readable governance artifacts and their fixed responsibilities: `canonical-tags.json` for the unique legal canonical tag set, `tag-aliases.json` for alias-to-canonical-tag mapping, `tag-expansions.json` for controlled neighboring canonical-tag expansion, and `location-aliases.json` for alias-to-canonical-location mapping. Then define the caller-side constraint extraction and multi-pass orchestration protocol that consumes those artifacts and hands only normalized canonical constraints to the wrapper.
