# Test Checklist

## Plan Reference

- @.planning/phase/06-debug-permission-profile-and-plugin-gate/requirement.md
- @.planning/phase/06-debug-permission-profile-and-plugin-gate/step.md

## Chosen Mode

lower-level only

## Why

- No `feature.feature` exists in the step folder
- This is a documentation-first, permission-contract-focused step producing tracked artifacts (JSON profiles, docs) rather than runtime enforcement code
- All verifiable behavior is contract correctness (schema shape, deny presence, doc alignment) testable at the artifact level

## Lower-Level Coverage

- Batch 1: `opencode.json` contains `.opencode/plugins/**` edit deny; `opencode.debug.json` exists at repo root; debug profile lifts only `.opencode/plugins/**` edit denial while keeping `.opencode/plugin-allowlist.json` deny; debug profile also denies edits to `opencode.json` and `opencode.debug.json`
- Batch 2: docs name `/debug` plus session flag as only activation path; docs reference vault-query-router as source of truth; docs state `state.debug === true` selects `opencode.debug.json`; docs state override ends with session; docs describe exception as explicit, not implicit
- Batch 3: debug.md, debug-mode.md, and routing-flows.md describe same plugin-edit exception without conflict; docs keep visible debug-session labeling; docs distinguish plugin-edit from unrelated debug exceptions; no doc claims normal sessions gain plugin edit permission; first-version audit scope is limited to labeling plus tracked artifacts
- Batch 4: secret-related bash denies and read denies unchanged; `.opencode/plugin-allowlist.json` stays outside debug edit override; plugin-local config inside `.opencode/plugins/**` is in scope; final contract compatible with archived secure-plugin-access boundary
- Batch 5: normal session uses `opencode.json` with plugins denied; debug session uses `opencode.debug.json` with plugins allowed; missing/unreadable/ambiguous state fails closed; session end removes debug override

## Browser E2E Coverage

- none required

## Refresh Triggers

- Material step changes to permission override topology or file patterns
- Review findings showing missing or wrong-layer coverage
- Addition of `feature.feature` would trigger re-evaluation to `lower-level + e2e`
