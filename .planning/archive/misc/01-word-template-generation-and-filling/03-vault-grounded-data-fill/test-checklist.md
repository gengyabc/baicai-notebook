# Test Checklist

## Plan Reference

- @.planning/phase/03-vault-grounded-data-fill/requirement.md
- @.planning/phase/03-vault-grounded-data-fill/step.md

## Chosen Mode

lower-level only

## Why

- `feature.feature` is not present in this step folder, so browser E2E is not required.
- The step focuses on input/output contract, vault root config resolution, and CLI boundary behavior.

## Lower-Level Coverage

- Load and validate only the step-02 placeholder description JSON shape: `placeholders[].placeholder` and `placeholders[].description`.
- Resolve vault root from `.opencode/vault-config.json` and reject hard-coded vault path assumptions.
- Normalize Jinja placeholders such as `{{ project_name }}` to downstream fill keys like `project_name`, with explicit error for invalid format.
- Generate a fill-data JSON artifact that is a flat object keyed by normalized placeholder names and can be loaded directly by `template_gen.fill_runner`.
- Ensure the generate-data CLI writes only data JSON output and does not require DOCX template/output arguments.

## Browser E2E Coverage

- none required

## Refresh Triggers

- Refresh when `requirement-version` or `step-version` changes, or when `delta.md` is added/updated.
- Refresh when value-resolution policy is frozen in discovery, because that changes required assertions and failure behavior.
- Refresh when requirements/quality review findings indicate missing contract checks or wrong-layer test placement.
