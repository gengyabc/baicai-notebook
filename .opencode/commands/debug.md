---
description: Enter sandbox mode for read-only vault behavior
model: bailian-coding-plan/glm-5
---
Enter debug/sandbox mode for this session. Topic: `$ARGUMENTS`

When active:
- Vault automation strategies are suspended
- No content will be written to wiki/, resources/, brainstorm/
- Low-confidence-brainstorm, post-*-solidify rules are disabled
- Session is read-only for vault operations
- SQLite vault retrieval (vault_index_search) works normally

Use this for debugging system behavior or casual conversation that should not be captured.

If a topic argument is provided, include it in your first response as a session label so the user (and session history) can identify this debug session at a glance. Example: `[debug: python-async]`

To exit: start a new session (mode is session-scoped).
