import json
import re
from pathlib import Path

from .exceptions import TemplateGenError

SECRET_BINDING_FIELD = "secret_name"

_ENV_VAR_PATTERN = re.compile(r"^[A-Z][A-Z0-9_]*$")


def normalize_secret_name_to_placeholder(secret_name: str) -> str:
    if not secret_name:
        raise TemplateGenError("secret_name must not be empty")
    if not _ENV_VAR_PATTERN.match(secret_name):
        raise TemplateGenError(
            f"secret_name must match UPPER_SNAKE_CASE pattern: {secret_name}"
        )
    return secret_name.lower()


def load_env_registry(registry_path: str | Path) -> list[dict[str, str]]:
    source = Path(registry_path)
    if not source.exists():
        return []
    try:
        data = json.loads(source.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return []
    if not isinstance(data, dict) or not isinstance(data.get("env_vars"), list):
        return []
    entries = []
    for item in data["env_vars"]:
        if isinstance(item, dict) and isinstance(item.get("name"), str):
            entries.append({"name": item["name"], "description": item.get("description", "")})
    return entries


_SIMPLE_PLACEHOLDER_PATTERN = re.compile(r"^\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}$")


def _extract_field_name(placeholder: str) -> str | None:
    match = _SIMPLE_PLACEHOLDER_PATTERN.match(placeholder)
    if match:
        return match.group(1)
    return None


def bind_secrets_to_placeholders(
    placeholders: list[dict],
    registry_entries: list[dict[str, str]],
) -> list[dict]:
    norm_to_entry: dict[str, dict[str, str] | None] = {}
    for entry in registry_entries:
        try:
            norm = normalize_secret_name_to_placeholder(entry["name"])
        except TemplateGenError:
            continue
        if norm in norm_to_entry:
            norm_to_entry[norm] = None
        else:
            norm_to_entry[norm] = entry

    result = []
    for ph in placeholders:
        updated = dict(ph)
        raw = ph.get("placeholder", "")
        field_name = _extract_field_name(raw)
        if field_name:
            norm_field = field_name.lower()
            entry = norm_to_entry.get(norm_field)
            if entry is not None:
                updated[SECRET_BINDING_FIELD] = entry["name"]
        elif raw and "{{" in raw:
            print(f"Warning: placeholder '{raw}' skipped for secret binding (field name does not match [A-Za-z0-9_] pattern)")
        result.append(updated)

    return result


def validate_secret_binding_drift(
    placeholders: list[dict],
    bound_keys: set[str],
) -> None:

    current_bindings: dict[str, str] = {}
    for ph in placeholders:
        field_name = _extract_field_name(ph.get("placeholder", ""))
        if field_name and SECRET_BINDING_FIELD in ph:
            current_bindings[field_name] = ph[SECRET_BINDING_FIELD]

    for secret_name in bound_keys:
        expected_field = normalize_secret_name_to_placeholder(secret_name)
        if expected_field not in current_bindings:
            raise TemplateGenError(
                f"secret-binding drift: bound secret '{secret_name}' "
                f"has no matching placeholder '{{{{ {expected_field} }}}}' "
                f"in the current placeholder set"
            )

    for field_name, bound_secret in current_bindings.items():
        expected_field = normalize_secret_name_to_placeholder(bound_secret)
        if field_name != expected_field:
            raise TemplateGenError(
                f"secret-binding drift: placeholder '{{{{ {field_name} }}}}' "
                f"is bound to '{bound_secret}' but the frozen normalization "
                f"rule expects field '{expected_field}'"
            )
