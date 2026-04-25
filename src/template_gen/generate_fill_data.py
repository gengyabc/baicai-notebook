import argparse
import json
import re
from pathlib import Path

from .exceptions import TemplateGenError


PLACEHOLDER_PATTERN = re.compile(r"^\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}$")


def load_placeholder_descriptions(json_path: str) -> list[dict[str, str]]:
    source = Path(json_path)
    if not source.exists():
        raise TemplateGenError(f"Input file not found: {json_path}")

    try:
        payload = json.loads(source.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise TemplateGenError(f"Invalid JSON in input file: {json_path}") from exc

    placeholders = payload.get("placeholders") if isinstance(payload, dict) else None
    if not isinstance(placeholders, list):
        raise TemplateGenError("Input JSON must contain a 'placeholders' array")

    rows: list[dict[str, str]] = []
    seen: set[str] = set()
    for index, item in enumerate(placeholders, start=1):
        if not isinstance(item, dict) or set(item.keys()) != {"placeholder", "description"}:
            raise TemplateGenError(
                f"placeholders[{index}] must contain only 'placeholder' and 'description'"
            )

        placeholder = item["placeholder"]
        description = item["description"]
        if not isinstance(placeholder, str) or placeholder == "":
            raise TemplateGenError(
                f"placeholders[{index}].placeholder must be a non-empty string"
            )
        if not isinstance(description, str):
            raise TemplateGenError(
                f"placeholders[{index}].description must be a string"
            )
        if placeholder in seen:
            raise TemplateGenError(f"Duplicate placeholder found in input JSON: {placeholder}")

        seen.add(placeholder)
        rows.append({"placeholder": placeholder, "description": description})

    return rows


def resolve_vault_root(repo_root: str | Path | None = None) -> Path:
    base = Path(repo_root) if repo_root is not None else Path.cwd()
    config_path = base / ".opencode" / "vault-config.json"
    if not config_path.exists():
        raise TemplateGenError(f"Vault config file not found: {config_path}")

    try:
        config = json.loads(config_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise TemplateGenError(f"Invalid JSON in vault config: {config_path}") from exc

    vault_root = config.get("vaultRoot") if isinstance(config, dict) else None
    if not isinstance(vault_root, str) or vault_root.strip() == "":
        raise TemplateGenError(
            f"vaultRoot must be a non-empty string in config: {config_path}"
        )

    resolved = (base / vault_root).resolve()
    base_resolved = base.resolve()
    if base_resolved != resolved and base_resolved not in resolved.parents:
        raise TemplateGenError("Resolved vault root must stay within repository root")
    if not resolved.exists() or not resolved.is_dir():
        raise TemplateGenError(f"Vault root directory not found: {resolved}")

    return resolved


def normalize_placeholder_key(placeholder: str) -> str:
    match = PLACEHOLDER_PATTERN.match(placeholder)
    if not match:
        raise TemplateGenError(
            f"Invalid placeholder format: {placeholder}. Expected '{{{{ field_name }}}}'"
        )
    return match.group(1)


def generate_fill_data(
    input_path: str,
    output_path: str,
    repo_root: str | Path | None = None,
) -> str:
    rows = load_placeholder_descriptions(input_path)
    # Batch 1 only validates vault-root config and boundary; value resolution is
    # intentionally deferred until Batch 2 policy is frozen in discovery.
    _ = resolve_vault_root(repo_root)

    data: dict[str, str] = {}
    for row in rows:
        key = normalize_placeholder_key(row["placeholder"])
        data[key] = ""

    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    return str(output)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate final fill-data JSON from placeholder descriptions"
    )
    parser.add_argument(
        "--input",
        required=True,
        help="Placeholder description JSON from CSV roundtrip",
    )
    parser.add_argument(
        "--output",
        required=True,
        help="Output final fill-data JSON path",
    )
    args = parser.parse_args()

    output = generate_fill_data(args.input, args.output)
    print(f"Fill data JSON generated at: {output}")


if __name__ == "__main__":
    main()
