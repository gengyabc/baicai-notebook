# Contract: 01-word-form-template-filling

## Invariants

- Template generation does not modify original empty form styles or layout
- Filling operation does not change document format structure
- Placeholder naming remains semantic and consistent
- Only empty cells are modified; non-empty cells are skipped
- Table row count is fixed; no dynamic row addition or deletion
- Style preservation: only text content is modified; no run or paragraph reconstruction
- Tables are never rebuilt or deleted
- Paragraphs are never rebuilt
- Table data uses fixed fields only; `{% for %}` loop syntax is not used
- Placeholders are inserted only in original empty cells while preserving original styles
- Merged cells: only primary cell processed; duplicate merged cells skipped
- Path traversal: batch_fill sanitizes filenames and prevents escape from output directory

## Data Shape Guarantees

- StyleInfo contains font_name, font_size, bold, italic, alignment metadata
- ParagraphInfo contains index, text, and optional StyleInfo
- CellInfo contains row_index, col_index, text, is_empty, and optional StyleInfo
- RowInfo contains index and list of CellInfo
- TableInfo contains index and list of RowInfo
- DocumentStructure contains paragraphs, tables, and styles metadata
- FieldInfo contains location path, original text, context, and suggested placeholder name
- CoordinateMapping maps table index, row index, column index to placeholder with empty cell flag
- PlaceholderMapping links Jinja placeholder to field path and original field info

## Rendering Constraints

- Input files are always editable `.docx` format
- Template layouts vary; each layout corresponds to a fixed field set
- LLM-generated placeholders must be manually reviewed before use
- Only open-source tools are used
- No image processing, signature processing, or PDF input/output
- parse_document outputs JSON to `.temp/docx_parsed/<filename>.json` automatically
- Location strings must follow format: "tables[i].rows[j].cells[k]"

## Error Handling Guarantees

- TemplateGenError is the base exception for all template_gen errors
- ParseError is raised for invalid `.docx` format, corrupted files, encoding issues, or missing files
- FillError is raised for missing or invalid template files, missing required data fields (StrictUndefined), or unsafe output paths
- TemplateGenError is raised for unsupported location format or invalid location index
- In batch filling, single record failure does not block other records; failed records are logged
- Path traversal attempts in filename patterns are sanitized to prevent escape from output directory