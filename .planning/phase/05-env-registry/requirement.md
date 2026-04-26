---
step-key: env-registry
step-number: 05
step-folder: 05-env-registry
phase-topic: secure-personal-info-management
status: discovered
requirement-version: 1
updated-at: 2026-04-26
source: discover-requirements
supersedes: null
---

## Restated Request

Create a secure, cross-platform environment variable registry system that allows LLM to retrieve personal information (ID numbers, phone numbers, addresses, etc.) for note filling without persisting sensitive values to vault or git.

## Real Objective

Enable secure personal data usage in LLM-assisted workflows while maintaining strict separation between metadata (whitelist) and actual values (keyring/environment), with whitelist serving as both semantic index and access control boundary.

## Problem Statement

Users need to reference personal information in vault notes and template filling, but these sensitive values should not be written to files or committed to git. Current approaches either hardcode values (insecure) or require manual copy-paste each time (inefficient). Need a mechanism where LLM can discover available entries by semantic description and retrieve values on demand, while ensuring only explicitly whitelisted variables are accessible.

## In Scope

- CLI tool (`env-registry.py`) with 6 commands: list, add, remove, get, set, describe
- Whitelist JSON file (`.opencode/env-registry.json`) storing name + description only
- Value storage: keyring priority with environment variable fallback
- Whitelist as access control list (get/set only allowed for registered names)
- Secure value input via stdin or interactive prompt (no CLI argument exposure)
- OpenCode skill definition for LLM integration
- pyproject.toml optional dependency group `secure` for keyring
- .gitignore entry for env-registry.json
- AGENTS.md routing entry

## Out of Scope

- Encrypting the whitelist JSON file itself (name + description are non-sensitive)
- Multi-user or multi-project isolation (project-level whitelist only)
- Value versioning or audit logging
- Automatic extraction of personal info from vault resources
- Web UI or GUI management
- Value expiration/rotation policies
- Blocking opencode session logging of get output (opencode-level behavior)

## Constraints

- Values must never be written to vault files or git
- get/set must validate whitelist before operation (access control)
- set must not accept value as CLI argument (security: no history/ps exposure)
- keyring is optional dependency, must gracefully fallback to environment variables
- Cross-platform: macOS Keychain, Linux libsecret, Windows Credential Manager
- Single-user single-session concurrency model (no file locking)
- LLM session logs may capture get output (documented risk in skill constraints)

## Assumptions

- Python keyring library is acceptable as optional dependency
- `.opencode/env-registry.json` will be added to `.gitignore` to prevent accidental commits
- Users understand the risk of LLM session logging and accept it for convenience
- Project-level whitelist is sufficient (no need for global/user-level registry)
- Variable names follow convention: uppercase letter start, alphanumeric + underscore

## Open Questions

None - spike document has resolved all major design decisions.

## Success Criteria

1. LLM can list available entries with descriptions and match by semantic need
2. LLM can retrieve registered variable values via `get` command
3. Users can add/remove/describe whitelist entries via CLI
4. Users can set values securely without CLI argument exposure
5. Unregistered variable access is blocked (get/set return exit code 2)
6. macOS stores values in Keychain via keyring, Linux falls back to environment variables
7. env-registry.json is excluded from git tracking
8. Skill is loadable on-demand and guides LLM to correct command usage

## Suggested Planning Focus

Start with CLI core implementation (Step 2 in spike): create `.opencode/scripts/env-registry.py` with all 6 commands, whitelist validation, keyring fallback, and secure value input. This is the foundation that all other components (skill, config updates) depend on.