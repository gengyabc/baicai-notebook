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

### Step 2: Validate Freshness And Generate Empty Fill Data Schema

```bash
uv run python -m template_gen.generate_fill_data
```

Before generating `fill_data.json`, this step validates that imported `descriptions.json`
matches the current canonical placeholder sequence from `temp-v{N}/placeholders.json`.
If mismatch is detected, fail fast and require:

- rerun `/export-csv edit`
- update the regenerated `descriptions.csv`
- rerun `/fill-docx`

### Step 3: Query Sources for Fill Data

**This step must be performed by the LLM.**

Read the fill_data JSON to see the field structure and descriptions.

Then follow `@.opencode/workflows/query-vault.md` to query the vault for relevant data.

**Fill data rules:**
- Use real data from vault when found
- Leave empty string `""` if no data found (do not invent data)
- For arrays: populate with actual items from vault, or keep single empty template item
- Preserve data provenance by noting source in comments

If `--free yes` or `-f yes`:
- fill missing content with reasonable non-vault content
- fill as mush as you can, search the web for content you don't know or not available in the vault
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
