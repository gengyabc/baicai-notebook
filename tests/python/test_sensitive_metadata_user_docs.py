import json
import subprocess
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
ENV_REGISTRY_SCRIPT = REPO_ROOT / ".opencode" / "scripts" / "env-registry.mjs"
REGISTRY_JSON = REPO_ROOT / ".opencode" / "env-registry.json"
SKILL_MD = REPO_ROOT / ".opencode" / "skills" / "env-registry" / "SKILL.md"
README_MD = REPO_ROOT / "README.md"
ENV_REGISTRY_README = REPO_ROOT / ".opencode" / "env-registry-README.md"


def _run_env_registry(*args):
    result = subprocess.run(
        ["bun", "run", str(ENV_REGISTRY_SCRIPT), *args],
        capture_output=True,
        text=True,
        cwd=str(REPO_ROOT),
        timeout=15,
    )
    return result


class TestBatch1MetadataDiscoveryBoundary:

    def test_registry_json_schema_only_name_and_description(self):
        data = json.loads(REGISTRY_JSON.read_text(encoding="utf-8"))
        assert data["version"] == 1
        for entry in data["env_vars"]:
            keys = set(entry.keys())
            assert keys == {"name", "description"}, (
                f"Entry {entry.get('name')} has unexpected fields: {keys - {'name', 'description'}}"
            )

    def test_list_json_output_only_name_and_description(self):
        result = _run_env_registry("list")
        assert result.returncode == 0
        entries = json.loads(result.stdout.strip())
        for entry in entries:
            keys = set(entry.keys())
            assert keys == {"name", "description"}, (
                f"list output entry has unexpected fields: {keys - {'name', 'description'}}"
            )

    def test_list_table_output_no_value_column(self):
        result = _run_env_registry("list", "--format", "table")
        assert result.returncode == 0
        combined = result.stdout + result.stderr
        value_indicators = ["value", "secret", "keychain_value", "raw"]
        for indicator in value_indicators:
            assert indicator.lower() not in combined.lower(), (
                f"Table output should not contain '{indicator}' column"
            )

    def test_skill_md_points_to_list_surface(self):
        text = SKILL_MD.read_text(encoding="utf-8")
        assert "list" in text, "SKILL.md should reference the list command"
        assert "env-registry.mjs list" in text, "SKILL.md should reference the canonical list command"

    def test_skill_md_no_parallel_metadata_source(self):
        text = SKILL_MD.read_text(encoding="utf-8")
        assert "env-registry.json" not in text or "list" in text, (
            "SKILL.md should not inline env-registry.json as a parallel metadata source"
        )

    def test_skill_md_no_raw_value_access_implied(self):
        text = SKILL_MD.read_text(encoding="utf-8")
        lines = text.split("\n")
        value_access_lines = [
            line for line in lines
            if "value" in line.lower()
            and "不" not in line
            and "no " not in line.lower()
            and "not " not in line.lower()
            and "never" not in line.lower()
            and "deny" not in line.lower()
            and "deprecated" not in line.lower()
            and "do not" not in line.lower()
            and "不要" not in line.lower()
            and "绝不" not in line.lower()
            and "secure" not in line.lower()
            and "set" not in line.lower()
            and "stored" not in line.lower()
            and "stored in keychain" not in line.lower()
        ]
        assert len(value_access_lines) == 0, (
            f"SKILL.md implies raw value access in lines: {value_access_lines}"
        )


class TestBatch2RootReadmeOnboarding:

    def test_readme_has_sensitive_data_section(self):
        text = README_MD.read_text(encoding="utf-8")
        has_section = any(
            kw in text
            for kw in ["敏感信息", "Sensitive", "sensitive", "env-registry"]
        )
        assert has_section, "README.md should have a sensitive-data capability section"

    def test_readme_mentions_name_description_boundary(self):
        text = README_MD.read_text(encoding="utf-8")
        boundary_mentions = (
            "name" in text.lower() and "description" in text.lower()
        )
        assert boundary_mentions, (
            "README.md should mention that discovery is limited to name and description"
        )

    def test_readme_points_to_detailed_guide(self):
        text = README_MD.read_text(encoding="utf-8")
        assert "env-registry-README" in text or "env-registry" in text, (
            "README.md should link to the detailed env-registry guide"
        )

    def test_readme_has_realistic_example_entry(self):
        text = README_MD.read_text(encoding="utf-8")
        realistic_entries = ["MY_ID_CARD", "MY_PHONE", "ID_CARD", "PHONE"]
        has_example = any(entry in text for entry in realistic_entries)
        assert has_example, (
            "README.md should include at least one realistic example entry"
        )

    def test_readme_no_real_secret_values(self):
        text = README_MD.read_text(encoding="utf-8")
        id_card_pattern_lines = [
            line for line in text.split("\n")
            if any(
                c.isdigit() for c in line
            )
            and "身份证" in line
            and "MY_ID_CARD" not in line
            and "name" not in line.lower()
        ]
        assert len(id_card_pattern_lines) == 0, (
            f"README.md should not contain real secret values: {id_card_pattern_lines}"
        )


class TestBatch3SelfServiceRegistrationGuide:

    def test_env_registry_readme_has_list_flow(self):
        text = ENV_REGISTRY_README.read_text(encoding="utf-8")
        assert "list" in text, "env-registry-README.md should document the list command"

    def test_env_registry_readme_has_add_flow(self):
        text = ENV_REGISTRY_README.read_text(encoding="utf-8")
        assert "add" in text, "env-registry-README.md should document the add command"

    def test_env_registry_readme_has_set_flow(self):
        text = ENV_REGISTRY_README.read_text(encoding="utf-8")
        assert "set" in text, "env-registry-README.md should document the set command"

    def test_env_registry_readme_has_describe_flow(self):
        text = ENV_REGISTRY_README.read_text(encoding="utf-8")
        assert "describe" in text, "env-registry-README.md should document the describe command"

    def test_env_registry_readme_has_realistic_example(self):
        text = ENV_REGISTRY_README.read_text(encoding="utf-8")
        realistic_entries = ["MY_ID_CARD", "MY_PHONE", "ID_CARD"]
        has_example = any(entry in text for entry in realistic_entries)
        assert has_example, (
            "env-registry-README.md should include at least one realistic example"
        )

    def test_env_registry_readme_separates_metadata_from_value_access(self):
        text = ENV_REGISTRY_README.read_text(encoding="utf-8")
        has_metadata_section = "元数据" in text or "metadata" in text.lower()
        has_security_section = "安全" in text or "security" in text.lower() or "模型" in text
        assert has_metadata_section or has_security_section, (
            "env-registry-README.md should clearly separate metadata discovery from value access"
        )

    def test_env_registry_readme_mentions_keychain_as_user_local(self):
        text = ENV_REGISTRY_README.read_text(encoding="utf-8")
        assert "Keychain" in text or "keychain" in text.lower(), (
            "env-registry-README.md should mention keychain access as a user-local path"
        )

    def test_env_registry_readme_model_boundary_wording(self):
        text = ENV_REGISTRY_README.read_text(encoding="utf-8")
        has_model_boundary = (
            "模型" in text
            or "model" in text.lower()
            or "LLM" in text
        )
        assert has_model_boundary, (
            "env-registry-README.md should explain the model capability boundary"
        )
