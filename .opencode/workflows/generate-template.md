# Workflow: Generate Template

## Goal

Convert a Word document into a Jinja template by parsing structure, generating semantic placeholders, and creating the final template file.

## Inputs

- `.docx` file path (required)

## Steps

### Step 1: Parse Document

Run the parser to extract document structure:

```bash
uv run python -m template_gen.parser <docx_file>
```

Output: `.temp/docx_parsed/{filename}.json`

### Step 2: Generate Placeholders

Read the parsed JSON and generate semantic placeholders:

1. Read `.temp/docx_parsed/{filename}.json`
2. Analyze empty cells and fillable fields
3. Generate **semantic placeholder names** based on context
4. Write to `.temp/docx_placeholders/{filename}_placeholders.json`

**Naming Rules:**
- Use `snake_case` naming (English)
- Names should be semantic (e.g., `applicant_name` not `field_1`)
- For table rows, use numeric prefixes (e.g., `course_1_name`, `course_2_name`)
- Use Chinese context clues (adjacent cell text like "姓名" → `name`)
- Look at adjacent cell text for context
- Preserve original structure mapping

**Placeholder format:**
```json
{
  "source_file": "original.docx",
  "placeholders": [
    {
      "location": "tables[0].rows[1].cells[1]",
      "placeholder": "{{ applicant_name }}",
      "context": "Adjacent to '姓名' label",
      "field_path": "applicant.name"
    }
  ]
}
```

### Step 3: Generate Template

Run the template generator:

```bash
uv run python -m template_gen.generate_template \
  --source <docx_file> \
  --placeholders ".temp/docx_placeholders/{filename}_placeholders.json" \
  --output ".temp/docx_template/{filename}_template.docx"
```

Output: `.temp/docx_template/{filename}_template.docx`

## Outputs

Print summary after completion:
- Source file: `{filename}.docx`
- Parsed structure: `.temp/docx_parsed/{filename}.json`
- Placeholders: `.temp/docx_placeholders/{filename}_placeholders.json` (X placeholders)
- Template: `.temp/docx_template/{filename}_template.docx`

## Next Step

User fills template with data:
```bash
uv run python -m template_gen.fill_runner \
  --template .temp/docx_template/{filename}_template.docx \
  --data <data.json> \
  --output .temp/docx_filled/output.docx
```