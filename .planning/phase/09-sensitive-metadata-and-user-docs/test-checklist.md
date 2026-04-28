# Test Checklist

## Plan Reference
- @.planning/phase/09-sensitive-metadata-and-user-docs/requirement.md
- @.planning/phase/09-sensitive-metadata-and-user-docs/step.md

## Chosen Mode
lower-level only

## Why
- No `feature.feature` exists in the step folder
- Step is primarily documentation-focused; behavior is proven by inspecting file contents and command output
- Lower-level tests (file content assertions, subprocess output checks) are sufficient

## Lower-Level Coverage

### Batch 1: Freeze The Metadata Discovery Boundary
- GIVEN `.opencode/env-registry.json`, WHEN its schema is inspected, THEN the only model-visible sensitive metadata fields are `name` and `description`
- GIVEN `env-registry.mjs list` output, WHEN entries are returned, THEN each entry exposes only `name` and `description` fields (no value fields)
- GIVEN model-facing env-registry guidance (SKILL.md), WHEN discovery instructions are reviewed, THEN they point to the canonical `list` surface and do not imply raw value access or extra metadata fields
- GIVEN SKILL.md, WHEN it is inspected, THEN it does not inline or invent a parallel metadata source beyond referencing the list command

### Batch 2: Add Root-Level Onboarding Without Overexposing Detail
- GIVEN root `README.md`, WHEN the sensitive-data capability section is read, THEN it explains the name-plus-description-only boundary, points to the detailed guide, and includes exactly one realistic example entry
- GIVEN the root example, WHEN it is reviewed for security wording, THEN it shows how a user registers or recognizes an entry without printing or suggesting a real secret value

### Batch 3: Make Self-Service Registration Operationally Clear
- GIVEN `.opencode/env-registry-README.md`, WHEN a user follows the documented happy path, THEN the sequence `list -> add -> set -> describe` is understandable and uses realistic examples
- GIVEN the detailed guide's security explanation, WHEN model and user capability boundaries are reviewed, THEN metadata discovery, secure plugin consumption, and user-local keychain access are clearly separated

## Browser E2E Coverage
- none required

## Refresh Triggers
- Material step changes to requirement.md or step.md
- Review findings showing missing or wrong-layer coverage
- New feature.feature added to step folder
