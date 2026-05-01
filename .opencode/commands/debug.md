---
description: Enter sandbox mode for read-only vault behavior
model: bailian-coding-plan/glm-5
---
Enter debug/sandbox mode for this session. Topic: `$ARGUMENTS`

When active:
- Vault automation strategies are suspended
- No content will be written to wiki/, resources/, brainstorm/
- Query-on-interaction, low-confidence-brainstorm, post-*-solidify rules are disabled
- Session is read-only for vault operations

Use this for debugging system behavior or casual conversation that should not be captured.

If a topic argument is provided, include it in your first response as a session label so the user (and session history) can identify this debug session at a glance. Example: `[debug: python-async]`

To exit: start a new session (mode is session-scoped).

## Plugin-Edit Override

When debug mode is active through `/debug`, a plugin-edit permission override applies:

- `state.debug === true` activates a runtime session-permission patch derived from the tracked debug profile (`opencode.debug.json`).
- `vault-query-router` validates `opencode.debug.json`, then updates the current session permission rules so the override takes effect immediately for the active debug session.
- This profile lifts the normal edit deny for `.opencode/plugins/**`, allowing edits to plugin source and plugin-local config under that tree during the debug session.
- The override is **session-scoped**: it ends when the session ends. Starting a new session returns to the normal permission profile (`opencode.json`), which denies edits to `.opencode/plugins/**`.
- The override is **explicit and auditable**, not a silent side effect. The `[debug: ...]` session label makes the active override visible.

### What stays protected even in debug

The following files remain denied for edit even during debug mode:

- `.opencode/plugin-allowlist.json` - part of the trusted enforcement boundary
- `opencode.json` - the normal-session permission profile
- `opencode.debug.json` - the debug permission profile artifact itself

If the permission selector cannot read trusted session debug state, cannot load `opencode.debug.json`, or sees ambiguous state, it fails closed and applies `opencode.json`.

### What this override does not affect

The plugin-edit override is separate from other debug-mode behaviors:

- Network search permission (`websearch`, `webfetch` without asking user permission) is an independent debug-mode exception, not related to the plugin-edit override.
- Secret-related bash denies and `**/secrets/**` read denies remain unchanged.
