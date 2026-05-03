---
step-key: structured-query-constraint-extraction
step-number: 3
step-folder: 03-structured-query-constraint-extraction
phase-topic: enhance-info-retrieval
status: discovered
requirement-version: 1
updated-at: 2026-04-29
source: discover-requirements
supersedes: null
---

## Restated Request

Improve vault retrieval so the LLM consistently recognizes when user language maps to structured frontmatter filters, explicitly prefers those filters over title-first querying, and invokes SQLite through a structured wrapper instead of ad hoc raw SQL.

## Real Objective

Make retrieval behavior more reliable and explainable by adding a deterministic query-intent extraction layer between the user's phrasing and the SQLite shortlist process.

## Problem Statement

The current retrieval flow defines structured SQLite filtering, but the LLM can still bypass that intent by searching titles or body text before extracting obvious constraints such as dates, locations, tags, and other stable frontmatter fields. This weakens retrieval precision, underuses available metadata, and makes behavior harder to debug when the model fails to apply the easiest high-value filters first.

## In Scope

- Define a query-intent extraction step that runs before structured SQLite shortlist selection
- Require the LLM to identify and explicitly call out when user phrasing maps to structured frontmatter constraints
- Treat time/date fields, location fields, and tags as the primary required constraint families for first-pass retrieval
- Support a small initial allowlist of additional low-risk structured filters, including `duration`, `num_participant`, `organizer`, `host`, and `participants`
- Define a hybrid mapping approach with explicit aliases for common time and location phrases plus limited low-risk inference for obvious topic and tag mappings
- Require retrieval to prefer structured SQLite filtering over title or body-text search whenever usable structured constraints can be extracted
- Define a structured wrapper or skill interface that accepts normalized retrieval constraints and builds SQLite queries safely
- Require the wrapper output to expose applied constraints and retrieval diagnostics that make model behavior inspectable
- Keep the resulting behavior compatible with the existing shortlist, reranking, and fallback step

## Out of Scope

- Implementing the wrapper, skill, or SQLite query builder in code
- Redesigning the existing SQLite shortlist ranking and fallback decision chain
- Expanding first-pass support to arbitrary freeform frontmatter keys
- Solving full metadata governance or alias lifecycle policy beyond what query-time extraction needs
- Replacing all model judgment with a fully static rules engine
- Using title or body-text search as the default first-pass retrieval strategy

## Constraints

- Structured frontmatter filtering must remain the default first retrieval action whenever the user's request provides usable structured clues
- The first version must always prioritize these constraint families in order: time/date, location, tags/topic, then the extra allowlisted structured fields
- Required structured time support must cover dedicated date fields such as `created`, `updated`, `start_date`, and `end_date`
- Required structured location support must cover `country`, `province`, and `city`, with existing China-default retrieval behavior preserved when `country` is absent
- Explicit alias tables should be used for common time and location phrases such as year references, half-year references, and common city or province phrasing
- Topic and tag extraction may use a hybrid approach: explicit aliases for stable known mappings plus LLM inference only when the mapping is obvious and low-risk
- The initial extra-field allowlist must stay small and limited to fields with clear semantics and repeated practical use
- The LLM should explicitly state which user phrases were interpreted as structured filters when presenting or using retrieval constraints
- Query execution should go through a structured wrapper or skill interface rather than relying on the LLM to compose raw SQLite directly
- Wrapper output must include both shortlist results and diagnostics sufficient to explain applied constraints, inferred constraints, candidate counts, and fallback behavior
- The requirement must remain compatible with the existing retrieval workflow and the separate frontmatter governance step

## Assumptions

- The user's mention of `rags` refers to `tags`
- A small explicit allowlist for extra structured fields will capture most near-term value without overcomplicating the first version
- Deterministic handling of time and location phrases will provide more benefit than trying to fully formalize all topic language in the first iteration
- A wrapper interface is the safest way to reduce malformed or inconsistent SQLite querying by the model

## Open Questions

- Which exact overlap semantics should apply for date-oriented requests, such as whether a query for `2025` should match by `start_date`, `end_date`, or any interval overlap with that year
- Whether diagnostic output from the wrapper should be purely model-facing or also shaped for direct user-facing transparency in some query flows
- Whether the initial extra-field allowlist should treat `organizer`, `host`, and `participants` as exact-match filters only or permit constrained fuzzy normalization for common naming variation

## Success Criteria

1. The requirement defines a pre-shortlist query-intent extraction step that maps natural-language requests into structured retrieval constraints.
2. The requirement states that the LLM must prefer structured frontmatter filters over title-first or body-first querying whenever the user's request contains usable structured clues.
3. The requirement makes time/date fields, location fields, and tags the required first-pass structured constraint families.
4. The requirement permits only a small initial allowlist of extra structured fields and identifies which fields belong in that allowlist.
5. The requirement defines a hybrid mapping strategy with explicit aliases for common time and location phrases plus constrained low-risk inference for topic and tag mappings.
6. The requirement requires a structured wrapper or skill interface for safe SQLite query construction instead of ad hoc raw SQL generation by the LLM.
7. The requirement requires retrieval diagnostics that expose applied constraints, inferred constraints, candidate counts, and fallback state for debugging and explainability.
8. The requirement remains planning-ready without expanding into implementation details or broad metadata-governance redesign.

## Suggested Planning Focus

First define the pre-query constraint extraction contract, including field-priority order, alias handling, and the initial extra-field allowlist, then plan the structured wrapper interface and diagnostic return shape so the existing SQLite shortlist workflow can consume normalized constraints consistently and transparently.
