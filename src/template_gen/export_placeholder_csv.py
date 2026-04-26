import argparse
import csv
import json
from pathlib import Path

from .exceptions import TemplateGenError
from .task_paths import TaskPaths


def load_placeholder_description_source(json_path: str) -> list[dict[str, str]]:
    source = Path(json_path)
    if not source.exists():
        raise TemplateGenError(f"Input file not found: {json_path}")

    try:
        data = json.loads(source.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise TemplateGenError(f"Invalid JSON: {json_path}") from exc

    placeholders = data.get("placeholders")
    if not isinstance(placeholders, list):
        raise TemplateGenError("Input JSON must contain a placeholders array")

    unique_rows: list[dict[str, str]] = []
    first_seen_descriptions: dict[str, str] = {}

    for item in placeholders:
        if not isinstance(item, dict):
            raise TemplateGenError("Each placeholders item must be an object")

        raw_placeholder = item.get("placeholder")
        if not isinstance(raw_placeholder, str) or raw_placeholder == "":
            raise TemplateGenError("Each placeholders item must include a non-empty placeholder")

        description = item.get("description", "")
        if description is None:
            description = ""
        elif not isinstance(description, str):
            raise TemplateGenError("description must be a string when provided")

        if raw_placeholder in first_seen_descriptions:
            first_description = first_seen_descriptions[raw_placeholder]
            if first_description and description and first_description != description:
                raise TemplateGenError(
                    f"Conflicting non-empty descriptions for placeholder: {raw_placeholder}"
                )
            continue

        first_seen_descriptions[raw_placeholder] = description
        unique_rows.append(
            {
                "placeholder": raw_placeholder,
                "description": description,
            }
        )

    return unique_rows


def export_placeholder_csv(input_path: str, output_path: str) -> str:
    rows = load_placeholder_description_source(input_path)
    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)

    with output.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["placeholder", "description"])
        writer.writeheader()
        writer.writerows(rows)

    return str(output)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Export reviewed placeholders JSON into a minimal placeholder/description CSV"
    )
    parser.add_argument("--input", help="Reviewed placeholders JSON file (optional)")
    parser.add_argument("--output", help="Output CSV file (optional)")
    args = parser.parse_args()

    if args.input and args.output:
        output = export_placeholder_csv(args.input, args.output)
        print(f"Placeholder CSV exported to: {output}")
    else:
        task_paths = TaskPaths.get_current()
        output = export_placeholder_csv(
            str(task_paths.placeholders_json),
            str(task_paths.descriptions_csv),
        )
        print(f"Placeholder CSV exported to: {output}")


if __name__ == "__main__":
    main()
