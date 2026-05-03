---
step-folder: 04-retrieval-contract-and-safety-guardrails
step-version: 1
test-layer-mode: lower-level
---

# Test Checklist

Derived from TDD Batches in step.md.

## Batch 1: Canonical schema and wrapper contract source

- [ ] B1.1: `.opencode/docs/sqlite-retrieval-contract.md` declares itself as the single canonical reference for `.opencode/frontmatter-index.sqlite`, the `notes` and `properties` schema, and retrieval-relevant indexed fields
- [ ] B1.2: The contract explicitly states that SQLite is a derived retrieval index, not the vault source of truth (already present; verify prominence and freeze status)
- [ ] B1.3: The contract makes `vault_index_search` the only supported first-pass retrieval entrypoint in non-debug sessions (already present; verify explicit wording)
- [ ] B1.4: The contract clearly separates current wrapper request shape from planned additions so callers do not assume unsupported input or diagnostics fields are already live (already present; verify clarity of live vs planned labels)
- [ ] B1.5: The Required Indexes section matches the actual SQLite schema indexes

## Batch 2: Local-first workflow and wrapper discipline

- [ ] B2.1: `query-vault.md` requires Stage 0 extraction before Stage 1 shortlist (already present; verify explicit prohibition language)
- [ ] B2.2: `query-vault.md` forbids ad hoc raw SQL as the default path and requires active constraints to be enforced inside SQLite (already present; verify coverage)
- [ ] B2.3: `query-vault.md` requires shortlist-first reading order and does not allow broad file reads before structured shortlist generation when usable structured clues exist
- [ ] B2.4: `query-vault.md` states that empty or unusable structured extraction must not trigger an unbounded SQLite query (already present; verify explicit language)
- [ ] B2.5: `query-vault.md` explicitly labels `vault_index_search` as the first retrieval wrapper

## Batch 3: Safety guardrails and stale-index handling

- [ ] B3.1: `retrieval-safety.md` forbids schema guessing and directs schema-aware work back to the canonical contract document
- [ ] B3.2: `retrieval-safety.md` distinguishes normal retrieval from retrieval-layer debugging and verification when discussing manual SQL
- [ ] B3.3: `retrieval-safety.md` requires stale or inconsistent index hits to be labeled as index issues (stale/inconsistent index evidence) when shortlisted files are missing or unreadable
- [ ] B3.4: `retrieval-safety.md` keeps fallback explicit and requires lower confidence when retrieval broadens beyond the structured shortlist

## Batch 4: Provenance separation and network permission policy

- [ ] B4.1: The contract, workflow, skill, and safety rule agree on the same four provenance categories: file-backed local facts, index-only hits, network-derived information, and working hypotheses
- [ ] B4.2: Non-debug network search requires explicit user permission and the allowed prompt shape is documented consistently across retrieval-safety.md and query-vault.md
- [ ] B4.3: Debug-mode exceptions do not weaken schema discipline or provenance labeling requirements (stated in both retrieval-safety.md and debug-mode.md)
- [ ] B4.4: `second-brain-query/SKILL.md` consumes the same contract and safety policy without redefining a conflicting retrieval flow
