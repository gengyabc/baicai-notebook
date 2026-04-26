import json
import os
import subprocess
import sys
from pathlib import Path

import pytest


CLI_PATH = Path(__file__).parent.parent / ".opencode" / "scripts" / "env-registry.py"
REGISTRY_PATH = Path(__file__).parent.parent / ".opencode" / "env-registry.json"


def _run_cli(args: list[str], stdin_input: str | None = None, env: dict | None = None) -> tuple[int, str, str]:
    run_env = os.environ.copy()
    if env:
        run_env.update(env)
    result = subprocess.run(
        [sys.executable, str(CLI_PATH)] + args,
        capture_output=True,
        text=True,
        input=stdin_input,
        timeout=10,
        env=run_env,
    )
    return result.returncode, result.stdout.strip(), result.stderr.strip()


def _write_registry(payload: dict) -> None:
    REGISTRY_PATH.parent.mkdir(parents=True, exist_ok=True)
    REGISTRY_PATH.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")


def _read_registry() -> dict:
    if not REGISTRY_PATH.exists():
        return {"version": 1, "env_vars": []}
    return json.loads(REGISTRY_PATH.read_text(encoding="utf-8"))


def _clear_registry() -> None:
    if REGISTRY_PATH.exists():
        REGISTRY_PATH.unlink()


class TestRegistryJsonOperations:
    def test_load_registry_returns_empty_when_file_not_exists(self):
        _clear_registry()
        code, out, err = _run_cli(["list"])
        assert code == 0
        data = json.loads(out)
        assert data == []

    def test_load_registry_exits_1_on_corrupt_json(self):
        _write_registry({"invalid": True})
        REGISTRY_PATH.write_text("not valid json {", encoding="utf-8")
        code, out, err = _run_cli(["list"])
        assert code == 1
        assert "corrupt" in err.lower() or "parse" in err.lower() or "invalid" in err.lower()

    def test_load_registry_exits_1_on_version_mismatch(self):
        _write_registry({"version": 2, "env_vars": []})
        code, out, err = _run_cli(["list"])
        assert code == 1
        assert "version" in err.lower()

    def test_save_registry_creates_parent_directories(self):
        _clear_registry()
        _run_cli(["add", "TEST_VAR", "test description"])
        assert REGISTRY_PATH.exists()
        assert REGISTRY_PATH.parent.exists()

    def test_registry_json_schema_is_valid(self):
        _clear_registry()
        _run_cli(["add", "TEST_VAR", "test"])
        data = _read_registry()
        assert data["version"] == 1
        assert isinstance(data["env_vars"], list)
        assert data["env_vars"][0]["name"] == "TEST_VAR"
        assert data["env_vars"][0]["description"] == "test"


class TestValidateName:
    def test_valid_uppercase_start(self):
        _clear_registry()
        code, out, err = _run_cli(["add", "VALID_NAME", "desc"])
        assert code == 0

    def test_valid_single_letter(self):
        _clear_registry()
        code, out, err = _run_cli(["add", "A", "desc"])
        assert code == 0

    def test_valid_uppercase_with_numbers(self):
        _clear_registry()
        code, out, err = _run_cli(["add", "VAR123", "desc"])
        assert code == 0

    def test_valid_uppercase_with_underscores(self):
        _clear_registry()
        code, out, err = _run_cli(["add", "MY_TEST_VAR", "desc"])
        assert code == 0

    def test_invalid_starts_with_number(self):
        _clear_registry()
        code, out, err = _run_cli(["add", "123BAD", "desc"])
        assert code == 1
        assert "invalid" in err.lower() or "name" in err.lower()

    def test_invalid_starts_with_lowercase(self):
        _clear_registry()
        code, out, err = _run_cli(["add", "lowercase", "desc"])
        assert code == 1

    def test_invalid_contains_dash(self):
        _clear_registry()
        code, out, err = _run_cli(["add", "BAD-NAME", "desc"])
        assert code == 1

    def test_invalid_contains_space(self):
        _clear_registry()
        code, out, err = _run_cli(["add", "BAD NAME", "desc"])
        assert code == 1

    def test_invalid_starts_with_underscore(self):
        _clear_registry()
        code, out, err = _run_cli(["add", "_BAD", "desc"])
        assert code == 1


class TestListCommand:
    def test_list_empty_registry(self):
        _clear_registry()
        code, out, err = _run_cli(["list"])
        assert code == 0
        data = json.loads(out)
        assert data == []

    def test_list_populated_registry(self):
        _clear_registry()
        _run_cli(["add", "VAR_A", "desc A"])
        _run_cli(["add", "VAR_B", "desc B"])
        code, out, err = _run_cli(["list"])
        assert code == 0
        data = json.loads(out)
        assert len(data) == 2
        assert {"name": "VAR_A", "description": "desc A"} in data
        assert {"name": "VAR_B", "description": "desc B"} in data

    def test_list_json_format_default(self):
        _clear_registry()
        _run_cli(["add", "TEST", "desc"])
        code, out, err = _run_cli(["list"])
        assert code == 0
        data = json.loads(out)
        assert isinstance(data, list)

    def test_list_json_format_explicit(self):
        _clear_registry()
        _run_cli(["add", "TEST", "desc"])
        code, out, err = _run_cli(["list", "--format", "json"])
        assert code == 0
        data = json.loads(out)
        assert isinstance(data, list)

    def test_list_table_format(self):
        _clear_registry()
        _run_cli(["add", "TEST_VAR", "test description"])
        code, out, err = _run_cli(["list", "--format", "table"])
        assert code == 0
        assert "TEST_VAR" in out
        assert "test description" in out

    def test_list_outputs_only_env_vars_array(self):
        _clear_registry()
        _run_cli(["add", "TEST", "desc"])
        code, out, err = _run_cli(["list"])
        data = json.loads(out)
        assert isinstance(data, list)
        assert not isinstance(data, dict)


class TestAddCommand:
    def test_add_succeeds(self):
        _clear_registry()
        code, out, err = _run_cli(["add", "NEW_VAR", "new description"])
        assert code == 0
        data = _read_registry()
        assert {"name": "NEW_VAR", "description": "new description"} in data["env_vars"]

    def test_add_duplicate_exits_1(self):
        _clear_registry()
        _run_cli(["add", "EXISTING_VAR", "desc"])
        code, out, err = _run_cli(["add", "EXISTING_VAR", "different desc"])
        assert code == 1
        assert "duplicate" in err.lower() or "already" in err.lower()

    def test_add_invalid_name_exits_1(self):
        _clear_registry()
        code, out, err = _run_cli(["add", "bad-name", "desc"])
        assert code == 1

    def test_add_missing_name_exits_1(self):
        _clear_registry()
        code, out, err = _run_cli(["add"])
        assert code == 1

    def test_add_missing_description_exits_1(self):
        _clear_registry()
        code, out, err = _run_cli(["add", "VAR_NAME"])
        assert code == 1


class TestRemoveCommand:
    def test_remove_succeeds(self):
        _clear_registry()
        _run_cli(["add", "TO_REMOVE", "desc"])
        code, out, err = _run_cli(["remove", "TO_REMOVE"])
        assert code == 0
        data = _read_registry()
        assert not any(e["name"] == "TO_REMOVE" for e in data["env_vars"])

    def test_remove_nonexistent_exits_2(self):
        _clear_registry()
        code, out, err = _run_cli(["remove", "NONEXISTENT"])
        assert code == 2
        assert "not found" in err.lower() or "not registered" in err.lower()

    def test_remove_missing_name_exits_1(self):
        _clear_registry()
        code, out, err = _run_cli(["remove"])
        assert code == 1


class TestDescribeCommand:
    def test_describe_updates_description(self):
        _clear_registry()
        _run_cli(["add", "VAR", "old description"])
        code, out, err = _run_cli(["describe", "VAR", "new description"])
        assert code == 0
        data = _read_registry()
        entry = next(e for e in data["env_vars"] if e["name"] == "VAR")
        assert entry["description"] == "new description"

    def test_describe_nonexistent_exits_2(self):
        _clear_registry()
        code, out, err = _run_cli(["describe", "NONEXISTENT", "desc"])
        assert code == 2
        assert "not found" in err.lower() or "not registered" in err.lower()

    def test_describe_missing_args_exits_1(self):
        _clear_registry()
        code, out, err = _run_cli(["describe", "VAR"])
        assert code == 1


class TestGetCommand:
    def test_get_unregistered_exits_2(self):
        _clear_registry()
        code, out, err = _run_cli(["get", "UNREGISTERED_VAR"])
        assert code == 2
        assert "not registered" in err.lower() or "whitelist" in err.lower()

    def test_get_registered_but_missing_value_exits_2(self):
        _clear_registry()
        _run_cli(["add", "MISSING_VALUE_VAR", "desc"])
        code, out, err = _run_cli(["get", "MISSING_VALUE_VAR"])
        assert code == 2
        assert "not found" in err.lower() or "missing" in err.lower() or "set" in err.lower()

    def test_get_from_env_fallback(self):
        _clear_registry()
        _run_cli(["add", "ENV_TEST_VAR", "desc"])
        code, out, err = _run_cli(["get", "ENV_TEST_VAR"], env={"ENV_TEST_VAR": "env_value_123"})
        assert code == 0
        assert out == "env_value_123"

    def test_get_outputs_value_only(self):
        _clear_registry()
        _run_cli(["add", "OUTPUT_VAR", "desc"])
        code, out, err = _run_cli(["get", "OUTPUT_VAR"], env={"OUTPUT_VAR": "value_only"})
        assert code == 0
        assert out == "value_only"
        assert err == ""

    def test_get_missing_name_exits_1(self):
        _clear_registry()
        code, out, err = _run_cli(["get"])
        assert code == 1


class TestSetCommand:
    def test_set_unregistered_exits_2(self):
        _clear_registry()
        code, out, err = _run_cli(["set", "UNREGISTERED_VAR"], stdin_input="value")
        assert code == 2
        assert "not registered" in err.lower() or "whitelist" in err.lower()

    def test_set_empty_value_exits_1(self):
        _clear_registry()
        _run_cli(["add", "EMPTY_VAR", "desc"])
        code, out, err = _run_cli(["set", "EMPTY_VAR"], stdin_input="")
        assert code == 1
        assert "empty" in err.lower() or "value" in err.lower()

    def test_set_missing_name_exits_1(self):
        _clear_registry()
        code, out, err = _run_cli(["set"], stdin_input="value")
        assert code == 1

    def test_set_stdin_input_keyring_unavailable_exits_3(self):
        _clear_registry()
        _run_cli(["add", "STDIN_VAR", "desc"])
        code, out, err = _run_cli(["set", "STDIN_VAR"], stdin_input="stdin_value")
        assert code == 3
        assert "keyring" in err.lower() or "export" in err.lower()


class TestAccessControl:
    def test_get_only_whitelisted_vars(self):
        _clear_registry()
        code, out, err = _run_cli(["get", "SECRET_VAR"], env={"SECRET_VAR": "secret_value"})
        assert code == 2
        assert out == ""

    def test_set_only_whitelisted_vars(self):
        _clear_registry()
        code, out, err = _run_cli(["set", "SECRET_VAR"], stdin_input="secret_value")
        assert code == 2


class TestExitCodes:
    def test_success_exit_0(self):
        _clear_registry()
        code, _, _ = _run_cli(["list"])
        assert code == 0

    def test_argument_error_exit_1(self):
        _clear_registry()
        code, _, _ = _run_cli(["add", "bad-name", "desc"])
        assert code == 1

    def test_not_found_exit_2(self):
        _clear_registry()
        code, _, _ = _run_cli(["remove", "NONEXISTENT"])
        assert code == 2

    def test_value_not_found_exit_2(self):
        _clear_registry()
        _run_cli(["add", "NO_VALUE", "desc"])
        code, _, _ = _run_cli(["get", "NO_VALUE"])
        assert code == 2


class TestCliArgumentParsing:
    def test_invalid_command_exits_1(self):
        _clear_registry()
        code, out, err = _run_cli(["invalid_command"])
        assert code == 1

    def test_no_command_exits_1(self):
        _clear_registry()
        code, out, err = _run_cli([])
        assert code == 1