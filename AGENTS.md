# Personal Knowledge Vault

This repository is an OpenCode-driven personal knowledge system.

## Operating model

Use this stack consistently:

`Command -> Workflow -> Skill / Subagent -> Rules`

Responsibilities:

- Commands dispatch user intent into the right workflow.
- Workflows own multi-step orchestration and output shape.
- Skills provide reusable narrow capability.
- Subagents handle deep reasoning, evidence review, clustering, or promotion work.
- Rules hold reusable constraints, schemas, and confidence policy.

## Folder roles

Canonical target layout:

- `my-work/` and `My-work/`: active intent, drafts, decisions, meetings, and project thinking
- `resources/` and `Resources/`: captured sources, evidence, and local-file references; keep changes incremental
- `brainstorm/`: speculative material only, kept in `todo/` and `active/`
- `wiki/`: stable knowledge, curated and index-first
- `output/`: deliverables, kept index-first
- `.opencode/`: project-local agent system

Treat uppercase and lowercase folder variants as aliases until the repository is normalized.

## Canonical references

- Entry commands: `.opencode/commands/brainstorm.md`, `ingest.md`, `lint-vault.md`, `query.md`, `solidify.md`
- Workflows: `.opencode/workflows/distill-brainstorm.md`, `ingest-my-work.md`, `ingest-resources.md`, `lint-vault.md`, `query-vault.md`, `solidify-to-wiki.md`
- Reusable rules: `.opencode/rules/core-vault.md`, `edit-policy.md`, `metadata-conventions.md`, `promotion-policy.md`, `query-confidence.md`
- Skills: `.opencode/skills/web-to-resource/SKILL.md`, `second-brain-ingest/SKILL.md`, `second-brain-query/SKILL.md`, `second-brain-lint/SKILL.md`, `brainstorm-distill/SKILL.md`, `solidify-to-wiki/SKILL.md`
- Discovery surfaces: `wiki/index.md` and `output/index.md`
- Structural log: `wiki/log.md` when present

Keep provenance, local links, `image_key`, and attachment locality intact.
