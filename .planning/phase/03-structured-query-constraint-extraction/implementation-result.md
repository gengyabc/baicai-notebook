---
step-folder: 03-structured-query-constraint-extraction
requirement-version: 1
step-version: 1
implementation-status: complete
---

## Implementation summary

Implemented the structured query constraint extraction contract as documentation and contract updates across five files. The step is contract-first and retrieval-doc-first: no code was written; all deliverables are Markdown documentation defining the extraction stage, normalized input shape, diagnostics, time-phrase alias tables, and safety constraints.

### Changed files

- `.opencode/docs/sqlite-retrieval-contract.md` - Added Constraint Extraction Stage section, Normalized Structured-Constraint Input Shape, Time-Phrase Alias Tables, and Diagnostics contract. Updated wrapper behavior to reference the new input shape. Updated supported time modes and canonical matching expectations.
- `.opencode/workflows/query-vault.md` - Added Stage 0: Constraint Extraction before Stage 1. Updated retrieval decision chain from five to six stages. Updated Stage 1 to receive constraints from Stage 0. Updated constraint rules, time/location matching detail, integration topology, and invariants.
- `.opencode/skills/second-brain-query/SKILL.md` - Added Stage 0 constraint extraction to the decision chain. Added detailed Constraint Extraction section with time, location, tag/topic, and extra-field extraction rules. Updated structured query contract to reference the extraction process and wrapper contract. Updated fallback visibility and constraints.
- `.opencode/alias-registry.md` - Added Retrieval integration section documenting that the constraint-extraction stage consumes this registry for tag and location canonical values, and that time-phrase aliases live in the retrieval contract document.
- `.opencode/rules/retrieval-safety.md` - Added Structured-First Constraint section and Raw-SQL Prohibition section. Updated Required Retrieval Order to start with Stage 0. Extended Structured Query Discipline with rules about freeform keyword search prohibition, extra-field allowlist, and fuzzy normalization prohibition. Extended Anti-Patterns with five new entries.

## Test checklist

### Batch 1: Pre-shortlist extraction stage and family priority

- [x] T1.1: `query-vault.md` requires constraint extraction before any Stage 1 SQLite shortlist execution - Stage 0 is mandatory and must not be skipped
- [x] T1.2: The extraction stage freezes family priority as time/date -> location -> tags/topic -> allowlisted extra fields - all three documents state this frozen order
- [x] T1.3: Retrieval documentation states that usable structured clues must be applied through SQLite before title-first or body-first search - stated in query-vault.md, SKILL.md, and retrieval-safety.md
- [x] T1.4: Empty or unusable structured extraction does not authorize an unbounded structured query - stated in query-vault.md and retrieval-safety.md

### Batch 2: Time and location normalization rules

- [x] T2.1: The retrieval contract distinguishes `event` versus `note` time mode and freezes when each is allowed - defined in sqlite-retrieval-contract.md, query-vault.md, and SKILL.md
- [x] T2.2: Year, half-year, month, and explicit date-range phrases are normalized into inclusive query windows - Time-Phrase Alias Tables in sqlite-retrieval-contract.md
- [x] T2.3: Event-time matching uses event-interval overlap with `start_date` and `end_date`, not `created` or `updated` - stated in all three primary documents
- [x] T2.4: Location extraction is limited to `country`, `province`, and `city` and preserves metadata-level China default semantics - stated in all documents
- [x] T2.5: Retrieval docs forbid query-time injection of `country = 中国` when the user omitted country - stated in query-vault.md, SKILL.md, retrieval-safety.md, and sqlite-retrieval-contract.md

### Batch 3: Tag, topic, and extra-field mapping boundaries

- [x] T3.1: Retrieval docs require explicit canonical tag mappings first and allow low-risk inference only for obvious topic mappings - stated in query-vault.md, SKILL.md, and sqlite-retrieval-contract.md
- [x] T3.2: Inferred tag mappings are distinguished from literal or alias-based mappings in diagnostics - structuredTrace records source as "literal", "alias", or "inference"; inferredConstraints is a separate diagnostic field
- [x] T3.3: The first-version extra-field allowlist is frozen to `duration`, `num_participant`, `organizer`, `host`, and `participants` - stated in all documents
- [x] T3.4: The first version forbids fuzzy normalization for `organizer`, `host`, and `participants` - stated in sqlite-retrieval-contract.md, SKILL.md, and retrieval-safety.md
- [x] T3.5: Retrieval docs do not reintroduce title or body keyword search as a substitute for structured tag extraction - explicit prohibition in query-vault.md, SKILL.md, and retrieval-safety.md

### Batch 4: Wrapper diagnostics and workflow alignment

- [x] T4.1: `sqlite-retrieval-contract.md` documents the normalized structured-constraint input shape expected by `vault_index_search` - full input shape with all four families and diagnostics
- [x] T4.2: The contract requires diagnostics for applied constraints, inferred constraints, rejected structured hints, selected `timeMode`, candidate counts, and fallback reason - Diagnostics contract section in sqlite-retrieval-contract.md
- [x] T4.3: `query-vault.md` and `second-brain-query/SKILL.md` consume the same extraction-stage contract and do not describe conflicting retrieval behavior - both reference the same contract, same priority order, same family rules
- [x] T4.4: Retrieval safety guidance stays aligned with the structured-first contract and raw-SQL prohibition - Structured-First Constraint and Raw-SQL Prohibition sections in retrieval-safety.md

## Verification

Cross-reference consistency verified:
- Stage 0 referenced in all five files
- Extraction priority order (frozen) stated in all four workflow/contract/safety documents
- `extraFields` allowlist consistently defined
- Time-phrase alias tables referenced from query-vault.md, SKILL.md, and alias-registry.md without duplication
- `structuredTrace` and diagnostics referenced in query-vault.md, SKILL.md, and sqlite-retrieval-contract.md
- Six-stage decision chain consistently stated in query-vault.md and SKILL.md
- No conflicting retrieval behavior between documents

## Risks

- Time-phrase alias tables cover common patterns but may need expansion for less common phrases as usage grows
- The `structuredTrace` diagnostics shape is defined but will need validation when the wrapper is implemented in code
- Extra-field allowlist is intentionally small; real usage may justify expansion in a later step

## E2E

none (documentation-only step, no executable code)

## Fix pass: QB-001

Fixed two quality findings from review round 1:

- **QR-enhance-info-retrieval-P1-001**: Published wrapper contract did not match the live `vault_index_search` schema. Replaced the single "Normalized Structured-Constraint Input Shape" section with three clearly separated sections: "Current Request Shape" (aligned with the live wrapper in `.opencode/plugins/vault-query-router/index.ts`), "Planned Request Shape" (extraFields, structuredTrace marked as planned contract work), and "Current Wrapper Behavior" (explicitly states what is and is not supported today). Updated all referencing documents to use "current request shape" language and to note that `extraFields` and `structuredTrace` are planned inputs.

- **QR-enhance-info-retrieval-P2-002**: Input and output responsibilities were conflated inside the `constraints` payload. Added a separate "Wrapper Response Contract" section for execution diagnostics (`appliedConstraints`, `inferredConstraints`, `rejectedStructuredHints`, `candidateCounts`, `fallbackReason`) with explicit statement that these are response-side data the caller must not supply as input. Updated query-vault.md and SKILL.md diagnostics sections to clarify the request/response boundary. Added note that the response contract is planned and the current wrapper returns only text-formatted output.

### Changed files (fix pass)

- `.opencode/docs/sqlite-retrieval-contract.md` - Replaced single input shape with Current Request Shape, Planned Request Shape, Wrapper Response Contract, and updated Current Wrapper Behavior
- `.opencode/workflows/query-vault.md` - Updated Stage 1 step 2 and 5, constraint rules, Stage 1 execution contract, and Diagnostics section to reference current request shape and response contract
- `.opencode/skills/second-brain-query/SKILL.md` - Updated Stage 0/1 descriptions, Diagnostics section, Structured Query Contract, and Fallback Visibility to reference current request shape and response contract
- `.opencode/rules/retrieval-safety.md` - Updated Structured-First Constraint item 2 to reference current request shape and array-valued location input

## Fix pass 2: QB-001

Fixed two remaining quality findings after fix pass 1:

- **QR-enhance-info-retrieval-P1-001** (still open): Docs still promised an empty-constraint structured-shortlist path that the live wrapper does not support. The live wrapper in `.opencode/plugins/vault-query-router/index.ts` goes directly to text fallback (`mode: "text-fallback"`) when constraints are absent (lines 905-922 of `searchIndex()`). Updated `query-vault.md` Stage 0 extraction rules (line 58) and constraint rules (line 108) to document that the live wrapper falls back to text search rather than returning an empty structured shortlist. Updated `SKILL.md` constraint rules (line 109) with the same correction. No empty-shortlist path is claimed for the current wrapper.

- **QR-enhance-info-retrieval-P2-002** (still open): `.opencode/skills/second-brain-query/SKILL.md` diagnostics section said "must produce a `structuredTrace` and the full diagnostics payload" which blurred extraction output vs wrapper response diagnostics. Rewrote SKILL.md Diagnostics section to clearly state that Stage 0 produces ONLY caller-side extraction artifacts (`structuredTrace`, normalized constraint values, matched phrases), and that `appliedConstraints`, `candidateCounts`, `fallbackReason`, `inferredConstraints`, `rejectedStructuredHints` are exclusively wrapper response data. Also updated `query-vault.md` Diagnostics section (line 80) with the same clearer boundary wording.

### Changed files (fix pass 2)

- `.opencode/workflows/query-vault.md` - Updated Stage 0 extraction rule on empty constraints (line 58), Diagnostics section (line 80), and constraint rules (line 108) to truthfully document live wrapper text-fallback behavior and clarify extraction-vs-response diagnostics boundary
- `.opencode/skills/second-brain-query/SKILL.md` - Updated Diagnostics section (line 100) to separate extraction artifacts from wrapper response diagnostics; updated constraint rules (line 109) to document text-fallback behavior for empty constraints

## Fix pass: QB-002

Fixed one quality finding:

- **QR-enhance-info-retrieval-P1-003**: `X之后` / `after X` time alias was normalizing inclusively (including X), contradicting the plain-language meaning of "after". Updated the Explicit date ranges alias table to make `before` and `after` exclusive of the boundary, and added `X以来` / `since X` as an inclusive alternative. Updated the general inclusive-endpoints rule to state the exception explicitly.

### Changed files (fix pass QB-002)

- `.opencode/docs/sqlite-retrieval-contract.md` - Updated `X之前`/`before X` to show exclusive boundary in pattern column and normalized window column; updated `X之后`/`after X` similarly (example: `2025年之后 -> [2026-01-01, 9999-12-31]`); added `X以来`/`since X` row as inclusive; updated the general window rule to state that `before`/`after` are exclusive of the boundary
