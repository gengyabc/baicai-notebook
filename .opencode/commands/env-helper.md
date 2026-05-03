---
description: Manage sensitive data entries (add/remove/query/update sensitive data)
model: bailian-coding-plan/glm-5
---
Manage sensitive data: `$ARGUMENTS`

## Shared Approval Contract

- This command is a consumer of the shared sensitive-command approval policy.
- OpenCode permissions remain the enforcement boundary for command execution.
- This command only provides user-facing context and local fallback guidance.

## Steps
1. Explain the risk and ask for explicit user consent before any sensitive operation.
2. If user approves, continue under OpenCode permission checks.
3. If approval is denied, stop and provide a local-only fallback path so the user can finish outside model access.
