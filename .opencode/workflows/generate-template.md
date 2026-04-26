# Workflow: Generate Template

See `@.opencode/rules/template-gen-paths.md` for directory structure and file purposes.

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

### Step 2: Generate Placeholders

Read the parsed JSON and generate semantic placeholders:

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

Run the template generator for current task:

```bash
uv run python -m template_gen.generate_template
```

## Outputs

Print summary after completion:
- Task name and version
- Number of placeholders
- Template file path