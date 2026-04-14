# Query on Interaction

Execute the query workflow on every user interaction.

## Trigger

This rule activates on every user message, but should exit early unless the message is likely to depend on vault context.

## Behavior

1. Load the `second-brain-query` skill.
2. If the message is unrelated to vault content, skip the query workflow.
3. Read `wiki/index.md` first for vault structure.
4. Search relevant folders based on query type.
5. Return confidence-labeled answers with provenance.

## Confidence threshold

If the query returns confidence < 0.7, trigger the `low-confidence-brainstorm` rule automatically.
