---
step-key: opaque-sensitive-document-fill
step-version: 1
requirement-version: 1
---

# Opaque Sensitive Document Fill

---

## Objective

Enable the existing document-fill workflow to complete templates that require sensitive values by introducing an opaque trusted-execution path, centered on `secure_action`, where the model can orchestrate non-sensitive steps and trigger secret consumption without ever reading the secret values or receiving unsanitized outputs back.

---

## Existing Workflow And Trust Boundary

- `.opencode/workflows/fill-docx.md` already freezes a split between the normal LLM-assisted fill path and a local-only sensitive fill path, but it does not yet define the trusted invocation contract that lets the model trigger secret insertion safely.
- `.opencode/plugins/secure-plugin-access.ts` already provides the only model-usable secret-consuming surface, but its current allowlist and handler set cover only a fixture digest capability and not document filling.
- `src/template_gen/generate_fill_data.py` and `src/template_gen/fill_runner.py` already provide the non-secret artifact and final fill boundaries for the current DOCX workflow.
- `opencode.json` already treats direct keychain and plugin-surface edits as restricted, so this step must preserve a narrow reviewed execution surface instead of widening general command access.

## Readiness Blockers

- The current requirement is directionally clear, but it still leaves multiple implementation-critical choices unfrozen that materially change the secure-action contract, test matrix, and trusted execution topology.
- The current discovery does not freeze:
  - the exact model-visible request shape for identifying which sensitive fields should be filled and where the trusted code should read or write document artifacts
  - whether the opaque path consumes an existing `fill_data.json` plus a separate sensitive-field manifest, a single merged manifest with secret references, or another reviewed artifact contract
  - whether the trusted path returns only `{ ok: true|false }` or a limited non-secret field/status summary, despite the requirement explicitly leaving this open
  - whether the final filled DOCX, or any post-fill derivative, is still safe for later model inspection when it may now contain user secrets
  - the exact ownership of any fallback trusted command path if `secure_action` cannot express the needed invocation shape for document filling
- These gaps cannot be resolved from the current step-local requirement without inventing product behavior that would drive implementation structure and tests.

---

## Locked constraints

- Sensitive values must never be returned to the model in normal results, logs, errors, or model-readable intermediate artifacts.
- `secure_action` is the preferred first-class invocation path for sensitive document filling.
- Any fallback trusted command path must remain narrowly scoped, reviewed, and equivalent in secrecy guarantees.
- The model may orchestrate non-sensitive workflow steps, but secret consumption and secret insertion must happen only inside trusted local execution.
- This step must stay compatible with the current `word-template-generation-and-filling` phase topic and existing `fill-docx` workflow boundaries.
- This step must not reopen any raw secret-read path for the model.

---

## Scope

### In

- Freezing how this step relates to the existing `fill-docx` workflow and `secure_action` plugin boundary
- Identifying the implementation-critical contract decisions that must be discovered before coding can proceed safely
- Defining the minimum files, symbols, and tests that the eventual implementation will need to touch once the opaque fill contract is frozen
- Preserving the requirement that secret insertion remains trusted-local while normal orchestration remains model-visible

### Out

- Implementing document-fill secret insertion in this planning round
- Inventing a new manifest format, secure-action argument schema, or result payload without refreshed discovery
- Broadening `secure_action` into arbitrary trusted command execution
- Redesigning the existing non-sensitive fill-data generation workflow beyond the sensitive insertion boundary
- Declaring any model-visible inspection path for secret-filled documents before discovery explicitly freezes it

---

# TDD Batches

## Batch 1: Freeze Current Safe Surfaces

**Primary Concern:** Confirm the existing workflow, plugin, and permission boundaries that the opaque fill path must preserve.

**Tests:**
- GIVEN `.opencode/workflows/fill-docx.md`
- WHEN the current fill workflow is reviewed
- THEN it still separates the normal LLM fill path from the local-only sensitive path and states that sensitive values must never be sent to the model

- GIVEN `.opencode/plugins/secure-plugin-access.ts` and `.opencode/plugin-allowlist.json`
- WHEN the current secure-action surface is reviewed
- THEN it exposes only reviewed allowlisted secret-consuming handlers and returns sanitized results

- GIVEN `opencode.json`
- WHEN keychain and secure-plugin boundaries are reviewed
- THEN direct raw secret access and unreviewed plugin-surface edits remain restricted

**Implementation:**
- Reconfirm the current trusted surfaces and enforcement boundaries that the new opaque fill path must reuse
- Keep `secure_action` as the preferred secret-consuming surface and preserve the current non-secret fill workflow boundaries

---

## Batch 2: Freeze The Opaque Document-Fill Contract After Refreshed Discovery

**Primary Concern:** After refreshed discovery, lock the exact request artifact, invocation shape, and result contract for trusted local secret insertion.

**Tests:**
- To be defined by refreshed discovery: at minimum cover the model-visible request shape, trusted input/output artifact paths, secure-action invocation shape, and sanitized result contract

**Implementation:**
- To be defined by refreshed discovery: current scope does not yet freeze the artifact contract, the secure-action argument schema, or the permissible result payload strongly enough for deterministic implementation

---

## Batch 3: Freeze Output Visibility And Fallback Behavior After Refreshed Discovery

**Primary Concern:** After refreshed discovery, lock what artifacts remain model-visible after secret insertion and whether a narrowly scoped non-plugin fallback path is required.

**Tests:**
- To be defined by refreshed discovery: at minimum cover post-fill artifact visibility, failure reporting, fallback-path constraints, and proof that no secret values enter model-visible outputs

**Implementation:**
- To be defined by refreshed discovery: current scope does not yet freeze whether the final DOCX may re-enter model context or how a fallback trusted command path is bounded relative to `secure_action`

---

## Files

- `.opencode/workflows/fill-docx.md` - current orchestration boundary between model-visible and local-only fill behavior
- `.opencode/plugins/secure-plugin-access.ts` - existing trusted secret-consuming surface that this step prefers to extend rather than bypass
- `.opencode/plugin-allowlist.json` - reviewed operation registry whose document-fill scope is not yet discovered
- `opencode.json` - current permission boundary that must continue to block raw secret access and unreviewed secure-surface changes
- `src/template_gen/generate_fill_data.py` - current non-secret fill-data generation boundary whose artifacts may feed the trusted fill path
- `src/template_gen/fill_runner.py` - current final document-fill entrypoint whose relationship to trusted secret insertion is not yet frozen
- `tests/test_secure_plugin_access.py` - existing proof surface for allowlisted secret consumption and sanitization
- `tests/test_sensitive_command_approval_docs.py` - existing proof surface for the documented split between LLM and local-only sensitive workflows

## Symbols

- `runSecureAction`
- `sanitizePayload`
- `generate_fill_data`
- `fill_document`
- `load_data_from_json`
- `## Goal` in `.opencode/workflows/fill-docx.md`
- `Approval boundary for sensitive data` in `.opencode/workflows/fill-docx.md`

## Execution constraints

- Only plan this live step folder.
- Do not invent a new secure-action schema or secret-field manifest until discovery freezes it.
- Do not assume the current plugin argument shape with `args.salt` generalizes to document filling.
- Do not assume the final filled DOCX is safe for model inspection once secrets are inserted.
- Keep any future fallback path narrower than arbitrary trusted command execution.

## Invariants

- `secure_action` remains the preferred model-usable secret-consuming path.
- Secret values never become model-readable output.
- Existing non-sensitive document-fill behavior remains intact outside the sensitive insertion boundary.
- Direct keychain access remains outside the model's allowed tool surface.

## Deferred follow-up

- Refresh discovery to freeze the model-visible request artifact and trusted document-fill input/output paths.
- Refresh discovery to freeze the secure-action argument schema and sanitized result payload for document filling.
- Refresh discovery to decide whether any post-fill artifact can safely re-enter model context.
- Refresh discovery to decide whether a bounded non-plugin fallback path is needed at all.
