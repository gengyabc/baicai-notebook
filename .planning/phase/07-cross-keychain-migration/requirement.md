---
step-key: cross-keychain-migration
step-number: 07
step-folder: 07-cross-keychain-migration
phase-topic: word-template-generation-and-filling
status: discovered
requirement-version: 1
updated-at: 2026-04-26
source: discover-requirements
supersedes: null
---

## Restated Request

Replace Python keyring with JS cross-keychain as the OS keychain backend and rewrite the env-registry CLI as a JavaScript tool, dropping Python keyring completely.

## Real Objective

Eliminate the Python keyring dependency so that secret storage uses a JS-native keychain library, enabling a future JS plugin layer to be the sole trusted entry point for secret access.

## Problem Statement

The current env-registry is a Python script using Python keyring. This creates a split stack (Python for secrets, JS for the planned plugin layer) and keeps a Python dependency that the spike document explicitly targets for removal. Cross-keychain as a single JS backend unifies the stack and removes the Python keyring attack surface.

## In Scope

- Rewrite `.opencode/scripts/env-registry.py` as a JS CLI under `.opencode/scripts/` using cross-keychain
- All 6 existing commands: list, add, remove, get, set, describe
- Whitelist JSON schema (`.opencode/env-registry.json`) remains unchanged
- OS keychain access via cross-keychain (macOS Keychain, Windows Credential Manager, Linux libsecret)
- Delete old Python keyring stored values (no migration script; users re-enter values)
- Remove Python keyring optional dependency from pyproject.toml
- Update SKILL.md to reflect JS CLI commands (`bun run` instead of `uv run python`)
- Update AGENTS.md routing if needed

## Out of Scope

- Plugin layer or capability isolation (that is step 08)
- Allowlist enforcement beyond existing whitelist validation
- OpenCode permission hardening
- Audit logging, rate limiting, confirmation prompts
- Linux native build tooling documentation (deferred)
- Multi-user or multi-project isolation

## Constraints

- Must use `bun` as the JS runtime (per AGENTS.md toolchain policy)
- CLI interface and exit codes must remain backward-compatible with existing skill/workflow references
- cross-keychain must work on macOS Keychain as primary target
- Existing `.opencode/env-registry.json` format must remain readable by the new JS tool
- Values must never be written to vault files or git
- set must not accept value as CLI argument (security: no history/ps exposure)

## Assumptions

- cross-keychain is available as an npm package and wraps OS keychain access
- Users will re-enter values after migration (old Python keyring values are deleted, not migrated)
- bun is already available in the project environment
- The Python env-registry.py can be removed without breaking other tools

## Open Questions

None.

## Success Criteria

1. JS CLI provides all 6 commands with identical semantics to the Python version
2. Values are stored in OS keychain via cross-keychain (macOS Keychain verified)
3. Python keyring dependency is removed from the project
4. SKILL.md reflects the new JS command paths
5. Existing env-registry.json is readable without format changes
6. set command does not expose values in CLI arguments or process list
7. Unregistered variable access is still blocked (exit code 2)

## Suggested Planning Focus

Start with the JS CLI rewrite: create `.opencode/scripts/env-registry.mjs` (or similar) with cross-keychain integration, whitelist validation, and all 6 commands. Then update skill and config references. Remove Python keyring dependency last.
