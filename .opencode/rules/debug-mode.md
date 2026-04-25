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

## Guard Pattern

All vault automation and write-triggering rules should check:

> If debug mode is active for this session, skip this rule.

The `/debug` command itself should also bypass the retrieval hook so debug state is established before any automatic vault lookup runs.

The host should track session state and respect this flag.
