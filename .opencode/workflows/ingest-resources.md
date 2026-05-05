# Workflow: Ingest Resources

## Goal

Convert external material into durable Markdown resources and connect them to the vault with safe storage guardrails.

## Inputs

- URLs, local files, Zotero items, PDFs, transcripts, or resource notes

## Steps

1. Determine the source type: web, pdf, zotero, local-file, note, or transcript.
2. Check whether a matching resource note already exists.
3. Create or update a Markdown resource note with provenance, summary, links, and `imageNameKey`.
4. Normalize metadata using the resource schema.
5. Write the resource note to `workbook/resources/inbox/` as a buffer queue.
6. Use `second-brain-ingest` to classify and route the content to its final destination:
   - `workbook/resources/` for confirmed evidence and sources
   - `workbook/brainstorm/` for speculative synthesis
   - `workbook/wiki/` for grounded knowledge (via solidify)
   - `workbook/my-work/` for active project context
7. Organize `workbook/resources/` incrementally when useful, but do not delete captured files, rename original files, or perform large tree-wide restructures.
8. Link the resource to relevant brainstorm, wiki, or project notes.
9. If the ingest promotes grounded material into `workbook/wiki/`, update `workbook/wiki/index.md` with Obsidian bidirectional links for the affected wiki notes.

## Skills

- load `web-to-resource` for URL capture or web-note normalization
- load `second-brain-ingest` for evidence routing

## Outputs

- new or improved resource note
- updated links into the knowledge graph
- optional brainstorm follow-on notes or solidify candidates
