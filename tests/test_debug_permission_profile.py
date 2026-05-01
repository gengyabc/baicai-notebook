"""
Tests for step 06: Debug Permission Profile and Plugin Gate.

These tests verify that permission contract artifacts (opencode.json, opencode.debug.json)
and documentation (debug.md, debug-mode.md, routing-flows.md) satisfy the frozen contract
from step.md TDD Batches 1-5.

Since this step is documentation-first and permission-contract-focused, tests validate
artifact schema correctness and doc alignment rather than runtime permission enforcement.
"""

import json
import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _load_json(relative: str) -> dict:
    p = REPO_ROOT / relative
    return json.loads(p.read_text(encoding="utf-8"))


def _read_doc(relative: str) -> str:
    p = REPO_ROOT / relative
    return p.read_text(encoding="utf-8")


def _read_source(relative: str) -> str:
    p = REPO_ROOT / relative
    return p.read_text(encoding="utf-8")


# ===================================================================
# Batch 1: Freeze the normal-vs-debug permission contract
# ===================================================================

class TestBatch1NormalVsDebugContract:
    """Batch 1: opencode.json restores .opencode/plugins/** deny;
    opencode.debug.json exists as a separate artifact; debug profile
    lifts only .opencode/plugins/** edit denial while keeping
    plugin-allowlist.json protected; debug profile also protects
    opencode.json and opencode.debug.json."""

    def test_opencode_json_has_plugins_edit_deny(self):
        cfg = _load_json("opencode.json")
        edit = cfg["permission"]["edit"]
        assert edit.get(".opencode/plugins/**") == "deny", (
            "opencode.json must restore .opencode/plugins/** edit deny"
        )

    def test_opencode_json_keeps_plugin_allowlist_deny(self):
        cfg = _load_json("opencode.json")
        edit = cfg["permission"]["edit"]
        assert edit.get(".opencode/plugin-allowlist.json") == "deny", (
            "opencode.json must keep .opencode/plugin-allowlist.json edit deny"
        )

    def test_debug_profile_exists_at_repo_root(self):
        p = REPO_ROOT / "opencode.debug.json"
        assert p.is_file(), "opencode.debug.json must exist at repository root"

    def test_debug_profile_has_same_top_level_shape(self):
        normal = _load_json("opencode.json")
        debug = _load_json("opencode.debug.json")
        # Same top-level keys (at least $schema and permission)
        assert "$schema" in debug, "opencode.debug.json must have $schema"
        assert "permission" in debug, "opencode.debug.json must have permission"
        assert set(normal.keys()) == set(debug.keys()), (
            "opencode.debug.json must use same top-level config shape as opencode.json"
        )

    def test_debug_profile_preserves_all_normal_denies_except_plugins_edit(self):
        normal = _load_json("opencode.json")
        debug = _load_json("opencode.debug.json")

        # bash denies must be identical
        assert normal["permission"]["bash"] == debug["permission"]["bash"], (
            "opencode.debug.json must preserve every normal bash deny"
        )

        # read denies must be identical
        assert normal["permission"]["read"] == debug["permission"]["read"], (
            "opencode.debug.json must preserve every normal read deny"
        )

        # edit denies: debug must NOT have .opencode/plugins/** deny
        debug_edit = debug["permission"]["edit"]
        assert debug_edit.get(".opencode/plugins/**") != "deny", (
            "opencode.debug.json must lift .opencode/plugins/** edit denial"
        )

    def test_debug_profile_keeps_plugin_allowlist_deny(self):
        debug = _load_json("opencode.debug.json")
        edit = debug["permission"]["edit"]
        assert edit.get(".opencode/plugin-allowlist.json") == "deny", (
            "opencode.debug.json must continue to deny .opencode/plugin-allowlist.json"
        )

    def test_debug_profile_does_not_grant_broad_opencode_access(self):
        debug = _load_json("opencode.debug.json")
        edit = debug["permission"]["edit"]
        for pattern in edit:
            if pattern == ".opencode/plugins/**":
                # This one should NOT be deny
                assert edit[pattern] != "deny"
            elif pattern == ".opencode/plugin-allowlist.json":
                assert edit[pattern] == "deny"
            elif pattern in ("opencode.json", "opencode.debug.json"):
                assert edit[pattern] == "deny", (
                    f"opencode.debug.json must deny edits to {pattern}"
                )
            # No broad .opencode/** pattern
            assert pattern != ".opencode/**", (
                "debug profile must not claim broad .opencode/** access"
            )

    def test_debug_profile_protects_opencode_json_and_self(self):
        debug = _load_json("opencode.debug.json")
        edit = debug["permission"]["edit"]
        assert edit.get("opencode.json") == "deny", (
            "opencode.debug.json must deny edits to opencode.json"
        )
        assert edit.get("opencode.debug.json") == "deny", (
            "opencode.debug.json must deny edits to opencode.debug.json (itself)"
        )


# ===================================================================
# Batch 2: Freeze the session gate and fail-closed activation rule
# ===================================================================

class TestBatch2SessionGateAndFailClosed:
    """Batch 2: docs name /debug + session flag as only activation;
    vault-query-router is source of truth; state.debug === true selects
    opencode.debug.json; override ends with session; debug exception
    is explicit, not implicit."""

    def test_debug_md_names_debug_command_as_activation_path(self):
        doc = _read_doc(".opencode/commands/debug.md")
        assert "/debug" in doc, "debug.md must reference /debug as activation path"

    def test_debug_md_mentions_session_scoped(self):
        doc = _read_doc(".opencode/commands/debug.md")
        assert re.search(r"session.scoped|session scoped|ends when the session", doc, re.I), (
            "debug.md must state override is session-scoped"
        )

    def test_debug_mode_md_references_session_debug_state(self):
        doc = _read_doc(".opencode/rules/debug-mode.md")
        assert "state.debug" in doc, (
            "debug-mode.md must reference state.debug as source of truth for session debug state"
        )

    def test_debug_mode_md_mentions_vault_query_router_as_source(self):
        doc = _read_doc(".opencode/rules/debug-mode.md")
        assert "vault-query-router" in doc, (
            "debug-mode.md must reference vault-query-router as source of truth"
        )

    def test_debug_mode_md_states_debug_true_selects_debug_profile(self):
        doc = _read_doc(".opencode/rules/debug-mode.md")
        assert re.search(r"state\.debug\s*===\s*true", doc), (
            "debug-mode.md must state state.debug === true selects opencode.debug.json"
        )

    def test_debug_mode_md_states_fail_closed(self):
        doc = _read_doc(".opencode/rules/debug-mode.md")
        assert re.search(r"fail.closed|fails.closed", doc, re.I), (
            "debug-mode.md must describe fail-closed behavior"
        )

    def test_docs_describe_override_as_explicit(self):
        doc = _read_doc(".opencode/rules/debug-mode.md")
        assert re.search(r"explicit|not implicit", doc, re.I), (
            "debug-mode.md must describe plugin-edit exception as explicit, not implicit"
        )

    def test_docs_state_override_ends_with_session(self):
        doc = _read_doc(".opencode/rules/debug-mode.md")
        assert re.search(r"override.*ends|ends.*session|session.*ends.*override", doc, re.I), (
            "debug-mode.md must state override ends when session ends"
        )


# ===================================================================
# Batch 3: Align user-visible audit behavior across debug docs
# ===================================================================

class TestBatch3DocAlignment:
    """Batch 3: debug.md, debug-mode.md, and routing-flows.md describe
    same plugin-edit exception; docs keep visible debug-session labeling;
    docs distinguish plugin-edit from unrelated debug exceptions; no doc
    claims normal sessions gain plugin edit permission; first-version
    audit scope is limited."""

    def test_debug_md_describes_plugin_edit_exception(self):
        doc = _read_doc(".opencode/commands/debug.md")
        assert ".opencode/plugins" in doc, (
            "debug.md must describe plugin-edit override"
        )

    def test_debug_mode_md_describes_plugin_edit_exception(self):
        doc = _read_doc(".opencode/rules/debug-mode.md")
        assert ".opencode/plugins" in doc, (
            "debug-mode.md must describe plugin-edit override"
        )

    def test_routing_flows_md_describes_debug_permission_exception(self):
        doc = _read_doc("docs/routing-flows.md")
        assert re.search(r"plugin.*edit|permission.*exception|debug.*permission", doc, re.I), (
            "routing-flows.md must mention debug permission exception"
        )

    def test_docs_keep_visible_debug_session_labeling(self):
        debug_md = _read_doc(".opencode/commands/debug.md")
        assert re.search(r"\[debug", debug_md), (
            "debug.md must keep [debug: ...] labeling behavior"
        )

    def test_docs_distinguish_plugin_edit_from_network_search(self):
        doc = _read_doc(".opencode/rules/debug-mode.md")
        # Must mention both but distinguish them
        has_plugin = ".opencode/plugins" in doc
        has_network = re.search(r"network|websearch|webfetch", doc, re.I)
        # If both are mentioned, they should be in separate contexts
        if has_plugin and has_network:
            # Ensure they are described as separate behaviors
            assert re.search(r"separate|independent|distinct|unrelated|different", doc, re.I), (
                "docs must distinguish plugin-edit from network-search permission"
            )

    def test_no_doc_claims_normal_sessions_gain_plugin_edit(self):
        for rel in [
            ".opencode/commands/debug.md",
            ".opencode/rules/debug-mode.md",
        ]:
            doc = _read_doc(rel)
            # Should not claim normal sessions can/may edit plugins.
            # Match sentences that say normal sessions CAN/MAY/ARE ALLOWED TO
            # edit plugins, but not descriptions of debug overriding the normal deny.
            normal_plugin_match = re.search(
                r"normal\s+session(?:s)?\s+(?:can|may|are\s+allowed\s+to)\s+edit\s+.*plugin",
                doc, re.I
            )
            assert not normal_plugin_match, (
                f"{rel} must not claim normal sessions gain plugin edit permission"
            )

    def test_docs_limit_first_version_audit_scope(self):
        doc = _read_doc(".opencode/rules/debug-mode.md")
        assert re.search(r"visible.*label|label.*visible|session.*label", doc, re.I), (
            "debug-mode.md must state first-version audit is limited to visible labeling + tracked artifacts"
        )


# ===================================================================
# Batch 4: Preserve adjacent security boundaries
# ===================================================================

class TestBatch4AdjacentSecurityBoundaries:
    """Batch 4: secret-related bash denies and read denies unchanged;
    .opencode/plugin-allowlist.json stays outside debug edit override;
    plugin-local config inside .opencode/plugins/** is in scope;
    final contract compatible with archived secure-plugin-access boundary."""

    def test_bash_secret_denies_unchanged_in_debug_profile(self):
        normal = _load_json("opencode.json")
        debug = _load_json("opencode.debug.json")
        assert normal["permission"]["bash"] == debug["permission"]["bash"], (
            "Secret-related bash denies must be identical in both profiles"
        )

    def test_read_secret_denies_unchanged_in_debug_profile(self):
        normal = _load_json("opencode.json")
        debug = _load_json("opencode.debug.json")
        assert normal["permission"]["read"] == debug["permission"]["read"], (
            "Read denies must be identical in both profiles"
        )

    def test_opencode_json_secrets_read_deny_exists(self):
        cfg = _load_json("opencode.json")
        read = cfg["permission"]["read"]
        assert read.get("**/secrets/**") == "deny", (
            "opencode.json must deny reading **/secrets/**"
        )

    def test_debug_profile_plugin_allowlist_stays_denied(self):
        debug = _load_json("opencode.debug.json")
        assert debug["permission"]["edit"].get(".opencode/plugin-allowlist.json") == "deny", (
            ".opencode/plugin-allowlist.json must stay denied even in debug profile"
        )

    def test_debug_profile_plugins_tree_not_denied_for_edit(self):
        debug = _load_json("opencode.debug.json")
        edit = debug["permission"]["edit"]
        assert edit.get(".opencode/plugins/**") != "deny", (
            "Plugin-local config under .opencode/plugins/** must be editable in debug"
        )

    def test_contract_compatible_with_archived_plugin_deny_boundary(self):
        """Verify opencode.json matches the shape frozen in archived
        08-secure-plugin-access step.md for the edit deny on plugins."""
        cfg = _load_json("opencode.json")
        edit = cfg["permission"]["edit"]
        assert ".opencode/plugins/**" in edit, (
            "opencode.json edit denies must include .opencode/plugins/**"
        )
        assert ".opencode/plugin-allowlist.json" in edit, (
            "opencode.json edit denies must include .opencode/plugin-allowlist.json"
        )

    def test_debug_docs_state_plugin_allowlist_stays_protected(self):
        doc = _read_doc(".opencode/rules/debug-mode.md")
        assert ".opencode/plugin-allowlist.json" in doc, (
            "debug-mode.md must state .opencode/plugin-allowlist.json stays protected"
        )


# ===================================================================
# Batch 5: Verify permission selection behavior (contract artifacts)
# ===================================================================

class TestBatch5PermissionSelectionBehavior:
    """Batch 5: contract-level verification of permission selection
    behavior. Tests verify that the artifact pair (opencode.json,
    opencode.debug.json) plus documentation correctly describe the
    selection mechanism: normal -> opencode.json, debug ->
    opencode.debug.json, fail-closed -> opencode.json."""

    def test_normal_session_plugins_denied(self):
        """In a normal session, permission evaluation uses opencode.json
        and keeps .opencode/plugins/** denied."""
        cfg = _load_json("opencode.json")
        assert cfg["permission"]["edit"][".opencode/plugins/**"] == "deny"

    def test_debug_session_plugins_allowed(self):
        """In a debug session where state.debug === true, permission
        evaluation uses opencode.debug.json and allows edits only under
        .opencode/plugins/**."""
        debug = _load_json("opencode.debug.json")
        edit = debug["permission"]["edit"]
        # plugins tree is NOT denied
        assert edit.get(".opencode/plugins/**") != "deny"
        # but allowlist IS denied
        assert edit.get(".opencode/plugin-allowlist.json") == "deny"
        # and opencode.json IS denied
        assert edit.get("opencode.json") == "deny"

    def test_fail_closed_to_normal_profile(self):
        """If trusted session state is missing/unreadable/ambiguous,
        permission evaluation fails closed to opencode.json.
        Verify this is documented."""
        doc = _read_doc(".opencode/rules/debug-mode.md")
        # Must describe fail-closed -> opencode.json
        assert re.search(r"fail.closed.*opencode\.json|opencode\.json.*fail.closed", doc, re.I) or \
               re.search(r"falls? back to opencode\.json", doc, re.I), (
            "debug-mode.md must state fail-closed falls back to opencode.json"
        )

    def test_session_end_removes_debug_override(self):
        """When session ends, the debug override no longer applies.
        Verify this is documented."""
        doc = _read_doc(".opencode/rules/debug-mode.md")
        assert re.search(
            r"session.*end|end.*session|override.*no longer|no longer.*override",
            doc, re.I
        ), (
            "debug-mode.md must state override no longer applies when session ends"
        )

    def test_debug_profile_does_not_allow_edit_outside_plugins_tree(self):
        """opencode.debug.json must not allow edits outside .opencode/plugins/**
        that are denied in opencode.json."""
        normal = _load_json("opencode.json")
        debug = _load_json("opencode.debug.json")
        normal_edit = normal["permission"]["edit"]
        debug_edit = debug["permission"]["edit"]
        # Every deny in normal except .opencode/plugins/** must also be deny in debug
        for pattern, rule in normal_edit.items():
            if pattern == ".opencode/plugins/**":
                continue  # This is the one exception
            assert debug_edit.get(pattern) == rule, (
                f"debug profile must preserve normal deny for {pattern}: "
                f"expected {rule}, got {debug_edit.get(pattern)}"
            )


class TestRuntimeDebugPermissionActivation:
    """Runtime activation uses the session update API when /debug runs."""

    def test_vault_query_router_uses_v2_session_update_client(self):
        source = _read_source(".opencode/plugins/vault-query-router/index.ts")
        assert "@opencode-ai/sdk/v2/client" in source
        assert "createOpencodeV2Client" in source
        assert "sessionClient.session.update" in source

    def test_runtime_patch_allows_plugins_and_protects_trusted_files(self):
        source = _read_source(".opencode/plugins/vault-query-router/index.ts")
        assert '.opencode/plugins/**' in source
        assert '.opencode/plugin-allowlist.json' in source
        assert 'opencode.json' in source
        assert 'opencode.debug.json' in source
        assert re.search(r'permission:\s*"edit"', source)
        assert re.search(r'action:\s*"allow"', source)
        assert re.search(r'action:\s*"deny"', source)

    def test_runtime_patch_fail_closed_on_profile_validation_failure(self):
        source = _read_source(".opencode/plugins/vault-query-router/index.ts")
        assert 'buildDebugSessionPermissionRules' in source
        assert 'debug permission override skipped; profile validation failed' in source
        assert 'Using normal permissions.' in source
