---
step-key: frontmatter-tag-governance
step-version: 1
requirement-version: 1
---

# Frontmatter Tag Governance

---

## Objective

Make retrieval metadata stable enough for the SQLite-first query flow by freezing when structured frontmatter must carry meaning, when tags may supplement it, and how alias-reviewed normalization is recorded and audited.

---

## Governance Surfaces

This step is limited to four implementation surfaces that already exist in the repo's metadata and retrieval model:

1. Policy source of truth in `.opencode/rules/metadata-conventions.md`.
2. Field-profile companion rules in `docs/metadata-field-matrix.md`.
3. A single human-reviewed alias registry artifact for first-stage normalization of `tags`, `country` / `province` / `city`, and `canonical_topic`.
4. Advisory lint and retrieval-facing documentation updates so the governance rules are consumed consistently by `.opencode/workflows/lint-vault.md`, `.opencode/skills/second-brain-lint/SKILL.md`, `.opencode/workflows/query-vault.md`, and `.opencode/skills/second-brain-query/SKILL.md`.

The first stage does not introduce auto-rewrite code, hard-blocking admission control, or arbitrary freeform frontmatter whitelisting.

---

## Alias Registry Shape And Review Flow

The first-stage registry is a Markdown artifact with three explicit sections:

1. `Tag aliases`
2. `Location aliases`
3. `Canonical topic aliases`

Each row must record, at minimum:

- the governed surface (`tag`, `country`, `province`, `city`, or `canonical_topic`)
- the canonical value
- accepted aliases
- review note or rationale

Location rows must keep the governed field explicit so `city` aliases are not conflated with `province` or `country` values.

First-stage review flow is fixed:

1. Lint finds a non-canonical or suspicious retrieval-relevant value.
2. Human review decides whether the value maps to an existing canonical entry, should become a new canonical entry, or should remain intentionally local and outside first-stage governance.
3. The registry is updated only when the value is accepted into governance.
4. Notes are not auto-rewritten by this step.

---

## Locked constraints

- Frontmatter remains the source of truth; retrieval and lint consume it rather than replacing it.
- Time stays primarily in dedicated structured fields such as `created`, `updated`, `start_date`, and `end_date`.
- Location stays primarily in dedicated structured fields `country`, `province`, and `city`, with the existing retrieval rule that missing note-level `country` defaults to China at the metadata/index layer.
- Tags remain a controlled retrieval aid and must not become the primary carrier for time or location semantics.
- Obsidian-style hierarchical tags remain supported, especially `topic/*` forms already referenced by retrieval docs.
- First-stage normalization covers only `tags`, location values, and `canonical_topic`.
- First-stage governance is alias-review plus human review; it is advisory rather than hard-blocking.
- This step must not add metadata migration or automatic frontmatter rewriting code.
- This step must not redefine the SQLite retrieval algorithm beyond aligning it with the new governance language.

---

## Scope

### In

- Define the boundary between structured fields and tags for retrieval-relevant metadata.
- Freeze the allowed role of hierarchical tags and the cases where tags remain useful.
- Define a first-stage alias registry shape and review flow for `tags`, `country`, `province`, `city`, and `canonical_topic`.
- Clarify how lint should report alias drift, suspicious additions, and non-canonical values during the advisory-governance phase.
- Align retrieval-facing docs so `query-vault.md` and `second-brain-query` rely on the same governance assumptions.
- Keep human-managed note authoring practical and compatible with current folder profiles.

### Out

- Auto-migrating existing notes to canonical metadata values.
- Adding automatic rewrite logic to `.opencode/plugins/auto-frontmatter/` or `.opencode/plugins/frontmatter-index/`.
- Enforcing a global whitelist for arbitrary frontmatter keys.
- Replacing hierarchical tags with flat enums or moving time/location into tags.
- Defining the later-scale thresholds that would trigger strong admission control.
- Redesigning unrelated ranking or fallback behavior from step 01.

---

# TDD Batches

## Batch 1: Structured Fields Versus Tags Policy

- Test: `.opencode/rules/metadata-conventions.md` explicitly states that time and location semantics belong in structured fields, not tags.
- Test: `.opencode/rules/metadata-conventions.md` defines when tags are allowed as retrieval aids and preserves hierarchical `topic/*` usage.
- Test: `docs/metadata-field-matrix.md` stays aligned with the policy language for note families that may use `canonical_topic` and domain-specific location fields.
- Test: Policy examples no longer imply that a single freeform `location` field is the primary retrieval shape when `country` / `province` / `city` are required for retrieval-sensitive notes.

## Batch 2: Alias Registry And Canonicalization Rules

- Test: A single alias registry artifact exists and has separate sections for tag aliases, location aliases, and `canonical_topic` aliases.
- Test: The registry defines governed surface, canonical value, accepted aliases, and review rationale for each normalization surface.
- Test: The policy explains that new aliases and suspicious new canonical candidates require human review rather than silent acceptance.
- Test: Location alias rows keep `country`, `province`, and `city` governance distinct rather than mixing them into one freeform location bucket.
- Test: `canonical_topic` normalization is defined only where retrieval materially depends on it, not as a universal required field.

## Batch 3: Advisory Lint Consumption

- Test: `.opencode/workflows/lint-vault.md` includes checks for alias drift, uncontrolled tag growth, and non-canonical retrieval metadata.
- Test: `.opencode/skills/second-brain-lint/SKILL.md` reflects the same findings-first advisory behavior.
- Test: The lint path distinguishes advisory review from later hard-blocking governance and does not require arbitrary frontmatter-key whitelisting.
- Test: Existing metadata-profile checks remain intact while adding governance-specific drift findings.

## Batch 4: Retrieval Consumer Alignment

- Test: `.opencode/workflows/query-vault.md` states governance assumptions that match the new metadata policy for tags, locations, and `canonical_topic`.
- Test: `.opencode/skills/second-brain-query/SKILL.md` stays aligned with the same structured-field-versus-tag rules.
- Test: Retrieval documentation preserves hierarchical tag matching and the existing metadata-level China default semantics.
- Test: No retrieval doc change reintroduces tags as the primary carrier for time or location.

---

## Files

- `.opencode/rules/metadata-conventions.md` - primary metadata governance policy
- `docs/metadata-field-matrix.md` - folder-profile companion matrix
- `docs/metadata-alias-registry.md` - new first-stage alias registry artifact
- `.opencode/workflows/lint-vault.md` - lint workflow consumption
- `.opencode/skills/second-brain-lint/SKILL.md` - lint skill alignment
- `.opencode/workflows/query-vault.md` - retrieval workflow alignment
- `.opencode/skills/second-brain-query/SKILL.md` - retrieval skill alignment

## Symbols

- `Tag rules` section in `.opencode/rules/metadata-conventions.md`
- `Field matrix` and note-family rows in `docs/metadata-field-matrix.md`
- `Alias registry` sections for tags, locations, and `canonical_topic`
- `Workflow: Lint Vault`
- `second-brain-lint`
- `Workflow: Query Vault`
- `second-brain-query`

## Execution constraints

- Keep the implementation doc-first and advisory-first.
- Do not add automation that mutates note frontmatter.
- Do not widen the step to cover arbitrary metadata ontology design.
- Keep the alias registry centralized for this first stage; domain splits are deferred unless later scale requires them.
- Preserve current retrieval assumptions from step 01 where they are already frozen.

## Invariants

- Frontmatter remains the durable source of truth.
- SQLite remains a derived retrieval index.
- Time and location are modeled primarily through structured fields.
- Hierarchical tags remain valid retrieval aids.
- `canonical_topic` stays optional unless a workflow explicitly depends on it.
- First-stage governance reports drift and normalization opportunities without hard-blocking note authoring.

## Deferred follow-up

- Thresholds for moving from advisory alias review to stronger whitelist-style admission control.
- Migration or bulk normalization tooling for existing notes.
- Automatic ingestion-time or save-time enforcement.
- Domain-specific registry splitting if the centralized alias registry becomes too large.
