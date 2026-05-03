# Test Checklist

## Plan Reference

- @.planning/phase/02-frontmatter-tag-governance/requirement.md
- @.planning/phase/02-frontmatter-tag-governance/step.md

## Chosen Mode

lower-level only

## Why

- No feature.feature exists in the step folder
- Step is doc-first and advisory-first; all behavior is verified by content and structure checks, not browser-visible flows
- Cross-document consistency can be verified with file content assertions

## Lower-Level Coverage

### Batch 1: Structured Fields Versus Tags Policy

- `.opencode/rules/metadata-conventions.md` explicitly states time and location semantics belong in structured fields, not tags
- `.opencode/rules/metadata-conventions.md` defines when tags are allowed as retrieval aids and preserves hierarchical `topic/*` usage
- `docs/metadata-field-matrix.md` aligns with policy language for `canonical_topic` and domain-specific location fields
- Policy examples no longer imply a single freeform `location` field is the primary retrieval shape when `country`/`province`/`city` are required (QR-02-P2-002: positive example uses "structured location fields" phrasing)

### Batch 2: Alias Registry And Canonicalization Rules

- `.opencode/alias-registry.md` exists with separate sections for tag aliases, location aliases, and canonical_topic aliases
- Registry defines governed surface, canonical value, accepted aliases, and review rationale for each entry
- Registry includes all canonical tags already sanctioned by policy enums and templates (QR-02-P1-001): `state/reviewed`, `state/draft`, `source/generated`, `source/local`, `source/chat`, `source/manual`, `role/synthesis`, `role/topic`, `role/entity`, `role/draft`, `role/index`, `role/log`
- Policy explains new aliases and suspicious canonical candidates require human review, not silent acceptance
- Location alias rows keep `country`, `province`, `city` governance distinct
- `canonical_topic` normalization is defined only where retrieval materially depends on it

### Batch 3: Advisory Lint Consumption

- `.opencode/workflows/lint-vault.md` includes checks for alias drift, uncontrolled tag growth, and non-canonical retrieval metadata
- `.opencode/skills/second-brain-lint/SKILL.md` reflects findings-first advisory behavior
- Lint path distinguishes advisory review from later hard-blocking governance
- Existing metadata-profile checks remain intact with governance-specific drift findings added

### Batch 4: Retrieval Consumer Alignment

- `.opencode/workflows/query-vault.md` states governance assumptions matching new metadata policy for tags, locations, canonical_topic; clarifies alias-aware query-time expansion is a future enhancement and alias registry is governance reference for human review (QR-02-P2-003)
- `.opencode/skills/second-brain-query/SKILL.md` stays aligned with structured-field-versus-tag rules; clarifies alias-aware expansion is a future enhancement and alias registry is governance reference (QR-02-P2-003)
- Retrieval docs preserve hierarchical tag matching and metadata-level China default
- No retrieval doc change reintroduces tags as primary carrier for time or location

## Browser E2E Coverage

- none required

## Refresh Triggers

- Material changes to step.md scope or TDD batches
- Review findings showing missing or wrong-layer coverage
- Addition of feature.feature would trigger mode change to lower-level + e2e
