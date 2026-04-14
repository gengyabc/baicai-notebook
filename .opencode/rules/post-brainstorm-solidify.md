# Post Brainstorm Solidify

Trigger solidify workflow after brainstorm distillation produces promotion-ready material.

## Trigger

This rule is a post-workflow policy. The host should evaluate it when:
- The `distill-brainstorm` workflow completes successfully
- The distilled material meets the promotion policy criteria

## Behavior

1. Review the distilled brainstorm notes for promotion candidates.
2. If grounded claims are identified, load the `solidify-to-wiki` skill.
3. Promote only grounded claims to `wiki/`.
4. Update `wiki/index.md` with Obsidian bidirectional links.
5. Retain speculative material in `brainstorm/` with explicit backlinks.

## Condition

Only trigger when brainstorm distillation produces content that passes the promotion test.
