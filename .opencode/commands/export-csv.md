---
description: Export placeholder descriptions as CSV for manual editing
argument-hint: "[edit]"
model: bailian-coding-plan/glm-5
---

Export placeholder descriptions from the current task's canonical placeholder JSON.

**Flag:** `$1`, 
- if `edit`, go to **Edit mode**: Rebuild placeholders from current `output-v{N}/template.docx` and overwrite `temp-v{N}/placeholders.json`, then export CSV
- If not, go to **Default mode**: Export CSV from existing `temp-v{N}/placeholders.json`

## Steps:
- Choose **Default mode** or **Edit mode** and run
- Add description

### Default mode

```bash
uv run python -m template_gen.export_placeholder_csv
```

- Source: current task `temp-v{N}/placeholders.json`
- Output: current task `output-v{N}/descriptions.csv`
- CSV contract remains minimal: `placeholder,description`

### Edit mode (template changed)

```bash
uv run python -m template_gen.export_placeholder_csv --edit
```

- Source of truth switches to current `output-v{N}/template.docx`
- Command rebuilds and overwrites current `temp-v{N}/placeholders.json`
- Then it exports and overwrites current `output-v{N}/descriptions.csv`
- If template is missing or has no supported placeholder structures, command fails explicitly

### Add description
- After export, the LLM reads `temp-v{N}/placeholders.json` and fills each `description` cell with a short semantic description based on the placeholder's `context` and `field_path`
- The descrition must be quoted to make sure the commas inside the descrition will do no harm
- MUST use Chinese for the descriptions

## Explicit paths

```bash
uv run python -m template_gen.export_placeholder_csv --input <placeholders.json> --output <descriptions.csv> --edit --template <template.docx>
```

- `--template` is required when `--edit` is used