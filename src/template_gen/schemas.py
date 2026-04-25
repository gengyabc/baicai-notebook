from dataclasses import dataclass
from typing import Optional


@dataclass
class StyleInfo:
    font_name: Optional[str] = None
    font_size: Optional[int] = None
    bold: bool = False
    italic: bool = False
    alignment: Optional[str] = None


@dataclass
class ParagraphInfo:
    index: int
    text: str
    style: Optional[StyleInfo] = None


@dataclass
class CellInfo:
    row_index: int
    col_index: int
    text: str
    is_empty: bool
    style: Optional[StyleInfo] = None


@dataclass
class RowInfo:
    index: int
    cells: list[CellInfo]


@dataclass
class TableInfo:
    index: int
    rows: list[RowInfo]


@dataclass
class DocumentStructure:
    paragraphs: list[ParagraphInfo]
    tables: list[TableInfo]
    styles: dict[str, StyleInfo]


@dataclass
class FieldInfo:
    location: str
    text: str
    context: str
    suggested_name: str


@dataclass
class CoordinateMapping:
    placeholder: str
    is_empty: bool
    target_type: str = "cell"
    paragraph_index: int | None = None
    table_index: int | None = None
    row_index: int | None = None
    col_index: int | None = None


@dataclass
class PlaceholderMapping:
    placeholder: str
    field_path: str
    field_info: FieldInfo
