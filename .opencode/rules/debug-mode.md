# Debug Mode

When debug mode is active, suspend vault automation strategies and all vault write operations.

## Scope

Session-scoped. Activated by the `/debug` command.

## Disabled Behaviors

When `debug` mode is active:
- Skip `low-confidence-brainstorm` rule
- Skip `post-ingest-solidify` rule
- Skip `post-brainstorm-solidify` rule
- Block all writes to `workbook/wiki/`, `workbook/resources/`, `workbook/brainstorm/`

## Allowed Behaviors

- Read from any vault folder
- Normal conversation
- Code analysis and other non-vault operations
- Network search (`websearch`, `webfetch`) without asking user permission first
- SQLite vault retrieval (vault_index_search) works normally

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
