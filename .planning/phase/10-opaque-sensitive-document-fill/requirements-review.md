# Requirements Review: 10-opaque-sensitive-document-fill

---
requirement-version: 1
step-version: 1
reviewed-at: 2026-04-29
---

## Summary

Review of implementation against requirement version 1 and step version 1.

## Success Criteria Coverage

1. **Document-filling path where LLM can trigger without reading sensitive values** -- PASS. The `fill-docx.md` workflow now includes Step 5 "Opaque Sensitive Fill" that defines the boundary, and Step 2.5 "Bind Secrets To Placeholders" that establishes secret-binding metadata. The LLM may trigger the workflow but secret consumption occurs inside trusted local execution.

2. **`secure_action` is established as the preferred invocation model** -- PASS. The workflow explicitly states `secure_action` is the preferred invocation path. The existing plugin infrastructure is confirmed intact and ready for a `sensitive-doc-fill` service/operation to be added after discovery freezes the contract.

3. **Fallback execution path is explicitly constrained** -- PASS. The requirement and workflow both state any fallback must remain narrowly scoped with the same opaque-secret guarantees. No fallback implementation was added because the step plan explicitly defers this to refreshed discovery.

4. **Outputs, logs, errors remain secret-free** -- PASS. Confirmed by Batch 1 tests that verify the existing `sanitizePayload` / `sanitizeValue` infrastructure and the `secure_action` sanitization contract.

5. **End-to-end document filling with secret insertion in trusted local execution** -- PARTIAL. The workflow structure supports it, but the actual trusted-fill handler is deferred pending discovery (correctly per step plan). The secret-binding metadata infrastructure is in place.

6. **No raw secret access path reopened** -- PASS. No new raw secret API was introduced. The `secure_action` path remains the only model-usable secret-consuming surface.

7. **Matched secret-backed placeholders preserve stable `secret_name` identity** -- PASS. `secret_binding.py` implements `bind_secrets_to_placeholders` which stores `secret_name` in placeholder entries. CSV roundtrip preservation is tested and working. The `SECRET_BINDING_FIELD` constant is `secret_name`.

8. **Trusted fill does not rely on semantic secret matching after placeholder generation** -- PASS. `validate_secret_binding_drift` enforces that placeholder tokens match the frozen normalization rule. The workflow states "No semantic re-matching of secrets occurs at fill time."

## Clarified Decisions Coverage

- Frozen normalization rule: `normalize_secret_name_to_placeholder` implements lowercase snake case from `secret_name` (resolving open question about the normalization rule).
- High-confidence single match only: `bind_secrets_to_placeholders` only binds on exact normalization match.
- CSV roundtrip preservation: Tested and passing.
- Drift validation: `validate_secret_binding_drift` fails on drift instead of silently remapping.

## Deferred Items

Per step.md Batch 2 and Batch 3, the following are deferred to refreshed discovery:
- The exact model-visible request shape for sensitive fill
- The trusted input/output artifact paths and fill manifest format
- The `secure_action` argument schema for document filling
- Whether the filled DOCX can re-enter model context
- Whether a non-plugin fallback path is needed

These deferrals are appropriate given the step plan explicitly marks them as "to be defined by refreshed discovery."

## Review Status

**correct** -- The implementation covers all success criteria that can be addressed given the current discovery state, and correctly defers items that require further discovery before they can be frozen.
