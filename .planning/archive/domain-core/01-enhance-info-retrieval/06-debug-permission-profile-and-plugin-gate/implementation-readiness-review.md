---
step-key: debug-permission-profile-and-plugin-gate
---

# Implementation Readiness Review

---

## Round 1

- requirement-version: 1
- step-version: 1
- round: 1
- mode: full
- assessment: blocked
- readiness_verdict: blocked
- stop_reason: baseline prerequisite missing - the step assumes a deny rule for `.opencode/plugins/**` that does not exist in current opencode.json
- manual_intervention_required: yes
- active_revision_focus: requirement.md and step.md both premise a baseline deny that is not present
- repeated_blockers: []
- repeated_root_cause_clusters: []

---

## Blockers

### P0-001: Baseline permission prerequisite missing

- Severity: P0
- Required: yes
- Status: open
- Revised pending review: no
- Category: prerequisite-baseline-missing
- Location: step.md:13, opencode.json:20-22
- Summary: The step objective (line 13) states the goal is to "allow work inside `.opencode/plugins/**` during a debug session while preserving the normal hard deny boundary everywhere else". However, the current `opencode.json` does NOT contain an edit deny rule for `.opencode/plugins/**`. It only denies `.opencode/plugin-allowlist.json`. The archived step 08-secure-plugin-access planned to establish `.opencode/plugins/**` edit deny, but this rule does not appear in the current permission config.
- Evidence:
  - step.md:13 - "Define one explicit, auditable debug-only permission override path that allows work inside `.opencode/plugins/**` during a debug session while preserving the normal hard deny boundary everywhere else"
  - step.md:25 - "The first-version override scope is narrow: it lifts the default edit deny only for `.opencode/plugins/**`"
  - step.md:39 - "The default plugin edit deny must remain the documented and committed normal-session behavior"
  - opencode.json:20-22 - current edit denies only `.opencode/plugin-allowlist.json`, not `.opencode/plugins/**`
  - Archived 08-secure-plugin-access/step.md:129 - shows intended rule `"edit": { ".opencode/plugins/**": "deny" }`
- Root Cause: Either the deny rule was never implemented correctly, was intentionally removed, or has regressed. The step premises a baseline that does not exist.
- Implementation Impact: A coding model implementing this step would have no baseline deny to override. The entire permission override design is built on a premise that is false in the current system state.
- Suggested Revision: Either: (a) acknowledge the missing baseline and include establishing it as part of this step's scope, (b) confirm whether the deny was intentionally removed and rewrite the step to match current reality, or (c) defer this step until a prerequisite step establishes the baseline deny.

---

### P1-001: Undefined debug profile artifact location and timing

- Severity: P1
- Required: yes
- Status: open
- Revised pending review: no
- Category: missing-implementation-shape
- Location: step.md:113, step.md:62
- Summary: The step references `opencode.debug.json` as a "tracked debug permission profile artifact" but does not specify where this file should be created, what its parent directory is, or when in the implementation sequence it should be created relative to other changes.
- Evidence:
  - step.md:113 - lists `opencode.debug.json` in Files section with no description of creation timing or location
  - step.md:62 - "Adding one tracked debug permission profile artifact that documents the debug-only edit allowance"
  - glob search found no existing `opencode.debug.json`
- Root Cause: Missing concrete shape and placement instruction for the new artifact.
- Implementation Impact: A coding model would need to invent the file location, name, and creation timing.
- Suggested Revision: Specify the exact path for the debug profile (e.g., `.opencode/debug-permission.json` or `opencode.debug.json` at root), the schema shape, and the creation order relative to permission enforcement updates.

---

### P1-002: Missing activation mechanism specification

- Severity: P1
- Required: yes
- Status: open
- Revised pending review: no
- Category: undefined-activation-behavior
- Location: step.md:36, step.md:23
- Summary: The step states "/debug is the only supported activation path" but does not specify HOW the permission override is activated. Is it automatic profile switching when debug session starts? Runtime permission check that reads session state? Manual profile selection? The mechanism for connecting `/debug` command execution to permission profile changes is undefined.
- Evidence:
  - step.md:36 - "Entering debug mode through `/debug` is the only supported activation path for the plugin-edit override in this step"
  - step.md:23 - "Activation is still runtime-gated by the existing session-scoped debug flag. The debug profile may be considered active only when the current session is in debug mode"
  - The current vault-query-router/index.ts tracks `state.debug` but there is no documented mechanism for how the permission system reads this state
- Root Cause: Missing frozen decision on the activation mechanism.
- Implementation Impact: A coding model would need to invent the activation mechanism - whether it's OpenCode-level profile switching, plugin-level permission delegation, or runtime permission layer changes.
- Suggested Revision: Freeze one activation mechanism: specify whether OpenCode host automatically selects the debug profile when session debug flag is true, whether a permission plugin reads session state and applies overrides, or another concrete mechanism.

---

### P2-001: Circular dependency concern unaddressed for debug state manager

- Severity: P2
- Required: yes
- Status: open
- Revised pending review: no
- Category: dependency-cycle-risk
- Location: step.md:24, step.md:117
- Summary: The step identifies `.opencode/plugins/vault-query-router/index.ts` as the source of truth for session debug state. This file lives inside `.opencode/plugins/**`. If a deny rule for `.opencode/plugins/**` existed, there would be a circular dependency: you need the debug state manager to work in order to activate debug mode, but you couldn't edit or fix the debug state manager during debug mode without already having debug mode active. The step does not address this concern.
- Evidence:
  - step.md:24 - "The session-scoped debug state already tracked in `.opencode/plugins/vault-query-router/index.ts` is the source of truth"
  - vault-query-router/index.ts:31-35 - defines SessionState with debug boolean
  - vault-query-router/index.ts:789-791 - sets debug=true when `/debug` command executes
- Root Cause: The critical debug-state-tracking code is in the protected area that the step wants to make editable during debug. If that code breaks, there is no path to fix it.
- Implementation Impact: A coding model implementing this step should understand how edits to the debug state manager itself would be handled, but the step provides no guidance.
- Suggested Revision: Either: (a) acknowledge the circular dependency and specify that the debug state manager is a special case that remains editable outside the normal deny pattern, or (b) document that the debug state manager is trusted code that should not need debug-mode edits, or (c) specify a fallback path for fixing the debug state manager if it becomes corrupted.

---

### P2-002: Missing test coverage for permission enforcement integration

- Severity: P2
- Required: yes
- Status: open
- Revised pending review: no
- Category: missing-tdd-batch
- Location: step.md:80-107
- Summary: The TDD batches focus on documentation alignment and contract testing but do not cover the actual permission enforcement mechanism. There are no tests for: (a) how the permission system checks session debug state, (b) how the permission system applies the debug profile override, (c) what happens if the debug state source is missing or corrupted, (d) how the fail-closed fallback works.
- Evidence:
  - Batch 1 (lines 80-86) - tests document presence of permission rules and profile artifacts, not enforcement behavior
  - Batch 2 (lines 88-92) - tests session gate documentation, not runtime enforcement
  - Batch 3 (lines 95-99) - tests doc consistency, not permission switching logic
  - Batch 4 (lines 101-107) - tests boundary preservation, not enforcement mechanism
- Root Cause: TDD batches are documentation-focused rather than behavior-focused.
- Implementation Impact: A coding model implementing the actual permission enforcement would have no test guidance for the core mechanism.
- Suggested Revision: Add a TDD batch that covers permission enforcement behavior: (a) normal session applies normal profile, (b) debug session applies debug profile, (c) session state source missing triggers fail-closed, (d) permission override is session-scoped and ends when session ends.

---

### P2-003: Incomplete audit trail specification

- Severity: P2
- Required: yes
- Status: open
- Revised pending review: no
- Category: missing-output-shape
- Location: step.md:37-38, step.md:148
- Summary: The step mentions user-visible session labeling (`[debug: ...]`) but does not specify what additional audit trail is needed beyond existing behavior. The deferred follow-up mentions "audit logging beyond visible session labeling" but does not specify whether the first version needs any audit artifacts.
- Evidence:
  - step.md:37 - "The session must expose that debug mode is active in user-visible session context, consistent with the existing `[debug: ...]` label behavior"
  - step.md:38 - "The permission contract must state explicitly that the plugin-edit override is active only for the current session"
  - debug.md:15 - already describes `[debug: topic]` label behavior
  - step.md:148 - deferred: "Audit logging beyond visible session labeling"
- Root Cause: Unclear whether the first version requires additional audit artifacts beyond existing labeling.
- Implementation Impact: A coding model would not know whether to create audit logs, session metadata records, or rely only on existing labeling.
- Suggested Revision: Specify whether the first version audit trail is: (a) only the existing `[debug: ...]` label plus documentation, or (b) includes additional session metadata artifacts, or (c) requires audit log entries.

---

## Suggested Revisions

### step.md revisions needed

1. **Resolve P0-001**: Add a prerequisite section that either:
   - States "This step requires that `.opencode/plugins/**` edit deny already exists in opencode.json. If missing, establish it as part of this step or as a prerequisite."
   - Or, if the deny was intentionally removed: rewrite the objective to reflect current reality

2. **Resolve P1-001**: Add concrete specification for debug profile artifact:
   - Specify exact path: either `.opencode/debug-permission.json` or `opencode.debug.json` at repository root
   - Specify schema shape matching the permission contract
   - Specify creation timing: whether it's created before or after permission enforcement updates

3. **Resolve P1-002**: Add frozen activation mechanism:
   - Specify whether OpenCode host automatically selects debug profile when session state.debug is true
   - Or specify whether a permission enforcement plugin reads vault-query-router session state
   - Or specify another concrete mechanism with source code references

4. **Resolve P2-001**: Add circular dependency handling:
   - Either specify that vault-query-router/index.ts is a trusted core that should not need debug edits
   - Or specify a special exception path for fixing the debug state manager
   - Or document that this concern is deferred to later work

5. **Resolve P2-002**: Add TDD batch for enforcement behavior:
   - Add Batch 5 covering permission enforcement integration tests

6. **Resolve P2-003**: Clarify audit trail scope for first version:
   - Specify whether audit is only labeling + docs, or includes additional artifacts

---

## Assessment

The step is **blocked** for implementation. The primary blocker (P0-001) is that the step premises a baseline deny rule for `.opencode/plugins/**` that does not exist in the current `opencode.json`. Without this baseline, the entire permission override design has nothing to override.

This is not a clarification gap - it is a prerequisite baseline that must exist before the step can proceed. The options are:
1. Establish the baseline deny as part of this step's scope (requires scope expansion)
2. Confirm whether the deny was intentionally removed and rewrite the step
3. Create a prerequisite step to establish the baseline first

Until this P0 blocker is resolved, the step cannot proceed to implementation.

---

## Next Steps

1. **Manual intervention required**: Human planner must determine whether `.opencode/plugins/**` deny was:
   - Never implemented correctly from step 08
   - Intentionally removed for operational reasons
   - Accidentally regressed
   
2. Based on determination, either:
   - Add `.opencode/plugins/**` deny to opencode.json and proceed
   - Rewrite this step to match current reality without the deny
   - Create a prerequisite step to establish the deny baseline

3. After resolving P0-001, address P1 blockers for profile location and activation mechanism.

---

## Round 2

- requirement-version: 1
- step-version: 1
- round: 2
- mode: delta
- assessment: ready
- readiness_verdict: ready
- stop_reason: null
- manual_intervention_required: no
- active_revision_focus: step.md revised to address all blockers from Round 1
- repeated_blockers: []
- repeated_root_cause_clusters: []

---

## Blocker Clearance Summary

All blockers from Round 1 have been cleared through targeted revisions in step.md.

### P0-001: Baseline permission prerequisite missing - CLEARED

- Previous Severity: P0
- Required: yes
- Status: cleared
- Clearance Evidence:
  - step.md:13 - Objective now states "Restore and preserve the normal hard edit deny for `.opencode/plugins/**` in `opencode.json`, then define one explicit, auditable debug-only override path"
  - step.md:21 - Explicitly acknowledges "Because the current file does not yet carry the required `.opencode/plugins/**` deny, this step must restore that deny as part of its first batch"
  - step.md:66 - Scope explicitly includes "Restoring the missing `.opencode/plugins/**` edit deny in `opencode.json` so the normal-session baseline exists in the live config"
  - step.md:90 - Batch 1 test covers "`opencode.json` restores and preserves the normal deny for `.opencode/plugins/**`"
- Resolution Method: The step adopted option (a) from Round 1 suggested revision - acknowledging the missing baseline and including its restoration as part of this step's scope

---

### P1-001: Undefined debug profile artifact location and timing - CLEARED

- Previous Severity: P1
- Required: yes
- Status: cleared
- Clearance Evidence:
  - step.md:22 - Specifies exact path: "at repository root path `opencode.debug.json`"
  - step.md:23 - Specifies schema: "`opencode.debug.json` must use the same top-level config shape as `opencode.json` and must preserve every normal deny except for the narrow edit difference that allows `.opencode/plugins/**`"
  - step.md:129 - Specifies creation timing: "tracked debug-only permission profile artifact at repository root, created after the root baseline deny is restored"
- Resolution Method: All three aspects (path, schema, timing) are now frozen in the step plan

---

### P1-002: Missing activation mechanism specification - CLEARED

- Previous Severity: P1
- Required: yes
- Status: cleared
- Clearance Evidence:
  - step.md:24 - Freezes mechanism: "the permission selector checks the current session state, uses `opencode.debug.json` only when `state.debug === true`, and otherwise falls back to `opencode.json`"
  - step.md:73 - Reinforces: "Freezing the first-version permission-selection behavior: use `opencode.json` in normal sessions, use `opencode.debug.json` only when trusted session debug state is active, and fail closed otherwise"
  - step.md:28 - Specifies fail-closed: "If the permission selector cannot read trusted session debug state, cannot load `opencode.debug.json`, or sees ambiguous state, it must fail closed and apply `opencode.json`"
  - step.md:139 - Symbol frozen: `state.debug === true` as the selection condition
- Resolution Method: One concrete activation mechanism is now frozen with explicit selection logic

---

### P2-001: Circular dependency concern unaddressed - CLEARED

- Previous Severity: P2
- Required: yes
- Status: cleared
- Clearance Evidence:
  - step.md:32 - Explicitly addresses: "This step does not require a self-healing path for a broken debug-state manager. First version may treat `.opencode/plugins/vault-query-router/index.ts` as bootstrap-trusted code: if `/debug` cannot set trusted session state, plugin edits remain denied and repair of the debug-state manager is an out-of-band local maintenance task rather than an LLM-granted fallback"
  - step.md:82 - Out of scope explicitly excludes "Adding persistent audit logs or recovery automation for a broken debug-state manager"
- Resolution Method: Circular dependency is acknowledged and explicitly designated as an out-of-band maintenance concern, not requiring in-step fallback automation

---

### P2-002: Missing test coverage for permission enforcement integration - CLEARED

- Previous Severity: P2
- Required: yes
- Status: cleared
- Clearance Evidence:
  - step.md:117-122 - New Batch 5 added: "Verify permission selection behavior" with four tests:
    - Test 1: "in a normal session, permission evaluation uses `opencode.json` and keeps `.opencode/plugins/**` denied"
    - Test 2: "in a debug session where trusted session state sets `state.debug === true`, permission evaluation uses `opencode.debug.json` and allows edits only under `.opencode/plugins/**`"
    - Test 3: "if trusted session state is missing, unreadable, or ambiguous, permission evaluation fails closed to `opencode.json`"
    - Test 4: "when the session ends, the debug override no longer applies because permission evaluation no longer sees an active debug session"
- Resolution Method: Full TDD batch for enforcement behavior added as requested in Round 1

---

### P2-003: Incomplete audit trail specification - CLEARED

- Previous Severity: P2
- Required: yes
- Status: cleared
- Clearance Evidence:
  - step.md:46 - Specifies first-version audit scope: "First-version audit behavior is limited to visible debug-session labeling plus the tracked permission-profile files and docs; persistent audit logging is deferred"
  - step.md:108 - Test clarifies: "first-version audit scope is clearly limited to visible labeling plus tracked profile artifacts"
  - step.md:167 - Deferred follow-up explicitly states: "Persistent audit logging beyond visible session labeling"
- Resolution Method: Audit scope for first version is explicitly limited and deferred items are clearly marked

---

## New Observations (Optional)

The following observations do not block implementation but are noted for future awareness:

### N1: Implementation-host gap acknowledged correctly

The step correctly places host-side permission engine implementation out of scope (step.md:77, 165), while still documenting the contract that the host would implement. This is appropriate for a planning artifact - the step defines the contract without requiring the coding model to implement host-level machinery.

However, Batch 5 tests (step.md:117-122) test "permission evaluation" behavior. A coding model should interpret these as tests of the documented contract artifacts (opencode.json and opencode.debug.json schema correctness, doc alignment) rather than tests of runtime permission enforcement, since the runtime enforcement is out of scope. This distinction does not block implementation but should be kept clear during implementation.

### N2: Profile placement at repository root

The step freezes `opencode.debug.json` at repository root (step.md:22, 129). This placement is frozen and acceptable, though future implementation should verify whether OpenCode host supports multi-profile discovery at root. Since host-side implementation is deferred, this artifact serves as a documented contract for future host consumption.

---

## Assessment

The step is **ready** for implementation. All P0, P1, and P2 blockers from Round 1 have been cleared through targeted revisions that:

1. Expanded scope to include baseline deny restoration (P0-001)
2. Frozen exact path, schema, and timing for debug profile artifact (P1-001)
3. Frozen one concrete activation mechanism with explicit selection logic (P1-002)
4. Acknowledged circular dependency and designated it as out-of-band maintenance (P2-001)
5. Added TDD Batch 5 for permission selection behavior verification (P2-002)
6. Clarified first-version audit scope limitation (P2-003)

The plan no longer requires the coding model to invent:
- Baseline deny rules (now explicit in scope)
- Profile artifact location or schema (now frozen)
- Activation mechanism (now frozen to session-state-gated selection)
- Circular dependency handling (now acknowledged as bootstrap-trusted)
- Test coverage for enforcement behavior (Batch 5 added)
- Audit trail scope (now limited to labeling + docs)

No required blockers remain. The step can proceed to implementation.

---

## Next Steps

Proceed to implementation. Optionally run verification mode after implementation to confirm the documented contract is satisfied by implementation artifacts.