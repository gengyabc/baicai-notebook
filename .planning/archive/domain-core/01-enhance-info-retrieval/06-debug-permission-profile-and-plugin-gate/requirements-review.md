---
step-key: debug-permission-profile-and-plugin-gate
requirement-version: 1
step-version: 1
---

# Requirements Review: 06-debug-permission-profile-and-plugin-gate

---

## Assessment

**correct**

---

## Findings

None. All success criteria, TDD batches, and locked constraints are satisfied.

---

## Requirement -> Plan -> Code Alignment

### Success Criteria Verification

| Criterion | Status | Evidence |
|-----------|--------|----------|
| 1. Debug-mode override path for plugin-level file access | satisfied | step.md:22-28 freezes the override topology; opencode.debug.json exists at repo root with lifted `.opencode/plugins/**` edit deny |
| 2. Preserves default deny boundary outside debug | satisfied | opencode.json:21 has `.opencode/plugins/**` edit deny restored; tests test_opencode_json_has_plugins_edit_deny passes |
| 3. Override session-scoped and auditable | satisfied | debug.md:25-26 states session-scoped; debug-mode.md:33 states override ends with session; visible `[debug: ...]` labeling preserved |
| 4. Avoids weakening unrelated security controls | satisfied | opencode.debug.json preserves all bash/read denies; tests test_bash_secret_denies_unchanged_in_debug_profile, test_read_secret_denies_unchanged_in_debug_profile pass |
| 5. Planning-ready without implementation detail | satisfied | step.md is documentation-first; no host-side permission engine code required |

### TDD Batch Coverage

| Batch | Tests | Status | Coverage |
|-------|-------|--------|----------|
| Batch 1: Freeze normal-vs-debug contract | 8 | all pass | opencode.json plugins deny restored; opencode.debug.json exists with same shape; preserves all denies except plugins edit; protects plugin-allowlist/opencode.json/self |
| Batch 2: Freeze session gate and fail-closed | 8 | all pass | `/debug` named as activation; session-scoped stated; vault-query-router as source; `state.debug === true` selects debug profile; fail-closed stated; override explicit; ends with session |
| Batch 3: Align user-visible audit behavior | 7 | all pass | all docs describe plugin-edit exception; visible labeling kept; distinguished from network search; no normal-session plugin edit claim; audit scope limited |
| Batch 4: Preserve adjacent security boundaries | 7 | all pass | bash/read secret denies unchanged; plugin-allowlist stays denied; plugins tree not denied for edit; compatible with archived boundary |
| Batch 5: Verify permission selection behavior | 5 | all pass | normal session plugins denied; debug session plugins allowed; fail-closed fallback; session end removes override; no edit outside plugins tree |

**Total: 35 tests, all passing**

---

## Spec -> Code Alignment

No feature.feature or contract.md in step folder. This is a documentation-first, permission-contract-focused step. Tests verify artifact schema correctness and doc alignment rather than runtime enforcement.

---

## Contract Validation

### opencode.json Contract

- ✓ `.opencode/plugins/**` edit deny present (line 21)
- ✓ `.opencode/plugin-allowlist.json` edit deny present (line 22)
- ✓ bash secret denies preserved (lines 4-18)
- ✓ read deny for `**/secrets/**` present (line 25)
- ✓ Compatible with archived 08-secure-plugin-access frozen shape (step.md:129)

### opencode.debug.json Contract

- ✓ Exists at repository root (per step.md:22)
- ✓ Same top-level config shape as opencode.json
- ✓ Preserves all bash denies (identical to opencode.json)
- ✓ Preserves all read denies (identical to opencode.json)
- ✓ `.opencode/plugins/**` edit deny NOT present (lifted per step.md:26)
- ✓ `.opencode/plugin-allowlist.json` edit deny present (line 21)
- ✓ `opencode.json` edit deny present (line 22)
- ✓ `opencode.debug.json` edit deny present (line 23)

---

## Test Quality

### Test Structure

- Clear batch organization matching step.md TDD structure
- Descriptive test names aligned with frozen contract statements
- Helper functions for JSON loading and doc reading
- No hardcoded paths beyond repo root resolution

### Test Coverage Gaps

None. All TDD batch requirements from step.md have corresponding tests.

### TDD Compliance

**Red**: Tests written before implementation artifacts existed (per implementation-readiness-review.md Round 2)

**Green**: All 35 tests pass, confirming implementation satisfies frozen contract

**Refactor**: Not applicable - this is a documentation-first step producing JSON artifacts and docs, not runtime code requiring refactoring

---

## Anti-Patterns Detected

None. The implementation follows the frozen contract without deviation:
- Profile placement at repo root (not nested)
- Same top-level shape (not divergent schema)
- Narrow override scope (not broad `.opencode/**`)
- Protected files remain denied (not silently allowed)
- Fail-closed stated (not fail-open)

---

## Behavior Matrix Validation

### Preserved Behaviors

| Behavior | Evidence |
|----------|----------|
| Default plugin edit deny in normal sessions | opencode.json:21 |
| Secret-related bash denies | opencode.json:4-18, opencode.debug.json:4-18 |
| `**/secrets/**` read deny | opencode.json:25, opencode.debug.json:26 |
| Plugin-allowlist edit deny | opencode.json:22, opencode.debug.json:21 |
| Session-scoped debug mode | debug.md:25, debug-mode.md:33 |
| Visible `[debug: ...]` labeling | debug.md:15 |
| Vault write suspension in debug | debug-mode.md:17 |
| Network search exception in debug | debug-mode.md:24 |

### Removed Behaviors

None. This is a new step introducing an override mechanism, not removing existing behaviors.

### Replacement Behaviors

| Behavior | Evidence |
|----------|----------|
| Plugin-edit override in debug mode | opencode.debug.json does NOT deny `.opencode/plugins/**`; debug.md:24; debug-mode.md:31 |

---

## Contradiction Checks

### No removed behaviors surviving

No behaviors were removed in this step.

### Protected files stay protected

- `.opencode/plugin-allowlist.json` - denied in both profiles (opencode.json:22, opencode.debug.json:21)
- `opencode.json` - denied in debug profile (opencode.debug.json:22)
- `opencode.debug.json` - denied in debug profile (opencode.debug.json:23)

### Override scope is narrow

- opencode.debug.json has NO broad `.opencode/**` deny pattern
- Only `.opencode/plugins/**` edit deny is lifted
- All other edit denies preserved

---

## Locked Constraints Compliance

| Constraint | Status | Evidence |
|------------|--------|----------|
| Do not weaken default deny posture outside debug | satisfied | opencode.json:21 has plugins deny |
| Do not broaden override beyond `.opencode/plugins/**` | satisfied | opencode.debug.json only lacks that pattern; tests confirm no broad `.opencode/**` |
| Do not allow debug mode to edit plugin-allowlist.json | satisfied | opencode.debug.json:21 denies it |
| Do not allow debug mode to edit opencode.json | satisfied | opencode.debug.json:22 denies it |
| Do not allow debug mode to edit opencode.debug.json | satisfied | opencode.debug.json:23 denies it |
| Do not rely on model memory alone | satisfied | debug-mode.md:28-32 specify session state mechanism |
| Do not redefine unrelated debug-mode behavior | satisfied | debug-mode.md:47-51 distinguish from network search and vault write suspension |
| Do not implement host-wide permission engine redesign | satisfied | documentation-first approach; no runtime enforcement code |
| Do not edit other live step plan | satisfied | only step 06 artifacts modified |

---

## Phase Handoff Note

**Archive context used:**
- `.planning/archive/misc/01-word-template-generation-and-filling/08-secure-plugin-access/step.md` - verified frozen permission shape compatibility

**No prior archived direction requires supersession.**

---

## Planning-Memory Follow-Up Note

None required. Step is complete and correct.

---

## Overall Summary

The implementation satisfies all success criteria from requirement.md, all TDD batches from step.md, and all locked constraints. The permission contract is correctly frozen with:

- `opencode.json` restoring the baseline `.opencode/plugins/**` edit deny
- `opencode.debug.json` at repository root with same shape, lifting only that deny while protecting plugin-allowlist, opencode.json, and itself
- Documentation aligned across debug.md, debug-mode.md, and routing-flows.md
- 35 tests passing across all 5 TDD batches

No alignment gaps, missing implementations, or contradiction issues detected.