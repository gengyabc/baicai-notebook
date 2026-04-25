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

### Step 3: Query Vault for Fill Data

**This step must be performed by the LLM.**

Read `.temp/docx_data/form_fill_data.json` to see the field structure and descriptions.

Then query the vault (`workbook/`) to find relevant data:

1. Read `workbook/wiki/index.md` first for knowledge discovery
2. Search relevant resources in `workbook/resources/`
3. Check `workbook/my-work/` for current context and active intent
4. Use `workbook/brainstorm/` only for tentative synthesis if no grounded data found

**Query strategy:**
- For project-related fields: search project documents in resources
- For course/teacher data: search training materials, course records
- Use Chinese keywords matching the description fields

**Fill data rules:**
- Use real data from vault when found
- Leave empty string `""` if no data found (do not invent data)
- For arrays: populate with actual items from vault, or keep single empty template item
- Preserve data provenance by noting source in comments

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
