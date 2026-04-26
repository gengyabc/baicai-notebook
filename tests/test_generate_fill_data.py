import json
from pathlib import Path

import pytest

from template_gen.exceptions import TemplateGenError
from template_gen.fill_runner import load_data_from_json
from template_gen.generate_fill_data import (
    generate_fill_data,
    load_placeholder_descriptions,
    main as generate_main,
    normalize_placeholder_key,
    resolve_vault_root,
)


def _write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")


class TestLoadPlaceholderDescriptions:
    def test_accepts_only_placeholders_placeholder_description_shape(self, tmp_path: Path):
        source = tmp_path / "placeholder_descriptions.json"
        _write_json(
            source,
            {
                "placeholders": [
                    {"placeholder": "{{ project_name }}", "description": "项目名称"},
                    {"placeholder": "{{ contact_name }}", "description": "联系人"},
                ]
            },
        )

        rows = load_placeholder_descriptions(str(source))
        assert rows == [
            {"placeholder": "{{ project_name }}", "description": "项目名称"},
            {"placeholder": "{{ contact_name }}", "description": "联系人"},
        ]

    @pytest.mark.parametrize(
        "payload",
        [
            {},
            {"placeholders": "not-a-list"},
            {"placeholders": [{"placeholder": "{{ a }}"}]},
            {"placeholders": [{"description": "字段A"}]},
            {"placeholders": [{"placeholder": "", "description": "字段A"}]},
            {"placeholders": [{"placeholder": "{{ a }}", "description": 123}]},
            {
                "placeholders": [
                    {
                        "placeholder": "{{ a }}",
                        "description": "字段A",
                        "extra": "not-allowed",
                    }
                ]
            },
            {
                "placeholders": [
                    {"placeholder": "{{ a }}", "description": "字段A"},
                    {"placeholder": "{{ a }}", "description": "字段A-duplicate"},
                ]
            },
        ],
    )
    def test_rejects_invalid_shape(self, tmp_path: Path, payload: dict):
        source = tmp_path / "placeholder_descriptions.json"
        _write_json(source, payload)

        with pytest.raises(TemplateGenError):
            load_placeholder_descriptions(str(source))

    def test_rejects_invalid_json_input_file(self, tmp_path: Path):
        source = tmp_path / "placeholder_descriptions.json"
        source.write_text("{not-valid-json", encoding="utf-8")

        with pytest.raises(TemplateGenError):
            load_placeholder_descriptions(str(source))


class TestResolveVaultRoot:
    def test_uses_vault_root_from_config_instead_of_hardcoded_vault(self, tmp_path: Path):
        repo = tmp_path / "repo"
        config_path = repo / ".opencode" / "vault-config.json"
        custom_root = repo / "knowledge"
        custom_root.mkdir(parents=True, exist_ok=True)
        config_path.parent.mkdir(parents=True, exist_ok=True)
        config_path.write_text('{"vaultRoot": "knowledge"}', encoding="utf-8")

        resolved = resolve_vault_root(repo)
        assert resolved == custom_root

    def test_rejects_missing_vault_root_config(self, tmp_path: Path):
        repo = tmp_path / "repo"
        (repo / ".opencode").mkdir(parents=True, exist_ok=True)
        (repo / ".opencode" / "vault-config.json").write_text("{}", encoding="utf-8")

        with pytest.raises(TemplateGenError):
            resolve_vault_root(repo)

    def test_rejects_invalid_vault_config_json(self, tmp_path: Path):
        repo = tmp_path / "repo"
        (repo / ".opencode").mkdir(parents=True, exist_ok=True)
        (repo / ".opencode" / "vault-config.json").write_text(
            "{not-valid-json", encoding="utf-8"
        )

        with pytest.raises(TemplateGenError):
            resolve_vault_root(repo)

    def test_rejects_vault_root_path_traversal(self, tmp_path: Path):
        repo = tmp_path / "repo"
        (repo / ".opencode").mkdir(parents=True, exist_ok=True)
        (repo / ".opencode" / "vault-config.json").write_text(
            '{"vaultRoot": "../outside"}', encoding="utf-8"
        )
        (tmp_path / "outside").mkdir(parents=True, exist_ok=True)

        with pytest.raises(TemplateGenError):
            resolve_vault_root(repo)


class TestNormalizePlaceholderKey:
    def test_normalizes_jinja_placeholder_to_key(self):
        assert normalize_placeholder_key("{{ project_name }}") == "project_name"

    @pytest.mark.parametrize(
        "placeholder",
        [
            "project_name",
            "{{ project-name }}",
            "{{ 123name }}",
            "{{ }}",
            "",
        ],
    )
    def test_rejects_invalid_placeholder_format(self, placeholder: str):
        with pytest.raises(TemplateGenError):
            normalize_placeholder_key(placeholder)


class TestGenerateFillDataCommandBoundary:
    def test_generates_flat_json_for_fill_runner_without_template_arguments(
        self, tmp_path: Path, monkeypatch
    ):
        repo = tmp_path / "repo"
        (repo / ".opencode").mkdir(parents=True, exist_ok=True)
        (repo / ".opencode" / "vault-config.json").write_text(
            '{"vaultRoot": "workbook"}', encoding="utf-8"
        )
        (repo / "workbook").mkdir(parents=True, exist_ok=True)

        source = repo / "placeholder_descriptions.json"
        output = repo / "out" / "fill_data.json"
        _write_json(
            source,
            {
                "placeholders": [
                    {"placeholder": "{{ project_name }}", "description": "项目名称"},
                    {"placeholder": "{{ contact_name }}", "description": "联系人"},
                ]
            },
        )

        result = generate_fill_data(str(source), str(output), repo_root=repo)
        assert result == str(output)

        loaded = load_data_from_json(str(output))
        assert loaded == {"project_name": "", "contact_name": ""}

        monkeypatch.chdir(repo)
        monkeypatch.setattr(
            "sys.argv",
            [
                "template_gen.generate_fill_data",
                "--input",
                str(source),
                "--output",
                str(output),
            ],
        )
        generate_main()
        assert output.exists()

    def test_fails_fast_when_descriptions_are_stale_against_current_placeholders(
        self, tmp_path: Path
    ):
        repo = tmp_path / "repo"
        (repo / ".opencode").mkdir(parents=True, exist_ok=True)
        (repo / ".opencode" / "vault-config.json").write_text(
            '{"vaultRoot": "workbook"}', encoding="utf-8"
        )
        (repo / "workbook").mkdir(parents=True, exist_ok=True)

        source = repo / "descriptions.json"
        placeholders = repo / "placeholders.json"
        output = repo / "out" / "fill_data.json"

        _write_json(
            source,
            {
                "placeholders": [
                    {"placeholder": "{{ b }}", "description": "字段B"},
                    {"placeholder": "{{ a }}", "description": "字段A"},
                ]
            },
        )
        _write_json(
            placeholders,
            {
                "placeholders": [
                    {"location": "paragraphs[0]", "placeholder": "{{ a }}"},
                    {"location": "paragraphs[1]", "placeholder": "{{ b }}"},
                    {"location": "paragraphs[2]", "placeholder": "{{ a }}"},
                ]
            },
        )

        with pytest.raises(TemplateGenError):
            generate_fill_data(
                str(source),
                str(output),
                repo_root=repo,
                canonical_placeholders_path=str(placeholders),
            )

    def test_accepts_matching_sequence_against_current_placeholders(self, tmp_path: Path):
        repo = tmp_path / "repo"
        (repo / ".opencode").mkdir(parents=True, exist_ok=True)
        (repo / ".opencode" / "vault-config.json").write_text(
            '{"vaultRoot": "workbook"}', encoding="utf-8"
        )
        (repo / "workbook").mkdir(parents=True, exist_ok=True)

        source = repo / "descriptions.json"
        placeholders = repo / "placeholders.json"
        output = repo / "out" / "fill_data.json"

        _write_json(
            source,
            {
                "placeholders": [
                    {"placeholder": "{{ a }}", "description": "字段A"},
                    {"placeholder": "{{ b }}", "description": "字段B"},
                ]
            },
        )
        _write_json(
            placeholders,
            {
                "placeholders": [
                    {"location": "paragraphs[0]", "placeholder": "{{ a }}"},
                    {"location": "paragraphs[1]", "placeholder": "{{ a }}"},
                    {"location": "paragraphs[2]", "placeholder": "{{ b }}"},
                ]
            },
        )

        result = generate_fill_data(
            str(source),
            str(output),
            repo_root=repo,
            canonical_placeholders_path=str(placeholders),
        )
        assert result == str(output)
