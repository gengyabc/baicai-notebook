# Spec Decision: 03-vault-grounded-data-fill

- Decision: none

## Why

- The step's own "Readiness Blocker" section says the requirement does not freeze how `description + vault evidence` becomes a final field value.
- Multiple value-resolution paths remain equally valid: rule extraction, model-assisted synthesis, or candidate-confirmation flow; each would change runtime topology, test assertions, and failure behavior.
- The requirement does not specify conflict resolution, missing-data handling, or whether an evidence artifact is required.
- Generating specs for a blocked step would freeze behavior that the requirement has not yet authorized, forcing later implementation to guess.

## Outputs

- decision.md
- feature.feature: no
- contract.md: no