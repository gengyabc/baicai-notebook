import argparse
from pathlib import Path
from .filler import fill_template


def load_data_from_json(json_path: str) -> dict:
    import json
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
    parser.add_argument('--template', required=True, help='Template DOCX file')
    parser.add_argument('--data', required=True, help='Data JSON file')
    parser.add_argument('--output', required=True, help='Output filled DOCX file')
    
    args = parser.parse_args()
    
    Path(args.output).parent.mkdir(parents=True, exist_ok=True)
    
    data = load_data_from_json(args.data)
    fill_document(args.template, data, args.output)
    print(f"Filled document saved to: {args.output}")