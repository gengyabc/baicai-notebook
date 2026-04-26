import argparse
import json
from pathlib import Path
from .task_paths import TaskPaths
from .filler import fill_template


def load_data_from_json(json_path: str) -> dict:
    with open(json_path, 'r', encoding='utf-8') as f:
        return json.load(f)


def fill_document(
    template_path: str,
    data: dict,
    output_path: str,
) -> str:
    return fill_template(template_path, data, output_path)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Fill Jinja template with data')
    parser.add_argument('--template', help='Template DOCX file (optional)')
    parser.add_argument('--data', help='Data JSON file (optional)')
    parser.add_argument('--output', help='Output filled DOCX file (optional)')
    
    args = parser.parse_args()
    
    if args.template and args.data and args.output:
        Path(args.output).parent.mkdir(parents=True, exist_ok=True)
        data = load_data_from_json(args.data)
        fill_document(args.template, data, args.output)
        print(f"Filled document saved to: {args.output}")
    else:
        task_paths = TaskPaths.get_current()
        task_paths.output_dir.mkdir(parents=True, exist_ok=True)
        data = load_data_from_json(str(task_paths.fill_data_json))
        fill_document(str(task_paths.template_docx), data, str(task_paths.filled_docx))
        print(f"Filled document saved to: {task_paths.filled_docx}")