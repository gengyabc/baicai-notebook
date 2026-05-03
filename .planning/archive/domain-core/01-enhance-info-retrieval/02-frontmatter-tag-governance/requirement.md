---
step-key: frontmatter-tag-governance
step-number: 2
step-folder: 02-frontmatter-tag-governance
phase-topic: enhance-info-retrieval
status: discovered
requirement-version: 1
updated-at: 2026-04-29
source: discover-requirements
supersedes: null
---

## Restated Request

Improve frontmatter and tag governance so retrieval can rely on stable metadata, especially by clarifying when to use structured fields versus tags, how hierarchical tags should behave, and how aliases should be reviewed and normalized over time.

## Real Objective

Make retrieval quality sustainable by preventing metadata drift, uncontrolled tag growth, and ambiguous semantic duplication across tags and frontmatter fields.

## Problem Statement

Even a stronger SQLite retrieval layer will remain unreliable if frontmatter values drift, similar tags proliferate, and retrieval-critical concepts are inconsistently expressed across freeform metadata. The vault needs a governance model that keeps metadata flexible enough for human use while still preserving reliable structured retrieval.

## In Scope

- Define the governance boundary between dedicated structured fields and tags for retrieval-relevant metadata
- Keep time and location primarily in structured fields rather than using tags as the main carrier
- Treat `tags` as a controlled but still human-usable retrieval aid with hierarchical forms such as `topic/*`
- Define an alias-based normalization model for tags and selected frontmatter values
- Include governance for location normalization through aliases across `country`, `province`, and `city`
- Include governance for `canonical_topic` normalization when it materially affects retrieval
- Allow a staged policy that begins with alias tables and human review, then can tighten into stronger admission control as scale grows
- Ensure the governance model remains compatible with existing Obsidian-style hierarchical tags and human review workflows

## Out of Scope

- Implementing metadata migration or automatic rewriting in code
- Forcing every frontmatter field into a global whitelist immediately
- Turning all note-specific domain fields into tags
- Moving precise structured judgment fields into tag form
- Defining the full retrieval algorithm, which belongs to the separate SQLite retrieval step
- Building a complete ontology for all future note domains

## Constraints

- Human-managed notes must remain practical to author and review
- Tag policy should preserve Obsidian-style hierarchical tags where they help retrieval
- Time should remain primarily in dedicated date fields rather than duplicated into tags
- Location should remain primarily in dedicated fields `country`, `province`, and `city`, with `country` defaulting to China when omitted
- Governance should begin with alias mapping plus human review rather than immediate hard blocking
- Stronger whitelist-style admission control may be introduced later only when growth and drift justify it
- Governance should cover `tags`, location aliases, and `canonical_topic`, but not arbitrary freeform frontmatter keys in the first stage
- The requirement must remain compatible with existing metadata conventions and a separate retrieval-behavior step

## Assumptions

- Current retrieval pain is materially affected by metadata inconsistency, not only ranking weakness
- A small number of normalization surfaces will provide most of the retrieval benefit
- Human review is acceptable for new aliases and suspicious additions
- Strong whitelist enforcement is best triggered by scale and drift signals rather than enabled from day one

## Open Questions

- What concrete growth or drift thresholds should trigger a move from alias-review governance to stronger whitelist admission control
- Whether alias governance artifacts should be split by domain, such as separate stores for tags and locations, or kept in one normalized registry
- How much linting feedback should be blocking versus advisory for human-authored notes before the stronger-governance phase begins

## Success Criteria

1. The requirement defines when retrieval-relevant metadata belongs in structured fields versus tags.
2. The requirement preserves hierarchical tags as a useful retrieval aid without making tags the primary carrier for time or location.
3. The requirement defines an alias-review normalization approach for `tags`, location values, and `canonical_topic`.
4. The requirement allows a staged transition from soft governance to stronger whitelist-style control when scale justifies it.
5. The requirement remains practical for human-managed notes and compatible with existing metadata conventions.
6. The requirement gives future planning a clear path to reduce metadata drift that harms retrieval quality.

## Suggested Planning Focus

First define the role split between structured fields and tags, then plan the normalization surfaces, alias-review flow, and scale-based tightening rules that will keep retrieval metadata stable without overconstraining note authoring.
