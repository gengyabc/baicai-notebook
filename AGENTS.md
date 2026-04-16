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

- If debug mode is active for this session, skip vault automation strategies and do not write to `wiki/`, `resources/`, or `brainstorm/`.
- `/debug` activates this session-scoped sandbox mode; detailed behavior lives in `.opencode/commands/debug.md` and `.opencode/rules/debug-mode.md`.

## Folder roles

- `my-work/` and `My-work/`: active intent, drafts, decisions, meetings, and project thinking
- `resources/` and `Resources/`: captured sources, evidence, and local-file references; keep changes incremental
- `brainstorm/`: speculative material only, kept in `todo/` and `active/`
- `wiki/`: stable knowledge, curated and index-first
- `output/`: deliverables, kept index-first
- `docs/plans/`: development requirements and plans, organized by date-prefixed folders
- `.opencode/`: project-local agent system

Treat uppercase and lowercase folder variants as aliases until the repository is normalized.

## Default routing

- For vault questions, read `.opencode/workflows/query-vault.md`.
- For ingesting sources into the vault, read `.opencode/workflows/ingest-resources.md`.
- For promoting grounded knowledge into `wiki/`, read `.opencode/workflows/solidify-to-wiki.md`.
- For vault linting or hygiene work, read `.opencode/workflows/lint-vault.md`.

## Vault query policy

- On each user message, run vault retrieval by default.
- The only exception is when debug mode is active for this session.
- For non-debug sessions, always follow the query workflow before answering, even for short or ambiguous prompts.
- Query order is: read `wiki/index.md` first, prefer relevant `wiki/` pages, then pull supporting evidence from `resources/`, then use `brainstorm/` only for tentative synthesis, and use `my-work/` only for current context and active intent.
- When the answer is not fully grounded, state confidence and separate confirmed facts from working hypotheses.

## Canonical references

- Primary discovery: `wiki/index.md`, `output/index.md`
- Structural log: `wiki/log.md` when present

Keep provenance, local links, `image_key`, and attachment locality intact.
