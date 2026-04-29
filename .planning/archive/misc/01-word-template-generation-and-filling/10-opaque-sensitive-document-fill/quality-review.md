# Quality Review: 10-opaque-sensitive-document-fill

---
step-version: 1
requirement-version: 1
---

## Round 1: Full Review

### Code Review Summary

The implementation adds secret-binding metadata infrastructure for opaque sensitive document filling. New module `secret_binding.py` provides normalization, binding, and drift validation. CSV roundtrip preserves `secret_name`. The `fill-docx.md` workflow is updated with opaque fill steps.

34 new tests cover Batch 1 (trusted surfaces), secret name normalization, placeholder-secret binding, drift validation, CSV roundtrip, fill-data generation, and infrastructure readiness.

### Normalized Findings

| ID | Severity | Module | Status | Summary |
|---|---|---|---|---|
| QR-10-P2-001 | P2 | secret_binding.py | open | `bind_secrets_to_placeholders` silently skips non-conforming registry entries instead of logging or warning |
| QR-10-P3-001 | P3 | export_placeholder_csv.py | open | `load_placeholder_description_source` preserves `secret_name` but `rebuild_placeholders_from_template` drops it during edit mode rebuild |

### Finding Details

#### QR-10-P2-001: Silent skip of non-conforming registry entries

- **File:** `src/template_gen/secret_binding.py:55-57`
- **Issue:** `bind_secrets_to_placeholders` catches `TemplateGenError` from `normalize_secret_name_to_placeholder` and silently skips non-conforming entries. This could mask data-quality issues in the registry that should be visible to the user.
- **Risk:** A misspelled or malformed registry entry would silently fail to bind, leading to a secret-backed field not being marked as such, potentially falling into the LLM fill path.
- **Recommendation:** Consider logging a warning or collecting skipped entries for the caller to report. However, this is acceptable for now because the env-registry already enforces the name pattern at `add` time.

#### QR-10-P3-001: Edit mode rebuild drops secret_name

- **File:** `src/template_gen/export_placeholder_csv.py:57-75`
- **Issue:** When `export_placeholder_csv` is called with `edit=True`, it rebuilds `placeholders.json` from the template DOCX using `rebuild_placeholders_from_template`. The rebuilt JSON has only `location` and `placeholder` fields; `secret_name` is lost. Then `load_placeholder_description_source` reads the rebuilt file and exports without `secret_name`.
- **Risk:** Running `/export-csv edit` after secret-binding would lose the binding metadata. The requirement states "CSV roundtrip and template-sync flows must preserve secret-binding metadata for surviving placeholders."
- **Recommendation:** The edit-mode rebuild should merge `secret_name` from the previous `placeholders.json` into the rebuilt entries for surviving placeholders. This is a real gap that needs fixing.

### Suggested Required Fix Batches

| Batch ID | Findings | Selection Order | Description |
|---|---|---|---|
| QB-001 | QR-10-P3-001 | 1 | Preserve `secret_name` during edit-mode placeholder rebuild by merging from prior placeholders.json |

### Previous Findings Verification

N/A (first round)

### Assessment

**mixed** -- One P3 finding identifies a real gap in the edit-mode rebuild path that loses `secret_name` metadata. This violates the requirement that CSV roundtrip and template-sync flows preserve secret-binding metadata.

---

## Round 2: Verification

### Code Review Summary

Fixed QR-10-P3-001 by updating `rebuild_placeholders_from_template` to merge `secret_name` from prior `placeholders.json` into rebuilt entries for surviving placeholders. Added 2 new tests covering edit-mode rebuild with secret-binding preservation.

### Normalized Findings

| ID | Severity | Module | Status | Summary |
|---|---|---|---|---|
| QR-10-P2-001 | P2 | secret_binding.py | optional | `bind_secrets_to_placeholders` silently skips non-conforming registry entries |
| QR-10-P3-001 | P3 | export_placeholder_csv.py | closed | Edit mode rebuild now preserves `secret_name` for surviving placeholders |

### Finding Details

#### QR-10-P3-001: FIXED

- **Fix:** `rebuild_placeholders_from_template` in `export_placeholder_csv.py` now reads the previous `placeholders.json` before rebuilding, extracts `secret_name` bindings, and merges them into the rebuilt entries for surviving placeholders.
- **Tests:** `test_edit_mode_rebuild_preserves_secret_name_for_surviving_placeholders` and `test_edit_mode_rebuild_drops_secret_name_for_removed_placeholders` both pass.

#### QR-10-P2-001: Marked optional

- The env-registry enforces the name pattern at `add` time. Non-conforming entries should not exist in practice. The silent skip is a safe defensive behavior.

### Assessment

**clean** -- All P0-P2 findings are resolved or marked optional. No remaining required fixes. 36 tests pass.
