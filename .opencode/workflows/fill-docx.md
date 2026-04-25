# Workflow: Fill Docx

## Goal

Convert edited placeholder CSV into the final filled DOCX by importing the CSV, querying the vault for data, generating fill data, and running the template filler.

## Inputs

- edited placeholder CSV
- template `.docx` file
- output `.docx` file path

## Steps

### Step 1: Import CSV to JSON

Import the edited CSV into the minimal placeholder-description JSON:

```bash
uv run python -m template_gen.import_placeholder_csv \
  --input $1 \
  --output .temp/docx_placeholders/form_placeholder_descriptions.json
```

### Step 2: Generate Empty Fill Data Schema

Generate the fill-data JSON structure (with empty values):

```bash
uv run python -m template_gen.generate_fill_data \
  --input .temp/docx_placeholders/form_placeholder_descriptions.json \
  --output .temp/docx_data/form_fill_data.json
```

### Step 3: Query Sources for Fill Data

**This step must be performed by the LLM.**

Read `.temp/docx_data/form_fill_data.json` to see the field structure and descriptions.

Then follow `@.opencode/workflows/query-vault.md` to query the vault (`workbook/`) for relevant data.

**Fill data rules:**
- Use real data from vault when found
- Leave empty string `""` if no data found (do not invent data)
- For arrays: populate with actual items from vault, or keep single empty template item
- Preserve data provenance by noting source in comments

If the command is run with `--free yes`, you may also:
- fill missing content with reasonable non-vault content
- search the web for content not available in the vault
- prefer vault data first when both vault and web sources exist
- Never invent personal info

If `--free` is omitted or set to `no`, keep the vault-only behavior.

Update `.temp/docx_data/form_fill_data.json` with the populated values.

### Step 4: Fill the Template

Run the template filler with the populated data:

```bash
uv run python -m template_gen.fill_runner \
  --template $2 \
  --data .temp/docx_data/form_fill_data.json \
  --output $3
```

## Outputs

- imported placeholder-description JSON
- fill-data JSON populated from vault data
- final filled DOCX with actual content
