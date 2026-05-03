# Test Checklist

## Plan Reference
- @.planning/phase/06-sensitive-command-approval/requirement.md
- @.planning/phase/06-sensitive-command-approval/step.md

## Chosen Mode
lower-level only

## Why
- No feature.feature exists in the step folder
- This step freezes policy boundaries across command, skill, and workflow docs
- Coverage can be enforced with lower-level document contract tests

## Lower-Level Coverage
- `.opencode/commands/env-helper.md` consumes shared approval policy and requires explicit consent
- `.opencode/commands/env-helper.md` provides a local fallback path when approval is denied
- `.opencode/skills/env-registry/SKILL.md` keeps skill as explanation layer, not permission enforcement owner
- `.opencode/workflows/fill-docx.md` separates normal LLM path from local-only sensitive fill path
- `.opencode/workflows/fill-docx.md` states that sensitive values are never exposed to model context
- `docs/routing-flows.md` documents approval boundary ownership and denied-path routing

## Browser E2E Coverage
- none required

## Refresh Triggers
- Any change to step.md locked constraints, invariants, or non-goals
- Any requirements or quality review finding that indicates missing boundary checks
- Any contract change affecting approval ownership split or fallback routing
