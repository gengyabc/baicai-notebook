# Personal Knowledge Vault

OpenCode-driven personal knowledge system for ingesting sources, querying grounded knowledge, and promoting stable notes into `wiki/` with provenance.

## Purpose

- Keep repository instructions short and routing-oriented in `AGENTS.md`.
- Keep human-facing project overview and maintenance commands in this `README.md`.
- Treat the repository as the system of record for durable knowledge and agent behavior.

## Run Services

From the repository root:

- `npm --prefix .opencode run frontmatter:watch`: watch vault files and update frontmatter continuously
- `npm --prefix .opencode run frontmatter:scan`: run a one-time scan across the vault
- `npm --prefix .opencode run frontmatter:backfill`: backfill missing frontmatter fields in batch
- `npm --prefix .opencode run frontmatter:scan-pending`: scan pending resource notes

## Operating Model

The repository uses this stack:

`Command -> Workflow -> Skill -> Rules`

- Commands are user-facing entry points.
- Workflows orchestrate multi-step behavior.
- Skills provide focused capabilities.
- Rules define reusable constraints and policies.

`AGENTS.md` is the entry map for the agent. Detailed behavior lives under `.opencode/` and should be loaded lazily.

## Vault Layers

- `my-work/` and `My-work/`: active intent, drafts, decisions, and project thinking
- `resources/` and `Resources/`: captured sources and supporting evidence
- `brainstorm/`: speculative notes in `todo/` and `active/`
- `wiki/`: stable knowledge, maintained index-first
- `output/`: deliverables, maintained index-first
- `docs/plans/`: dated plans and requirements
- `.opencode/`: commands, workflows, skills, and rules

Treat uppercase and lowercase folder variants as aliases until the repository is normalized.

## Common OpenCode Commands

Run these inside OpenCode sessions:

- `/ingest <path-or-url>`: ingest a local note, file, URL, or session artifact
- `/solidify <topic-or-note>`: promote grounded knowledge into `wiki/`
- `/lint-vault`: audit metadata, indexes, and vault hygiene
- `/process-pending`: process notes with pending LLM descriptions
- `/debug`: start a read-only sandbox session for vault behavior

## Retrieval And Promotion

- In normal sessions, every user message should query the vault first.
- The only bypass is a session started with `/debug` command.
- Vault Q&A starts from `wiki/index.md`, then relevant `wiki/` pages, then `resources/` for evidence.
- `brainstorm/` is for tentative synthesis, not stable facts.
- `my-work/` is for current context and user intent.
- Promotion into `wiki/` goes through the `solidify` workflow; unresolved speculation stays out of stable memory.

## Key Files

- `AGENTS.md`: agent entry map and routing policy
- `.opencode/workflows/query-vault.md`: vault query workflow
- `.opencode/workflows/ingest-resources.md`: external source ingest workflow
- `.opencode/workflows/solidify-to-wiki.md`: promotion workflow into `wiki/`
- `wiki/index.md`: primary wiki discovery entry
- `output/index.md`: primary deliverable discovery entry

## Notes

- `/debug` sessions disable vault automation strategies and block writes to `wiki/`, `resources/`, and `brainstorm/`.
- Keep provenance, local links, `image_key`, and attachment locality intact when editing vault notes.
