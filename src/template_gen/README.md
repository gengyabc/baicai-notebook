# Template Gen

Word template generation and filling library using `python-docx` and `docxtpl`.

## Purpose

Convert Word empty forms into Jinja templates and batch fill with structured data.

## Workflow

**Step 1: Generate template**
```
/generate-template .temp/docx/form.docx
```

This command follows the `generate-template` workflow:
- Parse document → `.temp/docx_parsed/form.json`
- Generate placeholders → `.temp/docx_placeholders/form_placeholders.json`
- Create template → `.temp/docx_template/form_template.docx`

**Step 2: Export placeholders for human description editing**
```bash
uv run python -m template_gen.export_placeholder_csv \
  --input .temp/docx_placeholders/form_placeholders.json \
  --output .temp/docx_placeholders/form_placeholder_descriptions.csv
```

The export file is intentionally minimal and contains only:
- `placeholder`
- `description`

**Step 3: Import edited descriptions back to semantic JSON**
```bash
uv run python -m template_gen.import_placeholder_csv \
  --input .temp/docx_placeholders/form_placeholder_descriptions.csv \
  --output .temp/docx_placeholders/form_placeholder_descriptions.json
```

**Step 4: Prepare data**
Create a JSON file with values matching placeholder names:
```json
{
  "project_name": "培训项目名称",
  "course_1_name": "课程名称",
  ...
}
```

**Step 5: Fill template**
```bash
uv run python -m template_gen.fill_runner \
  --template .temp/docx_template/form_template.docx \
  --data .temp/docx_data/data.json \
  --output .temp/docx_filled/output.docx
```

## Key Functions

| Function | Module | Purpose |
|----------|--------|---------|
| `parse_document` | parser | Extract paragraphs, tables, styles from `.docx` |
| `print_table_coordinates` | parser | Debug helper for table structure |
| `generate_template` | filler | Create Jinja template from `CoordinateMapping` list |
| `generate_template_from_json` | generate_template | Create Jinja template from placeholders JSON |
| `fill_template` | filler | Fill template with data dict |
| `fill_document` | fill_runner | Fill template from data JSON file |
| `batch_fill` | filler | Generate multiple documents from records |
| `set_cell_text_keep_basic_style` | filler | Preserve style when setting cell text |

## Data Schemas

- `DocumentStructure`: paragraphs, tables, styles
- `FieldInfo`: location, text, context, suggested_name
- `CoordinateMapping`: table/row/col indices to placeholder
- `PlaceholderMapping`: Jinja placeholder to field path

## Style Preservation

`set_cell_text_keep_basic_style()` modifies only the first run's text, preserving font, size, bold, italic. Secondary runs are cleared but not deleted.

## Constraints

- Only `.docx` format
- Fixed table rows (no `{% for %}` loops)
- Empty cells only (skip non-empty)
- No table/paragraph rebuilding
