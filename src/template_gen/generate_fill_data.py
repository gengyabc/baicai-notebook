import argparse
import json
import re
from pathlib import Path

from .exceptions import TemplateGenError


SIMPLE_PLACEHOLDER_PATTERN = re.compile(r"^\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}$")
LOOP_START_PATTERN = re.compile(r"\{%\s*for\s+(\w+)\s+in\s+(\w+)\s*%\}")
LOOP_END_PATTERN = re.compile(r"\{%\s*endfor\s*%\}")
LOOP_FIELD_PATTERN = re.compile(r"\{\{\s*(\w+)\.(\w+)\s*\}\}")


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


def parse_placeholder(placeholder: str) -> list[dict]:
    """
    Parse a placeholder and return a list of parsed components.
    
    Handles combined placeholders like:
    - `{% for course in courses %}{{ course.name }}` (loop_start + loop_field)
    - `{{ course.hours }}{% endfor %}` (loop_field + loop_end)
    
    Returns:
        list of dicts with keys:
        - type: "simple", "loop_start", "loop_end", "loop_field"
        - field: the field name (for simple)
        - loop_var: loop variable name (for loop_start, loop_field)
        - list_name: list name (for loop_start)
        - sub_field: sub-field name (for loop_field)
    """
    results = []
    
    simple_match = SIMPLE_PLACEHOLDER_PATTERN.match(placeholder)
    if simple_match:
        results.append({"type": "simple", "field": simple_match.group(1)})
        return results
    
    loop_start_match = LOOP_START_PATTERN.search(placeholder)
    if loop_start_match:
        results.append({
            "type": "loop_start",
            "loop_var": loop_start_match.group(1),
            "list_name": loop_start_match.group(2)
        })
    
    loop_field_match = LOOP_FIELD_PATTERN.search(placeholder)
    if loop_field_match:
        results.append({
            "type": "loop_field",
            "loop_var": loop_field_match.group(1),
            "sub_field": loop_field_match.group(2)
        })
    
    loop_end_match = LOOP_END_PATTERN.search(placeholder)
    if loop_end_match:
        results.append({"type": "loop_end"})
    
    if not results:
        results.append({"type": "unknown"})
    
    return results


def normalize_placeholder_key(placeholder: str) -> str:
    match = SIMPLE_PLACEHOLDER_PATTERN.match(placeholder)
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
    _ = resolve_vault_root(repo_root)

    data: dict = {}
    current_loop: dict | None = None
    loop_fields: dict = {}
    
    for row in rows:
        parsed_list = parse_placeholder(row["placeholder"])
        
        for parsed in parsed_list:
            if parsed["type"] == "simple":
                data[parsed["field"]] = ""
            elif parsed["type"] == "loop_start":
                list_name = parsed["list_name"]
                current_loop = {"list_name": list_name, "loop_var": parsed["loop_var"]}
                loop_fields[list_name] = {}
                if list_name not in data:
                    data[list_name] = []
            elif parsed["type"] == "loop_field":
                if current_loop:
                    sub_field = parsed["sub_field"]
                    loop_fields[current_loop["list_name"]][sub_field] = ""
            elif parsed["type"] == "loop_end":
                if current_loop:
                    list_name = current_loop["list_name"]
                    fields = loop_fields.get(list_name, {})
                    if fields and len(data[list_name]) == 0:
                        data[list_name] = [fields]
                current_loop = None
    
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
