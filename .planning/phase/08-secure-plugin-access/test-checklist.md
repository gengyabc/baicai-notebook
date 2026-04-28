# Test Checklist

## Plan Reference
- @.planning/phase/08-secure-plugin-access/requirement.md
- @.planning/phase/08-secure-plugin-access/step.md

## Chosen Mode
lower-level + e2e

## Why
- `feature.feature` exists in the step folder
- Step introduces a plugin API surface with observable input/output behavior
- Behavior is programmatic, not browser-visible; E2E means Bun harness for pytest-driven integration

## Lower-Level Coverage

- Malformed secure action input is rejected before keychain access
- Unknown service is rejected before keychain access
- Unknown operation for known service is rejected before keychain access
- Allowlisted fixture-secret.derive-digest returns deterministic SHA-256 digest
- Allowlisted operation result never contains raw secret value
- Handler error containing secret value is sanitized in returned error
- Handler result containing secret value is redacted or fails with sanitized-output-blocked
- Missing keychain secret returns generic failure without exposing secret name or value
- Extra arg keys not in allowedArgs are rejected before secret lookup
- env-registry `get` command exits 1 with deprecation message, no keychain lookup
- opencode.json contains required permission deny entries
- SKILL.md and env.md no longer instruct raw secret retrieval

## Browser E2E Coverage
- none required (programmatic plugin, no browser surface)

## Refresh Triggers
- Allowlist schema changes
- Handler contract changes
- Permission config structure changes
- New bypass patterns identified
