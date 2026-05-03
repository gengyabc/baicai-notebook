---
step-key: structured-query-constraint-extraction
step-version: 1
test-layer-mode: lower-level
---

# Test Checklist: Structured Query Constraint Extraction

This step is contract-first and retrieval-doc-first. "Tests" are assertions about documentation content, contract definitions, and workflow requirements rather than executable code.

## Batch 1: Pre-shortlist extraction stage and family priority

- [ ] T1.1: `query-vault.md` requires constraint extraction before any Stage 1 SQLite shortlist execution
- [ ] T1.2: The extraction stage freezes family priority as time/date -> location -> tags/topic -> allowlisted extra fields
- [ ] T1.3: Retrieval documentation states that usable structured clues must be applied through SQLite before title-first or body-first search
- [ ] T1.4: Empty or unusable structured extraction does not authorize an unbounded structured query

## Batch 2: Time and location normalization rules

- [ ] T2.1: The retrieval contract distinguishes `event` versus `note` time mode and freezes when each is allowed
- [ ] T2.2: Year, half-year, month, and explicit date-range phrases are normalized into inclusive query windows
- [ ] T2.3: Event-time matching uses event-interval overlap with `start_date` and `end_date`, not `created` or `updated`
- [ ] T2.4: Location extraction is limited to `country`, `province`, and `city` and preserves metadata-level China default semantics
- [ ] T2.5: Retrieval docs forbid query-time injection of `country = 中国` when the user omitted country

## Batch 3: Tag, topic, and extra-field mapping boundaries

- [ ] T3.1: Retrieval docs require explicit canonical tag mappings first and allow low-risk inference only for obvious topic mappings
- [ ] T3.2: Inferred tag mappings are distinguished from literal or alias-based mappings in diagnostics
- [ ] T3.3: The first-version extra-field allowlist is frozen to `duration`, `num_participant`, `organizer`, `host`, and `participants`
- [ ] T3.4: The first version forbids fuzzy normalization for `organizer`, `host`, and `participants`
- [ ] T3.5: Retrieval docs do not reintroduce title or body keyword search as a substitute for structured tag extraction

## Batch 4: Wrapper diagnostics and workflow alignment

- [ ] T4.1: `sqlite-retrieval-contract.md` documents the normalized structured-constraint input shape expected by `vault_index_search`
- [ ] T4.2: The contract requires diagnostics for applied constraints, inferred constraints, rejected structured hints, selected `timeMode`, candidate counts, and fallback reason
- [ ] T4.3: `query-vault.md` and `second-brain-query/SKILL.md` consume the same extraction-stage contract and do not describe conflicting retrieval behavior
- [ ] T4.4: Retrieval safety guidance stays aligned with the structured-first contract and raw-SQL prohibition
