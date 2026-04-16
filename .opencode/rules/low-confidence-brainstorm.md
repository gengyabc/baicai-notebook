# Low Confidence Brainstorm

Auto-invoke brainstorm when query returns confidence below threshold.

## Trigger

This rule activates whenever `query-on-interaction` returns a vault answer with confidence < 0.7.

## Guard

If debug mode is active for this session (see `debug-mode` rule), skip this rule entirely.

## Behavior

1. Load the `brainstorm-distill` skill.
2. Move the question into `brainstorm/todo/` or `brainstorm/active/` as appropriate.
3. Cluster related ideas and identify knowledge gaps.
4. Mark promotion candidates without promoting to `wiki/`.

## Threshold

Confidence < 0.7 on a vault answer triggers automatic brainstorm invocation.
