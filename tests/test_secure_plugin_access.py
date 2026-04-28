import json
import subprocess
import hashlib
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
OPENCODE_DIR = REPO_ROOT / ".opencode"
HARNESS = OPENCODE_DIR / "scripts" / "run-secure-action-harness.mjs"
FIXTURE_SECRET_NAME = "SECURE_PLUGIN_FIXTURE_SECRET"
FIXTURE_SECRET_VALUE = "test-secret-value-for-plugin-08"


def _bun(*args):
    result = subprocess.run(
        ["bun", "run", str(HARNESS), *args],
        capture_output=True,
        text=True,
        cwd=str(OPENCODE_DIR),
        timeout=30,
    )
    return result


def _run_secure_action(service, operation, args=None):
    if args is None:
        args = {}
    input_data = json.dumps({"service": service, "operation": operation, "args": args})
    result = _bun("run-secure-action", input_data)
    if result.returncode != 0:
        raise RuntimeError(f"harness failed: {result.stderr}")
    return json.loads(result.stdout.strip())


class TestBatch1PluginContract:

    def test_malformed_input_missing_service(self):
        result = _run_secure_action("", "derive-digest", {"salt": "x"})
        assert result["ok"] is False
        assert result["error"] == "malformed-input"

    def test_malformed_input_missing_operation(self):
        result = _run_secure_action("fixture-secret", "", {"salt": "x"})
        assert result["ok"] is False
        assert result["error"] == "malformed-input"

    def test_malformed_input_no_args(self):
        input_data = json.dumps({"service": "fixture-secret", "operation": "derive-digest"})
        result = subprocess.run(
            ["bun", "run", str(HARNESS), "run-secure-action", input_data],
            capture_output=True,
            text=True,
            cwd=str(OPENCODE_DIR),
            timeout=30,
        )
        parsed = json.loads(result.stdout.strip())
        assert parsed["ok"] is False
        assert parsed["error"] == "malformed-input"

    def test_unknown_service_rejected(self):
        result = _run_secure_action("unknown-service", "any", {})
        assert result["ok"] is False
        assert result["error"] == "unknown-service"

    def test_unknown_operation_rejected(self):
        result = _run_secure_action("fixture-secret", "unknown-op", {})
        assert result["ok"] is False
        assert result["error"] == "unknown-operation"

    def test_extra_arg_keys_rejected(self):
        result = _run_secure_action("fixture-secret", "derive-digest", {"salt": "x", "extra": "bad"})
        assert result["ok"] is False
        assert "invalid-args" in result["error"]

    def test_missing_required_arg_rejected(self):
        result = _run_secure_action("fixture-secret", "derive-digest", {})
        assert result["ok"] is False
        assert "invalid-args" in result["error"]

    def test_allowlisted_operation_returns_deterministic_digest(self):
        _bun("seed-secret", FIXTURE_SECRET_NAME, FIXTURE_SECRET_VALUE)
        try:
            result = _run_secure_action("fixture-secret", "derive-digest", {"salt": "test-salt"})
            assert result["ok"] is True
            expected = hashlib.sha256(
                (FIXTURE_SECRET_VALUE + ":test-salt").encode()
            ).hexdigest()
            assert result["digest"] == expected
            assert result["digest"] != FIXTURE_SECRET_VALUE
        finally:
            _bun("remove-secret", FIXTURE_SECRET_NAME)

    def test_result_does_not_contain_secret(self):
        _bun("seed-secret", FIXTURE_SECRET_NAME, FIXTURE_SECRET_VALUE)
        try:
            result = _run_secure_action("fixture-secret", "derive-digest", {"salt": "test-salt"})
            result_str = json.dumps(result)
            assert FIXTURE_SECRET_VALUE not in result_str
        finally:
            _bun("remove-secret", FIXTURE_SECRET_NAME)


class TestBatch2Sanitization:

    def test_error_containing_secret_is_sanitized(self):
        _bun("seed-secret", FIXTURE_SECRET_NAME, FIXTURE_SECRET_VALUE)
        try:
            result = _run_secure_action("fixture-secret", "derive-digest", {"salt": ""})
            assert result["ok"] is False
            result_str = json.dumps(result)
            assert FIXTURE_SECRET_VALUE not in result_str
        finally:
            _bun("remove-secret", FIXTURE_SECRET_NAME)

    def test_missing_secret_returns_generic_failure(self):
        _bun("remove-secret", FIXTURE_SECRET_NAME)
        result = _run_secure_action("fixture-secret", "derive-digest", {"salt": "x"})
        assert result["ok"] is False
        assert result["error"] == "secret-missing"
        result_str = json.dumps(result)
        assert FIXTURE_SECRET_VALUE not in result_str
        assert FIXTURE_SECRET_NAME not in result_str


class TestBatch2CodePaths:

    def test_plugin_source_has_sanitized_output_blocked_path(self):
        source = (OPENCODE_DIR / "plugins" / "secure-plugin-access.ts").read_text()
        assert "sanitized-output-blocked" in source

    def test_plugin_source_has_handler_not_found_path(self):
        source = (OPENCODE_DIR / "plugins" / "secure-plugin-access.ts").read_text()
        assert "handler-not-found" in source

    def test_plugin_sanitize_value_function_exists(self):
        source = (OPENCODE_DIR / "plugins" / "secure-plugin-access.ts").read_text()
        assert "sanitizeValue" in source or "sanitizePayload" in source
        assert "[REDACTED_SECRET]" in source

    def test_allowlist_handlers_all_present_in_plugin(self):
        allowlist = json.loads(
            (OPENCODE_DIR / "plugin-allowlist.json").read_text()
        )
        source = (OPENCODE_DIR / "plugins" / "secure-plugin-access.ts").read_text()
        for service_name, service in allowlist["services"].items():
            for op_name, op_config in service["operations"].items():
                handler_name = op_config["handler"]
                assert handler_name in source, \
                    f"Handler {handler_name} not found in plugin source"

    def test_sanitize_payload_redacts_secret_from_result(self):
        payload = json.dumps({"ok": True, "data": FIXTURE_SECRET_VALUE})
        result = _bun("test-sanitize", payload, FIXTURE_SECRET_VALUE)
        parsed = json.loads(result.stdout.strip())
        assert parsed["wasRedacted"] is True
        assert FIXTURE_SECRET_VALUE not in json.dumps(parsed["result"])
        assert "[REDACTED_SECRET]" in json.dumps(parsed["result"])

    def test_sanitize_payload_detects_semantic_drift_in_digest(self):
        payload = json.dumps({"ok": True, "digest": FIXTURE_SECRET_VALUE})
        result = _bun("test-sanitize", payload, FIXTURE_SECRET_VALUE)
        parsed = json.loads(result.stdout.strip())
        assert parsed["wasRedacted"] is True
        assert parsed["result"]["digest"] != FIXTURE_SECRET_VALUE

    def test_sanitize_payload_no_redaction_when_secret_absent(self):
        payload = json.dumps({"ok": True, "digest": "abc123"})
        result = _bun("test-sanitize", payload, FIXTURE_SECRET_VALUE)
        parsed = json.loads(result.stdout.strip())
        assert parsed["wasRedacted"] is False
        assert parsed["result"]["digest"] == "abc123"
