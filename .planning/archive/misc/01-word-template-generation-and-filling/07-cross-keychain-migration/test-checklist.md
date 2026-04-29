# Test Checklist

## Plan Reference
- @.planning/phase/07-cross-keychain-migration/requirement.md
- @.planning/phase/07-cross-keychain-migration/step.md

## Chosen Mode
lower-level only

## Why
- No `feature.feature` exists in the step folder
- The step is a CLI rewrite with no browser-visible surface
- All behavior can be verified through subprocess invocation and file inspection

## Lower-Level Coverage

### Batch 1: Preserve Registry And CLI Surface Under Bun
- Registry load: missing file returns empty array, corrupt JSON exits 1, version mismatch exits 1
- Registry save: creates parent directories, valid schema after add
- Name validation: valid uppercase start, single letter, numbers, underscores; invalid starts with number/lowercase/dash/space/underscore
- list: empty registry returns `[]`, populated returns entries, JSON default, JSON explicit, table format, outputs env_vars array only
- add: succeeds, duplicate exits 1, invalid name exits 1, missing name exits 1, missing description exits 1
- remove: succeeds, nonexistent exits 2, missing name exits 1
- describe: updates description, nonexistent exits 2, missing args exits 1
- get: unregistered exits 2, registered missing value exits 2, env fallback, outputs value only, missing name exits 1
- set: unregistered exits 2, empty value exits 1, missing name exits 1
- Access control: get only whitelisted, set only whitelisted
- Exit codes: 0 success, 1 argument error, 2 not found, 2 value not found
- Invalid command exits 1, no command exits 1

### Batch 2: Swap Keychain Backend While Preserving Access Control
- get/set reject unregistered names (exit 2) before keychain access
- get returns environment variable value when keychain has no value (env fallback)
- set stores through cross-keychain, get resolves from keychain
- set exits 3 when secure storage unavailable, no fallback write path
- Service name uses `opencode-env-registry`

### Batch 3: Complete The Dependency And Reference Migration
- SKILL.md command examples point to `bun run .opencode/scripts/env-registry.mjs`
- `cross-keychain` declared in `.opencode/package.json`
- Python `keyring` removed from `pyproject.toml`
- No first-party reference still depends on `.opencode/scripts/env-registry.py`
- `.opencode/scripts/env-registry.py` deleted

### Batch 4: Verify Migration Boundaries And Non-Goals
- get for previously registered value not re-entered reports value-not-found, instructs user to set
- Raw get command still exists (no plugin-only access claimed)
- No plugin contracts, deny rules, or secret-sanitizing result layers added

## Browser E2E Coverage
- none required

## Refresh Triggers
- Material step changes to CLI contract or exit codes
- Review findings showing missing coverage for keychain backend behavior
- Discovery that cross-keychain API differs from documented signatures
- Addition of feature.feature to step folder
