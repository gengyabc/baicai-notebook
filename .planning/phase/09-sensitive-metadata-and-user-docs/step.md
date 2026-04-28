---
step-key: sensitive-metadata-and-user-docs
step-version: 1
requirement-version: 1
---

# Sensitive Metadata And User Docs

---

## Objective

Make sensitive-data workflows discoverable without widening secret exposure by freezing the model-visible boundary to registry metadata only and updating the user-facing documentation so a user can register a new entry, set its value locally, and understand that raw secret values never become model-readable.

---

## Metadata Visibility Contract

- The only model-visible sensitive-entry metadata in this step is the pair `{ name, description }` stored in `.opencode/env-registry.json`.
- The canonical discovery surface is the existing env-registry list flow implemented by `.opencode/scripts/env-registry.mjs`; other docs or help surfaces may reference that flow, but must not become separate authoritative metadata inventories.
- No model-facing doc, skill, or help text in this step may imply that raw values, keychain contents, or additional hidden metadata fields are discoverable.
- `README.md` must provide a short overview with exactly one realistic example entry so onboarding stays discoverable without turning the root readme into an operational manual.
- `.opencode/env-registry-README.md` is the detailed operational source for self-service registration and value-setting, with concrete examples that keep the value opaque.

## Existing Contract And Source-Of-Truth Boundary

- `.opencode/env-registry.json` already stores only `name` and `description` records under `env_vars`; this file remains the sole source of truth for model-discoverable sensitive metadata in this step.
- `.opencode/scripts/env-registry.mjs` already enforces the public registry management commands: `list`, `add`, `remove`, `set`, and `describe`, while `get` remains a deprecated denial path.
- `.opencode/skills/env-registry/SKILL.md` may direct the model to the canonical list command, but must not inline or invent a parallel metadata source.
- `secure_action` remains the only model-usable path for secret-consuming operations; this step documents that boundary but does not redesign it.

## Documentation Decisions

- Root `README.md` must add one concise section that explains:
  - what sensitive-entry discovery exposes
  - that discovery is limited to entry name and description
  - that values are set locally by the user and never returned to the model
  - one realistic example such as `MY_ID_CARD`
- `.opencode/env-registry-README.md` must become the detailed self-service guide and must include:
  - the canonical `list`, `add`, `set`, and `describe` flows
  - at least one realistic register-then-set example with a real entry type
  - wording that separates metadata discovery from value access
  - user-local keychain access notes as a user-owned path, clearly distinct from model capabilities
- `.opencode/skills/env-registry/SKILL.md` may be updated only as needed to keep its discovery wording aligned with the canonical metadata boundary and the existing command surface.

---

## Locked constraints

- Expose only sensitive entry names and descriptions to the model; never values.
- Treat `.opencode/env-registry.json` plus the existing `list` surface as the single source of truth for sensitive metadata discovery.
- Do not add a new metadata API, new plugin capability, or a second authoritative discovery document in this step.
- Keep documentation examples realistic, but never include a real secret value.
- Keep the step compatible with the existing secure plugin boundary and deprecated raw `get` behavior.
- Do not edit any other live step plan while implementing this step.

---

## Scope

### In

- Documenting the metadata visibility contract in root `README.md`
- Refreshing `.opencode/env-registry-README.md` so a user can self-register an entry and set its value without model value exposure
- Aligning `.opencode/skills/env-registry/SKILL.md` wording with the canonical list-based discovery boundary when needed
- Making small implementation or test adjustments only if current docs or command output contradict the frozen metadata boundary

### Out

- Exposing raw sensitive values to the model under any condition
- Adding new discovery channels beyond the existing registry/list surface
- Redesigning secret storage, secure plugin behavior, or permission policy
- Expanding document-fill execution design beyond referencing that opaque secure consumption exists elsewhere

---

# TDD Batches

## Batch 1: Freeze The Metadata Discovery Boundary

**Primary Concern:** Ensure the real registry surface and planning language agree that only `name` and `description` are discoverable.

**Tests:**
- GIVEN `.opencode/env-registry.json`
- WHEN its schema and the `list` command behavior are inspected
- THEN the only model-visible sensitive metadata fields are `name` and `description`

- GIVEN model-facing env-registry guidance
- WHEN discovery instructions are reviewed
- THEN they point to the canonical `list` surface and do not imply raw value access or extra metadata fields

**Implementation:**
- Inspect and, if needed, minimally update `.opencode/scripts/env-registry.mjs` and `.opencode/skills/env-registry/SKILL.md` so the documented discovery contract matches actual behavior
- Add or refresh concise documentation language that explicitly names the metadata boundary

---

## Batch 2: Add Root-Level Onboarding Without Overexposing Detail

**Primary Concern:** Make the capability discoverable from `README.md` while keeping the root doc high level and security-accurate.

**Tests:**
- GIVEN root `README.md`
- WHEN the sensitive-data capability section is read
- THEN it explains the name-plus-description-only boundary, points to the detailed guide, and includes exactly one realistic example entry

- GIVEN the root example
- WHEN it is reviewed for security wording
- THEN it shows how a user registers or recognizes an entry without printing or suggesting a real secret value

**Implementation:**
- Add one short root `README.md` section covering capability, safety boundary, and one realistic example
- Link the reader to `.opencode/env-registry-README.md` for full operational steps

---

## Batch 3: Make Self-Service Registration Operationally Clear

**Primary Concern:** Ensure the detailed env-registry guide lets a user add an entry and set its value themselves without confusing metadata visibility with secret access.

**Tests:**
- GIVEN `.opencode/env-registry-README.md`
- WHEN a user follows the documented happy path
- THEN the sequence `list -> add -> set -> describe` is understandable and uses realistic examples

- GIVEN the detailed guide's security explanation
- WHEN model and user capability boundaries are reviewed
- THEN metadata discovery, secure plugin consumption, and user-local keychain access are clearly separated

**Implementation:**
- Refresh `.opencode/env-registry-README.md` command examples and surrounding wording for self-service onboarding
- Keep direct keychain instructions explicitly scoped to user-local operations rather than model-readable access

---

## Files

- `README.md`
- `.opencode/env-registry-README.md`
- `.opencode/skills/env-registry/SKILL.md`
- `.opencode/scripts/env-registry.mjs`
- `.opencode/env-registry.json`

## Symbols

- `loadRegistry`
- `cmdList`
- `cmdAdd`
- `cmdSet`
- `cmdDescribe`
- `cmdGet`

## Execution constraints

- Use `bun` command examples only for JS-side workflows.
- Preserve the current command surface unless a minimal wording or behavior fix is required to remove a contradiction with the requirement.
- Prefer documentation edits over code edits unless the current implementation materially violates the frozen metadata boundary.
- Keep example values opaque by using interactive `set` or placeholder stdin examples, not literal real secrets.

## Invariants

- `.opencode/env-registry.json` remains metadata-only.
- `list` remains the canonical model-discoverable sensitive-entry surface.
- `get` remains unavailable for raw secret retrieval.
- `secure_action` remains the model path for secret-backed operations that return sanitized outputs only.

## Deferred follow-up

- Deciding whether future command or skill help should inline example metadata output instead of only pointing to `list`
- Any broader UX redesign for secure document filling or additional discovery surfaces
