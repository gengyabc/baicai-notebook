# Test Checklist

## Plan Reference

- @.planning/phase/02-placeholder-description-csv-roundtrip/requirement.md
- @.planning/phase/02-placeholder-description-csv-roundtrip/step.md

## Chosen Mode

lower-level only

## Why

- This step defines strict file contract and CLI validation behavior without browser-visible flows.
- `feature.feature` is not present in the step folder, so lower-level tests are sufficient.

## Lower-Level Coverage

- Export reads reviewed placeholder JSON and writes a UTF-8 CSV with exact header `placeholder,description`.
- Export preserves first-seen placeholder order, deduplicates repeated placeholders, and keeps existing descriptions.
- Export fails on missing `placeholders`, missing or empty `placeholder`, and conflicting non-empty descriptions for the same placeholder.
- Import accepts only exact CSV columns/order, rejects missing or extra columns, empty placeholders, and duplicate placeholders.
- Import writes minimal JSON with only `placeholder` and `description` and preserves CSV row order.
- Export and import CLI entrypoints create output parent directories before writing artifacts and do not depend on template/fill commands.

## Browser E2E Coverage

- none required

## Refresh Triggers

- Refresh when requirement or step versions change, or when `delta.md` changes preserved/removed behavior.
- Refresh when requirements or quality review findings show missing contract checks or wrong-layer test placement.
