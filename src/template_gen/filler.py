from copy import deepcopy
import os

from docx import Document
from docxtpl import DocxTemplate
from jinja2 import Environment, StrictUndefined

from .exceptions import FillError
from .schemas import CoordinateMapping, DocumentStructure, FieldInfo, PlaceholderMapping


def detect_merged_cells(table) -> dict:
    """Detect merged cells in a table. Returns dict mapping (row, col) -> primary cell coords."""
    merged_map = {}
    seen_cells = {}

    for row_idx, row in enumerate(table.rows):
        for col_idx, cell in enumerate(row.cells):
            tc = cell._tc
            if tc in seen_cells:
                merged_map[(row_idx, col_idx)] = seen_cells[tc]
            else:
                seen_cells[tc] = (row_idx, col_idx)

    return merged_map


def _copy_run_style(source_run, target_run) -> None:
    if source_run is None or source_run._element.rPr is None:
        return

    target_rpr = target_run._element.get_or_add_rPr()
    for child in list(target_rpr):
        target_rpr.remove(child)
    for child in source_run._element.rPr:
        target_rpr.append(deepcopy(child))


def _find_style_source_run(table, row_idx: int, col_idx: int):
    candidates = []

    row = table.rows[row_idx]
    for other_col, cell in enumerate(row.cells):
        if other_col != col_idx:
            candidates.extend(cell.paragraphs[0].runs)

    for other_row, table_row in enumerate(table.rows):
        if other_row != row_idx and col_idx < len(table_row.cells):
            candidates.extend(table_row.cells[col_idx].paragraphs[0].runs)

    for run in candidates:
        if run.text or run._element.rPr is not None:
            return run

    return None


def set_cell_text_keep_style(cell, text: str, style_source_run=None) -> None:
    """Set cell text while preserving or borrowing run formatting."""
    paragraph = cell.paragraphs[0]

    if paragraph.runs:
        run = paragraph.runs[0]
        run.text = text
        for extra_run in paragraph.runs[1:]:
            extra_run.text = ""
    else:
        run = paragraph.add_run(text)
        _copy_run_style(style_source_run, run)


def set_paragraph_text_keep_style(paragraph, text: str) -> None:
    """Set paragraph text while preserving existing run formatting."""
    if paragraph.runs:
        run = paragraph.runs[0]
        run.text = text
        for extra_run in paragraph.runs[1:]:
            extra_run.text = ""
    else:
        paragraph.add_run(text)


def set_cell_text_keep_basic_style(cell, text: str, style_source_run=None) -> None:
    """Backward-compatible alias for style-preserving cell replacement."""
    set_cell_text_keep_style(cell, text, style_source_run=style_source_run)


def generate_template(
    input_path: str,
    output_path: str,
    mappings: list[CoordinateMapping],
) -> DocumentStructure:
    doc = Document(input_path)
    
    merged_maps = {}
    for t_idx, table in enumerate(doc.tables):
        merged_maps[t_idx] = detect_merged_cells(table)
    
    processed_cells = set()
    
    for mapping in mappings:
        if not mapping.is_empty:
            continue

        if mapping.target_type == "paragraph":
            if mapping.paragraph_index is None or mapping.paragraph_index >= len(doc.paragraphs):
                continue
            paragraph = doc.paragraphs[mapping.paragraph_index]
            set_paragraph_text_keep_style(paragraph, mapping.placeholder)
            continue
        
        table_idx = mapping.table_index
        row_idx = mapping.row_index
        col_idx = mapping.col_index
        if table_idx is None or row_idx is None or col_idx is None:
            continue
        
        cell_key = (table_idx, row_idx, col_idx)
        if cell_key in processed_cells:
            continue
        
        table = doc.tables[table_idx]
        row = table.rows[row_idx]
        cell = row.cells[col_idx]

        if cell.text.strip():
            continue

        merged_map = merged_maps.get(table_idx, {})
        primary_key = merged_map.get((row_idx, col_idx), (row_idx, col_idx))
        
        if primary_key != (row_idx, col_idx):
            continue
        
        style_source_run = None
        if not cell.paragraphs[0].runs:
            style_source_run = _find_style_source_run(table, row_idx, col_idx)

        set_cell_text_keep_style(cell, mapping.placeholder, style_source_run=style_source_run)
        processed_cells.add(cell_key)
    
    doc.save(output_path)
    
    from .parser import parse_document
    return parse_document(output_path)


def fill_template(
    template_path: str,
    data: dict,
    output_path: str,
) -> str:
    if not os.path.exists(template_path):
        raise FillError(f"Template file not found: {template_path}")
    
    try:
        tpl = DocxTemplate(template_path)
        tpl.render(data, jinja_env=Environment(undefined=StrictUndefined))
        tpl.save(output_path)
        return output_path
    except Exception as e:
        raise FillError(f"Fill failed: {str(e)}")


def _sanitize_filename_component(value: str) -> str:
    sanitized = value.strip().replace("..", "_")
    for separator in (os.sep, os.altsep):
        if separator:
            sanitized = sanitized.replace(separator, "_")
    return sanitized or "output"


def _build_output_path(output_dir: str, output_filename: str) -> str:
    output_dir_abs = os.path.abspath(output_dir)
    output_path = os.path.abspath(os.path.join(output_dir_abs, output_filename))

    if os.path.commonpath([output_dir_abs, output_path]) != output_dir_abs:
        raise FillError(f"Unsafe output filename: {output_filename}")

    return output_path


def batch_fill(
    template_path: str,
    data_records: list[dict],
    output_dir: str,
    filename_pattern: str = "output_{index}.docx",
) -> list[str]:
    if not os.path.exists(template_path):
        raise FillError(f"Template file not found: {template_path}")
    
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    outputs = []
    failed = []
    
    for i, data in enumerate(data_records):
        output_filename = filename_pattern.replace("{index}", str(i + 1))
        if "{name}" in filename_pattern and "name" in data:
            output_filename = output_filename.replace("{name}", _sanitize_filename_component(str(data["name"])))
        output_path = _build_output_path(output_dir, output_filename)

        try:
            fill_template(template_path, data, output_path)
            outputs.append(output_path)
        except FillError as e:
            failed.append({"index": i, "error": str(e)})
    
    if failed:
        print(f"Warning: {len(failed)} records failed to fill")
    
    return outputs
