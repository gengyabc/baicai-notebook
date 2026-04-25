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
