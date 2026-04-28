# Spec Decision: 08-secure-plugin-access

- Decision: feature-and-contract

## Why

- The step introduces a new plugin API surface with observable input/output behavior that tests can verify externally
- The step freezes specific schemas (allowlist shape), validation order, handler contract, and sanitization rules as technical boundaries that must not change during implementation

## Outputs

- decision.md
- feature.feature: yes
- contract.md: yes