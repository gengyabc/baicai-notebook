# Personal Knowledge Vault

## Loading policy

- Do not preemptively load all files under `.opencode/`.
- Read workflows, skills, and rules lazily based on the current task.
- Prefer progressive disclosure: start from this file, then load the smallest relevant next document.
- Do not assume files in `.opencode/rules/` auto-execute just because they exist. Follow the routing described here.

## Operating model

Use this stack consistently:

`Command -> Workflow -> Skill -> Rules`

- Commands dispatch user intent into workflows.
- Workflows orchestrate multi-step behavior.
- Skills provide focused capabilities.
- Rules define reusable constraints and policies.

## Session guard

- If debug mode is active for this session, skip vault automation strategies and do not write to `workbook/wiki/`, `workbook/resources/`, or `workbook/brainstorm/`.
- `/debug` activates this session-scoped sandbox mode; detailed behavior lives in `.opencode/commands/debug.md` and `.opencode/rules/debug-mode.md`.

## Vault configuration

The vault root folder is defined in `.opencode/vault-config.json`. Current setting: `workbook/`.

When folder names are referenced in documentation and workflows, they should be prefixed with the vault root (e.g., `workbook/wiki/`).

To rename the vault root folder, run:
```bash
node .opencode/scripts/migrate-vault-path.mjs <oldRoot> <newRoot>
```

## Folder roles

- `workbook/my-work/`: active intent, drafts, decisions, meetings, and project thinking
- `workbook/resources/`: captured sources, evidence, and local-file references; keep changes incremental
- `workbook/brainstorm/`: speculative material; `todo/` and `active/` stay lightweight and human-managed by default, while `brainstorm/managed/` is the explicit opt-in area for LLM-managed brainstorm notes
- `workbook/wiki/`: stable knowledge, curated and index-first
- `workbook/output/`: deliverables, kept index-first
- `docs/plans/`: development requirements and plans, organized by date-prefixed folders
- `.opencode/`: project-local agent system

## Default routing

- For vault questions, read `.opencode/workflows/query-vault.md`.
- For ingesting sources into the vault, read `.opencode/workflows/ingest-resources.md`.
- For promoting grounded knowledge into `workbook/wiki/`, read `.opencode/workflows/solidify-to-wiki.md`.
- For vault linting or hygiene work, read `.opencode/workflows/lint-vault.md`.

## Vault query policy

- On each user message, run vault retrieval by default.
- The only exception is when debug mode is active for this session.
- For non-debug sessions, always follow the query workflow before answering, even for short or ambiguous prompts.
- Query order is: read `workbook/wiki/index.md` first, prefer relevant `workbook/wiki/` pages, then pull supporting evidence from `workbook/resources/`, then use `workbook/brainstorm/` only for tentative synthesis, and use `workbook/my-work/` only for current context and active intent.
- When the answer is not fully grounded, state confidence and separate confirmed facts from working hypotheses.

## Canonical references

- Primary discovery: `workbook/wiki/index.md`, `workbook/output/index.md`
- Structural log: `workbook/wiki/log.md` when present

Keep provenance, local links, `image_key`, and attachment locality intact.

## Tool requirements

This project uses the following toolchain:

- **Python**: Use `uv` for all Python package management (install, run, sync, etc.)
- **JavaScript/TypeScript**: Use `bun` for all JS/TS package management and runtime

When working with Python dependencies, prefer `uv` commands over `pip`. When working with JS/TS dependencies, prefer `bun` commands over `npm` or `yarn`.
