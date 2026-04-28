---
step-key: secure-plugin-access
step-number: 08
step-folder: 08-secure-plugin-access
phase-topic: word-template-generation-and-filling
---

# Implementation Readiness Review

## Round 1

### Metadata

- requirement-version: 1
- step-version: 1
- round: 1
- mode: full
- assessed-at: 2026-04-27

### Assessment

The plan establishes clear security objectives and identifies the correct trusted execution surface (plugin layer) and enforcement boundary (OpenCode permissions). However, several concrete implementation details are missing that would require a coding model to invent behavior during implementation.

### Required Blockers

#### P1-B01: Missing allowlist JSON schema

- **Location**: step.md lines 42, 71, 109, 189
- **Finding**: The step requires a versioned allowlist schema at `.opencode/plugin-allowlist.json` that declares per operation: the secret name to resolve, accepted argument keys, and handler identifier. No concrete schema structure is provided.
- **Evidence**: step.md states "The allowlist schema must be versioned and must declare, per operation, the secret name to resolve, the accepted argument keys, and the handler identifier used by the plugin" without providing the JSON structure.
- **Impact**: A coding model would need to invent the schema shape, field names, and version field format.

#### P1-B02: Missing handler registration/dispatch mechanism

- **Location**: step.md lines 42, 50, 135, 178, 204
- **Finding**: The step requires handlers mapped from the allowlist but does not define how handlers are implemented, registered, or invoked. The term "handler identifier" appears without a corresponding registration contract.
- **Evidence**: step.md mentions "mapped to a reviewed in-repo handler" and "handler identifier used by the plugin" but the existing plugin pattern (`vault-query-router.ts`) shows a single tool with inline execute logic, not a handler dispatch system.
- **Impact**: A coding model would need to invent a handler registry pattern, handler interface, and dispatch logic.

#### P1-B03: Missing fixture capability specification

- **Location**: step.md lines 29-30, 99-101
- **Finding**: The step requires a "deterministic first-party fixture capability" for positive-path tests but does not specify what service/operation this is, what it does, or what secret it consumes.
- **Evidence**: step.md states "The committed allowlist may contain only a deterministic first-party fixture capability used to prove the framework path end to end in tests" without naming the fixture.
- **Impact**: A coding model would need to invent the fixture capability name, behavior, and test secret setup.

#### P2-B04: Missing sanitization implementation approach

- **Location**: step.md lines 47-48, 133, 47
- **Finding**: The step requires "centralized sanitization" and that no result, error, or log may contain secret values, but does not define the sanitization approach.
- **Evidence**: step.md states "Sanitization is required for both direct handler results and caught exceptions" and "output sanitization" without specifying how to detect or redact secrets.
- **Impact**: A coding model would need to choose between approaches (exact string match, pattern detection, placeholder substitution, etc.) which materially affects test assertions.

#### P2-B05: Missing deprecation vs removal decision for get command

- **Location**: requirement.md line 38, step.md line 144-145
- **Finding**: The requirement and step both say "remove or deprecate" the raw get command without making a frozen choice. This affects test expectations and CLI behavior.
- **Evidence**: requirement.md line 38: "Remove or deprecate the raw get command"; step.md batch 3 tests expect either deprecation or denial path.
- **Impact**: A coding model must make a product decision about whether get exits with deprecation warning, denial error, or is removed entirely.

#### P2-B06: Missing OpenCode permission config schema

- **Location**: step.md lines 23, 149, 193
- **Finding**: The step requires updating opencode.json with bash deny rules, edit denial, and read denial but the current opencode.json contains only a schema reference with no permission configuration.
- **Evidence**: Current opencode.json is `{"$schema": "https://opencode.ai/config.json"}`. step.md mentions "bash denies at least node -e*, node *cross-keychain*" but does not show the expected config structure.
- **Impact**: A coding model would need to discover or invent the OpenCode permission configuration schema.

### Optional Blockers

#### P3-B07: Missing sanitization scope for test secret values

- **Location**: step.md batch 2, tests
- **Finding**: Tests need a known secret value in the keychain for positive-path verification, but the plan does not specify whether tests should set up test secrets dynamically or use a pre-registered secret.
- **Evidence**: step.md line 100: "WHEN the plugin entry point runs with valid args and a stored secret" assumes a secret exists but does not specify setup.
- **Impact**: Lower priority as tests can use dynamic fixtures, but clarity would improve TDD batch executability.

### Repeated Blockers

None (first review).

### Repeated Root Cause Clusters

None (first review).

### Suggested Revisions

1. **For P1-B01**: Add a concrete allowlist JSON schema example to step.md, including:
   - Version field format
   - Service object structure
   - Operation object structure with secret name, args schema, and handler identifier
   - Example entry for the fixture capability

2. **For P1-B02**: Define the handler contract in step.md:
   - Where handler functions live (same file, separate module, or config-driven)
   - Handler function signature
   - How allowlist handler identifier maps to actual handler code
   - Whether handlers are hardcoded switch/case or config-loaded

3. **For P1-B03**: Specify the fixture capability:
   - Fixture service name (e.g., "test-fixture")
   - Fixture operation name (e.g., "echo-hash")
   - Fixture behavior (e.g., "returns SHA-256 hash of the secret value without revealing it")
   - Test secret setup approach

4. **For P2-B04**: Choose and document sanitization approach:
   - Redact exact secret value match
   - Redact any value matching secret patterns
   - Require handlers to declare output fields that may contain secrets

5. **For P2-B05**: Make frozen choice: either "deprecate with warning" or "deny with error message pointing to plugin".

6. **For P2-B06**: Provide the expected opencode.json permission config structure, or reference existing OpenCode documentation for the deny rules schema.

### Readiness Verdict

**blocked**

### Stop Reason

P1 blockers require clarification from discovered scope before implementation can proceed without inventing behavior.

### Manual Intervention Required

false

### Active Revision Focus

- step.md needs allowlist schema, handler contract, fixture capability specification
- Frozen decision needed for get command deprecation approach

---

## Round 2

### Metadata

- requirement-version: 1
- step-version: 2
- round: 2
- mode: delta
- assessed-at: 2026-04-27

### Assessment

The revised step.md (version 2) successfully resolves all six previously identified required blockers. The plan now provides concrete schemas, frozen decisions, and sufficient detail for TDD batches without requiring invention.

### Blocker Resolution Status

| Previous ID | Status | Resolution Evidence |
|---|---|---|
| P1-B01 | RESOLVED | Lines 48-65 provide exact allowlist JSON schema with version, services, operations, secretName, handler, allowedArgs fields and fixture example |
| P1-B02 | RESOLVED | Lines 74-78 define handler type signature, static HANDLERS registry, and exact key lookup dispatch |
| P1-B03 | RESOLVED | Lines 80-95 specify fixture capability: service `fixture-secret`, operation `derive-digest`, SHA-256 output, required `args.salt`, dynamic test secret seeding |
| P2-B04 | RESOLVED | Lines 103-109 define exact-value redaction with `[REDACTED]` replacement, sanitized-output-blocked fallback, applied to results, errors, and logs |
| P2-B05 | RESOLVED | Lines 113-114 freeze decision: `get` retained as denial path, exits 1 with deprecation message, no keychain lookup |
| P2-B06 | RESOLVED | Lines 115-136 provide exact opencode.json permission object with bash, edit, and read deny entries |
| P3-B07 | RESOLVED | Line 94 specifies dynamic secret seeding and cleanup in tests |

### New Blockers

None identified. The revision introduces sufficient concrete detail for implementation without introducing new ambiguity.

### Repeated Blockers

None. All previous blockers resolved.

### Repeated Root Cause Clusters

None. No recurrence of the ambiguity patterns from Round 1.

### Remaining Ambiguity Check

Minor implementation discretion points remain but do not require invention:

- Line 161: "shared JS keychain helper under `.opencode/scripts/` if needed" allows implementation to decide whether to extract shared code from existing env-registry.mjs helpers. This is within acceptable bounds as a code organization choice.
- Line 106: "semantically misleading" sanitization rejection criterion requires judgment, but the concrete fallback (reject with `sanitized-output-blocked` error) prevents invention.

### TDD Executability Verification

All four test batches can be executed without invented behavior:

- Batch 1: malformed input, fixture success, unknown rejection all testable with concrete validation rules and fixture spec
- Batch 2: error sanitization, result sanitization, missing secret all testable with defined redaction rules and failure behavior
- Batch 3: get deprecation, permission config, doc updates all verifiable against frozen decisions
- Batch 4: no fallback, setup commands preserved, explicit mapping all testable/reviewable

### Suggested Revisions

None. The plan is sufficiently concrete for implementation.

### Readiness Verdict

**ready**

### Stop Reason

All required blockers cleared. No additional revision needed.

### Manual Intervention Required

false

### Active Revision Focus

None. Implementation may proceed.

---

## Round 3

### Metadata

- requirement-version: 1
- step-version: 2
- round: 3
- mode: verification
- assessed-at: 2026-04-27

### Assessment

Verification confirms the plan remains ready for implementation. No required blockers present. The frozen contracts, schemas, and behaviors from step.md version 2 provide sufficient concrete specification for TDD batches without requiring invention.

### Verification Checklist

| Check | Status | Evidence |
|---|---|---|
| No required blockers remain | PASS | Round 2 resolved P1-B01 through P2-B06, no new blockers introduced |
| Plan does not require invented key behavior | PASS | Fixture capability, allowlist schema, handler contract, sanitization, permission config all frozen |
| TDD batches executable | PASS | All 4 batches have concrete test/implementation pairs without invention gaps |
| Source-of-truth boundaries clear | PASS | Plugin owns secret resolution; allowlist owns capability approval; opencode.json owns enforcement |
| Failure/fallback behavior defined | PASS | Lines 99-109 define sanitization failure, missing-secret response, and deny fallback |
| No references to nonexistent artifacts | PASS | All referenced files and symbols are either existing or planned for creation in this step |
| Validation order frozen | PASS | Lines 36-42 define 6-step validation sequence before secret lookup |

### Required Blockers

None.

### Optional Blockers

None. No low-priority expansion introduced per verification policy.

### Repeated Blockers

None.

### Repeated Root Cause Clusters

None.

### Implementation Discretion Points (Acceptable)

These remain unchanged from Round 2 and do not require invention:

1. Code organization choice for shared keychain helper (line 160) - within acceptable bounds
2. Judgment-based `sanitized-output-blocked` rejection (line 106) - concrete fallback prevents invention

### Cross-Step Dependency Verification

- Step 07 dependency acknowledged: `opencode-env-registry` service namespace preserved (line 21)
- `cross-keychain` usage locked: lines 145, 220 confirm JS keychain access path
- Setup commands preserved: lines 24, 268 confirm `list`, `add`, `remove`, `set`, `describe` remain for trusted setup

### Success Criteria Traceability

| Requirement Success Criterion | Plan Coverage |
|---|---|
| 1. Allowlisted pairs only, unlisted rejected | Lines 36-44 validation order + lines 48-65 allowlist schema |
| 2. No raw secrets in response/error/log | Lines 99-109 sanitization boundary |
| 3. Bash bypass blocked | Lines 115-136 permission config |
| 4. Plugin edit protection | Lines 128-129 edit deny rule |
| 5. Raw get deprecated | Lines 113-114 frozen denial path |
| 6. Output contains no secret material | Lines 103-109 exact-value redaction |
| 7. Anti-bypass measures | Lines 121-126 bash deny patterns |

All success criteria traceable to frozen plan elements.

### Suggested Revisions

None. Verification confirms readiness.

### Readiness Verdict

**verified-ready**

### Stop Reason

Verification complete. No blockers. Implementation authorized.

### Manual Intervention Required

false

### Active Revision Focus

None.