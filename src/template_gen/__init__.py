from .task_paths import TaskPaths, TEMP_BASE, STATE_FILE
from .parser import parse_document, print_table_coordinates
from .filler import (
    batch_fill,
    detect_merged_cells,
    fill_template,
    set_cell_text_keep_basic_style,
    set_cell_text_keep_style,
)
from .generate_template import (
    generate_template_from_json,
    load_placeholders_json,
    parse_location,
)
from .fill_runner import fill_document, load_data_from_json
from .export_placeholder_csv import export_placeholder_csv, load_placeholder_description_source
from .import_placeholder_csv import import_placeholder_csv, validate_placeholder_description_csv
from .generate_fill_data import (
    generate_fill_data,
    load_placeholder_descriptions,
    normalize_placeholder_key,
    resolve_vault_root,
)
from .schemas import (
    DocumentStructure,
    ParagraphInfo,
    TableInfo,
    RowInfo,
    CellInfo,
    StyleInfo,
    FieldInfo,
    CoordinateMapping,
    PlaceholderMapping,
)
from .exceptions import ParseError, FillError, TemplateGenError

__all__ = [
    "TaskPaths",
    "TEMP_BASE",
    "STATE_FILE",
    "parse_document",
    "print_table_coordinates",
    "fill_template",
    "batch_fill",
    "set_cell_text_keep_basic_style",
    "set_cell_text_keep_style",
    "detect_merged_cells",
    "generate_template_from_json",
    "load_placeholders_json",
    "parse_location",
    "fill_document",
    "load_data_from_json",
    "export_placeholder_csv",
    "load_placeholder_description_source",
    "import_placeholder_csv",
    "validate_placeholder_description_csv",
    "generate_fill_data",
    "load_placeholder_descriptions",
    "normalize_placeholder_key",
    "resolve_vault_root",
    "DocumentStructure",
    "ParagraphInfo",
    "TableInfo",
    "RowInfo",
    "CellInfo",
    "StyleInfo",
    "FieldInfo",
    "CoordinateMapping",
    "PlaceholderMapping",
    "ParseError",
    "FillError",
    "TemplateGenError",
]
