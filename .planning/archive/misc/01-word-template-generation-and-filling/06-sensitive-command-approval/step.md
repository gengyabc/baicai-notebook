---
step-key: sensitive-command-approval
step-version: 1
requirement-version: 1
---

# Sensitive Command Approval

---

## Objective

Define a reusable approval layer for sensitive command execution so OpenCode can classify risky invocations before execution, keep OpenCode permissions as the enforcement boundary, present clear approval and denial guidance to the user, and preserve a local-only document-filling path where sensitive values are injected by trusted local code instead of being exposed to the model.

---

## Integration Topology

- The approval layer sits in front of command execution and evaluates the pending invocation; it does not replace the command or script being called.
- OpenCode permissions remain the primary enforcement layer. The approval layer only decides when extra user consent, explanation, and denied-path guidance are required.
- Existing command and skill surfaces such as `.opencode/commands/env.md` and `.opencode/skills/env-registry/SKILL.md` are consumers of the shared approval contract, not independent policy owners.
- Existing document workflows such as `.opencode/workflows/fill-docx.md` remain the orchestration surface for normal fills. Sensitive fallback behavior must branch to a local-only path rather than reusing an LLM-visible value retrieval path.

## Workflow Consumption Boundary

- `env-registry` is one motivating consumer, but the reusable policy must classify invocations by command metadata rather than by one hardcoded script path.
- Approval messaging must stay understandable at the point of use, but the requirement does not yet freeze how much of that messaging is centralized versus owned by each consuming command or skill.
- If a user refuses LLM access, the denied path must still leave them with a workable local next step; the policy may not fail closed without fallback instructions.
- Sensitive document filling may use local Python scripts to inject trusted local values, but this step does not yet freeze which existing command owns that local handoff or the exact artifact contract between approval, local fill, and the final DOCX output.

## Permission And Fallback Boundary

- The approval layer must be compatible with OpenCode permission checks and may add plugin-style guidance, but it must not assume plugins can replace permission enforcement.
- The shared policy is responsible for classifying sensitivity and selecting the correct user-facing response shape.
- Command-specific consumers remain responsible for supplying their concrete local fallback instructions once the shared contract is frozen.
- Any local-only document fill path must keep sensitive values out of model context entirely; the model may describe the local path, but may not receive the values themselves.

## Readiness Blocker

- The requirement still leaves multiple implementation-critical choices open:
  - whether sensitivity matching is command-name based, argument-pattern based, or a combined rule set
  - whether the shared model must distinguish read, write, and boundary-changing operations
  - how much approval and denial messaging is standardized centrally versus overridden per consumer
  - which fallback instructions are mandatory shared fields versus workflow-specific text
  - what exact local-script contract bridges sensitive value retrieval and document filling without the model seeing the values
- These choices materially change the approval registry shape, rule evaluation order, ownership boundaries, test matrix, and downstream workflow integration points.
- The current step can freeze the intended boundaries and non-goals, but it is not implementation-ready until refreshed discovery resolves the policy contract above.

---

## Locked constraints

- Sensitive operations must still require explicit user consent before execution.
- The mechanism must be reusable across multiple command paths and scripts.
- The plan must preserve the separation between policy decision, user-facing explanation, and command-specific fallback instructions.
- The plan must not assume plugins can enforce permissions on their own.
- If approval is denied, the user must still be told how to complete the task locally.
- Local document filling may use trusted local Python code, but the model must not receive the sensitive values.
- This step does not change `env-registry.py` CLI behavior and does not implement the approval mechanism itself.

---

## Scope

### In

- Freezing the reusable approval model boundary for sensitive command execution
- Defining the ownership split between permission enforcement, approval policy, user-facing messaging, and command-specific fallback text
- Defining how `env-registry` participates as one concrete consumer of the shared model
- Defining how a local-only document filling path fits beside the existing `fill-docx` workflow without exposing sensitive values to the model
- Planning the tests and integration points needed once the shared policy contract is discovered fully

### Out

- Implementing the approval mechanism runtime
- Changing the existing `env-registry.py` command behavior
- Writing plugin code or permission configuration
- Redesigning the general command/workflow architecture beyond this approval concern
- Inventing a local fill script contract before discovery freezes it

---

# TDD Batches

## Batch 1: Freeze Current Consumer And Boundary Surfaces

**Primary Concern:** Record the current commands, skills, and workflows that will consume the approval model, while keeping OpenCode permissions as the enforcement boundary.

**Tests:**
- GIVEN a sensitive command consumer such as `.opencode/commands/env.md`
- WHEN the shared approval model is applied
- THEN the command consumes the shared approval decision instead of hardcoding its own standalone policy logic

- GIVEN a consuming skill such as `.opencode/skills/env-registry/SKILL.md`
- WHEN approval is required before revealing sensitive values
- THEN the skill guidance remains a consumer-facing explanation layer rather than the enforcement boundary itself

- GIVEN a document workflow such as `.opencode/workflows/fill-docx.md`
- WHEN sensitive values are involved
- THEN the normal LLM-driven path and the local-only fallback path remain explicitly separated

**Implementation:**
- Identify the current consumer surfaces and their ownership boundaries
- Freeze that OpenCode permissions enforce execution while the approval layer controls consent messaging and fallback routing
- Keep `env-registry` and document filling as example consumers, not the sole policy definition

---

## Batch 2: Freeze Sensitivity Classification And Approval Contract After Discovery Refresh

**Primary Concern:** After refreshed discovery, lock the reusable matching rules and the minimum shared approval contract so later implementation does not guess.

**Tests:**
- To be defined by refreshed discovery: at minimum cover command classification, user approval required, user denial path, and cross-consumer reuse.

**Implementation:**
- To be defined by refreshed discovery: current scope does not yet freeze the matching surface, operation categories, or contract fields strongly enough for deterministic implementation.

---

## Batch 3: Freeze Local-Only Sensitive Document Fill Handoff After Discovery Refresh

**Primary Concern:** After refreshed discovery, lock the exact handoff between approval denial, local value injection, and final document generation without exposing sensitive values to the model.

**Tests:**
- To be defined by refreshed discovery: at minimum cover denied LLM access, successful local completion, and no secret values entering model-visible artifacts.

**Implementation:**
- To be defined by refreshed discovery: current scope does not yet freeze the local script entrypoint, intermediate artifacts, or ownership boundary with the existing `fill-docx` workflow.

---

## Files

- `.opencode/commands/env.md` - current motivating command surface that should consume the shared approval contract instead of owning the policy alone
- `.opencode/skills/env-registry/SKILL.md` - current sensitive-data skill surface that needs the same approval boundary and denied-path guidance
- `.opencode/workflows/fill-docx.md` - current document-fill workflow whose normal LLM path must stay distinct from any future local-only sensitive fallback
- `src/template_gen/generate_fill_data.py` - existing local document-fill boundary that future discovery may choose to integrate with, without exposing values to the model
- `docs/routing-flows.md` - routing documentation that will need to reflect the approved ownership split once the shared contract is frozen

## Symbols

- `main()` in `.opencode/scripts/env-registry.py` - remains a consumer of approval policy, not the place to define the reusable policy contract
- `generate_fill_data()` in `src/template_gen/generate_fill_data.py` - remains an existing local artifact-generation boundary that must not receive model-exposed secrets
- `## Steps` in `.opencode/commands/env.md`
- `## DO THIS FIRST` in `.opencode/skills/env-registry/SKILL.md`
- `## Steps` in `.opencode/workflows/fill-docx.md`

## Execution constraints

- Only plan this live step folder.
- Do not turn `env-registry` special-case behavior into the shared policy definition.
- Do not treat plugin messaging as equivalent to permission enforcement.
- Do not guess the final sensitivity matching rule set, approval schema, or local-only fill contract before discovery refresh.
- Keep the future implementation boundary narrow enough that later coding work can be tested deterministically.

## Invariants

- OpenCode permissions remain the primary enforcement layer.
- `env-registry` remains one example consumer rather than the universal definition of sensitivity.
- Users must always receive understandable approval context before sensitive execution.
- Denied approval must still lead to a usable local completion path.
- Sensitive values must not be written into vault files or git as part of this workflow.

## Deferred follow-up

- Refresh discovery to freeze the sensitivity matching surface and operation categories.
- Refresh discovery to freeze the minimum shared approval contract fields and the split between standardized and command-specific messaging.
- Refresh discovery to freeze the local-only document-fill handoff and the exact relationship to `fill-docx` and existing local Python entrypoints.
