---
step-key: sqlite-shortlist-ranking-and-fallback
step-number: 1
step-folder: 01-sqlite-shortlist-ranking-and-fallback
phase-topic: enhance-info-retrieval
status: discovered
requirement-version: 1
updated-at: 2026-04-29
source: discover-requirements
supersedes: null
---

## Restated Request

Improve vault retrieval so SQLite can use frontmatter as a strong filtering layer, especially around tags, time, location, and description, then use description-based candidate selection before deciding which full notes to read.

## Real Objective

Make vault retrieval meaningfully more precise and efficient by turning SQLite from a weak shortlist into a structured retrieval gate with controlled fallback behavior.

## Problem Statement

The current retrieval flow can query the SQLite index, but it does not yet fully exploit structured frontmatter or use description-driven candidate narrowing. This causes too many low-value candidates, unnecessary full-note reads, and weak control over what happens when the first structured pass fails to find the requested information.

## In Scope

- Define a frontmatter-first retrieval decision chain for SQLite-backed vault search
- Treat structured constraints such as `tags`, time fields, and location fields as primary shortlist inputs
- Use `description` as a second-stage candidate reranking and note-opening decision input rather than as a substitute for note body reads
- Define progressive fallback behavior when the first structured shortlist is empty or insufficient
- Clarify how structured filtering should relax over successive retrieval passes before broader text retrieval is used
- Include location-aware retrieval using dedicated fields for `country`, `province`, and `city`, with `country` defaulting to China when omitted
- Keep body-text retrieval as a later fallback layer rather than the first recovery path
- Define success conditions that reduce unnecessary note reads and improve structured retrieval quality

## Out of Scope

- Implementing the retrieval changes in code
- Replacing Markdown frontmatter as the source of truth
- Requiring full-text search as a mandatory part of this step
- Redesigning the entire vault metadata policy beyond what retrieval behavior strictly depends on
- Using `description` to fully replace full-note reading for answer generation
- Designing unrelated ranking features outside vault retrieval

## Constraints

- SQLite frontmatter filtering remains the first retrieval layer for vault search
- Frontmatter stays the source of truth; SQLite acts as a derived retrieval index
- Time should be modeled primarily through dedicated fields such as `created`, `updated`, `start_date`, and `end_date`, not by overloading tags
- Location should be modeled primarily through dedicated fields `country`, `province`, and `city`, with `country` defaulting to China when absent
- `description` is for candidate narrowing and reranking, not for replacing full document reads in general
- Progressive relaxation must happen before broadening to wider text retrieval whenever the indexed structured pass is insufficient
- The requirement must remain compatible with a future separate governance step for metadata normalization and tag discipline

## Assumptions

- The main current weakness is retrieval quality and decision logic, not low-level SQLite throughput
- Existing notes already provide enough structured metadata in at least some domains to justify frontmatter-first filtering
- A configurable candidate-count threshold is acceptable for deciding when description-only reranking should activate
- Later broad text retrieval may use grep, FTS, or another text mechanism, but that mechanism does not need to be committed in this step

## Open Questions

- What default shortlist-size thresholds should trigger direct note reads versus description-based reranking versus another round of structural narrowing
- Whether progressive relaxation should prefer removing low-value tag constraints first, broadening time constraints first, or follow a fixed priority order
- Whether the retrieval layer should expose why a fallback happened so later planning can make the behavior inspectable and debuggable

## Success Criteria

1. The requirement defines a frontmatter-first SQLite retrieval flow that treats structured metadata as the primary shortlist mechanism.
2. The requirement states that `description` is used to choose which candidates deserve full reads when the shortlist is moderately sized.
3. The requirement defines a progressive relaxation strategy before broader text retrieval is attempted.
4. The requirement treats location as structured fields `country`, `province`, and `city` rather than a tag-only concern.
5. The requirement keeps full-text retrieval as optional later support, not a mandatory dependency for this step.
6. The requirement provides planning-ready direction for reducing unnecessary note opens and increasing structured retrieval precision.

## Suggested Planning Focus

First define the retrieval decision ladder from strict SQLite frontmatter filtering through description-based reranking and controlled fallback relaxation, then plan how thresholding, structured location handling, and inspectable fallback reasons fit into the existing vault query flow.
