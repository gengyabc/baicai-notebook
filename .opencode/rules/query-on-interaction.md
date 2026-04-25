# Query on Interaction

Default routing strategy for invoking vault query behavior on every user interaction.

## Trigger

Evaluate each user message and run vault query behavior by default.

## Guard

If debug mode is active for this session, skip this routing entirely.

## Behavior

1. Unless debug mode is active, run the query-vault retrieval hook for every user message.
2. The hook must call `vault_index_search` first to query `.opencode/frontmatter-index.sqlite` and produce a ranked shortlist.
3. Read shortlisted files before reading any other vault files.
4. Preserve folder priority in the shortlist as `workbook/wiki -> workbook/output -> workbook/resources -> workbook/brainstorm -> workbook/my-work`.
5. Soft fallback is allowed: if shortlisted files are empty or clearly insufficient, retrieval may expand beyond the shortlist, but that expansion should be stated explicitly.
6. Let the workflow load the relevant skill and rules.
7. Return confidence-labeled answers with provenance.
8. If the vault does not contain relevant grounding, say so explicitly before falling back to general knowledge.

## Debug Command Guard

The `/debug` command itself must bypass the retrieval hook so the session-scoped debug flag can be set before later messages are evaluated.

## Confidence threshold

If the query workflow returns confidence < 0.7, follow the low-confidence brainstorm routing.
