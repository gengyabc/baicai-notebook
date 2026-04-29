---
step-key: opaque-sensitive-document-fill
step-number: 10
step-folder: 10-opaque-sensitive-document-fill
phase-topic: word-template-generation-and-filling
status: discovered
requirement-version: 1
updated-at: 2026-04-28
source: discover-requirements
supersedes: null
---

## Restated Request

Enable document filling workflows where the LLM can invoke trusted underlying code or commands to insert sensitive values into documents without ever reading those values.

## Real Objective

Preserve end-to-end automation for sensitive document filling while keeping the secret boundary opaque to the model and limiting the execution surface to narrowly allowed operations.

## Problem Statement

Users want document-filling automation to continue working even when some fields require sensitive data. The LLM should be able to trigger the fill process, but must not read, echo, or infer the raw sensitive values. Without a defined opaque execution path, document filling either becomes unsafe or falls back to manual user work.

## In Scope

- Define an opaque sensitive-document-fill path where trusted local execution inserts sensitive values without revealing them to the LLM
- Prefer `secure_action` as the primary invocation model for sensitive document filling
- Allow only narrowly scoped trusted execution paths whose outputs remain secret-free
- Define the boundary between model-visible instructions and secret-consuming local execution
- Require sanitized outputs, logs, and errors so sensitive values are never exposed back to the model
- Cover document-filling use cases where the model orchestrates the workflow but secret insertion happens outside model visibility
- Allow placeholder generation to consult env-registry metadata (`name`, `description`) so likely secret-backed fields can be bound early
- Preserve explicit secret-binding metadata for matched placeholders so later sensitive fill does not need semantic re-matching

## Out of Scope

- General-purpose arbitrary trusted command execution for unrelated tasks
- Reintroducing any raw secret read API for the LLM
- Broadening metadata discovery rules beyond what is covered in the separate metadata step
- Redesigning the entire template-filling workflow beyond the sensitive-value insertion boundary
- Defining service-specific integrations beyond the generic trusted invocation pattern

## Constraints

- Sensitive values must never be returned to the LLM in normal output, logs, errors, or intermediate artifacts intended for model reading
- `secure_action` is the preferred first-class invocation path for sensitive document filling
- Any fallback trusted command path must remain narrowly scoped and provide the same opaque-secret guarantees
- The model may orchestrate the fill workflow, but secret consumption must occur only inside trusted local execution
- The requirement must remain compatible with the current phase topic `word-template-generation-and-filling`
- Placeholder generation may auto-bind a field to a registry secret only when there is one clear high-confidence match; ambiguous or low-confidence cases must not be auto-bound
- Later opaque sensitive fill may operate only on placeholders with explicit stored `secret_name`; trusted execution must not perform semantic re-matching at fill time
- CSV roundtrip and template-sync flows must preserve secret-binding metadata for surviving placeholders

## Assumptions

- Existing or planned trusted local code can access registered sensitive values without exposing them to the model
- Sensitive document filling can be decomposed so the model handles non-sensitive orchestration while trusted execution handles secret insertion
- A sanitized success or failure result is sufficient for the model to continue the workflow without seeing the secret
- Registry `name` values are stable enough to act as durable secret identities for matched secret-backed placeholders

## Clarified Decisions

- Placeholder generation may consult env-registry metadata (`name`, `description`) to identify likely secret-backed fields before the document-fill stage
- Secret binding is allowed only on high-confidence single matches; ambiguous or low-confidence cases must not be auto-bound
- For matched secret-backed fields, the registry entry `name` is the durable identity and must be preserved in `placeholders.json` as `secret_name`
- The visible placeholder token for a matched secret-backed field must be derived deterministically from `secret_name` using a frozen normalization rule
- Later opaque sensitive fill may operate only on fields with explicit stored `secret_name`; it must not perform semantic rematching at fill time
- CSV export/import and template-sync flows must preserve secret-binding metadata for surviving placeholders
- Placeholder drift that breaks the frozen secret-binding contract must fail validation instead of silently remapping

## Open Questions

- Whether the deterministic placeholder normalization rule should be exactly lowercase snake case from `secret_name` or another frozen transformation
- Whether the opaque fill path should report only success/failure or also return limited non-secret field-level status
- Which document-filling artifacts, if any, can be safely inspected by the model after sensitive insertion completes

## Success Criteria

1. The requirement defines a document-filling path where the LLM can trigger execution without reading sensitive values
2. `secure_action` is established as the preferred invocation model for this path
3. Any allowed fallback execution path is explicitly constrained and not equivalent to arbitrary command execution
4. The requirement states that outputs, logs, and errors visible to the model must remain secret-free
5. The requirement supports end-to-end document filling with secret insertion handled entirely inside trusted local execution
6. The requirement does not reopen any raw secret access path for the LLM
7. Matched secret-backed placeholders preserve stable `secret_name` identity from generation through fill
8. Trusted fill does not rely on semantic secret matching after placeholder generation

## Suggested Planning Focus

First define the opaque invocation contract for sensitive document filling around `secure_action`, then plan how trusted local execution, placeholder-to-secret identity preservation, sanitized result reporting, and workflow boundaries fit into the existing fill flow.
