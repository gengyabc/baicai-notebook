---
step-key: semantic-query-mapping-expansion
step-version: 1
requirement-version: 1
---

# Semantic Query Mapping Expansion

---

## Objective

Reduce semantic retrieval misses by extending the Stage 0 extraction layer with a small deterministic phrase-to-constraint mapping pass for time, location, and stable topic language, while making the router explicitly report which phrases were mapped, which remained unresolved, and when retrieval broadened beyond the structured shortlist.

---

## Mapping ownership and boundaries

The step must keep one deterministic ownership model for semantic mappings so later implementation does not guess where new behavior belongs:

- `.opencode/docs/sqlite-retrieval-contract.md` remains the source of truth for retrieval-time normalization behavior, including time-phrase tables, phrase-reporting expectations, and the bounded semantic-mapping policy.
- `.opencode/alias-registry.md` remains the source of truth for canonical tag values, accepted tag aliases, and canonical location values.
- `.opencode/plugins/vault-query-router/index.ts` is the live implementation surface that consumes those frozen mappings during `inferStructuredConstraints` and formats the current text-mode diagnostics.
- `.opencode/workflows/query-vault.md` and `.opencode/skills/second-brain-query/SKILL.md` must describe the same mapping order and reporting behavior without inventing broader semantic inference.

This step must stay within the current first-pass wrapper surface. Semantic topic expansion may resolve only to canonical `tags` values already supported by the live request shape. It must not introduce a new SQLite constraint family, a new wrapper entrypoint, or first-version `canonical_topic` filtering.

---

## Semantic mapping policy

The first version must freeze a narrow mapping policy that is deterministic enough for code and tests:

1. Run explicit literal and alias-backed extraction first for time, location, and tags.
2. Run a second bounded semantic phrase pass only for phrases that map to one already-governed canonical tag with low ambiguity.
3. If a phrase could plausibly map to multiple tags, multiple fields, or a not-yet-governed concept, leave it unresolved and report it as unmapped rather than guessing.
4. A single matched phrase may produce at most one canonical topic/tag output in the first version.
5. Time and location phrase expansion must remain deterministic table lookup or fixed-pattern normalization, not fuzzy similarity search.

The first-version high-confidence topic set must stay small and grounded in already-governed canonical tags. At minimum, the plan must cover the currently governed retrieval topics already present across the alias registry and live router surface, including `topic/training`, `topic/education`, `topic/idea`, `topic/design`, `topic/cv`, and `topic/ai-tools` where the user phrase is specific enough to make the mapping obvious.

Bare or overloaded phrases such as generic `Agent`, `LLM`, `RAG`, or `大模型相关` must not be forced into a canonical tag unless the requirement artifacts for this step add an explicit one-to-one mapping table for them. If they remain outside the frozen first-version table, the system must surface them as unresolved semantic hints instead of silently broadening or pretending they were normalized.

---

## Reporting contract for mapped and unmapped phrases

This step must make retrieval behavior inspectable without requiring unsupported wrapper response fields:

- Stage 0 extraction must keep a caller-side trace of mapped phrases with the matched phrase, target family or field, canonical value, and source class (`literal`, `alias`, or `inference`).
- The live router currently returns text output, not structured diagnostics. Therefore, first-version reporting must be satisfied by improving the router's textual structured-shortlist and fallback output so it explicitly separates:
  - mapped phrases that produced structured constraints
  - unresolved or rejected semantic hints that were considered but not applied
  - whether retrieval stayed structured or broadened to text fallback
- Do not require new live wrapper response fields in this step. Planned response-side diagnostics in the contract may be clarified, but implementation for this step must remain compatible with the router's current text output shape.

---

## Locked constraints

- Keep scope limited to the resolved step folder and the retrieval artifacts that define or implement Stage 0 extraction.
- Keep the first-pass retrieval family order unchanged: time/date, location, tags/topic, then the already-planned extra-field family.
- Do not add arbitrary keyword search, embedding search, ontology expansion, or fuzzy semantic similarity as part of the mapping layer.
- Do not introduce first-version `canonical_topic` filtering, arbitrary frontmatter-field expansion, or a new metadata-governance workflow.
- Prefer governed canonical values from `.opencode/alias-registry.md` whenever a mapping resolves to tags or locations.
- Preserve the existing structured-shortlist, reranking, and fallback flow from earlier steps.
- Preserve the rule that ambiguous semantic fragments are surfaced as unresolved instead of being guessed.

---

## Scope

### In

- Expand deterministic time and location phrase normalization coverage where the retrieval contract already defines stable tables or fixed patterns.
- Replace or refresh the live router's narrow hardcoded topic phrase list so it covers the governed retrieval topic set needed by this step, including `topic/ai-tools`.
- Freeze where semantic phrase tables live and which artifacts own canonical values versus retrieval-time behavior.
- Define the first-version rules for when topic language is mapped, when it is left unresolved, and how that decision is reported.
- Align the router, retrieval contract, workflow, and runtime skill on the same mapped/unmapped reporting behavior.
- Keep current text-mode diagnostics useful enough that later debugging can tell which phrases became structured filters.

### Out

- Adding a new canonical metadata field family to the structured SQLite pass.
- Universal synonym expansion for arbitrary domain language.
- Mapping ambiguous AI-language phrases to guessed tags without an explicit frozen table.
- Implementing structured wrapper response diagnostics as new machine-readable fields.
- Redesigning shortlist ranking, fallback thresholds, or metadata governance review policy.

---

# TDD Batches

## Batch 1: Freeze semantic mapping ownership and first-version boundaries

- Test: `.opencode/docs/sqlite-retrieval-contract.md` clearly separates canonical-value ownership (`.opencode/alias-registry.md`) from retrieval-time semantic mapping behavior.
- Test: the contract states that first-version semantic topic expansion may resolve only to already-supported canonical `tags` values and does not add `canonical_topic` or other new structured families.
- Test: the contract explicitly says ambiguous phrases remain unresolved and must be reported instead of guessed.
- Test: `.opencode/workflows/query-vault.md` and `.opencode/skills/second-brain-query/SKILL.md` consume the same bounded semantic-mapping policy.

## Batch 2: Expand deterministic time and location phrase normalization

- Test: the live router's extraction logic supports the time and location phrase coverage already frozen by `.opencode/docs/sqlite-retrieval-contract.md`, rather than only the current narrow year-only and limited location behavior.
- Test: time normalization still chooses `event` versus `note` mode before query construction and does not satisfy event-time requests with note timestamps.
- Test: location phrase expansion still normalizes only to `country`, `province`, and `city`, using governed canonical values.
- Test: extraction does not broaden to fuzzy or multi-hop semantic guesses for time or location language.

## Batch 3: Bounded topic phrase expansion on governed canonical tags

- Test: `.opencode/plugins/vault-query-router/index.ts` no longer relies on the current minimal hardcoded topic list alone and instead covers the governed retrieval topic set required by this step, including `topic/ai-tools`.
- Test: a matched semantic topic phrase produces at most one canonical tag in the first version.
- Test: phrases without one deterministic governed destination are not silently mapped.
- Test: `.opencode/alias-registry.md` and retrieval docs stay aligned on which canonical tag values are legal mapping targets.

## Batch 4: Mapped and unmapped phrase diagnostics in current router output

- Test: structured-shortlist output explicitly reports the mapped phrases that produced active constraints.
- Test: when extraction sees semantic hints it cannot safely normalize, router output explicitly reports them as unresolved or rejected rather than omitting them.
- Test: fallback output distinguishes between "no usable structured constraints" and "structured shortlist was insufficient after applying mapped constraints".
- Test: docs do not claim that these diagnostics already exist as structured response fields when they are only present in current text output.

---

## Files

- `.opencode/plugins/vault-query-router/index.ts` - live Stage 0 extraction and current text diagnostics
- `.opencode/docs/sqlite-retrieval-contract.md` - canonical retrieval-time mapping policy and phrase-reporting contract
- `.opencode/workflows/query-vault.md` - retrieval workflow behavior and extraction ordering
- `.opencode/skills/second-brain-query/SKILL.md` - runtime consumer of the mapping policy
- `.opencode/alias-registry.md` - governed canonical tag and location values used as mapping targets

## Symbols

- `inferStructuredConstraints`
- `inferTimeRange`
- `collectLocationMatches`
- `TAG_KEYWORDS`
- `LOCATION_ALIASES`
- `vault_index_search`
- `structuredTrace`
- `inferredConstraints`
- `rejectedStructuredHints`

## Execution constraints

- Keep implementation deterministic and table-driven where possible.
- Reuse the current router entrypoint and output shape instead of inventing a parallel semantic-mapping layer.
- If a required canonical destination for a highlighted phrase does not exist in the governed retrieval surface, leave the phrase unresolved and report it rather than inventing metadata semantics.
- Keep documentation honest about what is live versus planned in both request and response shapes.

## Invariants

- Structured extraction remains the first retrieval step when usable structured clues exist.
- Canonical locations and canonical tags remain governed values, not ad hoc query literals.
- Structured constraints remain bounded to time, location, tags/topic, and the already-planned extra fields.
- Ambiguous semantic language remains visible as unresolved instead of being converted into hidden guesses.
- Broadened retrieval remains explicit and lower-confidence when the structured shortlist is insufficient.

## Deferred follow-up

- New canonical metadata values for AI-specific concepts that do not yet have an approved governed retrieval destination.
- Machine-readable wrapper response diagnostics for mapped and rejected phrases.
- Broader semantic concept families or ontology-style expansion beyond the bounded first-version table.
