# Spec Decision: 02-placeholder-description-csv-roundtrip

- Decision: contract-only

## Why

- This is a developer-facing CLI utility with two independent commands, not end-user UI behavior.
- The step freezes strict data shape guarantees for CSV and JSON exchange formats.
- Validation rules, uniqueness constraints, and error handling contracts are explicitly defined.
- TDD batches already capture observable CLI behavior in GIVEN/WHEN/THEN format; a feature.feature would duplicate them.

## Outputs

- decision.md
- feature.feature: no
- contract.md: yes