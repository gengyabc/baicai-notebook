# Personal Knowledge Vault

This repository is an OpenCode-driven personal knowledge system.

## Operating model

Use this stack consistently:

`Command -> Workflow -> Skill / Subagent -> Rules`

Responsibilities:

- Commands interpret user intent, validate arguments, and route to the right workflow.
- Workflows orchestrate multi-step work, decide where notes belong, and manage outputs.
- Skills perform one atomic capability and should not own flow control.
- Subagents handle selective deep reasoning, evidence review, clustering, or promotion work.
- Rules enforce global constraints, metadata, promotion discipline, and answer quality.

## Folder roles

Canonical target layout:

- `my-work/`: active notes, drafts, decisions, meetings, project thinking
- `resources/`: external sources, stubs, captured webpages, Zotero notes, local-file references
- `brainstorm/`: speculative, partial, exploratory, or contradictory idea space
- `wiki/`: durable, curated, linked knowledge
- `output/`: deliverables
- `.opencode/`: project-local agent system

Current repository compatibility:

- `My-work/` should be treated as `my-work/`
- `Resources/` should be treated as `resources/`

Preserve existing capitalization in the live repo unless the user explicitly asks for a folder migration.

## Priority and confidence

When evidence conflicts or is incomplete, prefer this order:

1. User intent and active context from `my-work/` or `My-work/`
2. Source evidence from `resources/` or `Resources/`
3. Speculation and candidate synthesis in `brainstorm/`
4. Stable claims in `wiki/`

Do not present `brainstorm/` content as settled knowledge unless confidence and provenance are made explicit.

## Promotion pipeline

Default movement is:

`my-work/resources -> brainstorm -> wiki -> output`

Not everything should be promoted. Many ideas should remain in `brainstorm/` permanently.

## Hard rules

- Every important external source should have a Markdown note in `resources/`.
- Bare links are not knowledge; retain title, provenance, and why it matters.
- Prefer updating an existing wiki page over creating a duplicate.
- Never write speculative claims into `wiki/` without provenance and uncertainty handling.
- Treat `wiki/` as stable memory, not a scratchpad.
- Treat `brainstorm/` as editable and iterative; Git history is valuable there.
- Preserve links to local files and Zotero items in source notes.
- If `wiki/log.md` exists, append meaningful structural changes to it.

## Edit policy by folder

- `my-work/` or `My-work/`: suggest heavily, edit lightly, preserve authorship and voice
- `resources/` or `Resources/`: create or normalize stubs, summaries, provenance, and links
- `brainstorm/`: edit freely for clustering, synthesis, and exploration
- `wiki/`: edit carefully, preserve stability, remove duplication, tighten claims
- `output/`: generate task-specific deliverables freely

## Metadata

Use YAML frontmatter for durable notes. Full schemas are loaded from `.opencode/rules/metadata-conventions.md` via `opencode.json`.

## Modular instruction loading

Project rules are loaded globally through `opencode.json`.

When executing a vault task, read the relevant workflow file from `.opencode/workflows/` and follow it directly. Use skills for atomic work and subagents only when the task benefits from deeper parallel or specialized reasoning.
