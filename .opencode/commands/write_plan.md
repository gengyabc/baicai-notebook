---
description: Write a plan to docs/plans after LLM discussion
model: bailian-coding-plan/glm-5
---

Write the plan based on the final discussion result.

## Target directory

`docs/plans/`

## Filename convention

Use date-prefixed slug: `YYYY-MM-DD-<slug>.md`
- Today's date: `{{ current_date }}`
- Slug: lowercase, hyphenated, derived from plan title or topic

## Plan structure

```markdown
# Implementation Plan: <Title>

**Date:** YYYY-MM-DD
**Status:** draft | approved | in-progress | completed
**Requirement:** <optional link to requirements doc>

---

## Summary

<1-3 sentence overview>

---

## Decisions

| Issue | Decision | Rationale |
|-------|----------|-----------|
| ... | ... | ... |

---

## File Updates

### 1. `<file path>`

**Change type:** <creation | modification | deletion>

**Before:** (if modification)
```markdown
...
```

**After:**
```markdown
...
```

---

## Implementation Checklist

| # | File | Task | Priority | Status |
|---|------|------|----------|--------|
| 1 | ... | ... | High/Medium/Low | pending |

---

## Validation

**Requirement constraints:**
- [ ] <constraint 1>
- [ ] <constraint 2>

---

## Execution Order

1. ...
```

## Actions

1. Generate a slug from the plan title or topic
2. Create the file at `docs/plans/YYYY-MM-DD-<slug>.md`
3. Fill in the plan structure with the discussed content
4. Report the created file path