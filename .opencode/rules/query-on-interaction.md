# Query on Interaction

Default routing strategy for invoking vault query behavior on every user interaction.

## Trigger

Evaluate each user message and run vault query behavior by default.

## Guard

If debug mode is active for this session, skip this routing entirely.

## Behavior

1. Unless debug mode is active, read `.opencode/workflows/query-vault.md` for every user message.
2. Let the workflow load the relevant skill and rules.
3. Return confidence-labeled answers with provenance.
4. If the vault does not contain relevant grounding, say so explicitly before falling back to general knowledge.

## Confidence threshold

If the query workflow returns confidence < 0.7, follow the low-confidence brainstorm routing.
