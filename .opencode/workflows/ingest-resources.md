# Workflow: Ingest Resources

## Goal

Convert external material into durable Markdown resources and connect them to the vault.

## Inputs

- URLs, local files, Zotero items, PDFs, transcripts, or resource notes

## Steps

1. Determine the source type: web, pdf, zotero, local-file, note, or transcript.
2. Check whether a matching resource note already exists.
3. Create or update a Markdown resource note with provenance, summary, and links.
4. Normalize metadata using the resource schema.
5. Link the resource to relevant brainstorm, wiki, or project notes.
6. If the source suggests uncertain synthesis, send that synthesis to `brainstorm/`, not `wiki/`.
7. If the source directly strengthens a stable wiki note, update that note with explicit provenance.

## Skills

- load `web-to-resource` for URL capture or web-note normalization
- load `second-brain-ingest` for evidence routing

## Subagents

- use `vault-researcher` when multiple sources must be compared or summarized
- use `wiki-curator` when source evidence supports a durable wiki update

## Outputs

- new or improved resource note
- updated links into the knowledge graph
- optional brainstorm or wiki follow-on updates
