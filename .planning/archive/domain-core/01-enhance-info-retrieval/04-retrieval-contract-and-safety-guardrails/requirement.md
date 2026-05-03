---
step-key: retrieval-contract-and-safety-guardrails
step-number: 4
step-folder: 04-retrieval-contract-and-safety-guardrails
phase-topic: enhance-info-retrieval
status: discovered
requirement-version: 1
updated-at: 2026-04-30
source: discover-requirements
supersedes: null
---

## Restated Request

Create a canonical SQLite retrieval contract and enforce retrieval safety guardrails so vault queries use one wrapper entrypoint, one schema reference, and one consistent local-first policy.

## Real Objective

Prevent schema guessing, wrapper bypass, stale-index confusion, and unbounded fallback by making SQLite retrieval contractually explicit and safe by default.

## Problem Statement

The current retrieval flow can drift because schema knowledge, wrapper behavior, network-search permission, and confidence labeling are split across multiple places. That makes it easy for the model to guess tables, bypass the wrapper, treat index hits as confirmed facts, or search the web without permission in non-debug sessions.

## In Scope

- Define a canonical SQLite retrieval contract for `.opencode/frontmatter-index.sqlite`
- Specify the `notes` and `properties` schema and retrieval-relevant fields
- Declare `vault_index_search` as the required first-pass wrapper entrypoint
- Require local-first retrieval and explicit shortlist reading before broader reads
- Define safety guardrails for schema guessing, wrapper bypass, stale-index handling, and fallback labeling
- Require non-debug web search to ask first
- Require answer layers to separate file-backed facts, index-only hits, external results, and hypotheses
- Keep the contract compatible with the existing query workflow and the retrieval wrapper

## Out of Scope

- Implementing the retrieval wrapper or query builder in code
- Redesigning structured constraint extraction logic
- Expanding metadata governance beyond retrieval safety needs
- Defining topic synonym expansion beyond the retrieval contract
- Replacing the existing query workflow or ranking thresholds

## Constraints

- The SQLite database is a derived retrieval index, not the source of truth
- The first-pass entrypoint must be `vault_index_search`
- Non-debug sessions must not use network search without user permission
- The contract must describe the actual schema rather than inferred table names
- Shortlist hits must not be treated as confirmed file content until the file is read
- Fallback must be explicit and confidence-labeled
- The contract must remain aligned with the existing retrieval workflow

## Assumptions

- A single contract doc will reduce drift better than scattering schema details across rules
- Runtime guardrails are more reliable than relying on model memory alone
- The wrapper can expose enough diagnostics to support stale-index and fallback reporting

## Open Questions

- Should stale-index handling require user-visible messaging, internal diagnostics, or both?
- Should the contract prescribe a fixed answer format for provenance separation, or only a retrieval contract?
- Should the wrapper surface a standard confidence value or only textual confidence cues?

## Success Criteria

1. The requirement defines one canonical retrieval contract doc for the SQLite index.
2. The requirement states the schema and retrieval-relevant fields without ambiguity.
3. The requirement makes `vault_index_search` the required first-pass entrypoint.
4. The requirement requires explicit local-first fallback behavior and confidence labeling.
5. The requirement requires non-debug network search to ask first.
6. The requirement keeps local facts, index hits, web results, and hypotheses distinct.
7. The requirement remains planning-ready without implementation detail.

## Suggested Planning Focus

First define the contract surface and guardrail boundaries, then specify provenance separation and non-debug network permission handling so the retrieval wrapper can enforce them consistently.
