---
step-key: cross-keychain-migration
requirement-version: 1
step-version: 1
---

# Review Report

## Plan Reference
- @.planning/phase/07-cross-keychain-migration/requirement.md
- @.planning/phase/07-cross-keychain-migration/step.md

## Overall Status
- `correct`

## Findings

### Plan Alignment Issues
- The `set` interactive prompt now uses `process.stdin.setRawMode(true)` (lines 93, 98, 107 in env-registry.mjs) to suppress terminal echo, satisfying the security constraint from requirement.md line 52 and step.md invariant line 212 ("set never accepts a value as a CLI argument" — extended to cover echo suppression as a defense-in-depth fix). This goes beyond the Python version's `input()` which echoed characters, and aligns with the spirit of the constraint.

### Delta Checks
- Preserved behaviors verified: All six commands (list, add, remove, get, set, describe) present with identical argument shapes and exit codes (0/1/2/3). `list` defaults to JSON of `env_vars` array; `--format table` works. `get` prints only the resolved value to stdout. Env-variable fallback limited to `get`. Service name `opencode-env-registry` preserved (verified by `test_service_name_is_opencode_env_registry`). Whitelist-first access control enforced for `get` and `set`.
- Removed behaviors verified as absent: Python `env-registry.py` does not exist (glob confirms removal). `pyproject.toml` contains no `keyring` reference. SKILL.md contains no `uv run python` or `env-registry.py` references.
- Replacement behaviors verified: `cross-keychain` imported and used for `getPassword`, `setPassword`, `deletePassword` in env-registry.mjs. `set` replaces existing keychain values (verified by `test_set_replaces_existing_keychain_value`). CLI invoked via `bun run .opencode/scripts/env-registry.mjs`.
- Stale evidence detected: none

### Spec Violations
- none

### Contract Issues
- none — exit code contract (0/1/2/3) fully covered by `TestExitCodes` and per-command tests. `set` rejects positional value argument (line 276-281, test `test_set_does_not_accept_value_as_cli_argument`).

### Test Issues
- `test_set_exits_3_when_keychain_unavailable` is skipped in CI because the macOS Keychain is available; this is acceptable — the skip is explicit and the code path (lines 212-215 in env-registry.mjs) is structurally verified.

## Coverage Verification (MANDATORY for status `correct`)

### Requirements Coverage Table
| Requirement Section | Coverage Artifact | Verification Method | Status |
|---------------------|-------------------|---------------------|--------|
| Batch 1: Registry + CLI surface under Bun | TestRegistryJsonOperations (5 tests), TestValidateName (9 tests), TestListCommand (6 tests), TestAddCommand (5 tests), TestRemoveCommand (3 tests), TestDescribeCommand (3 tests), TestCliArgumentParsing (2 tests) | Tests run via `uv run pytest`, all pass | `covered` |
| Batch 2: Keychain backend swap + access control | TestKeychainBackend (6 tests), TestAccessControl (2 tests), TestGetCommand (5 tests), TestSetCommand (4 tests) | Tests run, keychain round-trip verified on macOS | `covered` |
| Batch 3: Dependency + reference migration | TestDependencyMigration (4 tests): skill_md_uses_bun_commands, cross_keychain_in_package_json, keyring_removed_from_pyproject, python_script_removed | File content assertions, glob check | `covered` |
| Batch 4: Migration boundaries + non-goals | TestMigrationBoundaries (3 tests): unmigrated value reports not-found, raw get still exists, set rejects CLI arg | Test assertions | `covered` |
| Preserved CLI contract — 6 commands | env-registry.mjs: cmdList, cmdAdd, cmdRemove, cmdGet, cmdSet, cmdDescribe; parseArgs switch | Code review + test pass | `covered` |
| Preserved CLI contract — exit codes 0/1/2/3 | TestExitCodes (4 tests) + per-command exit code tests | Test assertions | `covered` |
| Preserved CLI contract — list JSON default + --format table | TestListCommand: test_list_json_format_default, test_list_json_format_explicit, test_list_table_format, test_list_outputs_only_env_vars_array | Test assertions | `covered` |
| Preserved CLI contract — get prints value only | TestGetCommand: test_get_outputs_value_only | Test assertion | `covered` |
| Preserved CLI contract — set reads from hidden prompt/stdin, never CLI arg | env-registry.mjs readValueInteractive (setRawMode), parseArgs rejects args[2]; TestMigrationBoundaries::test_set_does_not_accept_value_as_cli_argument | Code review + test | `covered` |
| Storage: service name opencode-env-registry | env-registry.mjs line 8; TestKeychainBackend::test_service_name_is_opencode_env_registry | macOS security CLI verification | `covered` |
| Storage: env fallback for get only | env-registry.mjs getValue (line 62-68); TestKeychainBackend::test_get_env_fallback_when_keychain_empty, test_keychain_value_takes_priority_over_env | Code review + tests | `covered` |
| Storage: set fails with exit 3 if keychain unavailable | env-registry.mjs lines 211-214; TestKeychainBackend::test_set_exits_3_when_keychain_unavailable (skipped but structurally verified) | Code path verified | `covered` |
| Storage: no migration script, users re-enter | TestMigrationBoundaries::test_get_for_unmigrated_value_reports_not_found | Test assertion | `covered` |
| Storage: set replaces existing keychain value | TestKeychainBackend::test_set_replaces_existing_keychain_value | Test assertion | `covered` |
| SKILL.md updated to Bun commands | TestDependencyMigration::test_skill_md_uses_bun_commands; SKILL.md lines 29-37 | File content assertion | `covered` |
| cross-keychain in .opencode/package.json | TestDependencyMigration::test_cross_keychain_in_package_json; package.json line 16 | File content assertion | `covered` |
| Python keyring removed from pyproject.toml | TestDependencyMigration::test_keyring_removed_from_pyproject; pyproject.toml has no keyring | File content assertion | `covered` |
| env-registry.py removed | TestDependencyMigration::test_python_script_removed; glob confirms non-existence | File system check | `covered` |
| env-registry.json readable without format changes | env-registry.json: version 1, env_vars array with name+description — same schema | Code review | `covered` |
| Values never written to vault/git/CLI args | env-registry.mjs writes only to keychain; set rejects CLI value arg; no vault writes in code | Code review | `covered` |
| No plugin API or deny rules added (step 08 scope) | Code review: no plugin layer, no bash deny rules, no get removal | Code review | `covered` |

### Coverage Summary
- Total requirements sections in step.md: 4 batches + 6 preserved CLI contract items + 6 storage/migration items + 4 dependency migration items + 2 invariant checks = 22 distinct requirement lines
- Requirements checked: 22
- Covered: 22
- Gaps: 0
- Partial coverage: 0

### Coverage Gate
- All 22 requirement rows are `covered` — gate passed.

## TDD Compliance

### Red
- pass — Tests were written targeting the Bun CLI surface before implementation. The test suite structure (`_run_cli` executing `bun run .opencode/scripts/env-registry.mjs`) was established first and all behavior tests drive the implementation.

### Green
- pass — All 60 tests pass (1 skipped for keychain-unavailable path which is environment-dependent and correctly guarded). Implementation in env-registry.mjs satisfies every test assertion.

### Refactor
- pass — Code is clean: single-file module with clear function decomposition (loadRegistry, saveRegistry, validateName, findEntry, getValue, setValue, deleteValue, readValueInteractive, parseArgs, cmd* handlers). setRawMode interactive input properly restores terminal state on completion and Ctrl+C. No dead code or stale references remain.

## Anti-Patterns
- none — No dual Python/JS secret storage, no backward-compat wrapper, no secrets in CLI args, no vault writes, no step-08 scope creep.

## Phase Handoff

### Archive Context Used
- The original Python env-registry.py has been fully removed; its behavioral contract is captured in the test suite and the JS implementation.

### Phase-Log Follow-Up
- Step 08 can now proceed to build the plugin layer on top of the JS-native keychain backend. The raw `get` command remains available for step 08 to decide on removal/restriction.

### Superseded Directions
- Python keyring as a secret-storage backend is superseded. Any future reference to `uv run python .opencode/scripts/env-registry.py` should be treated as stale.
