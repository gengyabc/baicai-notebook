---
step-key: debug-permission-profile-and-plugin-gate
step-number: 6
step-folder: 06-debug-permission-profile-and-plugin-gate
phase-topic: enhance-info-retrieval
status: discovered
requirement-version: 1
updated-at: 2026-04-30
source: discover-requirements
supersedes: null
---

## Restated Request

Define a debug-mode permission/profile mechanism that can bypass the default `.opencode/plugins/**` edit deny rule while keeping the normal hard boundary intact outside debug sessions.

## Real Objective

Make debug mode a controlled escape hatch for plugin-level work without weakening the default safety boundary for normal sessions.

## Problem Statement

The current static permission rules are strong, but they are not session-aware. If plugin files are denied at the config level, debug mode needs a deliberate override path or a separate debug profile so the assistant can work on plugin/runtime behavior when explicitly authorized.

## In Scope

- Define how debug mode changes permission behavior for plugin-level files
- Specify whether the override is profile-based, session-gated, or both
- Preserve the default deny rule for `.opencode/plugins/**` outside debug sessions
- Keep other sensitive denies intact unless explicitly required by debug scope
- Require the override to be auditable and session-scoped
- Ensure debug bypass does not silently apply to normal sessions

## Out of Scope

- Implementing the actual permission engine or profile switch in code
- Relaxing unrelated secret or credential protections
- Changing retrieval behavior unrelated to plugin edit permissions
- Removing the default deny rule outside debug

## Constraints

- Debug mode must remain session-scoped
- The default safety posture must remain strict outside debug
- Any bypass must be explicit, not implicit
- The solution must be compatible with the existing plugin runtime and permission system
- The permission override must not depend on model memory alone

## Assumptions

- A separate debug profile or runtime gate is more maintainable than ad hoc exceptions
- The override is needed primarily for plugin edits and related runtime work
- The existing deny rules should remain the default for normal sessions

## Open Questions

- Should the debug override apply only to `.opencode/plugins/**` edits, or also to related config files?
- Should the override be implemented as a separate OpenCode profile or a runtime session gate?
- Should debug bypass be visible in session metadata or only enforced internally?

## Success Criteria

1. The requirement defines a debug-mode override path for plugin-level file access.
2. The requirement preserves the default deny boundary outside debug.
3. The requirement keeps the override session-scoped and auditable.
4. The requirement avoids weakening unrelated security controls.
5. The requirement is planning-ready without implementation detail.

## Suggested Planning Focus

First decide whether the override is profile-based or runtime-gated, then define the exact file scopes and audit behavior so debug can bypass plugin denial safely.
