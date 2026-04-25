---
description: Export placeholder descriptions as CSV for manual editing
argument-hint: "[placeholders-json] [output-csv]"
model: bailian-coding-plan/glm-5
---

Export placeholder descriptions from the reviewed placeholder JSON.

**Arguments:**
- `$1` (optional): Placeholder JSON file path
  - If not provided: Find the newest `*_placeholders.json` in `.temp/docx_placeholders/`
- `$2` (optional): Output CSV path
  - If not provided: `.temp/docx_placeholders/<input_basename>_descriptions.csv`

## Steps

### Step 1: Read Placeholder JSON

Read the placeholder JSON file to understand the fields and their context.

### Step 2: Generate Descriptions

For each placeholder, generate a short Chinese description (1-2 sentences) based on:
- The placeholder name (e.g., `project_name` → "项目名称")
- The context field in the JSON
- The field_path for understanding data structure

**Description rules:**
- Use Chinese for Chinese document templates
- Keep descriptions concise (under 50 characters)
- Describe the field purpose, not the format
- For loop variables, indicate the list structure

### Step 3: Update JSON with Descriptions

Add a `description` field to each placeholder in the JSON, then write it back.

### Step 4: Export to CSV

Run the exporter:

```bash
uv run python -m template_gen.export_placeholder_csv \
  --input <placeholders-json> \
  --output <output-csv>
```

The CSV can then be used for manual refinement if needed.
