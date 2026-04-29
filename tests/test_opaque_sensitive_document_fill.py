import csv
import json
import subprocess
from pathlib import Path

import pytest

from template_gen.exceptions import TemplateGenError
from template_gen.generate_fill_data import (
    generate_fill_data,
    load_placeholder_descriptions,
    normalize_placeholder_key,
)
from template_gen.export_placeholder_csv import export_placeholder_csv
from template_gen.import_placeholder_csv import import_placeholder_csv
from template_gen.secret_binding import (
    bind_secrets_to_placeholders,
    normalize_secret_name_to_placeholder,
    validate_secret_binding_drift,
    SECRET_BINDING_FIELD,
)

REPO_ROOT = Path(__file__).resolve().parent.parent
OPENCODE_DIR = REPO_ROOT / ".opencode"
HARNESS = OPENCODE_DIR / "scripts" / "run-secure-action-harness.mjs"
FIXTURE_SECRET_NAME = "SECURE_PLUGIN_FIXTURE_SECRET"
FIXTURE_SECRET_VALUE = "test-secret-value-for-plugin-08"


def _write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def _read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def _read_csv_rows(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


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


class TestBatch1FillDocxWorkflowSeparation:
    def test_fill_docx_separates_llm_and_local_sensitive_path(self):
        text = (REPO_ROOT / ".opencode" / "workflows" / "fill-docx.md").read_text()
        assert "normal LLM fill path" in text
        assert "local-only sensitive fill path" in text
        assert "must never be sent to the model" in text

    def test_fill_docx_states_sensitive_values_must_never_be_sent_to_model(self):
        text = (REPO_ROOT / ".opencode" / "workflows" / "fill-docx.md").read_text()
        assert "sensitive values must never be sent to the model" in text

    def test_fill_docx_mentions_secret_name_binding(self):
        text = (REPO_ROOT / ".opencode" / "workflows" / "fill-docx.md").read_text()
        assert "secret_name" in text

    def test_fill_docx_mentions_opaque_fill_step(self):
        text = (REPO_ROOT / ".opencode" / "workflows" / "fill-docx.md").read_text()
        assert "Opaque Sensitive Fill" in text

    def test_fill_docx_mentions_secure_action(self):
        text = (REPO_ROOT / ".opencode" / "workflows" / "fill-docx.md").read_text()
        assert "secure_action" in text

    def test_fill_docx_llm_must_leave_secret_fields_empty(self):
        text = (REPO_ROOT / ".opencode" / "workflows" / "fill-docx.md").read_text()
        assert "secret_name" in text
        assert "leave" in text.lower() or "empty" in text.lower()


class TestBatch1SecurePluginSurface:
    def test_plugin_exposes_only_allowlisted_handlers(self):
        source = (OPENCODE_DIR / "plugins" / "secure-plugin-access.ts").read_text()
        allowlist = json.loads(
            (OPENCODE_DIR / "plugin-allowlist.json").read_text()
        )
        for service_name, service in allowlist["services"].items():
            for op_name, op_config in service["operations"].items():
                handler_name = op_config["handler"]
                assert handler_name in source

    def test_plugin_returns_sanitized_results(self):
        source = (OPENCODE_DIR / "plugins" / "secure-plugin-access.ts").read_text()
        assert "sanitizePayload" in source or "sanitizeValue" in source
        assert "[REDACTED_SECRET]" in source

    def test_allowlisted_operation_returns_sanitized_output(self):
        _bun("seed-secret", FIXTURE_SECRET_NAME, FIXTURE_SECRET_VALUE)
        try:
            result = _run_secure_action("fixture-secret", "derive-digest", {"salt": "test-salt"})
            assert result["ok"] is True
            result_str = json.dumps(result)
            assert FIXTURE_SECRET_VALUE not in result_str
        finally:
            _bun("remove-secret", FIXTURE_SECRET_NAME)


class TestBatch1PermissionBoundary:
    def test_opencode_json_denies_raw_secret_access(self):
        config = json.loads((REPO_ROOT / "opencode.json").read_text())
        perm = config["permission"]
        bash_denies = list(perm.get("bash", {}).keys())
        assert any("cross-keychain" in k for k in bash_denies)
        assert any("keytar" in k for k in bash_denies)

    def test_opencode_json_denies_secrets_read(self):
        config = json.loads((REPO_ROOT / "opencode.json").read_text())
        read_denys = config.get("permission", {}).get("read", {})
        assert "**/secrets/**" in read_denys


class TestSecretNameNormalization:
    def test_normalizes_uppercase_snake_to_placeholder(self):
        result = normalize_secret_name_to_placeholder("MY_ID_CARD")
        assert result == "my_id_card"

    def test_normalizes_simple_name(self):
        result = normalize_secret_name_to_placeholder("PHONE")
        assert result == "phone"

    def test_normalizes_multi_word_name(self):
        result = normalize_secret_name_to_placeholder("BANK_ACCOUNT_NUMBER")
        assert result == "bank_account_number"

    def test_rejects_empty_name(self):
        with pytest.raises(TemplateGenError):
            normalize_secret_name_to_placeholder("")

    def test_rejects_lowercase_name(self):
        with pytest.raises(TemplateGenError):
            normalize_secret_name_to_placeholder("phone")

    def test_rejects_name_with_spaces(self):
        with pytest.raises(TemplateGenError):
            normalize_secret_name_to_placeholder("MY ID CARD")


class TestBindSecretsToPlaceholders:
    def _make_registry_entries(self, names):
        return [{"name": n, "description": f"desc for {n}"} for n in names]

    def test_binds_single_high_confidence_match(self):
        placeholders = [
            {"placeholder": "{{ phone }}", "description": "手机号码"},
        ]
        registry = self._make_registry_entries(["PHONE"])
        result = bind_secrets_to_placeholders(placeholders, registry)
        assert result[0][SECRET_BINDING_FIELD] == "PHONE"

    def test_does_not_bind_when_no_exact_normalization_match(self):
        placeholders = [
            {"placeholder": "{{ id_card_number }}", "description": "身份证号"},
        ]
        registry = [
            {"name": "ID_CARD", "description": "身份证号"},
            {"name": "ID_CARD_BACK", "description": "身份证背面"},
        ]
        result = bind_secrets_to_placeholders(placeholders, registry)
        assert SECRET_BINDING_FIELD not in result[0]

    def test_skips_non_conforming_registry_entries_gracefully(self):
        placeholders = [
            {"placeholder": "{{ phone }}", "description": "手机号码"},
        ]
        registry = [
            {"name": "PHONE", "description": "手机号码"},
            {"name": "invalid-name", "description": "bad entry"},
        ]
        result = bind_secrets_to_placeholders(placeholders, registry)
        assert result[0][SECRET_BINDING_FIELD] == "PHONE"

    def test_does_not_bind_when_no_registry_match(self):
        placeholders = [
            {"placeholder": "{{ project_name }}", "description": "项目名称"},
        ]
        registry = self._make_registry_entries(["PHONE"])
        result = bind_secrets_to_placeholders(placeholders, registry)
        assert SECRET_BINDING_FIELD not in result[0]

    def test_preserves_existing_fields(self):
        placeholders = [
            {"placeholder": "{{ phone }}", "description": "手机号码", "location": "tables[0].rows[0].cells[0]"},
        ]
        registry = self._make_registry_entries(["PHONE"])
        result = bind_secrets_to_placeholders(placeholders, registry)
        assert result[0]["location"] == "tables[0].rows[0].cells[0]"
        assert result[0][SECRET_BINDING_FIELD] == "PHONE"

    def test_binds_multiple_placeholders_independently(self):
        placeholders = [
            {"placeholder": "{{ phone }}", "description": "手机号码"},
            {"placeholder": "{{ project_name }}", "description": "项目名称"},
        ]
        registry = self._make_registry_entries(["PHONE"])
        result = bind_secrets_to_placeholders(placeholders, registry)
        assert result[0][SECRET_BINDING_FIELD] == "PHONE"
        assert SECRET_BINDING_FIELD not in result[1]


class TestSecretBindingDriftValidation:
    def test_passes_when_placeholders_match_bindings(self):
        placeholders = [
            {"placeholder": "{{ phone }}", "description": "手机号码", SECRET_BINDING_FIELD: "PHONE"},
            {"placeholder": "{{ project_name }}", "description": "项目名称"},
        ]
        validate_secret_binding_drift(placeholders, bound_keys={"PHONE"})

    def test_fails_when_bound_placeholder_disappeared(self):
        placeholders = [
            {"placeholder": "{{ project_name }}", "description": "项目名称"},
        ]
        bound_keys = {"PHONE"}
        with pytest.raises(TemplateGenError, match="secret-binding"):
            validate_secret_binding_drift(placeholders, bound_keys=bound_keys)

    def test_fails_when_bound_placeholder_token_changed(self):
        placeholders = [
            {"placeholder": "{{ mobile }}", "description": "手机号码", SECRET_BINDING_FIELD: "PHONE"},
        ]
        with pytest.raises(TemplateGenError, match="secret-binding"):
            validate_secret_binding_drift(placeholders, bound_keys={"PHONE"})


class TestCsvRoundtripPreservesSecretBinding:
    def test_export_includes_secret_name_column(self, tmp_path: Path):
        placeholders_json = tmp_path / "placeholders.json"
        out_csv = tmp_path / "out" / "descriptions.csv"
        _write_json(
            placeholders_json,
            {
                "placeholders": [
                    {"placeholder": "{{ phone }}", "description": "手机号码", SECRET_BINDING_FIELD: "PHONE"},
                    {"placeholder": "{{ project_name }}", "description": "项目名称"},
                ]
            },
        )

        export_placeholder_csv(str(placeholders_json), str(out_csv))

        rows = _read_csv_rows(out_csv)
        assert rows[0]["secret_name"] == "PHONE"
        assert rows[1]["secret_name"] == ""

    def test_import_preserves_secret_name(self, tmp_path: Path):
        source_csv = tmp_path / "descriptions.csv"
        out_json = tmp_path / "out" / "descriptions.json"
        source_csv.write_text(
            "placeholder,description,secret_name\n{{ phone }},手机号码,PHONE\n{{ project_name }},项目名称,\n",
            encoding="utf-8",
        )

        import_placeholder_csv(str(source_csv), str(out_json))

        payload = _read_json(out_json)
        assert payload["placeholders"][0][SECRET_BINDING_FIELD] == "PHONE"
        assert SECRET_BINDING_FIELD not in payload["placeholders"][1] or payload["placeholders"][1][SECRET_BINDING_FIELD] == ""

    def test_roundtrip_preserves_secret_binding(self, tmp_path: Path):
        placeholders_json = tmp_path / "placeholders.json"
        csv_path = tmp_path / "descriptions.csv"
        reimported_json = tmp_path / "descriptions.json"

        _write_json(
            placeholders_json,
            {
                "placeholders": [
                    {"placeholder": "{{ phone }}", "description": "手机号码", SECRET_BINDING_FIELD: "PHONE"},
                    {"placeholder": "{{ project_name }}", "description": "项目名称"},
                ]
            },
        )

        export_placeholder_csv(str(placeholders_json), str(csv_path))
        import_placeholder_csv(str(csv_path), str(reimported_json))

        payload = _read_json(reimported_json)
        assert payload["placeholders"][0][SECRET_BINDING_FIELD] == "PHONE"
        assert SECRET_BINDING_FIELD not in payload["placeholders"][1] or payload["placeholders"][1][SECRET_BINDING_FIELD] == ""

    def test_edit_mode_rebuild_preserves_secret_name_for_surviving_placeholders(self, tmp_path: Path):
        from docx import Document
        from template_gen.export_placeholder_csv import export_placeholder_csv

        placeholders_json = tmp_path / "temp" / "placeholders.json"
        out_csv = tmp_path / "output" / "descriptions.csv"
        template_docx = tmp_path / "output" / "template.docx"

        _write_json(
            placeholders_json,
            {
                "placeholders": [
                    {"location": "paragraphs[0]", "placeholder": "{{ phone }}", SECRET_BINDING_FIELD: "PHONE"},
                    {"location": "tables[0].rows[0].cells[0]", "placeholder": "{{ project_name }}"},
                ]
            },
        )

        doc = Document()
        doc.add_paragraph("{{ phone }}")
        doc.add_paragraph("{{ project_name }}")
        template_docx.parent.mkdir(parents=True, exist_ok=True)
        doc.save(template_docx)

        export_placeholder_csv(
            str(placeholders_json),
            str(out_csv),
            edit=True,
            template_docx_path=str(template_docx),
            placeholders_output_path=str(placeholders_json),
        )

        refreshed = _read_json(placeholders_json)
        phone_entry = next(p for p in refreshed["placeholders"] if p["placeholder"] == "{{ phone }}")
        assert phone_entry[SECRET_BINDING_FIELD] == "PHONE"

    def test_edit_mode_rebuild_drops_secret_name_for_removed_placeholders(self, tmp_path: Path):
        from docx import Document
        from template_gen.export_placeholder_csv import export_placeholder_csv

        placeholders_json = tmp_path / "temp" / "placeholders.json"
        out_csv = tmp_path / "output" / "descriptions.csv"
        template_docx = tmp_path / "output" / "template.docx"

        _write_json(
            placeholders_json,
            {
                "placeholders": [
                    {"location": "paragraphs[0]", "placeholder": "{{ phone }}", SECRET_BINDING_FIELD: "PHONE"},
                    {"location": "paragraphs[1]", "placeholder": "{{ old_field }}"},
                ]
            },
        )

        doc = Document()
        doc.add_paragraph("{{ phone }}")
        template_docx.parent.mkdir(parents=True, exist_ok=True)
        doc.save(template_docx)

        export_placeholder_csv(
            str(placeholders_json),
            str(out_csv),
            edit=True,
            template_docx_path=str(template_docx),
            placeholders_output_path=str(placeholders_json),
        )

        refreshed = _read_json(placeholders_json)
        assert not any(p["placeholder"] == "{{ old_field }}" for p in refreshed["placeholders"])


class TestGenerateFillDataWithSecretBinding:
    def test_generate_fill_data_preserves_secret_binding_in_output(self, tmp_path: Path):
        repo = tmp_path / "repo"
        (repo / ".opencode").mkdir(parents=True, exist_ok=True)
        (repo / ".opencode" / "vault-config.json").write_text(
            '{"vaultRoot": "workbook"}', encoding="utf-8"
        )
        (repo / "workbook").mkdir(parents=True, exist_ok=True)

        source = repo / "descriptions.json"
        output = repo / "out" / "fill_data.json"
        _write_json(
            source,
            {
                "placeholders": [
                    {"placeholder": "{{ phone }}", "description": "手机号码", SECRET_BINDING_FIELD: "PHONE"},
                    {"placeholder": "{{ project_name }}", "description": "项目名称"},
                ]
            },
        )

        generate_fill_data(str(source), str(output), repo_root=repo)

        loaded = _read_json(output)
        assert loaded == {"phone": "", "project_name": ""}


class TestDocFillInfrastructureReadiness:
    def test_allowlist_schema_supports_new_services(self):
        allowlist = json.loads(
            (OPENCODE_DIR / "plugin-allowlist.json").read_text()
        )
        assert "services" in allowlist
        assert isinstance(allowlist["services"], dict)

    def test_plugin_handler_dispatch_is_static(self):
        source = (OPENCODE_DIR / "plugins" / "secure-plugin-access.ts").read_text()
        assert "HANDLERS" in source
        assert "require(" not in source or "createRequire" in source

    def test_plugin_validation_order_preserves_secret_safety(self):
        source = (OPENCODE_DIR / "plugins" / "secure-plugin-access.ts").read_text()
        assert "unknown-service" in source
        assert "unknown-operation" in source
        assert "invalid-args" in source
        assert "secret-missing" in source
