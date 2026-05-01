# Debug Mode

When debug mode is active, suspend vault automation strategies and all vault write operations.

## Scope

Session-scoped. Activated by the `/debug` command.

## Disabled Behaviors

When `debug` mode is active:
- Skip `query-on-interaction` rule
- Skip the SQLite-first retrieval hook and disable `vault_index_search` for the session
- Skip `low-confidence-brainstorm` rule
- Skip `post-ingest-solidify` rule
- Skip `post-brainstorm-solidify` rule
- Block all writes to `workbook/wiki/`, `workbook/resources/`, `workbook/brainstorm/`

## Allowed Behaviors

- Read from any vault folder
- Normal conversation
- Code analysis and other non-vault operations
- Network search (`websearch`, `webfetch`) without asking user permission first (this is an independent debug-mode exception, separate from the plugin-edit override below)

## Plugin-Edit Permission Override

When `state.debug === true`, a debug permission override patches the current session using the tracked debug profile:

- **Activation path**: `/debug` sets trusted session state, then `vault-query-router` validates `opencode.debug.json` and calls the session update API to patch the active session permission rules immediately.
- **Profile source**: `opencode.debug.json` remains the tracked, auditable source for the debug boundary; runtime session rules are derived from that profile rather than mutating `opencode.json`.
- **Permission patch**: the session patch allows `.opencode/plugins/**` edits and reasserts denies for `.opencode/plugin-allowlist.json`, `opencode.json`, and `opencode.debug.json`.
- **Override scope**: the debug profile lifts the normal edit deny only for `.opencode/plugins/**`, allowing edits to plugin source and plugin-local config under that tree.
- **Source of truth**: `.opencode/plugins/vault-query-router/index.ts` tracks session-scoped debug state (`state.debug`) and applies the runtime patch. Do not introduce a second independent toggle.
- **Session-scoped**: the plugin-edit override ends when the session ends. When a new session starts, `state.debug` is no longer `true` and permission evaluation uses `opencode.json` by default.
- **Explicit and auditable**: the plugin-edit override is not implicit. It is visible through the `[debug: ...]` session label and is documented in the tracked permission-profile files.
- **Fail-closed**: if the router cannot read trusted session debug state, cannot validate `opencode.debug.json`, or cannot patch the session, it fails closed and leaves the normal `opencode.json` boundary in effect.

### Protected even in debug

The following files remain denied for edit even when debug mode is active:

- `.opencode/plugin-allowlist.json` - part of the trusted enforcement boundary, not covered by the override
- `opencode.json` - the normal-session permission profile, protected to prevent self-modification
- `opencode.debug.json` - the debug permission profile artifact, protected to prevent self-modification

### Relationship to other debug exceptions

The plugin-edit override is separate from and independent of other debug-mode behaviors:

- Network search without user permission is a separate debug-mode exception that does not depend on the plugin-edit override.
- Vault write suspension is a separate debug-mode behavior that remains in effect regardless of the plugin-edit override.
- The plugin-edit override does not grant broad edit access to `.opencode/**` or other repository areas outside `.opencode/plugins/**`.

### Debug state manager bootstrap

`.opencode/plugins/vault-query-router/index.ts` is treated as bootstrap-trusted code. If `/debug` cannot set trusted session state (i.e., if the debug state manager is broken), plugin edits remain denied and repair of the debug-state manager is an out-of-band local maintenance task rather than an LLM-granted fallback.

## Still Required in Debug Mode

Even when debug mode is active, the following constraints remain in force:

- **Schema discipline**: do not guess SQLite table names, column names, or index shapes. Read `.opencode/docs/sqlite-retrieval-contract.md` first.
- **Provenance labeling**: network-derived results must still be labeled clearly as external information. Do not blur external results into local-vault evidence.
- **Confidence separation**: file-backed facts, index-only hits, network-derived information, and working hypotheses must remain distinct categories.
- **Stale-index handling**: missing or unreadable shortlisted files must be reported as index issues, not as confirmed facts.
- **Fallback visibility**: if retrieval broadens beyond the structured shortlist, state so explicitly with lower confidence.

## Guard Pattern

All vault automation and write-triggering rules should check:

> If debug mode is active for this session, skip this rule.

The `/debug` command itself should also bypass the retrieval hook so debug state is established before any automatic vault lookup runs.

The host should track session state and respect this flag.

## First-Version Audit Scope

First-version audit behavior is limited to visible debug-session labeling (the `[debug: ...]` label) plus the tracked permission-profile files and documentation. Persistent audit logging beyond visible session labeling is deferred.
