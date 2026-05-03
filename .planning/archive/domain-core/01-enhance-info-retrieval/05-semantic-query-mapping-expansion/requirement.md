---
step-key: semantic-query-mapping-expansion
step-number: 5
step-folder: 05-semantic-query-mapping-expansion
phase-topic: enhance-info-retrieval
status: discovered
requirement-version: 1
updated-at: 2026-04-30
source: discover-requirements
supersedes: null
---

## Restated Request

Expand deterministic query-to-constraint mapping so common retrieval phrases and stable topic language are normalized before SQLite shortlist selection.

## Real Objective

Reduce semantic misses where the query clearly implies structured retrieval intent, but the model fails to map phrases like time references, place names, or domain topics into usable constraints.

## Problem Statement

The current extraction layer can handle some obvious tags, locations, and years, but it still misses or weakly handles broader retrieval language such as `大模型相关`, `LLM`, `RAG`, `Agent`, or other stable topic families. That causes recall loss, vague fallback, and avoidable manual interpretation.

## In Scope

- Define a hybrid mapping strategy for common query phrases to structured constraints
- Expand explicit aliases for time and location phrases
- Add high-confidence topic mappings for a small set of stable retrieval concepts
- Specify how low-risk inference is allowed for obvious topic and tag cases
- Require the system to explicitly report which query phrases were interpreted as structured filters
- Define how unmapped or ambiguous semantic fragments are reported without pretending they were resolved
- Keep the mapping layer compatible with the existing structured shortlist and fallback workflow

## Out of Scope

- Building a full ontology or universal synonym engine
- Solving every ambiguous topic phrase automatically
- Redesigning the shortlist ranking or fallback thresholds
- Changing the retrieval contract or wrapper entrypoint
- Expanding arbitrary freeform frontmatter key support

## Constraints

- Time/date, location, and tags/topic remain the primary first-pass families
- Only low-risk semantic inference is allowed for topic expansion
- The mapping layer must prefer canonical structured values when possible
- The system must surface which phrases were mapped and which were not
- Mapping must remain deterministic enough to debug
- The step must remain compatible with the retrieval workflow and governance rules

## Assumptions

- A narrow set of stable topic aliases will provide most near-term value
- Explicit reporting of mapped phrases will make retrieval easier to inspect
- It is better to leave ambiguous concepts unresolved than to over-infer them

## Open Questions

- Which topic families should get canonical aliases first, beyond `topic/training`?
- Should `大模型相关` map to one canonical topic or multiple related constraints?
- When should the system ask for clarification instead of inferring a topic mapping?

## Success Criteria

1. The requirement defines a deterministic semantic mapping layer for retrieval phrases.
2. The requirement expands explicit aliases for common time and location expressions.
3. The requirement identifies a small set of stable topic mappings for high-confidence inference.
4. The requirement requires surfaced diagnostics for mapped and unmapped phrases.
5. The requirement keeps the mapping layer bounded and compatible with the shortlist workflow.

## Suggested Planning Focus

First define the stable alias sets and reporting contract, then decide the minimal high-confidence topic mappings so semantic expansion stays narrow and explainable.
