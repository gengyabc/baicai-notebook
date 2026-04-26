---
step-key: secure-plugin-access
step-number: 08
step-folder: 08-secure-plugin-access
phase-topic: word-template-generation-and-filling
status: discovered
requirement-version: 1
updated-at: 2026-04-26
source: discover-requirements
supersedes: null
---

## Restated Request

Build a secure JS plugin as the sole trusted entry point for secret usage, enforcing per-service-per-operation allowlisting and capability isolation so the LLM can never access raw secrets.

## Real Objective

Enforce capability-based secret access: the LLM calls allowlisted operations on allowlisted services and receives only the operation result, never the secret itself. This closes the attack surface where an LLM could exfiltrate credentials via bash, tool abuse, code mutation, or indirect leakage.

## Problem Statement

Even with cross-keychain storage (step 07), the LLM can still call `env-registry get` to retrieve raw secret values, or invoke `node -e "require('cross-keychain')..."` via bash. A plugin layer that consumes secrets internally and only returns operation results is needed to achieve the security model described in the spike.

## In Scope

- JS plugin as the ONLY entry point for secret-consuming operations
- Per-service-per-operation allowlist: validate service + operation + args before execution
- Capability-based API: `plugin.runSecureAction({service, operation, args})` → result only (never the secret)
- No raw secret access APIs: no getSecret(), getToken(), dumpKeychain()
- Output sanitization: no secret in response body, error messages, or logs
- Execution isolation: plugin code is minimal, reviewed, immutable during runtime
- OpenCode permission hardening:
  - Bash deny patterns: `node *keytar*`, `node *cross-keychain*`, `node -e*`
  - Edit protection for `.opencode/plugins/**`
  - File read deny for `**/secrets/**`
- Anti-bypass: block known secret-access patterns in bash, protect plugin files from edit
- Remove or deprecate the raw `get` command from env-registry CLI

## Out of Scope

- Building actual service integrations (e.g., embedding API calls, search API calls) — plugin is the framework only
- Audit logging (optional enhancement, not blocking)
- Rate limiting (optional enhancement, not blocking)
- Confirmation prompts for sensitive ops (optional enhancement, not blocking)
- Separate helper service / daemon (advanced, not needed now)
- Linux native build tooling documentation
- Changing vault or document-filling workflows beyond what the plugin enables

## Constraints

- Plugin must use cross-keychain (from step 07) for all keychain access
- Plugin must not expose secrets to the LLM under any code path
- Allowlist entries must be per-service-per-operation (least privilege)
- OpenCode permissions are the enforcement boundary; the plugin is the trusted layer
- Plugin code must be immutable during runtime (no self-editing, no dynamic requires of untrusted code)
- Must work with OpenCode's existing tool and permission model

## Assumptions

- Step 07 (cross-keychain-migration) is completed before this step begins
- OpenCode supports JS plugins or the plugin can be invoked as a CLI tool
- The allowlist can be stored in a config file (e.g., `.opencode/plugin-allowlist.json`) or inline in the plugin
- OpenCode permission config supports deny patterns for bash commands and edit paths

## Open Questions

None.

## Success Criteria

1. Plugin exposes only allowlisted service+operation pairs; unlisted combinations are rejected
2. Plugin never returns raw secrets in any response, error, or log output
3. LLM cannot bypass the plugin to access secrets via bash (`node -e`, `node *cross-keychain*` blocked)
4. Plugin files under `.opencode/plugins/**` cannot be edited by the LLM
5. Raw `get` command is removed or deprecated so secrets cannot be retrieved via CLI by the LLM
6. Output from any plugin operation contains no secret material
7. Anti-bypass measures block known secret-access patterns with high probability

## Suggested Planning Focus

First design the plugin API surface (input schema, allowlist schema, output sanitization), then implement the allowlist validation and execution isolation, then configure OpenCode permission hardening. The allowlist schema is the contract that everything else depends on.
