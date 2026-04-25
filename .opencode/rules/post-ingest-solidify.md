# Post Ingest Solidify

Trigger solidify workflow after successful resource or my-work ingest.

## Trigger

This rule is a post-workflow policy. The host should evaluate it when:
- The `ingest-resources` workflow completes successfully with grounded material
- The `ingest-my-work` workflow completes successfully with grounded material

## Guard

If debug mode is active for this session (see `debug-mode` rule), skip this rule entirely.

## Behavior

1. Check if the ingested material meets the promotion policy criteria.
2. If yes, load the `solidify-to-wiki` skill.
3. Promote only grounded claims to `workbook/wiki/`.
4. Update `workbook/wiki/index.md` with Obsidian bidirectional links.
5. Preserve speculative material in `workbook/brainstorm/`.

## Condition

Only trigger when the ingest produces clearly grounded content with sufficient provenance.
