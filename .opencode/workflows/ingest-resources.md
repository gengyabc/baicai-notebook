# Workflow: Ingest Resources

## Goal

Convert external material into durable Markdown resources and connect them to the vault with safe storage guardrails.

## Inputs

- URLs, local files, Zotero items, PDFs, transcripts, or resource notes

## Steps

1. Determine the source type: web, pdf, zotero, local-file, note, or transcript.
2. Check whether a matching resource note already exists.
3. Create or update a Markdown resource note with provenance, summary, links, and `image_key`.
4. Normalize metadata using the resource schema.
5. Organize `resources/` incrementally when useful, but do not delete captured files, rename original files, or perform large tree-wide restructures.
6. Link the resource to relevant brainstorm, wiki, or project notes.
7. Send derived synthesis to `brainstorm/` by default.
8. If the source strongly supports stable knowledge, hand the grounded part to `solidify` instead of writing `wiki/` directly.
9. If the ingest promotes grounded material into `wiki/`, update `wiki/index.md` with Obsidian bidirectional links for the affected wiki notes.

## Skills

- load `web-to-resource` for URL capture or web-note normalization
- load `second-brain-ingest` for evidence routing

## Outputs

- new or improved resource note
- updated links into the knowledge graph
- optional brainstorm follow-on notes or solidify candidates
