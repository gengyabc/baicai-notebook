---
step-key: debug-permission-profile-and-plugin-gate
step-version: 1
requirement-version: 1
---

# Debug Permission Profile And Plugin Gate

---

## Objective

Restore and preserve the normal hard edit deny for `.opencode/plugins/**` in `opencode.json`, then define one explicit, auditable debug-only override path that temporarily lifts that deny for the current debug session only, so later implementation can support plugin-level debugging without turning debug mode into a broad edit escape hatch.

---

## Permission override topology

This step must freeze one deterministic contract for how the plugin-edit exception works so later implementation does not choose between incompatible designs:

- Root `opencode.json` remains the default enforcement boundary for normal sessions. Because the current file does not yet carry the required `.opencode/plugins/**` deny, this step must restore that deny as part of its first batch and treat it as the baseline boundary that debug overrides.
- The override is defined as a separate tracked debug permission profile artifact at repository root path `opencode.debug.json`, not as an in-place mutation of the normal permission file.
- `opencode.debug.json` must use the same top-level config shape as `opencode.json` and must preserve every normal deny except for the narrow edit difference that allows `.opencode/plugins/**` while continuing to deny `.opencode/plugin-allowlist.json`.
- Activation is runtime-gated by the existing session-scoped debug flag. The frozen mechanism for this step is: the permission selector checks the current session state, uses `opencode.debug.json` only when `state.debug === true`, and otherwise falls back to `opencode.json`.
- The session-scoped debug state already tracked in `.opencode/plugins/vault-query-router/index.ts` is the source of truth for whether a session is in debug mode. Later implementation must reuse that session concept rather than inventing a second independent toggle.
- The first-version override scope is narrow: it lifts the default edit deny only for `.opencode/plugins/**` so plugin source and plugin-local config under that tree can be edited during debug work.
- Trusted enforcement artifacts outside that tree remain protected even in debug, including `.opencode/plugin-allowlist.json`, `opencode.json`, and the debug-profile artifact itself.
- If the permission selector cannot read trusted session debug state, cannot load `opencode.debug.json`, or sees ambiguous state, it must fail closed and apply `opencode.json`.

This chooses a hybrid shape intentionally: profile-defined permissions for auditability plus a session gate for enforcement. A profile-only design would be too easy to activate out of band, while a pure runtime exception with no tracked profile would make the changed boundary harder to review.

This step does not require a self-healing path for a broken debug-state manager. First version may treat `.opencode/plugins/vault-query-router/index.ts` as bootstrap-trusted code: if `/debug` cannot set trusted session state, plugin edits remain denied and repair of the debug-state manager is an out-of-band local maintenance task rather than an LLM-granted fallback.

---

## Frozen debug boundary and audit behavior

Later implementation must treat the debug plugin-edit exception as a visible, session-scoped boundary change with minimum necessary breadth:

1. Entering debug mode through `/debug` is the only supported activation path for the plugin-edit override in this step.
2. The session must expose that debug mode is active in user-visible session context, consistent with the existing `[debug: ...]` label behavior.
3. The permission contract must state explicitly that the plugin-edit override is active only for the current session and ends when the session ends.
4. The default plugin edit deny must remain the documented and committed normal-session behavior.
5. Other sensitive deny boundaries remain unchanged unless they are already separately allowed by existing debug rules. In particular, this step must not relax secret-reading bash denies or `**/secrets/**` read denies.
6. If later implementation cannot prove the session is in debug mode, it must fail closed and apply the normal permission profile.
7. First-version audit behavior is limited to visible debug-session labeling plus the tracked permission-profile files and docs; persistent audit logging is deferred.

---

## Locked constraints

- Do not weaken the default deny posture outside debug sessions.
- Do not broaden the override beyond `.opencode/plugins/**` in the first version.
- Do not allow debug mode to edit `.opencode/plugin-allowlist.json`, `opencode.json`, or the debug-profile artifact.
- Do not rely on model memory or prompt text alone to activate the override; activation must depend on tracked session debug state.
- Do not redefine unrelated debug-mode behavior such as vault read routing or network-search exceptions except where docs must mention that those behaviors are independent of plugin edit permissions.
- Do not implement a host-wide permission engine redesign in this step.
- Do not edit any other live step plan while implementing this step.

---

## Scope

### In

- Restoring the missing `.opencode/plugins/**` edit deny in `opencode.json` so the normal-session baseline exists in the live config.
- Keeping `opencode.json` as the strict normal-session permission contract after that baseline is restored.
- Adding one tracked debug permission profile artifact at `opencode.debug.json` that documents the debug-only edit allowance for `.opencode/plugins/**`.
- Updating debug command and debug-mode rule docs so they describe the plugin-edit override, its session gate, and its fail-closed behavior.
- Updating routing or system-behavior docs that summarize what debug mode changes so the permission exception is discoverable and auditable.
- Aligning the documented source of truth for session debug state with the existing session flag behavior in `.opencode/plugins/vault-query-router/index.ts`.
- Verifying that plugin-local config under `.opencode/plugins/**` is covered while plugin-adjacent trusted artifacts outside that tree remain denied.
- Freezing the first-version permission-selection behavior: use `opencode.json` in normal sessions, use `opencode.debug.json` only when trusted session debug state is active, and fail closed otherwise.

### Out

- Implementing the host-side permission engine or automatic profile switching machinery.
- Relaxing `.opencode/plugin-allowlist.json`, `opencode.json`, or secret-related deny rules during debug.
- Granting broad edit access to `.opencode/**` or other repository areas.
- Changing vault retrieval contracts, provenance rules, or network permission policy beyond clarifying that they are separate from the plugin-edit override.
- Introducing a second independent debug concept separate from the existing session-scoped debug state.
- Adding persistent audit logs or recovery automation for a broken debug-state manager.

---

# TDD Batches

## Batch 1: Freeze the normal-vs-debug permission contract

- Test: `opencode.json` restores and preserves the normal deny for `.opencode/plugins/**` while keeping the existing deny for `.opencode/plugin-allowlist.json`.
- Test: the step defines a separate tracked debug permission profile artifact at exact path `opencode.debug.json` rather than mutating the root permission file at session runtime.
- Test: the debug profile lifts edit denial only for `.opencode/plugins/**` and does not claim broader `.opencode/**` access.
- Test: the plan explicitly keeps `.opencode/plugin-allowlist.json`, `opencode.json`, and the debug-profile artifact protected even in debug.

## Batch 2: Freeze the session gate and fail-closed activation rule

- Test: the plan names `/debug` plus the tracked session debug flag as the only supported activation path for the plugin-edit override.
- Test: `.opencode/plugins/vault-query-router/index.ts` remains the referenced source of truth for session debug state rather than introducing an unrelated toggle.
- Test: the contract freezes one selection mechanism: trusted `state.debug === true` selects `opencode.debug.json`; every other state selects `opencode.json`.
- Test: the contract states that the override ends with the session and falls back to the normal permission profile whenever debug state cannot be proven.
- Test: debug documentation describes the plugin-edit exception as session-scoped and explicit, not implicit.

## Batch 3: Align user-visible audit behavior across debug docs

- Test: `.opencode/commands/debug.md`, `.opencode/rules/debug-mode.md`, and summary routing docs describe the same plugin-edit exception and do not conflict on scope or activation.
- Test: the docs keep the existing visible debug-session labeling behavior and make clear that the permission exception is part of that debug session context.
- Test: the docs distinguish plugin-edit override behavior from unrelated debug exceptions such as network-search permission.
- Test: no document claims that normal sessions gain plugin edit permission, and first-version audit scope is clearly limited to visible labeling plus tracked profile artifacts.

## Batch 4: Preserve adjacent security boundaries

- Test: secret-related bash denies and `**/secrets/**` read denies remain unchanged by this step.
- Test: the plan makes clear that `.opencode/plugin-allowlist.json` stays outside the debug edit override because it is part of the trusted enforcement boundary.
- Test: plugin-local config files inside `.opencode/plugins/**` are in scope, but plugin-adjacent repo-wide config is not.
- Test: the final contract stays compatible with the archived secure-plugin-access boundary that originally froze the plugin edit deny.

## Batch 5: Verify permission selection behavior

- Test: in a normal session, permission evaluation uses `opencode.json` and keeps `.opencode/plugins/**` denied.
- Test: in a debug session where trusted session state sets `state.debug === true`, permission evaluation uses `opencode.debug.json` and allows edits only under `.opencode/plugins/**`.
- Test: if trusted session state is missing, unreadable, or ambiguous, permission evaluation fails closed to `opencode.json`.
- Test: when the session ends, the debug override no longer applies because permission evaluation no longer sees an active debug session.

---

## Files

- `opencode.json` - normal-session permission boundary that must restore and keep the plugin edit deny
- `opencode.debug.json` - tracked debug-only permission profile artifact at repository root, created after the root baseline deny is restored
- `.opencode/commands/debug.md` - debug activation contract and session labeling
- `.opencode/rules/debug-mode.md` - canonical debug-mode behavior and fail-closed guardrails
- `docs/routing-flows.md` - summary routing documentation for debug behavior
- `.opencode/plugins/vault-query-router/index.ts` - existing source of truth for session-scoped debug state
- `.planning/archive/misc/01-word-template-generation-and-filling/08-secure-plugin-access/step.md` - archived source that froze the original plugin edit deny boundary

## Symbols

- `permission.edit`
- `state.debug === true`
- `.opencode/plugins/**`
- `.opencode/plugin-allowlist.json`
- `/debug`
- `state.debug`
- `pendingDebugCommand`
- `command.executed`

## Execution constraints

- Keep the implementation contract documentation-first and permission-contract-focused.
- Prefer one explicit tracked debug profile artifact over scattered per-file exceptions.
- Keep the override narrow enough that later coding and review can verify it by file pattern alone.
- Preserve the current debug session model instead of introducing a second state machine.
- Restore the normal baseline deny before describing the debug exception that overrides it.

## Invariants

- Normal sessions keep the hard plugin edit deny.
- Debug mode remains session-scoped.
- Plugin editing in debug is explicit and auditable, not a silent side effect.
- Trusted security-boundary files outside `.opencode/plugins/**` remain protected.
- Existing non-permission debug guardrails such as schema discipline and provenance labeling remain intact.

## Deferred follow-up

- Host-side automatic profile selection or permission-engine support for the debug profile.
- Expanded debug edit scopes beyond `.opencode/plugins/**` if future requirements justify them.
- Persistent audit logging beyond visible session labeling.
