# Test Checklist

## Plan Reference
- @.planning/phase/01-word-form-template-filling/requirement.md
- @.planning/phase/01-word-form-template-filling/step.md

## Chosen Mode
lower-level only

## Why
- No feature.feature exists - this is backend library implementation
- Contract.md defines invariants and data shapes for lower-level verification
- User-visible behavior not defined, browser E2E not applicable

## Lower-Level Coverage
- Batch 1: Tool Chain Validation
  - python-docx parses document structure (paragraphs, tables) correctly
  - docxtpl fills Jinja template with test data correctly
  - ParseError raised for invalid/corrupted/missing files
- Batch 2: Template Generation Workflow
  - Document structure analysis extracts field positions and context
  - JSON output generated at `.temp/docx_parsed/<filename>.json`
  - set_cell_text_keep_style preserves cell style (font, alignment)
  - set_cell_text_keep_basic_style backward-compatible alias works
  - Style borrowing from adjacent cells for empty cells without runs
  - print_table_coordinates outputs table coordinate info
  - Placeholder generation produces semantic Jinja placeholders with field mapping
  - generate_template inserts placeholders only in empty cells
  - generate_template skips non-empty cells (rechecks actual content)
  - detect_merged_cells identifies merged cells
  - generate_template handles merged cells (skips duplicates)
  - parse_location rejects unsupported location formats
  - load_placeholders_json rejects invalid location index
- Batch 3: Batch Filling Workflow
  - Single document fill replaces all placeholders correctly
  - FillError raised for missing required data (StrictUndefined)
  - Batch fill generates multiple documents with correct naming
  - Batch fill sanitizes filename placeholders (path traversal prevention)
  - Fixed table row fields fill correctly, empty fields use empty strings
  - Filled text preserves borrowed style from template generation
  - fill_runner CLI entry point works

## Browser E2E Coverage
- none required

## Refresh Triggers
- Material step.md changes affecting TDD batch definitions
- Review findings showing missing coverage for contract invariants
- New requirement-version without corresponding test updates