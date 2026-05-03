---
schema: requirements-review-v1
step-key: semantic-query-mapping-expansion
step-folder: 05-semantic-query-mapping-expansion
requirement-version: 1
step-version: 1
review-status: correct
reviewed-at: 2026-04-30
---

## Review Summary

The implementation correctly satisfies all requirement success criteria and TDD batch objectives. The extraction logic module properly separates Stage 0 constraint extraction into a testable surface, the time and location phrase normalization coverage has expanded deterministically, topic phrase expansion is bounded to governed canonical tags, and text-mode diagnostics report both mapped phrases and unresolved semantic hints. Documentation updates correctly reference the bounded semantic mapping policy without overclaiming structured response fields.

## Requirement Alignment

| Success Criterion | Status | Notes |
|-------------------|--------|-------|
| 1. Deterministic semantic mapping layer for retrieval phrases | pass | Contract section "Semantic mapping policy (frozen at step 05)" defines bounded rules; extraction-logic.ts implements table-driven lookup with no fuzzy similarity search |
| 2. Expanded explicit aliases for time and location expressions | pass | Added "今年/this year", "去年/last year", "这个月/this month", "上个月/last month", month-with-year, month-only, "以来/since", "之前/before", "之后/after", "从X到Y/between" patterns |
| 3. Small set of stable topic mappings for high-confidence inference | pass | TAG_KEYWORDS covers governed set: topic/training, topic/education, topic/idea, topic/design, topic/cv, topic/ai-tools with aliases from alias-registry.md |
| 4. Surfaced diagnostics for mapped and unmapped phrases | pass | formatDiagnosticOutput reports mapped phrases with reasons, unresolvedHints array captures ambiguous phrases (LLM, RAG, Agent, 大模型相关), text output distinguishes "no constraints" vs "shortlist insufficient" |
| 5. Mapping layer bounded and compatible with shortlist workflow | pass | Extraction uses only governed canonical values; unresolved phrases reported instead of guessed; no canonical_topic or extraFields introduced |

## Step Alignment

| TDD Batch | Status | Notes |
|-----------|--------|-------|
| Batch 1: Freeze semantic mapping ownership and boundaries | pass | Contract separates canonical-value ownership (alias-registry.md) from retrieval-time behavior; contract states semantic topic expansion resolves only to canonical tags; contract says ambiguous phrases remain unresolved; workflow and skill docs reference bounded semantic-mapping policy (lines 64 and 109 respectively) |
| Batch 2: Expand deterministic time and location phrase normalization | pass | Time normalization added for relative years, months, date ranges (since, before, after, between); time mode selection preserved (event vs note); location normalization uses governed canonical values only; no fuzzy semantic guesses (verified by "南方" test) |
| Batch 3: Bounded topic phrase expansion on governed canonical tags | pass | TAG_KEYWORDS includes topic/ai-tools with aliases from alias-registry.md; single canonical tag per phrase enforced; LLM, RAG, Agent, 大模型相关 not silently mapped; alias-registry alignment verified in tests |
| Batch 4: Mapped and unmapped phrase diagnostics | pass | formatDiagnosticOutput reports mapped phrases; unresolvedHints reported for ambiguous phrases; fallback output distinguishes cases; contract acknowledges text-formatted diagnostics only, not structured response fields |

## Spec Alignment

| Spec File | Status | Notes |
|-----------|--------|-------|
| sqlite-retrieval-contract.md | pass | Semantic mapping policy section added with bounded rules; time-phrase alias tables updated with new patterns; contract states it does not introduce canonical_topic; ambiguous phrase handling documented |
| query-vault.md | pass | References bounded semantic mapping policy in Stage 0 extraction section; extraction rules updated; low-risk inference rule preserved |
| second-brain-query/SKILL.md | pass | References bounded semantic mapping policy; extraction rules updated; ambiguous phrase handling noted |
| alias-registry.md | pass | Canonical tag and location values remain governance reference; topic/ai-tools aliases present; extraction-logic.ts mirrors registry values |

## Test Coverage

- 52 tests, 132 assertions covering all 4 TDD batches
- Batch 1: 6 documentation alignment tests verifying contract separation, policy consumption
- Batch 2: 28 time normalization tests covering all new patterns + existing behavior + location normalization
- Batch 3: 4 topic expansion tests verifying topic/ai-tools coverage, single-tag constraint, unmapped phrase handling, registry alignment
- Batch 4: 7 diagnostics tests verifying mapped phrase reporting, unresolved hint detection, fallback case distinction, docs honesty

Test suite passes (per implementation-result.md). Coverage is adequate for the bounded scope.

## Issues

- none

## Recommendation

proceed

## Phase Handoff Note

No prior review evidence needed to re-validate. Step introduces new behavior; all TDD batches verified fresh.

## Planning-Memory Follow-Up

none required

## Supersedes

none