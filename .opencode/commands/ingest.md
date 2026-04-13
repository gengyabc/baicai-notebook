---
description: Ingest notes or sources into the vault
agent: vault-orchestrator
subtask: true
---
Ingest the target scope into the knowledge vault.

Arguments: `$ARGUMENTS`

Routing rules:

- If the target is in `my-work/` or `My-work/`, follow @.opencode/workflows/ingest-my-work.md.
- If the target is in `resources/` or `Resources/`, or is a URL, local file, Zotero item, PDF, or transcript, follow @.opencode/workflows/ingest-resources.md.
- If no scope is given, inspect recent context and choose the smallest reasonable ingest scope.

Use the loaded project rules and the relevant skills. Delegate to subagents only when the task benefits from specialized reasoning.
