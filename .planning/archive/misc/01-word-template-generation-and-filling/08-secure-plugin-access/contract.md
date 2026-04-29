# Contract: 08-secure-plugin-access

## Invariants

- The plugin is the only model-reachable entry point for secret-consuming operations
- No API surface returns raw secret values in any response, error, or log
- Allowlist approval is per-service-per-operation, not per-secret-name
- The plugin fails closed: unknown fields, unknown operations, missing secrets, and handler mismatches all return non-secret errors without fallback to raw secret output

## Data Shape Constraints

### runSecureAction Input

- Input shape is `{ service: string, operation: string, args: object }`
- No additional top-level fields are accepted by the model-facing tool wrapper

### Allowlist Schema

- Version field must be `1`
- Services object keyed by service name
- Operations object keyed by operation name inside a service
- Per-operation fields: `secretName`, `handler`, `allowedArgs`
- `allowedArgs` is an exact list of accepted top-level arg keys; any extra key triggers rejection before secret lookup

### Fixture Output

- `fixture-secret.derive-digest` returns `{ ok: true, digest: "<sha256-hex>" }`
- `digest` is SHA-256 hex of `secret + ":" + args.salt`
- `args.salt` is required and must be non-empty string

## Validation Order

1. Reject malformed input
2. Reject unknown service
3. Reject unknown operation for known service
4. Validate args against allowlisted operation contract
5. Resolve secret from keychain only after validation succeeds
6. Execute operation and sanitize result before return

## Sanitization Constraints

- Success payloads are recursively inspected; any string containing the secret as substring is replaced with `[REDACTED_SECRET]`
- If sanitized payload would be semantically misleading, the operation fails with `sanitized-output-blocked` instead of returning partial redaction
- Error messages are stringified and have secret occurrences replaced with `[REDACTED_SECRET]`
- Plugin log lines apply the same exact-value replacement before emission
- No pattern-based secret detection required; only exact matching of resolved secret value

## Handler Dispatch Constraints

- Handlers are dispatched via static in-file registry lookup
- No dynamic imports, file paths, or reflective lookup
- Allowlist `handler` values must map by exact key into the HANDLERS registry

## Permission Config Constraints

- Root opencode.json uses `permission` object with explicit deny entries
- Bash denies at minimum: `node -e*`, `node *cross-keychain*`, `node *keytar*`, direct secret-reading CLI patterns
- Edit denies: `.opencode/plugins/**`
- Read denies: `**/secrets/**`

## Compatibility Constraints

- env-registry CLI retains `list`, `add`, `remove`, `set`, `describe` for trusted setup
- `get` command remains parseable but performs no keychain lookup and exits 1 with deprecation message
- Plugin uses cross-keychain for secret resolution without shelling out to env-registry CLI