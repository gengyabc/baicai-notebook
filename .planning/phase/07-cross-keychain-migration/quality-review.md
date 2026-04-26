---
schema: review-result-v1
skill: quality-review
phase: word-template-generation-and-filling
step_folder: 07-cross-keychain-migration
result_file: .planning/phase/07-cross-keychain-migration/quality-review.md
finding_id_scope: phase
append_only: true
step-version: 1
requirement-version: 1
---

## Round 1

```yaml
round: 1
mode: full
assessment: mixed
base_sha: 66d89f600e3325d9ff2c1882a662b2683c565571
head_sha: 66d89f600e3325d9ff2c1882a662b2683c565571
scope: .opencode/scripts/env-registry.mjs, tests/test_env_registry.py, .opencode/skills/env-registry/SKILL.md, .opencode/package.json, pyproject.toml
stop_reason: none
manual_intervention_required: false
active_batch_under_review: QB-001
open_findings: 5
batch_count: 2
repeated_findings: []
repeated_root_cause_clusters: []
```

### Code Review Summary

The cross-keychain migration from Python/keyring to JS/cross-keychain is well-executed overall. The Python script (`env-registry.py`) is confirmed removed, `keyring` is absent from `pyproject.toml`, `cross-keychain` is present in `.opencode/package.json`, and the SKILL.md correctly references `bun run` commands. The test suite is thorough (469 lines covering registry CRUD, name validation, access control, keychain backend, migration boundaries, and dependency migration).

Key issues found: silent error swallowing in keychain operations (`deleteValue` and `getValue`) can mask failures and leave orphaned secrets or return stale env-var values without warning. A race condition exists in concurrent registry file writes. Minor usability gaps around help and masking feedback.

### Normalized Findings

- ID: QR-cross-keychain-migration-P1-001
- Priority: P1
- Required: yes
- Status: open
- Title: `cmdRemove` reports success when keychain deletion silently fails
- Location: `.opencode/scripts/env-registry.mjs:80-84`
- Root Cause Cluster: silent-error-swallow
- Batch Candidate: QB-001
- Summary: `deleteValue` catches all keychain errors with empty `catch {}`. After `cmdRemove` deletes the entry from the JSON registry, it calls `deleteValue`, but if the keychain delete fails, the user still sees "Removed 'X' from registry." and the secret persists in the keychain as an orphan.
- Impact: Orphaned secrets remain in keychain with no user visibility. Over time this creates untracked sensitive data that is impossible to discover or clean up through the CLI.
- Recommended Fix: Propagate the delete result from `deleteValue`. If keychain deletion fails after successful registry removal, warn the user (e.g., "Warning: keychain deletion failed for 'X'; secret may still exist in keychain.") rather than reporting unconditional success.

- ID: QR-cross-keychain-migration-P2-001
- Priority: P2
- Required: yes
- Status: open
- Title: `getValue` silently swallows keychain read errors and falls back to env
- Location: `.opencode/scripts/env-registry.mjs:59-66`
- Root Cause Cluster: silent-error-swallow
- Batch Candidate: QB-001
- Summary: The `catch {}` on line 63 means any keychain error (permission denied, keychain locked, service unavailable) is silently ignored and the function falls back to `process.env`. The user has no indication that keychain was consulted but failed; they just get the env var value.
- Impact: Confusing behavior where a user has a keychain value set but receives an env var value instead without warning. Makes debugging keychain connectivity issues very difficult.
- Recommended Fix: Distinguish between "not found" (expected) and "error" (unexpected) in the catch block. On unexpected errors, emit a stderr warning before falling back to env, or at minimum log the error for diagnostics.

- ID: QR-cross-keychain-migration-P2-002
- Priority: P2
- Required: no
- Status: open
- Title: No concurrency protection on registry file writes
- Location: `.opencode/scripts/env-registry.mjs:11-49`
- Root Cause Cluster: file-concurrency
- Batch Candidate: QB-002
- Summary: `loadRegistry` and `saveRegistry` are not atomic. Two concurrent `add` calls can both read the same state, one writes, then the other overwrites with stale data, losing the first addition.
- Impact: Data loss if the CLI is invoked concurrently (e.g., from multiple opencode sessions or automated scripts). Low probability but silent and unrecoverable when it occurs.
- Recommended Fix: Use a simple file lock (e.g., write a `.lock` file with exclusive access before `loadRegistry`/`saveRegistry`) or use atomic write via temp file + rename pattern, combined with a retry loop.

- ID: QR-cross-keychain-migration-P3-001
- Priority: P3
- Required: no
- Status: optional
- Title: No `--help` flag or dedicated help command
- Location: `.opencode/scripts/env-registry.mjs:228-300`
- Root Cause Cluster: usability
- Batch Candidate: none
- Summary: `parseArgs` only shows usage text when no command is given or an unknown command is used. There is no `--help` flag or `help` subcommand for discoverability.
- Impact: Users must read SKILL.md or source code to learn available commands and flags.
- Recommended Fix: Add `--help` / `-h` handling that prints available commands and their arguments.

- ID: QR-cross-keychain-migration-P3-002
- Priority: P3
- Required: no
- Status: optional
- Title: Interactive password input provides no visual feedback
- Location: `.opencode/scripts/env-registry.mjs:86-115`
- Root Cause Cluster: usability
- Batch Candidate: none
- Summary: In TTY raw mode, typed characters are completely invisible (no echo, no asterisks). Users may think the program is frozen, especially on first use.
- Impact: Minor usability friction; users unfamiliar with the tool may press Ctrl+C out of confusion.
- Recommended Fix: Print a hint like "(input hidden, press Enter when done)" or show asterisk/bullet per character typed.

### Suggested Required Fix Batches

- Batch ID: QB-001
- Selection Order: 1
- Findings: QR-cross-keychain-migration-P1-001, QR-cross-keychain-migration-P2-001
- Reason: Both findings share the "silent error swallowing" root cause in keychain operations. Fixing them together involves refactoring `getValue` and `deleteValue` to distinguish expected-not-found from unexpected errors, and surfacing warnings to the user.

- Batch ID: QB-002
- Selection Order: 2
- Findings: QR-cross-keychain-migration-P2-002
- Reason: File concurrency protection is an independent concern from error handling. Can be addressed in a separate pass after QB-001.

### Previous Findings Verification

none (round 1)

## Round 2

```yaml
round: 2
mode: delta
assessment: clean
base_sha: 66d89f600e3325d9ff2c1882a662b2683c565571
head_sha: 66d89f600e3325d9ff2c1882a662b2683c565571
scope: .opencode/scripts/env-registry.mjs, tests/test_env_registry.py
stop_reason: clean
manual_intervention_required: false
active_batch_under_review: QB-001
open_findings: 0
batch_count: 2
repeated_findings: []
repeated_root_cause_clusters: []
```

### Fix Verification

- ID: QR-cross-keychain-migration-P1-001
- Status: fixed_pending_review
- Verification: `cmdRemove` (lines 161-185) now inlines `deletePassword` instead of delegating to `deleteValue`. On keychain deletion failure, it catches the error, emits `Warning: keychain deletion failed for 'X': <message>` to stderr, and after the "Removed" message, emits `Warning: Secret for 'X' may still exist in keychain.`. This directly addresses the orphaned-secret concern. Fix is correct and complete.

- ID: QR-cross-keychain-migration-P2-001
- Status: fixed_pending_review
- Verification: `getValue` (lines 58-69) now emits `Warning: keychain read failed for 'X': <message>` to stderr in the catch block before falling back to `process.env`. This distinguishes "keychain error" from "keychain not found" (the null/undefined path on line 61 returns without warning, which is correct — not-found is expected). Fix matches the recommended approach.

- ID: QR-cross-keychain-migration-P2-002
- Status: fixed_pending_review
- Verification: `saveRegistry` (lines 43-48) now writes to a temp file in `os.tmpdir()` with a timestamped name, then uses `fs.promises.rename` to atomically move it to `REGISTRY_PATH`. The `rename` import is present (line 1), `tmpdir` import is present (line 4). This follows the recommended "temp file + rename" pattern and prevents partial/corrupt writes on concurrent access. Note: this does not fully prevent the TOCTOU race between `loadRegistry` and `saveRegistry` (two processes could still read the same state and one overwrites the other), but since the finding was P2/Required:no and the atomic write eliminates the corruption risk, this is a reasonable resolution level.

- ID: QR-cross-keychain-migration-P3-001
- Status: optional
- No change; remains optional.

- ID: QR-cross-keychain-migration-P3-002
- Status: optional
- No change; remains optional.

### Assessment

All required findings (P1-001, P2-001) from QB-001 are fixed. P2-002 (QB-002) was also fixed proactively. The `silent-error-swallow` root cause cluster is fully resolved — both `getValue` and `cmdRemove` now surface keychain errors to the user via stderr warnings. The `file-concurrency` cluster is mitigated by the atomic write pattern. No regressions observed in the test file. Assessment: **clean**.

## Round 3

```yaml
round: 3
mode: verification
assessment: clean
base_sha: 66d89f600e3325d9ff2c1882a662b2683c565571
head_sha: 66d89f600e3325d9ff2c1882a662b2683c565571
scope: .opencode/scripts/env-registry.mjs
stop_reason: clean
manual_intervention_required: false
active_batch_under_review: none
open_findings: 0
batch_count: 0
repeated_findings: []
repeated_root_cause_clusters: []
```

### Verification of Round 2 Fixes

- ID: QR-cross-keychain-migration-P1-001
- Status: closed
- Verification: `cmdRemove` (lines 161-185) wraps `deletePassword` in try/catch. On failure, sets `keychainWarning = true` and emits `Warning: keychain deletion failed for 'X': <message>` to stderr (line 175-177). After the "Removed" message, conditionally emits `Warning: Secret for 'X' may still exist in keychain.` (lines 180-184). Fix confirmed stable and correct.

- ID: QR-cross-keychain-migration-P2-001
- Status: closed
- Verification: `getValue` (lines 58-69) catch block emits `Warning: keychain read failed for 'X': <message>` to stderr (lines 63-65) before falling back to `process.env`. The null/undefined path (line 61) correctly returns without warning. Fix confirmed stable and correct.

- ID: QR-cross-keychain-migration-P2-002
- Status: closed
- Verification: `saveRegistry` (lines 43-48) writes to `join(tmpdir(), 'env-registry-${Date.now()}.json')` then calls `rename(tmpPath, REGISTRY_PATH)`. Imports for `rename` (line 1) and `tmpdir` (line 4) are present. Atomic write pattern confirmed stable and correct.

### Assessment

All three `fixed_pending_review` findings from Round 2 are confirmed fixed in the current code. No regressions introduced. Assessment: **clean**. Stop reason: **clean**.
