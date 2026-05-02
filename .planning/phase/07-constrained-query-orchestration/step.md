---
step-key: constrained-query-orchestration
step-version: 1
requirement-version: 1
---

# Constrained Query Orchestration

---

## Objective

Make structured retrieval more governable and debuggable by requiring the caller to normalize user intent into contract-supported canonical constraints before `vault_index_search`, then allowing only one bounded broadening path that reuses explicitly approved expansion relationships instead of router-local freeform keyword guessing.

---

## Governed artifact ownership

This step must freeze one deterministic ownership model for governed retrieval normalization so later implementation does not guess which file owns which vocabulary:

- `.opencode/canonical-tags.json` is the only legal runtime source of final canonical tag values that may be emitted in `constraints.tags` or `constraints.hierarchicalTags`.
- `.opencode/tag-aliases.json` is the only legal runtime source for mapping user-facing tag aliases into canonical tag values from `.opencode/canonical-tags.json`.
- `.opencode/tag-expansions.json` is the only legal runtime source for bounded neighboring-tag expansion relationships, and every expansion target it names must already exist in `.opencode/canonical-tags.json`.
- `.opencode/location-aliases.json` is the only legal runtime source for mapping user-facing location aliases into canonical `country`, `province`, and `city` values used by the retrieval contract.
- `.opencode/alias-registry.md` remains a human-reviewed bootstrap source and migration reference during this step, but it is no longer the legal runtime source for final canonical tag outputs once these machine-readable artifacts exist.
- `.opencode/docs/sqlite-retrieval-contract.md` remains the contract authority for request shape, pass ordering, and diagnostics semantics. It may reference the governance artifacts, but it must not duplicate their governed value tables.

The first implementation may seed the JSON artifacts by extracting governed values from `.opencode/alias-registry.md`, but runtime retrieval must consume the JSON artifacts rather than parsing or semantically depending on the Markdown registry.

---

## Orchestration protocol

The retrieval caller must follow this fixed control flow whenever the user request contains usable structured clues:

1. Analyze the request before retrieval and normalize only retrieval-contract-supported fields.
2. Resolve tag outputs only to canonical values from `.opencode/canonical-tags.json`, using `.opencode/tag-aliases.json` and `.opencode/location-aliases.json` for input normalization when needed.
3. Call `vault_index_search` with the normalized constraint payload; do not delegate first-pass tag or location inference back to router-local keyword tables when governed caller-side normalization succeeded.
4. Run the first structured pass with the primary canonical constraints only. Do not auto-expand to neighboring tags before this first pass completes.
5. If the primary structured pass returns fewer than 3 candidates, one broadened structured pass may run using only explicitly approved neighboring canonical tags from `.opencode/tag-expansions.json`.
6. If the primary structured pass returns 3 or more candidates, do not auto-run a broadened semantic expansion pass in the first version. Any later fallback behavior continues through the existing shortlist-first decision chain.
7. The caller must keep SQL generation and execution inside the wrapper layer. The LLM and orchestration layer may normalize constraints, but they must not emit raw SQL.

This step intentionally freezes a narrower first-version trigger for broadened semantic expansion than the requirement's general discussion of "empty or clearly insufficient". Fewer-than-3-result broadening is the automatic expansion trigger in version 1 because it is deterministic, explainable, and does not require an invented subjective insufficiency threshold.

---

## Normalization and trace rules

The caller-side normalization stage must preserve one inspectable trace model across literal, alias-based, and inference-based mappings:

- `literal` means the user phrase already matched a legal canonical value directly.
- `alias` means the user phrase matched a governed alias that normalized to a canonical value through `.opencode/tag-aliases.json` or `.opencode/location-aliases.json`.
- `inference` means the user phrase did not literally match a canonical value or alias, but one bounded governed mapping rule resolved it to exactly one approved canonical tag.

First-version tag inference remains narrow:

- It may resolve only to canonical tags already listed in `.opencode/canonical-tags.json`.
- It must not emit more than one primary canonical tag per matched phrase.
- It must not invent new tag strings, new structured fields, or freeform semantic buckets.
- If a phrase could plausibly map to multiple canonical tags or to an ungoverned concept, leave it unresolved and report it rather than guessing.

First-version broadened expansion also remains narrow:

- A broadened pass may add only the small approved neighboring canonical tag set listed for the chosen primary tag in `.opencode/tag-expansions.json`.
- The broadened set must stay small enough to remain explainable in one trace, with at most two to three approved neighboring canonical tags when the artifact lists multiple close neighbors.
- Expansion artifacts may broaden only among already-approved canonical tags; they must not introduce alias strings or new concepts.

---

## Wrapper and diagnostics alignment

This step must stay compatible with the existing `vault_index_search` wrapper entrypoint and the shortlist-first policy from earlier steps while freezing clearer caller-versus-wrapper responsibilities:

- `vault_index_search` remains the only structured SQLite execution path.
- The caller owns normalization, governed artifact lookup, and the decision to attempt the bounded expansion pass.
- The wrapper owns SQL generation, execution, shortlist ranking inputs, and reporting candidate counts for each structured pass.
- The contract and runtime flow must distinguish at least these pass states: `primary-structured-pass`, `expansion-structured-pass`, and the later existing fallback chain.
- Diagnostics must report which canonical constraints were used in each structured pass, whether each mapping was `literal`, `alias`, or `inference`, why expansion was triggered, and how many candidates each pass returned.
- The workflow and skill docs must stay honest about live versus planned request-shape support. If the wrapper still lacks some caller-supplied trace fields, the plan must preserve the pass semantics and reporting requirement without inventing a second retrieval entrypoint.

This step does not replace the current retrieval contract families. It governs how the caller prepares and broadens `time`, `location`, `tags`, and other already-allowed constraint families before the wrapper executes them.

---

## Locked constraints

- Keep scope limited to the resolved step folder and the retrieval artifacts that define or implement caller-side normalization and structured pass orchestration.
- Keep `.opencode/canonical-tags.json` as the unique legal source of final canonical tag outputs.
- Keep alias governance, expansion governance, and location normalization governance in separate machine-readable artifacts with separate responsibilities.
- Do not allow the LLM or caller to emit raw SQL or unsupported structured keys.
- Do not allow a broadened semantic pass before the primary structured pass completes.
- Do not auto-broaden when the primary structured pass returns 3 or more candidates in the first version.
- Do not introduce a new retrieval wrapper entrypoint, a schema redesign, or unrestricted ontology-style expansion.
- Keep the step aligned with the retrieval contract, the governed metadata work, the semantic-mapping work, and existing retrieval safety rules.

---

## Scope

### In

- Freezing the machine-readable governance artifacts and their exact responsibilities at paths under `.opencode/`.
- Defining how caller-side normalization consumes canonical tags, tag aliases, tag expansions, and location aliases.
- Defining the first-version automatic pass order: primary governed structured pass first, zero-result bounded expansion pass second, then existing fallback behavior.
- Freezing how literal, alias, and inference mappings are distinguished in retrieval diagnostics.
- Aligning the retrieval contract, workflow, runtime skill, and router implementation around the same caller-versus-wrapper responsibility boundary.
- Updating the live retrieval implementation surface so router-local deterministic extraction stops being the primary source of tag and location governance when caller-supplied governed constraints are available.
- Defining a lightweight human-review workflow for proposing, approving, and rejecting additions to the governed JSON artifacts, consistent with the requirement's default human-approval posture for canonical tag additions.
- Defining first-version machine-readable diagnostics fields for the wrapper response so multi-pass retrieval behavior can be inspected programmatically rather than only through caller-side text output.

### Out

- Redesigning the SQLite schema, shortlist ranking, or fallback thresholds.
- Allowing the LLM to generate arbitrary SQL or arbitrary structured fields.
- Adding unrestricted semantic broadening, fuzzy ontology search, or multi-hop topic inference.
- Auto-broadening on subjective "insufficient but non-zero" shortlist counts in the first version.

---

# TDD Batches

## Batch 1: Freeze machine-readable governance artifact boundaries

- Test: `.opencode/docs/sqlite-retrieval-contract.md` names `.opencode/canonical-tags.json`, `.opencode/tag-aliases.json`, `.opencode/tag-expansions.json`, and `.opencode/location-aliases.json` with the same distinct responsibilities frozen by this step.
- Test: the contract states that `.opencode/canonical-tags.json` is the only legal runtime source for final canonical tag outputs.
- Test: retrieval docs no longer describe `.opencode/alias-registry.md` as the legal runtime source for final canonical tag outputs, while still allowing it as a bootstrap or human-review reference.
- Test: every canonical tag referenced by `.opencode/tag-aliases.json` or `.opencode/tag-expansions.json` must already exist in `.opencode/canonical-tags.json`.

## Batch 2: Enforce caller-side normalization before structured execution

- Test: `.opencode/workflows/query-vault.md` requires caller-side governed normalization before `vault_index_search` when usable structured clues exist.
- Test: `.opencode/skills/second-brain-query/SKILL.md` instructs the model to emit only retrieval-contract-supported fields and only governed canonical tag values.
- Test: the live router implementation accepts caller-supplied governed constraints without re-deriving competing tag or location values from router-local keyword tables.
- Test: no retrieval artifact claims that raw SQL generation is permitted as a substitute for governed structured constraints.

## Batch 3: Freeze the bounded primary-pass and expansion-pass policy

- Test: the primary structured pass uses only the caller's primary canonical constraints with no automatic neighboring-tag expansion.
- Test: automatic broadening may run only after a primary structured pass that returns fewer than 3 candidates.
- Test: the broadened pass uses only explicitly approved neighbors from `.opencode/tag-expansions.json` and does not invent new canonical tags.
- Test: primary structured results of 3 or more candidates do not trigger first-version automatic semantic expansion.

## Batch 4: Distinguish literal, alias, inference, and pass-level diagnostics

- Test: retrieval diagnostics distinguish `literal`, `alias`, and `inference` mappings for each applied governed constraint.
- Test: diagnostics distinguish `primary-structured-pass` from `expansion-structured-pass` and report why expansion was triggered.
- Test: diagnostics report the canonical constraints used and candidate counts returned for each structured pass.
- Test: unresolved or ambiguous semantic hints are reported rather than silently converted into guessed canonical tags.

## Batch 5: Align implementation surfaces with the new governance source of truth

- Test: `.opencode/plugins/vault-query-router/index.ts` and any extraction helpers consume the machine-readable governance artifacts rather than treating Markdown registry tables or hardcoded topic maps as the primary runtime source of tag and location governance.
- Test: any retained router-local deterministic mappings are strictly derived consumers of the governed artifacts, not independent sources of truth.
- Test: `.opencode/alias-registry.md` remains aligned enough to seed and review the governed artifacts, but runtime retrieval no longer depends on it as the final canonical output surface.
- Test: existing shortlist-first retrieval and fallback behavior remain intact outside the new bounded expansion rule.

## Batch 6: Human-review workflow for governed artifact changes

- Test: the step defines a lightweight propose-approve-reject workflow for additions to `.opencode/canonical-tags.json`, `.opencode/tag-aliases.json`, `.opencode/tag-expansions.json`, and `.opencode/location-aliases.json`.
- Test: canonical tag additions require explicit human approval by default, consistent with the requirement's governance posture.
- Test: alias and expansion additions may be proposed by LLM or human but must be reviewable before merging into the governed artifacts.
- Test: the workflow is documented in at least one retrieval-facing artifact so later maintenance can follow it without inventing an ad hoc process.

## Batch 7: Machine-readable wrapper response diagnostics

- Test: the retrieval contract defines first-version machine-readable diagnostics fields in the wrapper response for pass state, applied constraints, expansion trigger reason, and candidate counts.
- Test: diagnostics fields distinguish `primary-structured-pass` from `expansion-structured-pass` with structured data rather than text-only output.
- Test: the wrapper response contract stays backward-compatible: existing text output continues to work while structured diagnostics are added alongside it.
- Test: the contract honestly marks which diagnostics fields are live versus planned so implementation can proceed incrementally.

---

## Files

- `.opencode/canonical-tags.json` - unique legal runtime source of canonical tag outputs
- `.opencode/tag-aliases.json` - alias-to-canonical-tag runtime mapping artifact
- `.opencode/tag-expansions.json` - approved neighboring-tag expansion artifact
- `.opencode/location-aliases.json` - alias-to-canonical-location runtime mapping artifact
- `.opencode/docs/sqlite-retrieval-contract.md` - retrieval contract, pass ordering, and diagnostics authority
- `.opencode/workflows/query-vault.md` - caller-side retrieval orchestration workflow
- `.opencode/skills/second-brain-query/SKILL.md` - runtime caller behavior for structured retrieval
- `.opencode/plugins/vault-query-router/index.ts` - live wrapper and retrieval orchestration implementation surface
- `.opencode/plugins/vault-query-router/extraction-logic.ts` - extraction and mapping consumer surface
- `.opencode/plugins/vault-query-router/extraction.test.ts` - contract and orchestration coverage
- `.opencode/alias-registry.md` - bootstrap and human-review source used to seed machine-readable artifacts

## Symbols

- `vault_index_search`
- `constraints.tags`
- `constraints.hierarchicalTags`
- `country`
- `province`
- `city`
- `structuredTrace`
- `literal`
- `alias`
- `inference`
- `primary-structured-pass`
- `expansion-structured-pass`

## Execution constraints

- Keep the first version deterministic and artifact-driven.
- Prefer replacing ad hoc router-local governance tables with governed artifact consumption rather than layering another competing mapping source on top.
- Keep the primary versus broadened pass boundary explicit enough that tests can prove when expansion did or did not happen.
- Preserve compatibility with the current wrapper entrypoint and current retrieval contract families while tightening caller-side normalization rules.

## Invariants

- Structured SQLite retrieval remains the first retrieval action when usable structured clues exist.
- Final tag outputs remain governed canonical values, never freeform user phrases or aliases.
- SQL generation and execution stay inside the wrapper layer.
- Neighboring-tag broadening remains bounded, explicit, and lower-confidence than the primary structured pass.
- Ambiguous or ungoverned semantic language remains visible as unresolved instead of being guessed.

## Deferred follow-up

- Raising the automatic expansion threshold above 3 candidates if later retrieval analysis shows a higher cutoff would improve recall without reducing precision.
- Automated tooling for governed artifact maintenance beyond the lightweight propose-approve-reject workflow defined in this step.
- Richer structured diagnostics fields beyond the first-version pass-state and candidate-count fields if the live wrapper needs a more detailed response shape later.
