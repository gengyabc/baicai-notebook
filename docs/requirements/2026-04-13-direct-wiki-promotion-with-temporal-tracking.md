# Direct Wiki Promotion with Temporal Tracking

**Status:** ready
**Decomposition:** single-step
**Created:** 2026-04-13
**Key:** direct-wiki-promotion-with-temporal-tracking

---

## Focus

Enable resources to promote directly to wiki by default, with brainstorm routing for uncertain content and temporal metadata for staleness tracking.

---

## In Scope

- Update `promotion-policy.md` to reflect direct-as-default path
- Define brainstorm routing criteria (conflict, speculation, synthesis uncertainty, novel ideas)
- Add `last_verified` and `review_cadence` fields to wiki schema
- Add `needs-review` status to wiki schema
- Set default `review_cadence` to annual
- Update solidify workflow to handle direct promotion and temporal fields

---

## Out of Scope

- Retroactive migration of existing wiki notes
- Automated staleness checking/notifications
- Changes to brainstorm note schema

---

## Constraints

- Must preserve wiki groundedness requirement
- Must preserve brainstorm's role for speculative content
- New content only; existing content unchanged

---

## Assumptions

- LLM can reasonably detect conflict, speculation, synthesis uncertainty, and novel ideas
- `needs-review` status is informational, not blocking
- User accepts annual default review cadence

---

## Success Criteria

- Resources promote directly to wiki unless brainstorm conditions detected
- Wiki notes include `last_verified` and `review_cadence` fields
- Outdated wiki notes show `needs-review` status
- Existing vault behavior preserved for notes without temporal fields

---

## Files to Update

1. `.opencode/rules/promotion-policy.md`
2. `.opencode/rules/metadata-conventions.md`
3. `.opencode/skills/solidify-to-wiki/SKILL.md`