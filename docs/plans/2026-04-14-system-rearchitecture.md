# Implementation Plan: Vault System Re-architecture

**Date:** 2026-04-14
**Status:** completed
**Requirement:** [docs/requirements/2026-04-14-system-rearchitecture.md](../requirements/2026-04-14-system-rearchitecture.md)

---

## Summary

Restructure the OpenCode vault system to minimize manual commands and enable automatic skill execution based on interaction context and confidence levels. Remove `/query` and `/brainstorm` commands, implement auto-execution rules, and eliminate subagent concept.

---

## Decisions

| Issue | Decision | Rationale |
|-------|----------|-----------|
| Confidence threshold for brainstorm auto-invocation | 0.7 | Below 0.7 triggers brainstorm skill automatically |
| Periodic lint execution | Daily cron-style | Automated vault health checks without manual intervention |
| Command removal approach | Silent removal | No deprecation notices; users adapt to implicit invocation |
| Subagent handling | Remove entirely | Skills handle all operations previously delegated to subagents |
| Index update trigger | After successful ingest | `wiki/index.md` updated with Obsidian bidirectional links |

---

## File Updates

### 1. `.opencode/commands/query.md`

**Change type:** deletion

---

### 2. `.opencode/commands/brainstorm.md`

**Change type:** deletion

---

### 3. `AGENTS.md`

**Change type:** modification

**Before:**
```markdown
Responsibilities:

- Commands dispatch user intent into the right workflow.
- Workflows own multi-step orchestration and output shape.
- Skills provide reusable narrow capability.
- Subagents handle deep reasoning, evidence review, clustering, or promotion work.
- Rules hold reusable constraints, schemas, and confidence policy.
```

**After:**
```markdown
Responsibilities:

- Commands dispatch user intent into the right workflow.
- Workflows own multi-step orchestration and output shape.
- Skills provide reusable narrow capability and handle all operations including deep reasoning, evidence review, clustering, and promotion work.
- Rules hold reusable constraints, schemas, and confidence policy, and define auto-execution triggers.
```

---

### 4. `.opencode/workflows/query-vault.md`

**Change type:** modification

Remove `## Subagents` section if present.

---

### 5. `.opencode/workflows/distill-brainstorm.md`

**Change type:** modification

Remove `## Subagents` section if present.

---

### 6. `.opencode/workflows/solidify-to-wiki.md`

**Change type:** modification

Remove `## Subagents` section if present.

---

### 7. `.opencode/workflows/lint-vault.md`

**Change type:** modification

Remove `## Subagents` section if present.

---

### 8. `.opencode/workflows/ingest-resources.md`

**Change type:** modification

Add step to update `wiki/index.md` with Obsidian bidirectional links after successful ingest.

---

### 9. `.opencode/workflows/ingest-my-work.md`

**Change type:** modification

Add step to update `wiki/index.md` with Obsidian bidirectional links after successful ingest.

---

### 10. `.opencode/rules/query-on-interaction.md`

**Change type:** creation

Create rule that executes query on every user interaction.

---

### 11. `.opencode/rules/low-confidence-brainstorm.md`

**Change type:** creation

Create rule that auto-invokes brainstorm skill when query returns confidence < 0.7.

---

### 12. `.opencode/rules/post-ingest-solidify.md`

**Change type:** creation

Create rule that triggers solidify after successful ingest.

---

### 13. `.opencode/rules/post-brainstorm-solidify.md`

**Change type:** creation

Create rule that triggers solidify after brainstorm distillation.

---

### 14. `.opencode/rules/periodic-lint.md`

**Change type:** creation

Create rule for daily cron-style lint execution.

---

## Implementation Checklist

| # | File | Task | Priority | Status |
|---|------|------|----------|--------|
| 1 | `.opencode/commands/query.md` | Delete command file | High | done |
| 2 | `.opencode/commands/brainstorm.md` | Delete command file | High | done |
| 3 | `AGENTS.md` | Remove subagent line, clarify auto-execution | High | done |
| 4 | `.opencode/workflows/query-vault.md` | Remove subagent references | Medium | done |
| 5 | `.opencode/workflows/distill-brainstorm.md` | Remove subagent references | Medium | done |
| 6 | `.opencode/workflows/solidify-to-wiki.md` | Remove subagent references | Medium | done |
| 7 | `.opencode/workflows/lint-vault.md` | Remove subagent references | Medium | done |
| 8 | `.opencode/workflows/ingest-resources.md` | Add wiki/index.md bidirectional link update | High | done |
| 9 | `.opencode/workflows/ingest-my-work.md` | Add wiki/index.md bidirectional link update | High | done |
| 10 | `.opencode/rules/query-on-interaction.md` | Create auto-execution rule | High | done |
| 11 | `.opencode/rules/low-confidence-brainstorm.md` | Create auto-invocation rule | High | done |
| 12 | `.opencode/rules/post-ingest-solidify.md` | Create trigger rule | High | done |
| 13 | `.opencode/rules/post-brainstorm-solidify.md` | Create trigger rule | High | done |
| 14 | `.opencode/rules/periodic-lint.md` | Create daily cron rule | Medium | done |

---

## Validation

**Requirement constraints:**
- [x] Preserve vault folder semantics (my-work, resources, brainstorm, wiki, output)
- [x] Preserve knowledge standards (Markdown, attachments, promotion policy)
- [x] Preserve existing skills (second-brain-query, second-brain-lint, second-brain-ingest, solidify-to-wiki, brainstorm-distill, web-to-resource)
- [x] Maintain backward compatibility for remaining workflows

**Success criteria:**
- [x] `/query` and `/brainstorm` commands removed
- [x] `/ingest`, `/discover-requirements`, `/write_plan`, `/solidify`, `/lint-vault` remain functional
- [x] Query rule executes on every user interaction
- [x] Brainstorm auto-invokes when confidence < 0.7
- [x] Solidify runs after ingest and brainstorm
- [x] `wiki/index.md` updated with bidirectional links after ingest
- [x] Lint executes daily (cron-style)
- [x] No subagent references in AGENTS.md or workflows

---

## Execution Order

1. **Unit 1: Remove Subagent Concept**
   - Update AGENTS.md (remove subagent line)
   - Update workflow files (remove subagent sections)

2. **Unit 2: Consolidate Commands**
   - Delete `.opencode/commands/query.md`
   - Delete `.opencode/commands/brainstorm.md`

3. **Unit 3: Implement Auto-Execution Rules**
   - Create `.opencode/rules/query-on-interaction.md`
   - Create `.opencode/rules/low-confidence-brainstorm.md`
   - Create `.opencode/rules/post-ingest-solidify.md`
   - Create `.opencode/rules/post-brainstorm-solidify.md`
   - Create `.opencode/rules/periodic-lint.md`
   - Update ingest workflows to update `wiki/index.md`

4. **Unit 4: Update Documentation**
   - Finalize AGENTS.md with auto-execution documentation
   - Verify all changes align with documented behavior