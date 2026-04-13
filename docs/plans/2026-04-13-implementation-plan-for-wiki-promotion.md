# Implementation Plan: Direct Wiki Promotion with Temporal Tracking

**Date:** 2026-04-13
**Status:** approved
**Requirement:** docs/requirements/2026-04-13-direct-wiki-promotion-with-temporal-tracking.md

---

## Summary

Enable resources to promote directly to wiki by default, with brainstorm routing for uncertain content and temporal metadata for staleness tracking.

---

## Decisions

| Issue | Decision | Rationale |
|-------|----------|-----------|
| Brainstorm routing | Automatic LLM detection | User prefers hands-off flow similar to current solidify |
| Temporal fields | Merge `last_reviewed` into `last_verified` | Single field sufficient for staleness tracking; reduces cognitive load |
| Review cadence | Keep as-is (annual, quarterly, monthly) | Default annual; domain-specific cadence optional |

---

## File Updates

### 1. `.opencode/rules/promotion-policy.md`

**Change type:** Core logic modification

**Before:**
```markdown
Default promotion flow is `my-work/resources -> brainstorm -> wiki -> output`.

Do not promote material directly from `my-work/` or `resources/` into `wiki/` by default. 
Entry into `wiki/` must go through the explicit `solidify` gate.
```

**After:**
```markdown
Default promotion flow is `my-work/resources -> wiki -> output` with brainstorm routing for uncertain content.

### Direct-to-wiki path (default)

Promote material from `my-work/` or `resources/` directly to `wiki/` when:
- the content is well-supported with clear provenance
- claims are grounded and verifiable
- no significant conflicts or contradictions exist
- synthesis is straightforward with clear conclusions

### Brainstorm routing (conditional)

Route content to `brainstorm/` first when ANY of the following conditions exist:
- **Conflict:** Evidence sources disagree or present contradictory claims
- **Speculation:** Content contains hypotheses, predictions, or unverified claims
- **Synthesis uncertainty:** Multiple interpretations are equally plausible
- **Novel ideas:** Content explores new territory without established precedent

Content in `brainstorm/` promotes to `wiki/` only when:
- the claim has repeated support from `resources/` or strong user-authored evidence
- the note can be normalized without losing important uncertainty
- provenance can be attached directly in the wiki note
- the content will likely be useful as durable memory later
```

**Preserved sections:**
- `solidify` remains the only gate into `wiki/`
- Brainstorm vs wiki characteristic comparison
- Backlink preservation behavior

---

### 2. `.opencode/rules/metadata-conventions.md`

**Change type:** Schema extension

**Wiki schema - Before:**
```yaml
---
type: wiki
kind: concept | entity | project | source | synthesis | method
title:
summary:
sources: []
related: []
confidence: medium | high
status: stable | evolving
last_reviewed:
image_key:
---
```

**Wiki schema - After:**
```yaml
---
type: wiki
kind: concept | entity | project | source | synthesis | method
title:
summary:
sources: []
related: []
confidence: medium | high
status: stable | evolving | needs-review
last_verified:
review_cadence: annual | quarterly | monthly
image_key:
---
```

**Field changes:**
| Field | Action | Description |
|-------|--------|-------------|
| `last_reviewed` | REMOVED | Merged into `last_verified` |
| `last_verified` | ADDED | Date when content was confirmed accurate (YYYY-MM-DD) |
| `review_cadence` | ADDED | Review frequency; default `annual` |
| `status` | EXTENDED | Added `needs-review` option for stale content |

---

### 3. `.opencode/skills/solidify-to-wiki/SKILL.md`

**Change type:** Capability expansion

**Before:**
```markdown
## What I do

- test whether content is ready for durable memory
- extract grounded claims from mixed material
- update or create the right wiki note
- preserve links back to sources and brainstorm notes when helpful
- maintain `wiki/index.md` and `wiki/log.md` responsibilities for wiki changes
```

**After:**
```markdown
## What I do

- test whether content is ready for durable memory
- extract grounded claims from mixed material
- route uncertain content to brainstorm instead of wiki
- update or create the right wiki note
- preserve links back to sources and brainstorm notes when helpful
- set temporal metadata (`last_verified`, `review_cadence`) on new wiki notes
- maintain `wiki/index.md` and `wiki/log.md` responsibilities for wiki changes

## Routing decision

### Direct promotion to wiki

Promote directly when content has:
- clear, verifiable claims with strong provenance
- consistent evidence from reliable sources
- straightforward synthesis without ambiguity
- factual information or established concepts

### Route to brainstorm instead

Route to `brainstorm/` when detecting ANY of:
- **Conflict:** Source contradictions or disputed claims
- **Speculation:** Hypotheses, predictions, or unverified assertions
- **Synthesis uncertainty:** Multiple plausible interpretations
- **Novelty:** New ideas without established precedent

Routing is automatic; user is informed of the routing decision.
```

**Extended constraints:**
```markdown
## Constraints

- do not promote unresolved speculation
- prefer updating an existing wiki page over creating a duplicate
- always set `last_verified` and `review_cadence` on new wiki notes
- default `review_cadence` to `annual` unless domain requires different cadence
```

---

## Implementation Checklist

| # | File | Task | Priority | Status |
|---|------|------|----------|--------|
| 1 | `promotion-policy.md` | Replace default flow with direct-to-wiki | High | pending |
| 2 | `promotion-policy.md` | Add brainstorm routing conditions | High | pending |
| 3 | `metadata-conventions.md` | Remove `last_reviewed` from wiki schema | Medium | pending |
| 4 | `metadata-conventions.md` | Add `last_verified` to wiki schema | Medium | pending |
| 5 | `metadata-conventions.md` | Add `review_cadence` to wiki schema | Medium | pending |
| 6 | `metadata-conventions.md` | Add `needs-review` to status enum | Low | pending |
| 7 | `solidify-to-wiki/SKILL.md` | Add routing decision section | High | pending |
| 8 | `solidify-to-wiki/SKILL.md` | Add temporal metadata handling | Medium | pending |
| 9 | `solidify-to-wiki/SKILL.md` | Update constraints | Low | pending |

---

## Validation

**Requirement constraints verification:**
- [x] Wiki groundedness preserved (routing conditions ensure only grounded content reaches wiki)
- [x] Brainstorm role preserved (speculative content still routes to brainstorm)
- [x] New content only (no migration of existing notes)
- [x] No automated staleness checking (only metadata fields added)

**Success criteria mapping:**
- Resources promote directly to wiki unless brainstorm conditions detected → routing logic in promotion-policy.md and SKILL.md
- Wiki notes include `last_verified` and `review_cadence` fields → metadata-conventions.md schema
- Outdated wiki notes show `needs-review` status → status enum extension
- Existing vault behavior preserved → no changes to existing note processing

---

## Execution Order

1. Update `metadata-conventions.md` (schema foundation)
2. Update `promotion-policy.md` (core logic)
3. Update `solidify-to-wiki/SKILL.md` (skill behavior)

This order ensures schema is defined before logic references it.