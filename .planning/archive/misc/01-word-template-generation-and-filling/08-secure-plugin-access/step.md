---
step-key: secure-plugin-access
step-version: 2
requirement-version: 1
---

# Secure Plugin Access

---

## Objective

Introduce a first-party OpenCode plugin as the only model-reachable secret-consuming surface, so secret-backed work is performed through allowlisted `service + operation` capabilities with sanitized result-only outputs while direct raw-secret retrieval paths are removed or blocked.

---

## Runtime And Enforcement Topology

- The trusted execution surface for this step is a new first-party plugin under `.opencode/plugins/secure-plugin-access.ts`, following the existing plugin pattern already used in `.opencode/plugins/`.
- The plugin must own one internal entry point, `runSecureAction({ service, operation, args })`, and expose only a single model-facing tool that delegates to that entry point.
- Secret values continue to live in the OS keychain under the step `07` service namespace `opencode-env-registry`; the plugin must use JS keychain access via `cross-keychain` and must not shell out to the `env-registry` CLI for secret reads.
- Allowlist policy lives in a new tracked config file, `.opencode/plugin-allowlist.json`, so allowed `service + operation` pairs are explicit, reviewable, and separate from plugin code.
- Root `opencode.json` is the enforcement boundary for OpenCode permissions in this step. It must carry the bash deny rules, edit denial for `.opencode/plugins/**`, and read denial for `**/secrets/**` required by the current requirement.
- The existing `.opencode/scripts/env-registry.mjs` remains the trusted local setup path for `list`, `add`, `remove`, `set`, and `describe`, but it must stop being a model-usable raw secret retrieval surface in this step.

## Framework-Only Positive Path Boundary

- This step does not ship real third-party service integrations.
- The committed allowlist may contain only a deterministic first-party fixture capability used to prove the framework path end to end in tests; it must consume a registered keychain secret internally and return only derived, non-secret output.
- The fixture capability is fixed to `fixture-secret.derive-digest`; do not invent additional fixture services or operations during implementation.
- Tests must cover both rejection paths and at least one successful allowlisted operation without introducing a production external API dependency.

## Secure Action Contract

- `runSecureAction` input shape is fixed to `{ service: string, operation: string, args: object }`.
- Validation order is fixed:
  1. reject malformed input
  2. reject unknown service
  3. reject unknown operation for a known service
  4. validate args against the allowlisted operation contract before any secret lookup
  5. resolve the named secret from keychain only after validation succeeds
  6. execute the operation and sanitize the returned result before it leaves the plugin
- The allowlist schema must be versioned and must declare, per operation, the secret name to resolve, the accepted argument keys, and the handler identifier used by the plugin.
- The plugin must fail closed: unknown fields, unknown operations, missing secrets, and handler mismatches all return non-secret errors and never fall back to raw secret output.

## Frozen Allowlist And Handler Contract

- `.opencode/plugin-allowlist.json` uses this exact top-level shape:

```json
{
  "version": 1,
  "services": {
    "fixture-secret": {
      "operations": {
        "derive-digest": {
          "secretName": "SECURE_PLUGIN_FIXTURE_SECRET",
          "handler": "fixtureSecretDeriveDigest",
          "allowedArgs": ["salt"]
        }
      }
    }
  }
}
```

- Field meanings are frozen:
  - `version`: allowlist schema version, must be `1` for this step
  - `services`: object keyed by service name
  - `operations`: object keyed by operation name inside a service
  - `secretName`: env-registry whitelist name whose value is resolved from keychain
  - `handler`: reviewed in-repo handler identifier
  - `allowedArgs`: exact list of accepted top-level arg keys; any extra key is rejected before secret lookup
- The plugin owns a static in-file handler registry with this contract:
  - `type SecureActionHandler = (input: { secret: string; args: Record<string, unknown> }) => Promise<Record<string, unknown>>`
  - `const HANDLERS = { fixtureSecretDeriveDigest }` in `.opencode/plugins/secure-plugin-access.ts`
  - allowlist `handler` values must map by exact key lookup into `HANDLERS`; no dynamic imports, file paths, or reflective lookup
- The model-facing tool wrapper may accept only the public `service`, `operation`, and `args` fields; it must not accept `secretName`, `handler`, or any override of allowlist-owned fields.

## Frozen Fixture Capability

- The only committed positive-path fixture capability for this step is `service = "fixture-secret"` and `operation = "derive-digest"`.
- It resolves the allowlisted keychain secret `SECURE_PLUGIN_FIXTURE_SECRET` and returns:

```json
{
  "ok": true,
  "digest": "<sha256-hex>"
}
```

- `digest` is the SHA-256 hex digest of `secret + ":" + args.salt`.
- `args.salt` is required, must be a non-empty string, and is the only accepted arg for the fixture operation.
- Tests must seed `SECURE_PLUGIN_FIXTURE_SECRET` dynamically during setup through the shared JS keychain helper or direct `cross-keychain` write, then clean it up after assertions.
- No other committed allowlist entry is required for this step.

## Sanitization And Failure Boundary

- No plugin success payload, thrown error, warning, or log line may contain the resolved secret value.
- Sanitization is required for both direct handler results and caught exceptions before anything is returned to the model or written through plugin logging.
- When a secret is missing or keychain access fails, the plugin must return a generic failure that identifies the service or operation context but not the secret name or secret contents.
- The plugin must not support dynamic `require`, runtime code loading, user-supplied handler paths, or operation dispatch based on unchecked strings beyond the reviewed allowlist mapping.
- Sanitization is frozen to exact-value redaction plus leak rejection:
  - the plugin keeps the resolved secret string in memory for the duration of one operation
  - before returning success, it recursively inspects every string field in the result payload; if any string contains the secret as a substring, replace each occurrence with `[REDACTED_SECRET]`
  - if the sanitized payload still differs from the raw payload in a way that would make the result semantically misleading for this step, reject the operation with a generic `sanitized-output-blocked` error instead of returning a partially redacted success payload
  - before returning failure, stringify the candidate error message, replace each secret occurrence with `[REDACTED_SECRET]`, and return only the sanitized message
  - plugin log lines must use the same exact-value replacement before emission
- This step does not require pattern-based secret detection beyond exact matching of the resolved secret value.

## Frozen Raw-Get Decision And Permission Shape

- The raw env-registry `get` command is retained only as a deprecated denial path for compatibility of command parsing; it must not read keychain state and must exit `1` with a message directing callers to the secure plugin path.
- `parseArgs()` in `.opencode/scripts/env-registry.mjs` continues to recognize `get NAME`, but `cmdGet()` no longer performs secret lookup in this step.
- Root `opencode.json` must use the OpenCode `permission` object with explicit deny entries shaped like:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "permission": {
    "bash": {
      "node -e*": "deny",
      "node *cross-keychain*": "deny",
      "node *keytar*": "deny",
      "bun run .opencode/scripts/env-registry.mjs get *": "deny",
      "bun .opencode/scripts/env-registry.mjs get *": "deny"
    },
    "edit": {
      ".opencode/plugins/**": "deny"
    },
    "read": {
      "**/secrets/**": "deny"
    }
  }
}
```

- Preserve any unrelated existing project config fields while adding these permission entries.

---

## Locked constraints

- Use `bun` and the existing `.opencode` JS dependency owner for all code introduced in this step.
- Use `cross-keychain` for all secret resolution performed by the plugin.
- Keep the allowlist boundary at `service + operation`; do not collapse it to service-only access.
- Do not expose any `getSecret`, `getToken`, `dumpKeychain`, or equivalent raw-secret API.
- Do not allow the plugin to call the env-registry CLI as a subprocess to obtain secrets.
- Do not rely on real external network integrations to prove this step complete.
- Do not edit any other live step plan while implementing or revising this step.

---

## Scope

### In

- Adding `.opencode/plugins/secure-plugin-access.ts` as the sole plugin surface for secret-consuming operations
- Adding `.opencode/plugin-allowlist.json` with a versioned per-service-per-operation schema
- Refactoring or adding a small shared JS keychain helper under `.opencode/scripts/` if needed so the plugin and env-registry use the same `cross-keychain` backend without subprocess calls
- Updating `opencode.json` to deny known bypass paths for bash and protected file edits or reads
- Removing or deprecating the raw `get` path in `.opencode/scripts/env-registry.mjs` so it no longer returns secrets to the model
- Updating first-party skill or command guidance that still tells the model to call raw `get`
- Adding tests that cover allowlisted success, allowlist rejection, sanitization, raw-get deprecation, and permission-config hardening

### Out

- Shipping production integrations to external APIs or services
- Audit logging, rate limiting, or confirmation prompts
- A separate daemon, helper service, or sandbox runtime
- Redesigning vault workflows beyond switching them away from raw secret retrieval
- Linux-specific packaging or native build guidance

---

# TDD Batches

## Batch 1: Freeze The Trusted Plugin Contract

**Primary Concern:** Establish one plugin-owned secure action surface with deterministic input validation and a framework-only positive path that does not depend on external services.

**Tests:**
- GIVEN malformed secure action input
- WHEN the plugin entry point runs
- THEN it rejects before keychain access with a non-secret validation error

- GIVEN an allowlist containing one fixture `service + operation`
- WHEN the plugin entry point runs with valid args and a stored secret
- THEN it returns `{ ok: true, digest }` where `digest` is deterministic from the fixture rule and never equals the secret itself

- GIVEN an unknown service or unknown operation
- WHEN the plugin entry point runs
- THEN it fails closed before secret lookup

**Implementation:**
- Add `.opencode/plugins/secure-plugin-access.ts` with a pure `runSecureAction()` helper plus the plugin tool wrapper
- Add `.opencode/plugin-allowlist.json` and load it with version validation
- Add a test harness path that can execute `runSecureAction()` without needing a live OpenCode UI session

---

## Batch 2: Enforce Secret Isolation And Sanitization

**Primary Concern:** Ensure only validated allowlisted handlers can resolve keychain secrets and that no result, error, or log leaks secret material.

**Tests:**
- GIVEN a valid allowlisted operation whose handler throws an error containing the secret value
- WHEN the plugin returns the failure
- THEN the returned error is sanitized and omits the secret

- GIVEN a valid allowlisted operation whose raw handler result includes the secret value
- WHEN the plugin returns success
- THEN the final payload replaces the exact secret substring with `[REDACTED_SECRET]` or fails with `sanitized-output-blocked`

- GIVEN a valid allowlisted operation with a missing keychain value
- WHEN the plugin runs
- THEN it returns a generic missing-secret failure without exposing the secret name or value

**Implementation:**
- Route keychain resolution through shared JS helpers using `cross-keychain`
- Add centralized sanitization for success results, caught errors, and plugin logs
- Freeze handler dispatch to reviewed in-repo mappings only

---

## Batch 3: Remove Or Block Raw Secret Retrieval Paths

**Primary Concern:** Close the known model-accessible bypasses outside the plugin surface.

**Tests:**
- GIVEN the env-registry CLI
- WHEN `get` is invoked from its public command surface
- THEN it exits `1`, performs no keychain lookup, and prints only a deprecation or denial message that points callers to the secure plugin workflow

- GIVEN root `opencode.json`
- WHEN permission rules are inspected
- THEN it uses the `permission` object shape and bash denies at least `node -e*`, `node *cross-keychain*`, `node *keytar*`, and direct secret-reading CLI patterns, edit denies `.opencode/plugins/**`, and read denies `**/secrets/**`

- GIVEN first-party skill or command guidance that previously referenced raw `get`
- WHEN docs are inspected
- THEN they no longer instruct the model to retrieve secrets directly

**Implementation:**
- Remove or deprecate the `get` command in `.opencode/scripts/env-registry.mjs`
- Update `opencode.json` permission rules for bash, edit, and read
- Update `.opencode/skills/env-registry/SKILL.md` and any first-party command docs that still point at raw `get`

---

## Batch 4: Lock Anti-Bypass Invariants

**Primary Concern:** Verify the framework stays a plugin-only capability boundary rather than regressing into direct secret access through nearby surfaces.

**Tests:**
- GIVEN a request for an unallowlisted service or operation
- WHEN the secure plugin is used
- THEN no fallback path attempts raw keychain access, CLI execution, or dynamic handler loading

- GIVEN the step `07` env-registry setup flow
- WHEN this step is complete
- THEN `set`, `add`, `remove`, `describe`, and metadata-safe `list` still exist for trusted setup, while secret consumption for model work routes through the plugin only

- GIVEN the committed allowlist and plugin source
- WHEN files are reviewed together
- THEN every executable operation is explicitly declared in the allowlist and mapped to a reviewed in-repo handler

**Implementation:**
- Keep setup-only env-registry commands intact except for raw `get`
- Ensure the plugin does not discover handlers dynamically
- Verify the allowlist-to-handler mapping remains explicit and reviewable

---

## Files

- `.opencode/plugins/secure-plugin-access.ts` - trusted secure-action plugin and tool wrapper
- `.opencode/plugin-allowlist.json` - versioned allowlist for service and operation capability mapping
- `.opencode/scripts/env-registry.mjs` - raw `get` removal or deprecation and shared keychain helper extraction if needed
- `.opencode/skills/env-registry/SKILL.md` - remove model guidance that retrieves raw secrets directly
- `.opencode/commands/env-helper.md` - refresh command guidance if it still points callers at raw `get`
- `opencode.json` - OpenCode permission rules for bash, edit, and read hardening
- `tests/test_secure_plugin_access.py` - framework contract, sanitization, allowlist, and hardening coverage
- `tests/fixtures/run_secure_action.mjs` - Bun harness that imports `runSecureAction()` for pytest-driven plugin behavior tests
- `tests/test_env_registry.py` - raw `get` deprecation or denial behavior coverage
- `tests/test_sensitive_command_approval_docs.py` - doc boundary updates if the changed guidance belongs in the shared sensitive-command policy surface

## Symbols

- `runSecureAction()` in `.opencode/plugins/secure-plugin-access.ts`
- secure plugin tool registration in `.opencode/plugins/secure-plugin-access.ts`
- allowlist loader and validator in `.opencode/plugins/secure-plugin-access.ts`
- `HANDLERS` registry and `fixtureSecretDeriveDigest()` in `.opencode/plugins/secure-plugin-access.ts`
- keychain helper exports used by `.opencode/scripts/env-registry.mjs` and the plugin
- `cmdGet()` and `parseArgs()` in `.opencode/scripts/env-registry.mjs`

## Execution constraints

- Only plan and implement this resolved step folder.
- Prefer the smallest plugin surface that satisfies the security model.
- Keep the positive-path test capability first-party and deterministic.
- Do not claim secret safety unless the same tests cover success, failure, and bypass attempts.
- Do not leave any documented first-party model workflow that still instructs direct secret retrieval.

## Invariants

- Step `07` remains the owner of cross-keychain storage and setup-time registry management.
- Secret values are never written to tracked files, returned in plugin payloads, or printed by the deprecated raw `get` path.
- Allowlist approval is required per `service + operation`, not merely per secret name.
- OpenCode permissions remain the enforcement boundary for bash, read, and edit restrictions.
- This step ships the secure framework, not real external service integrations.

## Deferred follow-up

- Add real service integrations only after the secure framework and permission hardening from this step are stable.
- Consider audit logging, rate limiting, and confirmation prompts in later work once the plugin-only secret boundary is in place.
