---
step-key: cross-keychain-migration
step-version: 1
requirement-version: 1
---

# Cross Keychain Migration

---

## Objective

Replace the Python `env-registry.py` implementation with a Bun-run JavaScript CLI backed by `cross-keychain`, while preserving the existing six-command interface, whitelist access control, and secure `set` input behavior so later secure-plugin work can depend on a JS-native secret backend instead of Python keyring.

---

## Runtime And Integration Topology

- The new executable surface is `.opencode/scripts/env-registry.mjs`, invoked from the repo root as `bun run .opencode/scripts/env-registry.mjs <command> ...`.
- JS dependency ownership for this step lives in `.opencode/package.json`, because the secret-access runtime and planned plugin work both live under `.opencode/`.
- The existing whitelist file remains `.opencode/env-registry.json` with the same versioned schema and the same `name` plus `description` payload shape.
- Python stops owning secret storage entirely in this step: `.opencode/scripts/env-registry.py` is removed after JS parity is covered by tests and all local references are updated.
- Python test coverage remains acceptable for this step; the existing `tests/test_env_registry.py` suite should be updated to execute the Bun CLI rather than replaced wholesale.

## Preserved CLI Contract

- Keep the existing six commands and argument shapes: `list`, `add`, `remove`, `get`, `set`, `describe`.
- Keep the current exit-code contract used by the existing tests and skill guidance:
  - `0` success
  - `1` argument or validation error
  - `2` whitelist miss or value-not-found
  - `3` secure storage unavailable for `set`
- Keep `list` defaulting to JSON output of the `env_vars` array only, and keep `--format table` as the human-readable mode.
- Keep `get` printing only the resolved value to stdout on success.
- Keep `set NAME` as the only write form; it must continue to read from a hidden prompt when interactive and from stdin when piped, never from a positional CLI value.

## Storage And Migration Boundary

- Use the same logical service name, `opencode-env-registry`, for JS keychain entries so the storage namespace remains stable across the backend swap.
- JS keychain access is the primary storage path for both `get` and `set` in this step.
- Preserve environment-variable fallback for `get` only, because step `05` established that behavior and step `07` changes the keychain backend rather than the user-facing command contract.
- `set` must not add a new environment-variable write path; if secure storage is unavailable, it still fails with exit code `3` rather than silently writing secrets into process-visible storage.
- No migration path may copy old Python-managed values into JS-managed storage. Users must repopulate values with `set` after the migration.
- When a value is re-entered through the JS CLI, the stored entry for that name must be replaced in the JS-managed keychain backend rather than preserved from any prior Python-based state.

---

## Locked constraints

- Use `bun` as the runtime for all CLI execution in this step.
- Use `cross-keychain` as the OS keychain library for macOS, Windows, and Linux.
- Keep `.opencode/env-registry.json` readable without schema changes.
- Do not write secret values to vault files, git-tracked files, or CLI arguments.
- Do not add new user-facing commands, flags, or workflow surfaces beyond the existing six-command contract.
- Remove Python `keyring` dependency ownership from the project files touched by this step.
- Keep step `08` concerns out of scope: no plugin API, no bash deny rules, and no removal of the raw `get` command yet.

---

## Scope

### In

- Implementing `.opencode/scripts/env-registry.mjs` with command parity for `list`, `add`, `remove`, `get`, `set`, and `describe`
- Reusing the existing whitelist validation and JSON read/write semantics against `.opencode/env-registry.json`
- Wiring keychain reads, writes, and deletes through `cross-keychain`
- Preserving current access-control behavior so `get` and `set` only work for registered names
- Updating `.opencode/skills/env-registry/SKILL.md` to the Bun-based command surface and revised storage wording
- Updating tests that currently target `.opencode/scripts/env-registry.py`
- Removing Python `keyring` dependencies from `pyproject.toml` and any lock or metadata files that are expected to stay in sync for this repo
- Removing the old Python CLI after the JS path is covered

### Out

- Building the secure plugin layer or capability isolation from step `08`
- Changing whitelist semantics beyond existing validation rules
- Adding audit logging, confirmation prompts, or rate limiting
- Adding a bulk migration script for old stored values
- Introducing new config formats for secret storage

---

# TDD Batches

## Batch 1: Preserve Registry And CLI Surface Under Bun

**Primary Concern:** Keep the whitelist file behavior, command parsing, output shape, and exit codes stable while swapping the executable from Python to JS.

**Tests:**
- GIVEN the registry file is missing, corrupt, or version-mismatched
- WHEN the Bun CLI runs `list`
- THEN it returns the same empty/default behavior and the same failure exit semantics as the current Python CLI

- GIVEN a valid whitelist entry set
- WHEN `list`, `add`, `remove`, and `describe` run through the Bun CLI
- THEN the JSON schema, stdout messages, and exit codes remain compatible with the current contract

- GIVEN invalid commands or malformed arguments
- WHEN the Bun CLI parses them
- THEN it exits with code `1` and keeps stderr-only error reporting

**Implementation:**
- Port registry loading, validation, name checks, and JSON persistence into `.opencode/scripts/env-registry.mjs`
- Update `tests/test_env_registry.py` to execute `bun run .opencode/scripts/env-registry.mjs`
- Remove Python-specific assumptions from the tests without weakening behavior coverage

---

## Batch 2: Swap Keychain Backend While Preserving Access Control

**Primary Concern:** Replace Python keyring reads and writes with `cross-keychain` while keeping whitelist enforcement and success/error semantics stable.

**Tests:**
- GIVEN a name not present in `.opencode/env-registry.json`
- WHEN `get NAME` or `set NAME` runs
- THEN the CLI still exits `2` before attempting any keychain access

- GIVEN a registered name with no stored keychain value but an environment variable present
- WHEN `get NAME` runs
- THEN the CLI returns the environment value as the preserved fallback path

- GIVEN a registered name and secure storage is available
- WHEN `set NAME` receives a non-empty value from stdin or prompt
- THEN the value is stored through `cross-keychain` and `get NAME` can resolve it from the keychain path

- GIVEN secure storage is unavailable for a registered name
- WHEN `set NAME` runs
- THEN the CLI exits `3` without writing the value into CLI arguments, files, or a new environment fallback path

**Implementation:**
- Introduce JS helpers for `get`, `set`, and delete operations against `cross-keychain`
- Preserve the existing `opencode-env-registry` service name and whitelist-first control flow
- Keep environment fallback limited to `get`

---

## Batch 3: Complete The Dependency And Reference Migration

**Primary Concern:** Remove Python keyring ownership and update all first-party references to the Bun CLI without leaving stale instructions behind.

**Tests:**
- GIVEN the repo documentation and skill guidance for env-registry
- WHEN a user follows the documented commands
- THEN every command path points to `bun run .opencode/scripts/env-registry.mjs ...` rather than the removed Python script

- GIVEN the project dependency manifests for this step
- WHEN secret-storage dependencies are inspected
- THEN Python `keyring` is no longer required and JS `cross-keychain` is declared in the `.opencode` package that owns the new CLI

- GIVEN the old Python script path
- WHEN the migration is complete
- THEN no first-party workflow or test still depends on `.opencode/scripts/env-registry.py`

**Implementation:**
- Update `.opencode/skills/env-registry/SKILL.md` command examples and storage wording
- Add `cross-keychain` to `.opencode/package.json`
- Remove Python keyring references from `pyproject.toml` and synced metadata that this repository treats as source-controlled dependency state
- Delete `.opencode/scripts/env-registry.py` after reference migration and test updates are complete

---

## Batch 4: Verify Migration Boundaries And Non-Goals

**Primary Concern:** Lock the migration behavior so later work does not accidentally turn this step into plugin hardening or secret-exfiltration redesign.

**Tests:**
- GIVEN a previously registered variable that has not been re-entered through the JS CLI
- WHEN `get NAME` cannot resolve it from the JS keychain path or environment fallback
- THEN the CLI reports the existing value-not-found error path and instructs the user to `set` it again rather than attempting automatic migration

- GIVEN step `08` security goals
- WHEN this step is implemented
- THEN the raw `get` command still exists and plugin-only access is not claimed as completed by this migration

**Implementation:**
- Keep migration behavior explicit in tests and user-facing guidance: no automatic value-copy path, users re-enter secrets with `set`
- Avoid adding plugin contracts, deny rules, or secret-sanitizing result layers in this step

---

## Files

- `.opencode/scripts/env-registry.mjs` - new Bun CLI implementation and keychain integration
- `.opencode/scripts/env-registry.py` - removed after JS parity and reference migration are complete
- `.opencode/env-registry.json` - unchanged whitelist schema consumed by the new CLI
- `.opencode/package.json` - JS dependency owner for `cross-keychain`
- `.opencode/skills/env-registry/SKILL.md` - updated Bun command guidance and storage wording
- `tests/test_env_registry.py` - preserved behavior suite retargeted to the Bun CLI
- `pyproject.toml` - remove Python `keyring` dependency ownership
- `uv.lock` - refresh only if dependency-source policy in this repo requires the lockfile to reflect the `pyproject.toml` removal

## Symbols

- `main()` in `.opencode/scripts/env-registry.mjs`
- Registry loader and saver helpers in `.opencode/scripts/env-registry.mjs`
- Keychain read, write, and delete helpers in `.opencode/scripts/env-registry.mjs`
- `_run_cli()` in `tests/test_env_registry.py`
- `## How to use me` and `## Constraints` in `.opencode/skills/env-registry/SKILL.md`

## Execution constraints

- Only plan and implement this live step folder.
- Preserve observable CLI behavior unless the current requirement explicitly changes it.
- Prefer updating the existing test suite over replacing it.
- Do not leave dual Python and JS secret-storage implementations in steady state.
- Do not introduce a backward-compatibility wrapper script unless implementation proves it is required by a first-party reference that cannot be updated in this step.

## Invariants

- Whitelist registration remains the access-control boundary for `get` and `set`.
- Secret values are never stored in `.opencode/env-registry.json`.
- `set` never accepts a value as a CLI argument.
- `list` remains safe to expose because it returns metadata only.
- Step `08` still owns plugin-only secret access and anti-bypass hardening.

## Deferred follow-up

- Decide in step `08` whether the raw `get` command should be removed, blocked, or retained only for local trusted surfaces.
- Add plugin-layer enforcement so the LLM can consume secret-backed operations without ever receiving raw secret values.
