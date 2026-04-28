import json
import subprocess
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
ENV_REGISTRY_SCRIPT = REPO_ROOT / ".opencode" / "scripts" / "env-registry.mjs"


def _run_env_registry(*args):
    result = subprocess.run(
        ["bun", "run", str(ENV_REGISTRY_SCRIPT), *args],
        capture_output=True,
        text=True,
        cwd=str(REPO_ROOT),
        timeout=15,
    )
    return result


class TestBatch3RawGetDeprecation:

    def test_get_command_exits_1(self):
        result = _run_env_registry("get", "ANY_NAME")
        assert result.returncode != 0

    def test_get_command_prints_deprecation_message(self):
        result = _run_env_registry("get", "ANY_NAME")
        combined = result.stdout + result.stderr
        assert "secure plugin" in combined.lower() or "deprecated" in combined.lower() or "denied" in combined.lower()

    def test_get_command_no_keychain_lookup(self):
        result = _run_env_registry("get", "NONEXISTENT_SECRET_FOR_TEST_08")
        combined = result.stdout + result.stderr
        assert "keychain" not in combined.lower() or "deprecated" in combined.lower() or "denied" in combined.lower()


class TestBatch3PermissionConfig:

    def _read_opencode_json(self):
        return json.loads((REPO_ROOT / "opencode.json").read_text(encoding="utf-8"))

    def test_opencode_json_has_permission_object(self):
        config = self._read_opencode_json()
        assert "permission" in config

    def test_bash_denies_node_e(self):
        config = self._read_opencode_json()
        bash_rules = config.get("permission", {}).get("bash", {})
        has_node_e_deny = any(
            "node -e" in key and value == "deny"
            for key, value in bash_rules.items()
        )
        assert has_node_e_deny

    def test_bash_denies_bun_e(self):
        config = self._read_opencode_json()
        bash_rules = config.get("permission", {}).get("bash", {})
        has_bun_e_deny = any(
            "bun -e" in key and value == "deny"
            for key, value in bash_rules.items()
        )
        assert has_bun_e_deny

    def test_bash_denies_bun_eval(self):
        config = self._read_opencode_json()
        bash_rules = config.get("permission", {}).get("bash", {})
        has_bun_eval_deny = any(
            "bun eval" in key and value == "deny"
            for key, value in bash_rules.items()
        )
        assert has_bun_eval_deny

    def test_bash_denies_cross_keychain(self):
        config = self._read_opencode_json()
        bash_rules = config.get("permission", {}).get("bash", {})
        has_cross_keychain_deny = any(
            "cross-keychain" in key and value == "deny"
            for key, value in bash_rules.items()
        )
        assert has_cross_keychain_deny

    def test_bash_denies_keytar(self):
        config = self._read_opencode_json()
        bash_rules = config.get("permission", {}).get("bash", {})
        has_keytar_deny = any(
            "keytar" in key and value == "deny"
            for key, value in bash_rules.items()
        )
        assert has_keytar_deny

    def test_bash_denies_env_registry_get(self):
        config = self._read_opencode_json()
        bash_rules = config.get("permission", {}).get("bash", {})
        has_get_deny = any(
            "env-registry.mjs get" in key and value == "deny"
            for key, value in bash_rules.items()
        )
        assert has_get_deny

    def test_edit_denies_plugins(self):
        config = self._read_opencode_json()
        edit_rules = config.get("permission", {}).get("edit", {})
        has_plugins_deny = any(
            ".opencode/plugins" in key and value == "deny"
            for key, value in edit_rules.items()
        )
        assert has_plugins_deny

    def test_edit_denies_allowlist(self):
        config = self._read_opencode_json()
        edit_rules = config.get("permission", {}).get("edit", {})
        has_allowlist_deny = any(
            "plugin-allowlist.json" in key and value == "deny"
            for key, value in edit_rules.items()
        )
        assert has_allowlist_deny

    def test_read_denies_secrets(self):
        config = self._read_opencode_json()
        read_rules = config.get("permission", {}).get("read", {})
        has_secrets_deny = any(
            "secrets" in key and value == "deny"
            for key, value in read_rules.items()
        )
        assert has_secrets_deny


class TestBatch3DocBoundary:

    def test_skill_md_no_raw_get_instruction(self):
        text = (REPO_ROOT / ".opencode" / "skills" / "env-registry" / "SKILL.md").read_text(encoding="utf-8")
        lines = text.split("\n")
        get_instruction_lines = [
            line for line in lines
            if "env-registry.mjs get" in line
            and "deny" not in line.lower()
            and "deprecated" not in line.lower()
            and "do not" not in line.lower()
            and "不要" not in line.lower()
        ]
        assert len(get_instruction_lines) == 0, f"Raw get instruction still present: {get_instruction_lines}"

    def test_env_md_no_raw_get_instruction(self):
        text = (REPO_ROOT / ".opencode" / "commands" / "env.md").read_text(encoding="utf-8")
        assert "env-registry.mjs get" not in text or "deny" in text.lower() or "deprecated" in text.lower()


class TestBatch4AntiBypass:

    def _read_opencode_json(self):
        return json.loads((REPO_ROOT / "opencode.json").read_text(encoding="utf-8"))

    def test_setup_commands_still_exist(self):
        for cmd in ["list", "add", "remove", "set", "describe"]:
            result = _run_env_registry(cmd)
            combined = result.stdout + result.stderr
            assert "Unknown command" not in combined, \
                f"Command '{cmd}' should still be recognized (got 'Unknown command')"

    def test_allowlist_and_handler_mapping_is_explicit(self):
        allowlist = json.loads(
            (REPO_ROOT / ".opencode" / "plugin-allowlist.json").read_text(encoding="utf-8")
        )
        assert allowlist["version"] == 1
        for service_name, service in allowlist["services"].items():
            for op_name, op_config in service["operations"].items():
                assert "handler" in op_config, f"Missing handler for {service_name}.{op_name}"
                assert "secretName" in op_config, f"Missing secretName for {service_name}.{op_name}"
                assert "allowedArgs" in op_config, f"Missing allowedArgs for {service_name}.{op_name}"
                assert isinstance(op_config["allowedArgs"], list)

    def test_plugin_source_no_dynamic_requires(self):
        plugin_source = (REPO_ROOT / ".opencode" / "plugins" / "secure-plugin-access.ts").read_text(encoding="utf-8")
        assert "require(" not in plugin_source or "createRequire" in plugin_source
        assert "import(" not in plugin_source

    def test_permission_config_has_all_required_deny_patterns(self):
        config = self._read_opencode_json()
        bash_rules = config.get("permission", {}).get("bash", {})
        edit_rules = config.get("permission", {}).get("edit", {})
        read_rules = config.get("permission", {}).get("read", {})
        assert any("node -e" in k for k in bash_rules)
        assert any("bun -e" in k for k in bash_rules)
        assert any("cross-keychain" in k for k in bash_rules)
        assert any("keytar" in k for k in bash_rules)
        assert any("env-registry.mjs get" in k for k in bash_rules)
        assert any("security find-generic-password" in k for k in bash_rules)
        assert any("security add-generic-password" in k for k in bash_rules)
        assert any("security delete-generic-password" in k for k in bash_rules)
        assert any("security dump-keychain" in k for k in bash_rules)
        assert any(".opencode/plugins" in k for k in edit_rules)
        assert any("plugin-allowlist.json" in k for k in edit_rules)
        assert any("secrets" in k for k in read_rules)

    def test_bash_denies_security_find_generic_password(self):
        config = self._read_opencode_json()
        bash_rules = config.get("permission", {}).get("bash", {})
        has_security_deny = any(
            "security find-generic-password" in key and value == "deny"
            for key, value in bash_rules.items()
        )
        assert has_security_deny

    def test_bash_denies_security_find(self):
        config = self._read_opencode_json()
        bash_rules = config.get("permission", {}).get("bash", {})
        has_security_find_deny = any(
            "security find" in key and value == "deny"
            for key, value in bash_rules.items()
        )
        assert has_security_find_deny
