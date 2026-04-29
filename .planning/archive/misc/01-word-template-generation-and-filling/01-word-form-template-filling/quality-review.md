---
schema: review-result-v1
skill: quality-review
phase: word-template-generation-and-filling
step_folder: 01-word-form-template-filling
result_file: .planning/phase/01-word-form-template-filling/quality-review.md
finding_id_scope: phase
append_only: true
step-version: 1
requirement-version: 1
---

## Round 1

```yaml
round: 1
mode: full
assessment: clean
base_sha: HEAD
head_sha: HEAD
scope: src/template_gen/*.py, tests/*.py
stop_reason: clean
manual_intervention_required: false
active_batch_under_review: none
open_findings: 0
batch_count: 0
repeated_findings: []
repeated_root_cause_clusters: []
```

### Code Review Summary

Implementation is clean and minimal. All functions are well-scoped, test coverage is comprehensive, and code follows the step.md plan. Key additions beyond original plan: merged cell handling, style borrowing, CLI entry points, path traversal security, JSON output. No P0-P2 issues found.

### Normalized Findings

- ID: QR-word-template-generation-and-filling-P3-001
- Priority: P3
- Required: no
- Status: optional
- Title: Minor code cleanup opportunities
- Location: Various files
- Root Cause Cluster: minor-cleanup
- Batch Candidate: none
- Summary: Code follows conventions well; optional cleanup could remove unused imports in filler.py if desired
- Impact: No functional impact
- Recommended Fix: None required
- Block Reason: none

### Suggested Required Fix Batches
- none (no required findings)

### Previous Findings Verification
- none (first round)

## Round 2

```yaml
round: 2
mode: delta
assessment: mixed
base_sha: HEAD
head_sha: HEAD
scope: src/template_gen/*.py, tests/*.py
stop_reason: none
manual_intervention_required: false
active_batch_under_review: QB-001
open_findings: 2
batch_count: 1
repeated_findings: []
repeated_root_cause_clusters: []
```

### Code Review Summary

The change set is close, but the template-generation workflow still misses one planned capability and mishandles one documented edge case. Tests are green, but they do not cover these gaps.

### Normalized Findings

- ID: QR-word-template-generation-and-filling-P1-001
- Priority: P1
- Required: yes
- Status: open
- Title: Paragraph placeholder generation is not implemented
- Location: src/template_gen/generate_template.py:9-49; src/template_gen/filler.py:76-124
- Root Cause Cluster: missing-paragraph-template-support
- Batch Candidate: QB-001
- Summary: The step plan and scope require paragraph text replacement, but `parse_location()` only accepts `tables[].rows[].cells[]` locations and `generate_template()` can only write into table cells. Any placeholder JSON that targets a paragraph, such as `paragraphs[0]`, is rejected outright, so the template-generation phase cannot produce paragraph placeholders at all.
- Impact: A documented in-scope capability is missing. Forms with fillable content outside tables cannot be templated through the implemented workflow, which makes the step incomplete for mixed paragraph/table documents.
- Recommended Fix: Extend the placeholder location schema and generation path to support paragraph targets, then add coverage for loading paragraph mappings and writing placeholders into paragraph runs while preserving formatting.
- Block Reason: none

- ID: QR-word-template-generation-and-filling-P1-002
- Priority: P1
- Required: yes
- Status: open
- Title: Merged-cell detection skips vertical merged duplicates
- Location: src/template_gen/filler.py:12-24; src/template_gen/filler.py:108-118
- Root Cause Cluster: incomplete-merged-cell-detection
- Batch Candidate: QB-001
- Summary: `detect_merged_cells()` only compares each cell with the previous cell in the same row. That catches horizontal merges, but not vertically merged continuation cells in later rows. In `python-docx`, vertically merged cells still share the same underlying `_tc`, so those duplicates are present but never mapped and therefore are not skipped as promised by the step plan.
- Impact: Placeholder generation can target a vertically merged continuation cell instead of recognizing it as a duplicate of the primary cell. That makes merged-area handling non-deterministic and can confuse coordinate-based placeholder mapping for real templates.
- Recommended Fix: Detect duplicate `_tc` values across the whole table, not just within one row, and add a regression test covering vertical merges.
- Block Reason: none

- ID: QR-word-template-generation-and-filling-P3-001
- Priority: P3
- Required: no
- Status: optional
- Title: Minor code cleanup opportunities
- Location: Various files
- Root Cause Cluster: minor-cleanup
- Batch Candidate: none
- Summary: Code follows conventions well; optional cleanup could remove unused imports in filler.py if desired
- Impact: No functional impact
- Recommended Fix: None required
- Block Reason: none

### Suggested Required Fix Batches

- Batch ID: QB-001
- Selection Order: 1
- Findings: QR-word-template-generation-and-filling-P1-001, QR-word-template-generation-and-filling-P1-002
- Reason: Both required findings are in the template-generation path and should be fixed together before another review round.

### Previous Findings Verification

- ID: QR-word-template-generation-and-filling-P3-001
- Previous Status: optional
- Current Status: optional
- Notes: Still optional and unchanged; no action required for merge readiness.

## Round 3

```yaml
round: 3
mode: delta
assessment: clean
base_sha: HEAD
head_sha: HEAD
scope: src/template_gen/filler.py, src/template_gen/generate_template.py, src/template_gen/schemas.py, tests/test_generator.py
stop_reason: clean
manual_intervention_required: false
active_batch_under_review: none
open_findings: 0
batch_count: 0
repeated_findings: []
repeated_root_cause_clusters: []
```

### Code Review Summary

Selected batch QB-001 is resolved. Paragraph-target placeholder generation is now supported, merged-cell detection now handles vertical duplicates, and regression tests cover both behaviors. No required open findings remain.

### Normalized Findings

- ID: QR-word-template-generation-and-filling-P1-001
- Priority: P1
- Required: yes
- Status: closed
- Title: Paragraph placeholder generation is not implemented
- Location: src/template_gen/generate_template.py:9-66; src/template_gen/filler.py:77-138
- Root Cause Cluster: missing-paragraph-template-support
- Batch Candidate: QB-001
- Summary: `parse_location()` now supports `paragraphs[i]` and JSON loading emits paragraph-target mappings; template generation writes paragraph placeholders while preserving run style.
- Impact: In-scope paragraph templating capability is now available for mixed paragraph/table documents.
- Recommended Fix: none
- Block Reason: none

- ID: QR-word-template-generation-and-filling-P1-002
- Priority: P1
- Required: yes
- Status: closed
- Title: Merged-cell detection skips vertical merged duplicates
- Location: src/template_gen/filler.py:12-25
- Root Cause Cluster: incomplete-merged-cell-detection
- Batch Candidate: QB-001
- Summary: merged-cell detection now tracks first-seen XML cell objects across the whole table, which correctly identifies both horizontal and vertical merged duplicates.
- Impact: Placeholder placement in merged areas is deterministic and aligned with the step contract.
- Recommended Fix: none
- Block Reason: none

- ID: QR-word-template-generation-and-filling-P3-001
- Priority: P3
- Required: no
- Status: optional
- Title: Minor code cleanup opportunities
- Location: Various files
- Root Cause Cluster: minor-cleanup
- Batch Candidate: none
- Summary: Optional cleanup remains non-blocking.
- Impact: No functional impact.
- Recommended Fix: None required.
- Block Reason: none

### Suggested Required Fix Batches

- none (no required findings)

### Previous Findings Verification

- ID: QR-word-template-generation-and-filling-P1-001
- Previous Status: open
- Current Status: closed
- Notes: Verified via updated parser/mapping logic and regression tests.

- ID: QR-word-template-generation-and-filling-P1-002
- Previous Status: open
- Current Status: closed
- Notes: Verified via table-wide merged detection update and vertical-merge regression test.

- ID: QR-word-template-generation-and-filling-P3-001
- Previous Status: optional
- Current Status: optional
- Notes: Unchanged and non-blocking.
