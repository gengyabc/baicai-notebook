# Test Checklist

## Plan Reference

- @.planning/phase/04-template-edit-aware-csv-json-roundtrip/requirement.md
- @.planning/phase/04-template-edit-aware-csv-json-roundtrip/step.md

## Chosen Mode

lower-level only

## Why

- No `feature.feature` exists in this step folder, so lower-level tests are sufficient.
- Required behavior is Python CLI/data-contract logic and can be proven without browser journeys.

## Lower-Level Coverage

- `/export-csv edit` reads placeholders from current `template.docx` and rewrites current `placeholders.json`.
- `/export-csv edit` fails when `template.docx` is missing or contains no supported placeholders.
- Rewritten `placeholders.json` preserves template occurrence order and duplicate occurrences.
- CSV export still deduplicates by first occurrence order under the existing minimal CSV contract.
- Default `/export-csv` behavior remains unchanged when `edit` is not provided.
- `/fill-docx` path fails fast when imported `descriptions.json` placeholder sequence mismatches canonical sequence from current `placeholders.json`.
- `/fill-docx` path continues normally when imported `descriptions.json` matches canonical sequence exactly.

## Browser E2E Coverage

- none required

## Refresh Triggers

- Refresh when `step.md` changes scope, constraints, or symbol/file targets.
- Refresh when requirements/quality review findings indicate missing coverage or wrong test layer.
- Refresh when `export_placeholder_csv` or `generate_fill_data` contracts change in a way that affects batch assertions.
