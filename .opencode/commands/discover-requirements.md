---
description: Discover requirements and persist to docs/requirements/
argument-hint: <initial-request>
---

Discover requirements for: `$ARGUMENTS`

Follow @.opencode/_vendor/baicai-vibe/workflows/discover-requirements-core.md.

Use the shared contract in @.opencode/_vendor/baicai-vibe/rules/discover-requirements-core-contract.md.

---

## Persistence

When contract returns `status: ready`, write to `docs/requirements/YYYY-MM-DD-<key>.md` with:

- Title, Focus, In Scope, Out of Scope, Constraints, Assumptions, Success Criteria from contract fields
- Status: ready
- Decomposition: from contract
- Created: today's date
- Key: from contract

When `status: needs-more-discovery` or `blocked`: do NOT persist. Return contract to user.