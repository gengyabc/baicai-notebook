# Periodic Lint

Execute vault lint on a daily schedule to maintain vault health.

## Trigger

This rule activates on a daily maintenance schedule provided by the host.

## Behavior

1. Load the `second-brain-lint` skill.
2. Check frontmatter coverage and schema fit for all vault folders.
3. Flag missing `image_key` fields.
4. Identify orphan notes, duplicates, and weakly linked pages.
5. Check index coverage in `workbook/wiki/index.md` and `workbook/output/index.md`.
6. Flag promotion candidates from `workbook/brainstorm/`.
7. Report findings in severity order.

## Schedule

Daily execution, if the host provides scheduling support.

## Outputs

- Prioritized findings
- Promotion candidates
- Cleanup suggestions
