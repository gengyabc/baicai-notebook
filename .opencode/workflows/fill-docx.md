# Workflow: Fill Docx

See `@.opencode/rules/template-gen-paths.md` for directory structure and file purposes.

## Goal

Convert edited placeholder CSV into the final filled DOCX by importing the CSV, querying the vault for data, generating fill data, and running the template filler.
All for current task

## Steps

### Step 1: Import CSV to JSON

```bash
uv run python -m template_gen.import_placeholder_csv
```

### Step 2: Generate Empty Fill Data Schema

```bash
uv run python -m template_gen.generate_fill_data
```

### Step 3: Query Sources for Fill Data

**This step must be performed by the LLM.**

Read the fill_data JSON to see the field structure and descriptions.

Then follow `@.opencode/workflows/query-vault.md` to query the vault (`workbook/`) for relevant data.

**Fill data rules:**
- Use real data from vault when found
- Leave empty string `""` if no data found (do not invent data)
- For arrays: populate with actual items from vault, or keep single empty template item
- Preserve data provenance by noting source in comments

If `--free yes` or `-f yes`:
- fill missing content with reasonable non-vault content
- search the web for content not available in the vault
- prefer vault data first when both vault and web sources exist
- Never invent personal info

Update the fill_data JSON with the populated values.

### Step 4: Fill the Template

```bash
uv run python -m template_gen.fill_runner
```

## Outputs

- fill-data JSON populated from vault data
- final filled DOCX