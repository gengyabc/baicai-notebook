---
step-key: retrieval-contract-and-safety-guardrails
step-version: 1
requirement-version: 1
---

# Retrieval Contract and Safety Guardrails

---

## Objective

Make vault retrieval safe and predictable by freezing one canonical SQLite contract, one required first-pass wrapper entrypoint, and one consistent provenance and fallback policy across the contract doc, workflow, runtime skill, and safety rules.

---

## Existing contracts and boundaries

- `.opencode/docs/sqlite-retrieval-contract.md` is the canonical schema and wrapper-contract reference for `.opencode/frontmatter-index.sqlite`.
- `.opencode/workflows/query-vault.md` remains the source of truth for retrieval order, decision chain, and fallback behavior.
- `.opencode/skills/second-brain-query/SKILL.md` must consume the same contract and must not redefine competing schema or fallback behavior.
- `.opencode/rules/retrieval-safety.md` enforces schema discipline, wrapper usage, file-validation requirements, provenance separation, and network-permission behavior.
- This step is contract and guardrail work only. It does not implement the retrieval wrapper itself or redesign the structured extraction logic from earlier steps.

---

## Contract surface to freeze

The plan must leave later implementation with one unambiguous retrieval contract:

- Document the actual SQLite schema for `notes` and `properties` and the retrieval-relevant fields used by first-pass retrieval.
- Declare `vault_index_search` as the required first-pass entrypoint in non-debug sessions.
- Keep the current wrapper request shape explicit, and clearly label planned request-shape additions so callers do not assume live support.
- Require local-first shortlist generation and explicit shortlist reads before broader file reads.
- Make it explicit that SQLite is a derived index and that shortlist hits are not confirmed file facts until the file is read.

---

## Safety and provenance decisions

The first version must freeze these behavior boundaries so later coding and testing do not need to guess:

- Schema guessing is prohibited; schema-aware work must read the canonical contract first.
- Wrapper bypass is prohibited for normal retrieval; ad hoc SQL is allowed only for retrieval-layer implementation, debugging, or verification.
- Empty or unusable structured extraction must not trigger an unbounded SQLite query.
- Stale-index handling must remain explicit: missing or unreadable shortlisted files are reported as stale or inconsistent index evidence, not as confirmed facts.
- Non-debug sessions must ask the user before `websearch` or `webfetch`; debug-mode exceptions must still label network-derived results clearly.
- Answer layers must stay distinct across four categories: file-backed local facts, index-only hits, network-derived information, and working hypotheses or inferred matches.

---

## Locked constraints

- Keep scope limited to the resolved step folder and the existing retrieval artifacts it governs.
- Do not invent a new retrieval workflow, a new wrapper name, or a new step decomposition.
- Keep `query-vault.md` as the retrieval behavior authority and `.opencode/docs/sqlite-retrieval-contract.md` as the schema and wrapper-contract authority.
- Keep the plan compatible with step 01 shortlist behavior, step 02 metadata governance assumptions, and step 03 structured extraction rules.
- Do not require user-facing formatting beyond confidence and provenance separation unless the existing requirement already defines it.
- Do not turn index-only hits into verified claims, and do not blur external results into local-vault evidence.

---

## Scope

### In

- Freeze the canonical contract document for SQLite schema, retrieval-relevant fields, and wrapper request and response boundaries.
- Align `query-vault.md`, `second-brain-query/SKILL.md`, and `retrieval-safety.md` to the same contract and local-first policy.
- Freeze the guardrails for schema reading, wrapper usage, stale-index labeling, fallback visibility, and non-debug network permission.
- Freeze provenance separation requirements so later answers and diagnostics keep confirmed facts, index-only evidence, external results, and hypotheses distinct.
- Keep planned versus live wrapper capabilities explicit so later implementation does not assume unsupported fields already exist.

### Out

- Implementing or renaming `vault_index_search`.
- Redesigning structured extraction family order, normalization logic, or shortlist thresholds from prior steps.
- Expanding metadata governance beyond the retrieval safety needs already discovered.
- Adding new retrieval entrypoints, new database tables, or a new answer-rendering product surface.
- Broadening first-pass structured retrieval to arbitrary frontmatter fields beyond the already-discovered allowlist.

---

# TDD Batches

## Batch 1: Canonical schema and wrapper contract source

- Test: `.opencode/docs/sqlite-retrieval-contract.md` is the single canonical reference for `.opencode/frontmatter-index.sqlite`, the `notes` and `properties` schema, and retrieval-relevant indexed fields.
- Test: the contract explicitly states that SQLite is a derived retrieval index, not the vault source of truth.
- Test: the contract makes `vault_index_search` the only supported first-pass retrieval entrypoint in non-debug sessions.
- Test: the contract clearly separates current wrapper request shape from planned additions so callers do not assume unsupported input or diagnostics fields are already live.

## Batch 2: Local-first workflow and wrapper discipline

- Test: `.opencode/workflows/query-vault.md` requires Stage 0 extraction before Stage 1 shortlist and keeps `vault_index_search` as the first retrieval wrapper.
- Test: retrieval docs forbid ad hoc raw SQL as the default path and require active constraints to be enforced inside SQLite.
- Test: retrieval docs require shortlist-first reading order and do not allow broad file reads before structured shortlist generation when usable structured clues exist.
- Test: retrieval docs state that empty or unusable structured extraction must not trigger an unbounded SQLite query.

## Batch 3: Safety guardrails and stale-index handling

- Test: `.opencode/rules/retrieval-safety.md` forbids schema guessing and directs schema-aware work back to the canonical contract.
- Test: the safety rule distinguishes normal retrieval from retrieval-layer debugging and verification when discussing manual SQL.
- Test: the safety rule requires stale or inconsistent index hits to be labeled as index issues when shortlisted files are missing or unreadable.
- Test: the safety rule keeps fallback explicit and requires lower confidence when retrieval broadens beyond the structured shortlist.

## Batch 4: Provenance separation and network permission policy

- Test: the contract, workflow, skill, and safety rule agree on the separation between file-backed facts, index-only hits, network-derived information, and working hypotheses.
- Test: non-debug network search requires explicit user permission and the allowed prompt shape is documented consistently.
- Test: debug-mode exceptions do not weaken schema discipline or provenance labeling requirements.
- Test: `.opencode/skills/second-brain-query/SKILL.md` consumes the same contract and safety policy without redefining a conflicting retrieval flow.

---

## Files

- `.opencode/docs/sqlite-retrieval-contract.md` - canonical SQLite schema and wrapper contract
- `.opencode/workflows/query-vault.md` - retrieval order, fallback policy, and local-first behavior
- `.opencode/skills/second-brain-query/SKILL.md` - runtime consumer of the retrieval contract
- `.opencode/rules/retrieval-safety.md` - retrieval safety and provenance guardrails
- `.opencode/rules/debug-mode.md` - debug-session behavior boundary referenced by the safety policy

## Symbols

- `vault_index_search`
- `.opencode/frontmatter-index.sqlite`
- `notes`
- `properties`
- `structuredTrace`
- `appliedConstraints`
- `inferredConstraints`
- `rejectedStructuredHints`
- `candidateCounts`
- `fallbackReason`

## Execution constraints

- Keep the step doc-first and rule-alignment-first.
- Reuse the existing retrieval artifacts instead of introducing parallel contract surfaces.
- Keep the plan concrete enough that later implementation can tell which behavior is already live, which is planned, and which file owns each rule.
- Stop if later execution would require new product behavior beyond the discovered requirement.

## Invariants

- The Markdown vault remains the source of truth and SQLite remains a derived retrieval index.
- `vault_index_search` remains the first-pass retrieval wrapper in non-debug sessions.
- Structured shortlist generation remains local-first.
- Shortlist hits are not confirmed evidence until the source file is read.
- External results, index-only hits, confirmed local facts, and hypotheses remain distinct.

## Deferred follow-up

- Wrapper implementation for planned diagnostics fields and planned request-shape additions.
- Any user-facing answer template beyond the required provenance separation.
- Broader metadata governance changes or new structured constraint families.
