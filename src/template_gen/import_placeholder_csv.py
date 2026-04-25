import argparse
import csv
import json
from pathlib import Path

from .exceptions import TemplateGenError


def validate_placeholder_description_csv(csv_path: str) -> list[dict[str, str]]:
    source = Path(csv_path)
    if not source.exists():
        raise TemplateGenError(f"Input file not found: {csv_path}")

    with source.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        if reader.fieldnames != ["placeholder", "description"]:
            raise TemplateGenError(
                "CSV header must be exactly: placeholder,description"
            )

        seen: set[str] = set()
        rows: list[dict[str, str]] = []

        for row_index, row in enumerate(reader, start=2):
            if None in row:
                raise TemplateGenError(
                    f"CSV row {row_index} has unexpected number of columns"
                )

            placeholder = row.get("placeholder")
            description = row.get("description")

            if placeholder == "":
                raise TemplateGenError(f"CSV row {row_index} has empty placeholder")

            if placeholder in seen:
                raise TemplateGenError(
                    f"Duplicate placeholder found in CSV: {placeholder}"
                )

            if description is None:
                raise TemplateGenError(
                    f"CSV row {row_index} has missing description column"
                )

            seen.add(placeholder)
            rows.append({"placeholder": placeholder, "description": description})

    return rows


def import_placeholder_csv(input_path: str, output_path: str) -> str:
    rows = validate_placeholder_description_csv(input_path)

    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)
    payload = {"placeholders": rows}
    output.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return str(output)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Import placeholder/description CSV into a minimal placeholders JSON"
    )
    parser.add_argument("--input", required=True, help="Edited placeholder CSV file")
    parser.add_argument("--output", required=True, help="Output placeholders JSON file")
    args = parser.parse_args()

    output = import_placeholder_csv(args.input, args.output)
    print(f"Placeholder JSON imported to: {output}")


if __name__ == "__main__":
    main()
