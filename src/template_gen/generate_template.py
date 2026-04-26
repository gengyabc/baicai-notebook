import json
from pathlib import Path

from .exceptions import TemplateGenError
from .schemas import CoordinateMapping
from .task_paths import TaskPaths
from .filler import generate_template as _generate_template


def parse_location(location: str) -> dict:
    if location.startswith("paragraphs[") and location.endswith("]"):
        try:
            return {"paragraphs": int(location[len("paragraphs[") : -1])}
        except ValueError as exc:
            raise TemplateGenError(f"Invalid location index: {location}") from exc

    parts = location.split('.')
    expected_keys = ("tables", "rows", "cells")
    result = {}

    if len(parts) != len(expected_keys):
        raise TemplateGenError(f"Unsupported location: {location}")

    for part, expected_key in zip(parts, expected_keys):
        if "[" not in part or not part.endswith("]"):
            raise TemplateGenError(f"Unsupported location: {location}")

        key, raw_index = part.split("[", 1)
        if key != expected_key:
            raise TemplateGenError(f"Unsupported location: {location}")

        try:
            result[key] = int(raw_index[:-1])
        except ValueError as exc:
            raise TemplateGenError(f"Invalid location index: {location}") from exc

    return result


def load_placeholders_json(json_path: str) -> list[CoordinateMapping]:
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    mappings = []
    for placeholder in data['placeholders']:
        loc = parse_location(placeholder['location'])
        if 'paragraphs' in loc:
            mapping = CoordinateMapping(
                placeholder=placeholder['placeholder'],
                is_empty=True,
                target_type='paragraph',
                paragraph_index=loc['paragraphs'],
            )
        else:
            mapping = CoordinateMapping(
                placeholder=placeholder['placeholder'],
                is_empty=True,
                target_type='cell',
                table_index=loc.get('tables', 0),
                row_index=loc.get('rows', 0),
                col_index=loc.get('cells', 0),
            )
        mappings.append(mapping)
    
    return mappings


def generate_template_from_json(
    source_docx: str,
    placeholders_json: str,
    output_path: str,
) -> None:
    mappings = load_placeholders_json(placeholders_json)
    _generate_template(source_docx, output_path, mappings)
    print(f"Template saved to: {output_path}")


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Generate Jinja template from DOCX')
    parser.add_argument('--source', help='Source DOCX file (optional, uses current task if not provided)')
    parser.add_argument('--placeholders', help='Placeholders JSON file (optional)')
    parser.add_argument('--output', help='Output template DOCX file (optional)')
    
    args = parser.parse_args()
    
    if args.source and args.placeholders and args.output:
        Path(args.output).parent.mkdir(parents=True, exist_ok=True)
        generate_template_from_json(args.source, args.placeholders, args.output)
    else:
        task_paths = TaskPaths.get_current()
        generate_template_from_json(
            str(task_paths.input_docx),
            str(task_paths.placeholders_json),
            str(task_paths.template_docx),
        )
