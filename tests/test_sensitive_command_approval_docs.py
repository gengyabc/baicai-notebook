from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parent.parent


def _read_text(relative_path: str) -> str:
    return (REPO_ROOT / relative_path).read_text(encoding="utf-8")


def test_env_command_uses_shared_policy_and_denied_fallback() -> None:
    text = _read_text(".opencode/commands/env-helper.md")
    assert "shared sensitive-command approval policy" in text
    assert "explicit user consent" in text
    assert "local-only fallback" in text


def test_env_skill_is_consumer_not_enforcement_owner() -> None:
    text = _read_text(".opencode/skills/env-registry/SKILL.md")
    assert "consumer of shared sensitive-command approval policy" in text
    assert "OpenCode permissions remain the enforcement boundary" in text
    assert "local-only fallback" in text


def test_fill_docx_separates_llm_and_local_sensitive_path() -> None:
    text = _read_text(".opencode/workflows/fill-docx.md")
    assert "normal LLM fill path" in text
    assert "local-only sensitive fill path" in text
    assert "must never be sent to the model" in text


def test_routing_doc_records_approval_boundary_and_denied_path() -> None:
    text = _read_text("docs/routing-flows.md")
    assert "Sensitive Command Approval Boundary" in text
    assert "OpenCode permissions" in text
    assert "approval denied" in text
