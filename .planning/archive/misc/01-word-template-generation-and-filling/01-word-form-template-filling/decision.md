# Spec Decision: 01-word-form-template-filling

- Decision: contract-only

## Why

- This is a backend library implementation with no user-visible UI behavior
- Step defines significant technical boundaries and invariants to preserve (no table/paragraph rebuilding, style preservation, fixed row fields)
- Data shape guarantees are explicitly defined (DocumentStructure, FieldInfo, CoordinateMapping, PlaceholderMapping)
- Failure behaviors and error handling contracts are specified (ParseError, FillError)

## Outputs

- decision.md
- feature.feature: no
- contract.md: yes