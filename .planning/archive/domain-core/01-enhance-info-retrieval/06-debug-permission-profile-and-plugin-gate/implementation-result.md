---
schema: implementation-result-v1
step-key: debug-permission-profile-and-plugin-gate
step-folder: 06-debug-permission-profile-and-plugin-gate
requirement-version: 1
step-version: 1
result-version: 1
implementation-status: complete
---

# Implementation Result: 06-debug-permission-profile-and-plugin-gate

## Plan Source

- @.planning/phase/06-debug-permission-profile-and-plugin-gate/step.md

## Based On

- @.planning/phase/06-debug-permission-profile-and-plugin-gate/implementation-readiness-review.md (Round 2: ready)

## Summary

- Step: 06-debug-permission-profile-and-plugin-gate
- Status: complete
- Result Scope: current implementation batch only

## Files Changed

- `opencode.json` - restored `.opencode/plugins/**` edit deny in the normal-session permission boundary
- `opencode.debug.json` - created at repository root with same top-level config shape as opencode.json; lifts `.opencode/plugins/**` edit denial while keeping `.opencode/plugin-allowlist.json`, `opencode.json`, and `opencode.debug.json` denied
- `.opencode/commands/debug.md` - added plugin-edit override section describing session gate, fail-closed behavior, protected files, and independence from other debug exceptions
- `.opencode/rules/debug-mode.md` - added plugin-edit permission override section with profile selection (`state.debug === true`), source of truth reference to vault-query-router, fail-closed guard, protected files, bootstrap-trusted state manager, and first-version audit scope
- `docs/routing-flows.md` - updated debug command routing graph to include plugin-edit override; added debug permission exception routing graph and routing standards section
- `tests/test_debug_permission_profile.py` - added 35 tests across 5 TDD batches covering contract artifacts and doc alignment

## Behavior Implemented

- Restored the missing `.opencode/plugins/**` edit deny in `opencode.json` as the normal-session baseline
- Created `opencode.debug.json` at repository root with same top-level config shape, preserving every normal deny except lifting `.opencode/plugins/**` edit denial, while continuing to deny `.opencode/plugin-allowlist.json`, `opencode.json`, and `opencode.debug.json`
- Updated debug command docs to describe the plugin-edit override, its session gate (`/debug` + `state.debug === true`), and fail-closed behavior
- Updated debug-mode rule to describe the permission exception, profile selection mechanism, source of truth (vault-query-router), and first-version audit scope
- Updated routing flows to include debug permission exception graph and standards
- Aligned documented source of truth for session debug state with existing session flag behavior in vault-query-router

## Tests Added

- `tests/test_debug_permission_profile.py::TestBatch1NormalVsDebugContract::test_opencode_json_has_plugins_edit_deny`
- `tests/test_debug_permission_profile.py::TestBatch1NormalVsDebugContract::test_opencode_json_keeps_plugin_allowlist_deny`
- `tests/test_debug_permission_profile.py::TestBatch1NormalVsDebugContract::test_debug_profile_exists_at_repo_root`
- `tests/test_debug_permission_profile.py::TestBatch1NormalVsDebugContract::test_debug_profile_has_same_top_level_shape`
- `tests/test_debug_permission_profile.py::TestBatch1NormalVsDebugContract::test_debug_profile_preserves_all_normal_denies_except_plugins_edit`
- `tests/test_debug_permission_profile.py::TestBatch1NormalVsDebugContract::test_debug_profile_keeps_plugin_allowlist_deny`
- `tests/test_debug_permission_profile.py::TestBatch1NormalVsDebugContract::test_debug_profile_does_not_grant_broad_opencode_access`
- `tests/test_debug_permission_profile.py::TestBatch1NormalVsDebugContract::test_debug_profile_protects_opencode_json_and_self`
- `tests/test_debug_permission_profile.py::TestBatch2SessionGateAndFailClosed::test_debug_md_names_debug_command_as_activation_path`
- `tests/test_debug_permission_profile.py::TestBatch2SessionGateAndFailClosed::test_debug_md_mentions_session_scoped`
- `tests/test_debug_permission_profile.py::TestBatch2SessionGateAndFailClosed::test_debug_mode_md_references_session_debug_state`
- `tests/test_debug_permission_profile.py::TestBatch2SessionGateAndFailClosed::test_debug_mode_md_mentions_vault_query_router_as_source`
- `tests/test_debug_permission_profile.py::TestBatch2SessionGateAndFailClosed::test_debug_mode_md_states_debug_true_selects_debug_profile`
- `tests/test_debug_permission_profile.py::TestBatch2SessionGateAndFailClosed::test_debug_mode_md_states_fail_closed`
- `tests/test_debug_permission_profile.py::TestBatch2SessionGateAndFailClosed::test_docs_describe_override_as_explicit`
- `tests/test_debug_permission_profile.py::TestBatch2SessionGateAndFailClosed::test_docs_state_override_ends_with_session`
- `tests/test_debug_permission_profile.py::TestBatch3DocAlignment::test_debug_md_describes_plugin_edit_exception`
- `tests/test_debug_permission_profile.py::TestBatch3DocAlignment::test_debug_mode_md_describes_plugin_edit_exception`
- `tests/test_debug_permission_profile.py::TestBatch3DocAlignment::test_routing_flows_md_describes_debug_permission_exception`
- `tests/test_debug_permission_profile.py::TestBatch3DocAlignment::test_docs_keep_visible_debug_session_labeling`
- `tests/test_debug_permission_profile.py::TestBatch3DocAlignment::test_docs_distinguish_plugin_edit_from_network_search`
- `tests/test_debug_permission_profile.py::TestBatch3DocAlignment::test_no_doc_claims_normal_sessions_gain_plugin_edit`
- `tests/test_debug_permission_profile.py::TestBatch3DocAlignment::test_docs_limit_first_version_audit_scope`
- `tests/test_debug_permission_profile.py::TestBatch4AdjacentSecurityBoundaries::test_bash_secret_denies_unchanged_in_debug_profile`
- `tests/test_debug_permission_profile.py::TestBatch4AdjacentSecurityBoundaries::test_read_secret_denies_unchanged_in_debug_profile`
- `tests/test_debug_permission_profile.py::TestBatch4AdjacentSecurityBoundaries::test_opencode_json_secrets_read_deny_exists`
- `tests/test_debug_permission_profile.py::TestBatch4AdjacentSecurityBoundaries::test_debug_profile_plugin_allowlist_stays_denied`
- `tests/test_debug_permission_profile.py::TestBatch4AdjacentSecurityBoundaries::test_debug_profile_plugins_tree_not_denied_for_edit`
- `tests/test_debug_permission_profile.py::TestBatch4AdjacentSecurityBoundaries::test_contract_compatible_with_archived_plugin_deny_boundary`
- `tests/test_debug_permission_profile.py::TestBatch4AdjacentSecurityBoundaries::test_debug_docs_state_plugin_allowlist_stays_protected`
- `tests/test_debug_permission_profile.py::TestBatch5PermissionSelectionBehavior::test_normal_session_plugins_denied`
- `tests/test_debug_permission_profile.py::TestBatch5PermissionSelectionBehavior::test_debug_session_plugins_allowed`
- `tests/test_debug_permission_profile.py::TestBatch5PermissionSelectionBehavior::test_fail_closed_to_normal_profile`
- `tests/test_debug_permission_profile.py::TestBatch5PermissionSelectionBehavior::test_session_end_removes_debug_override`
- `tests/test_debug_permission_profile.py::TestBatch5PermissionSelectionBehavior::test_debug_profile_does_not_allow_edit_outside_plugins_tree`

## Canonical E2E Path

- none

## E2E Run Result

- not run

## Commands Run

- `uv run pytest tests/test_debug_permission_profile.py -v` (35 passed)
- `uv run pytest tests/ -v` (201 passed, 0 failed)

## Known Risks

- Host-side permission engine does not yet implement automatic profile switching; the contract is documented but not enforced at runtime
- Debug profile placement at repository root (`opencode.debug.json`) assumes future host support for multi-profile discovery at root
- The debug state manager (vault-query-router) is bootstrap-trusted; if it breaks, there is no in-session repair path

## Next Suggested Review Focus

- Verify that opencode.debug.json deny list is complete and no unintended edit paths are opened
- Confirm doc consistency across all three updated files (debug.md, debug-mode.md, routing-flows.md)
- Check that the debug permission exception in routing-flows.md mermaid graph matches the text description
