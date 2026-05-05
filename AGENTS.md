# Personal Knowledge Vault

## Loading policy

- Do not preemptively load all files under `.opencode/`.
- Read workflows, skills, and rules lazily based on the current task.
- Prefer progressive disclosure: start from this file, then load the smallest relevant next document.
- Do not assume files in `.opencode/rules/` auto-execute just because they exist. Follow the routing described here.


## Session guard

- If debug mode is active for this session, skip vault automation strategies and do not write to `workbook/wiki/`, `workbook/resources/`, or `workbook/brainstorm/`.
- `/debug` activates this session-scoped sandbox mode; detailed behavior lives in `.opencode/commands/debug.md` and `.opencode/rules/debug-mode.md`.

## Vault configuration

The vault root folder is defined in `.opencode/vault-config.json` (see `vaultRoot` field).

**CRITICAL: Vault Delete Protection is enforced by plugin.** Never delete files in the vault. See `.opencode/rules/vault-delete-protection.md` for details.

When folder names are referenced in documentation and workflows, they should be prefixed with the vault root.


## Folder roles

- `workbook/my-work/`: active intent, drafts, decisions, meetings, and project thinking (index-first)
- `workbook/resources/`: captured sources, evidence, and local-file references; SQLite-indexed, no index.md needed
- `workbook/resources/inbox/`: buffer queue for incoming material before classification (SQLite-indexed, LLM-managed)
- `workbook/brainstorm/`: speculative material; `todo/` and `active/` stay lightweight and human-managed by default, while `brainstorm/managed/` is the explicit opt-in area for LLM-managed brainstorm notes (SQLite-indexed, no index.md needed)
- `workbook/wiki/`: stable knowledge, curated and index-first
- `workbook/output/`: deliverables, index-first
- `docs/plans/`: development requirements and plans, organized by date-prefixed folders
- `.opencode/`: project-local agent system

## Default routing

- For vault questions, read `.opencode/workflows/query-vault.md`.
- For ingesting sources into the vault, read `.opencode/workflows/ingest-resources.md`.
- For promoting grounded knowledge into `workbook/wiki/`, read `.opencode/workflows/solidify-to-wiki.md`.
- For vault linting or hygiene work, read `.opencode/workflows/lint-vault.md`.
- For personal information needed in notes or forms, read `.opencode/skills/env-registry/SKILL.md`.
- For vault delete protection rules, read `.opencode/rules/vault-delete-protection.md`.

## Vault query policy

- On each user message, run vault retrieval by default.
- The only exception is when debug mode is active for this session.
- For non-debug sessions, always follow the query workflow before answering, even for short or ambiguous prompts.
- Treat `.opencode/docs/sqlite-retrieval-contract.md` as the canonical schema and retrieval contract for `.opencode/frontmatter-index.sqlite`.

**MANDATORY PRE-READS before any vault query**:
1. Read `.opencode/workflows/query-vault.md` to understand the retrieval decision chain
2. Read governance artifacts before calling `vault_index_search`:
   - `.opencode/canonical-tags.json` - legal source for canonical tag values
   - `.opencode/tag-aliases.json` - maps aliases like "培训" to canonical "topic/training"
   - `.opencode/location-aliases.json` - maps location aliases to canonical values
3. Perform Stage 0 constraint extraction and normalization BEFORE the tool call
4. Output structured query summary in commentary before calling `vault_index_search`
5. Pass only normalized constraint values to `vault_index_search`, NOT raw user text

- Query order is: SQLite shortlist first, then read `workbook/wiki/index.md`, prefer relevant `workbook/wiki/` pages, then pull supporting evidence from `workbook/resources/`, then use `workbook/brainstorm/` only for tentative synthesis, and use `workbook/my-work/` only for current context and active intent.
- When the answer is not fully grounded, state confidence and separate confirmed facts from working hypotheses.
- In non-debug sessions, do not use network search without user permission. If local retrieval is insufficient and external search would help, ask first.

## Canonical references

- Primary discovery: `workbook/wiki/index.md`, `workbook/output/index.md`
- Structural log: `workbook/wiki/log.md` when present
- LLM-managed zones (`resources/`, `brainstorm/managed/`): SQLite-indexed, no index.md

Keep provenance, local links, `imageNameKey`, and attachment locality intact.

## Tool requirements

This project uses the following toolchain:

- **Python**: Use `uv` for all Python package management (install, run, sync, etc.)
- **JavaScript/TypeScript**: Use `bun` for all JS/TS package management and runtime

When working with Python dependencies, prefer `uv` commands over `pip`. When working with JS/TS dependencies, prefer `bun` commands over `npm` or `yarn`.

## Approach
- Read existing files before writing. Don't re-read unless changed.
- Thorough in reasoning, concise in output.
- Skip files over 100KB unless required.
- No sycophantic openers or closing fluff.
- No emojis or em-dashes.
- Do not guess APIs, versions, flags, commit SHAs, or package names. Verify by reading code or docs before asserting.
- Always follow @.opencode/rules/baicai-vibe/token-efficient-workflow.md unless user asks otherwise.
