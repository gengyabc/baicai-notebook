## Title

Implementation Plan: Resource Frontmatter Simplification

## Requirement

- `docs/requirements/2026-05-04-resource-frontmatter-simplification.md`

## Goal

Align the `workbook/resources/` auto-frontmatter pipeline with the simplified schema by removing redundant fields, keeping current retrieval behavior unchanged, and making `source/*` tags the only source-classification carrier.

## Target Schema

Required for resource notes:

```yaml
created:
updated:
imageNameKey:
description:
status:
tags: []
llm_description_done:
llm_tags:
ingest_status:
source_hash:
```

Optional when provenance is available:

```yaml
source:
```

Fields to remove from resource notes:

```yaml
type:
kind:
source_type:
content_role:
trust_level:
verification:
llm_stage:
canonical_topic:
source_path:
```

## Design Decisions

1. Keep the retrieval contract unchanged.
2. Keep `status` as a structured field.
3. Keep `source/*` tags and treat them as the canonical source classification.
4. Remove `source_type` to avoid duplicate source semantics.
5. Remove `source_path`; file location remains available from the actual path.
6. Keep `source_hash` because the ingestion pipeline already uses it to detect body changes.
7. Preserve or add `source` only when an external provenance value is available.

## Implementation Steps

### 1. Narrow resource-specific schema generation

Update `.opencode/plugins/auto-frontmatter/backfill.mjs` so that resource notes under `workbook/resources/` only write the kept fields.

Changes:

- Stop writing `type`
- Stop writing `kind`
- Stop writing `source_type`
- Stop writing `content_role`
- Stop writing `trust_level`
- Stop writing `verification`
- Stop writing `llm_stage`
- Stop writing `canonical_topic`
- Stop writing `source_path`

Implementation note:

- Do this with resource-scoped logic rather than changing every note family globally.
- Prefer introducing a small resource-specific frontmatter builder or a resource field allowlist, rather than adding more conditional branches to the generic builder.

### 2. Replace source classification derivation

Remove `source_type` generation from the resource pipeline and derive `source/*` tags directly.

Changes:

- Replace `guessSourceType(...)` usage for resource notes with a source-tag derivation step.
- Tag derivation should classify only into the agreed set:
  - `source/web`
  - `source/local-file`
  - `source/chat`

Implementation note:

- Existing canonical tags currently include `source/local`, not `source/local-file`.
- Before coding, reconcile the implementation with tag governance artifacts so the final emitted tag is legal in the current canonical set, or update those governance artifacts in the same change if the agreed canonical value is now `source/local-file`.

### 3. Preserve provenance in `source`

Make provenance explicit instead of relying on inferred `source_type`.

Changes:

- If a resource note already has `source`, preserve it.
- If `source` is absent and a stable external URL can be extracted from the body, set `source` for resource notes when appropriate.
- Do not use file container location as provenance.

Implementation note:

- `extractFirstUrl(body)` already exists and can be reused as a best-effort fallback.
- Avoid inventing fake provenance for local-only notes.

### 4. Simplify tag synchronization

Update `mergeTags(...)` so resource-note tags no longer depend on `source_type` or `content_role` fields.

Changes:

- Keep `state/*` tag derivation from `status`
- Keep `source/*` derivation from the new source-tag classifier
- Remove dependency on removed fields such as `content_role`
- For resource notes, keep `role/raw` only if that role tag still has operational value; otherwise stop emitting role tags for resource notes

Recommended approach:

- Keep `role/raw` for now only if existing workflows still assume it.
- If no workflow depends on it, remove role-tag generation for resource notes in this same change to reduce classification noise.

### 5. Remove stale-field preservation for resource notes

Today the builder copies unknown existing keys forward.

Changes:

- For resource notes, explicitly drop removed fields even if they already exist in old files.
- Preserve unrelated user-added fields such as `author`, `published`, or other domain metadata when present.

Implementation note:

- This needs a resource-specific denylist or allowlist during final frontmatter assembly.

### 6. Update docs and workflow references

Update documentation that still describes the old resource schema.

Likely files:

- `.opencode/plugins/auto-frontmatter/README.md`
- `.opencode/rules/metadata-conventions.md`
- Any resource workflow docs that mention removed fields or old enums

### 7. Backfill existing resource notes

Run the updated backfill process against `workbook/resources/` so existing notes converge to the simplified schema.

Approach:

- Prefer one controlled backfill run after code changes
- Review a small sample before applying broadly if needed

### 8. Verify behavior

Validation checklist:

- New resource notes receive only the kept fields
- Existing resource notes lose removed fields after backfill
- Existing retrieval workflows continue to function unchanged
- `/enhance-description` still finds `llm_description_done: false`
- `/enhance-tags` still finds `llm_tags: false`
- `source_hash` still changes only when body content changes
- `status` remains in sync with `state/*` tags
- `source` is preserved when present and added only when justified

## Open Implementation Question

One issue should be resolved before coding:

1. Canonical source tag spelling

Current governance appears to use `source/local`, while the agreed source bucket wording is `local-file`.

Decision needed during implementation:

- Either keep emitted tag as `source/local` for compatibility
- Or update canonical tag governance artifacts to `source/local-file` and migrate callers accordingly

Recommended implementation choice:

- Keep `source/local` in code for the first pass unless you explicitly want a tag-governance migration in the same step.

## Suggested Change Order

1. Update plugin logic in `backfill.mjs`
2. Update tag derivation and stale-field dropping
3. Update docs
4. Run targeted backfill on `workbook/resources/`
5. Verify workflows and sample notes

## Risks

- Removing fields too broadly could affect non-resource note families if the implementation is not properly scoped.
- Changing source tag spelling without governance alignment could break retrieval normalization.
- Auto-deriving `source` from body text can capture incidental URLs rather than the true canonical source.

## Risk Mitigations

- Scope schema simplification strictly to `workbook/resources/`
- Keep retrieval contract untouched
- Use conservative provenance autofill rules
- Validate on the two known example notes plus a small mixed sample from `workbook/resources/web/`
