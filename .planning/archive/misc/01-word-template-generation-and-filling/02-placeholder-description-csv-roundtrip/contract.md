# Contract: 02-placeholder-description-csv-roundtrip

## Invariants

- Existing `generate_template_from_json()` and `fill_document()` behavior is not changed by this step.
- Reviewed placeholder JSON remains the authoritative input for template generation phase.
- Export/import commands are standalone and do not modify template generation or fill workflows.
- The CSV roundtrip JSON is a semantic input for downstream steps, not a replacement for template coordinate mapping files.

## Data Shape Guarantees

### Export Input JSON

- JSON must contain a `placeholders` array.
- Each array element must contain a `placeholder` string field.
- Elements may optionally contain `location`, `description`, or other fields; only `placeholder` and `description` are used.

### Export Output CSV

- CSV contains exactly two columns with header `placeholder,description` in that order.
- CSV uses UTF-8 encoding.
- Each unique `placeholder` appears exactly once, in order of first appearance in the input JSON.
- `placeholder` values are written verbatim without renaming, Jinja unwrapping, or semantic rewriting.
- `description` values are written verbatim; empty string is allowed.

### Import Input CSV

- CSV must contain exactly two columns with header `placeholder,description` in that order.
- Column order must match exactly; swapped columns are rejected.
- Each `placeholder` must be a non-empty string.
- `placeholder` values must be unique across all rows.
- `description` may be empty string.

### Import Output JSON

- JSON contains a `placeholders` array.
- Each element contains exactly `placeholder` and `description` fields.
- Order matches CSV row order.
- No `location` or other metadata fields are included.

## Validation Rules

- Export fails when input JSON lacks `placeholders` array.
- Export fails when any element lacks `placeholder` field or `placeholder` is empty string.
- Export fails when same `placeholder` appears multiple times with different non-empty `description` values.
- Import fails when CSV header is not exactly `placeholder,description` in that order.
- Import fails when CSV contains extra columns or missing columns.
- Import fails when any `placeholder` cell is empty.
- Import fails when `placeholder` values are not unique.

## Error Handling Guarantees

- `TemplateGenError` is the base exception for export and import validation failures.
- Validation failures cause immediate CLI exit with clear error message; no silent fallback or partial output.
- Parent directories for output paths are created if they do not exist.
- Input files must exist; missing files cause failure.