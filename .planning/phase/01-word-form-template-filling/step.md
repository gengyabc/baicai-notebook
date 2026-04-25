---
step-key: word-form-template-filling
step-version: 1
requirement-version: 1
implementation-status: complete
---

# Word Form Template Generation and Filling

---

## Objective

构建可重复使用的自动化流程，将多种版式的 Word 空表转化为可编程填充的 Jinja 模板，支持批量生成结构化文档。

---

## Technical Implementation Details

### Tool Chain Selection

**Primary Tools:**

| Tool | Responsibility |
|------|----------------|
| `python-docx` | 低层级 Word 文档读写，处理表格、段落等原始结构 |
| `docxtpl` | 基于 Jinja2 的模板渲染，高层级模板填充接口 |
| `jinja2` | 模板语法和变量替换，由 `docxtpl` 内部使用 |

**Rationale:**
- `docxtpl` 内部依赖 `python-docx`，两者职责互补而非竞争
- `python-docx` 用于分析空表结构（读取表格、段落、样式）
- `docxtpl` 用于模板渲染和批量填充
- 无需选择"其中一个"，而是组合使用

**Dependency Flow:**
```
空表.docx → [python-docx 读取结构] → 结构化描述 → [LLM 生成占位符] → 模板.docx → [docxtpl 填充] → 输出文档
```

**Key Implementation Pattern:**

```python
def set_cell_text_keep_style(cell, text: str, style_source_run=None) -> None:
    """
    保留样式设置单元格文本：
    - 如果段落有 runs，修改第一个 run 的文本，清空其他 runs
    - 如果段落没有 runs，添加新 run 并可选复制样式源
    - style_source_run: 可选，用于为空单元格提供样式的 run 对象
    """
    paragraph = cell.paragraphs[0]
    if paragraph.runs:
        paragraph.runs[0].text = text
        for run in paragraph.runs[1:]:
            run.text = ""
    else:
        run = paragraph.add_run(text)
        if style_source_run:
            _copy_run_style(style_source_run, run)

def set_cell_text_keep_basic_style(cell, text: str, style_source_run=None) -> None:
    """向后兼容别名"""
    set_cell_text_keep_style(cell, text, style_source_run=style_source_run)
```

**Why This Pattern:**
- 不重建单元格结构
- 保留原有字体、对齐等样式
- 避免因重建 run 导致格式丢失
- 支持从同行/同列单元格借用样式（style_source_run 参数）

**Merged Cell Handling:**
```python
def detect_merged_cells(table) -> dict:
    """检测合并单元格，返回 (row, col) -> 主单元格坐标的映射"""
    merged_map = {}
    for row_idx, row in enumerate(table.rows):
        prev_cell = None
        prev_col = 0
        for col_idx, cell in enumerate(row.cells):
            if prev_cell is not None and cell._tc is prev_cell._tc:
                merged_map[(row_idx, col_idx)] = (row_idx, prev_col)
            else:
                prev_cell = cell
                prev_col = col_idx
    return merged_map
```
- 跳过合并单元格的从单元格，只处理主单元格
- 防止在合并区域重复写入

### Two-Phase Workflow

**Phase 1: Template Generation**
1. 输入: Word 空表文件 (`.docx`)
2. `python -m src.template_gen.parser <docx_file>` 解析文档结构
3. 输出: JSON 结构描述到 `.temp/docx_parsed/<filename>.json`（自动生成）
4. LLM 分析结构描述，生成占位符建议 JSON（人工交互）
5. 人工校对占位符命名和位置
6. `python -m src.template_gen.generate_template --source <docx> --placeholders <json> --output <template.docx>`
7. 输出: 带占位符的模板文件 (`.docx`)

**Phase 2: Batch Filling**
1. 输入: 模板文件 + 结构化数据 (JSON)
2. `python -m src.template_gen.fill_runner --template <template.docx> --data <data.json> --output <output.docx>` 单文档填充
3. 或编程调用 `batch_fill()` 批量生成
4. 输出: 填充后的文档集合

**CLI Entry Points:**
- `python -m src.template_gen.parser <docx_file>` - 解析文档结构
- `python -m src.template_gen.generate_template --source --placeholders --output` - 生成模板
- `python -m src.template_gen.fill_runner --template --data --output` - 填充文档

### Placeholder Naming Convention

**Preferred Pattern (Fixed Fields):**

```jinja2
{{ project_name }}              # 简单字段
{{ course_1_name }}             # 表格行 1，固定字段
{{ course_2_name }}             # 表格行 2，固定字段
{{ course_1_teacher }}          # 课程 1 教师
{{ course_1_hours }}            # 课程 1 学时
```

**Avoid (Dynamic Rows):**

```jinja2
{% for course in courses %}     # 不推荐：容易破坏 Word 表格行结构
{{ course.name }}
{% endfor %}
```

**Rationale:**
- Word 表格里的循环容易影响行结构
- 复杂模板语法可能跨 run
- 跨单元格循环容易出错
- 行增删会影响原版式

**Naming Rules:**
- 使用 snake_case
- 语义化命名（如 `applicant_name` 而非 `field1`）
- 表格行用数字前缀（如 `course_1_name`, `course_2_name`）
- 固定行数，不足留空字符串

---

## Locked constraints

- 输入文件始终是可编辑的 `.docx`
- 模板版式多样，每种版式对应固定字段集合
- LLM 生成占位符后必须人工校对
- 必须使用开源工具
- 不处理图片、签名、PDF
- **不重建表格、不删除表格、不重建段落**
- **表格数据用固定字段，不用 `{% for %}` 循环语法**
- **只在原有空单元格中插入占位符，保留原有样式**

---

## Scope

### In

- 工具链选型与职责划分
- 模板生成流程定义
- 批量填充流程定义
- 占位符命名规范
- 支持段落文本替换
- 支持表格固定行字段填充
- 样式保留函数实现（含样式借用）
- 合并单元格检测与处理
- 辅助坐标工具
- CLI 入口（parser, generate_template, fill_runner）
- JSON 输出（parse_document 自动输出）
- 路径安全检查（batch_fill）
- 位置字符串解析（parse_location）

### Out

- 图片处理
- 签名处理
- PDF 输入或输出
- 非 `.docx` 格式
- LLM API 集成实现（仅定义接口规范）

---

# TDD Batches

## Batch 1: Tool Chain Validation

**Primary Concern:** 验证 `python-docx` 和 `docxtpl` 能协同工作

**Tests:**
- GIVEN a sample Word document
- WHEN parsing with python-docx
- THEN document structure (paragraphs, tables) is extracted correctly

- GIVEN a Jinja template created by docxtpl
- WHEN filling with test data
- THEN output document contains correct values

- GIVEN an invalid docx file
- WHEN parsing with python-docx
- THEN ParseError is raised

- GIVEN a missing file path
- WHEN parsing
- THEN ParseError is raised

**Implementation:**
- 创建 `src/template_gen/` 目录结构
- 实现文档结构解析函数（自动输出 JSON 到 `.temp/docx_parsed/`）
- 实现模板填充基础函数
- 实现异常类：`ParseError`, `FillError`, `TemplateGenError`

---

## Batch 2: Template Generation Workflow

**Primary Concern:** 空表分析 → 占位符生成 → 模板输出（保留样式、处理合并单元格）

**Tests:**
- GIVEN an empty form document with text fields
- WHEN analyzing document structure
- THEN extract field positions and context (JSON output)

- GIVEN an empty table cell with existing style
- WHEN setting placeholder text
- THEN cell style (font, alignment) is preserved

- GIVEN an empty table cell with no runs
- WHEN setting placeholder text with style_source_run
- THEN borrowed style from adjacent cell is applied

- GIVEN document structure analysis
- WHEN generating placeholder suggestions
- THEN output semantic Jinja placeholders with field mapping

- GIVEN reviewed placeholders and coordinate mapping
- WHEN writing to template file
- THEN output valid docxtpl-compatible template with styles preserved

- GIVEN a non-empty cell
- WHEN generating template
- THEN skip non-empty cells (preserve original content)

- GIVEN a table with merged cells
- WHEN generating template
- THEN only process primary cell, skip merged duplicates

- GIVEN an unsupported location string
- WHEN parsing location
- THEN TemplateGenError is raised

- GIVEN a placeholders JSON with invalid location
- WHEN loading JSON
- THEN TemplateGenError is raised

**Implementation:**
- 实现文档结构分析模块（自动 JSON 输出）
- 实现 `set_cell_text_keep_style()` 和 `set_cell_text_keep_basic_style()` 样式保留函数
- 实现 `detect_merged_cells()` 合并单元格检测
- 实现 `_find_style_source_run()` 样式源查找
- 实现 `parse_location()` 位置字符串解析
- 实现 `load_placeholders_json()` JSON 加载
- 实现 `generate_template()` 占位符写入逻辑（处理合并单元格）
- 实现 `generate_template_from_json()` CLI 入口
- 实现 `print_table_coordinates()` 辅助坐标工具

---

## Batch 3: Batch Filling Workflow

**Primary Concern:** 结构化数据 → 模板渲染 → 文档输出（含安全检查）

**Tests:**
- GIVEN a template with placeholders
- WHEN filling with structured data (single record)
- THEN output document has all fields replaced

- GIVEN a template and multiple data records
- WHEN batch filling
- THEN generate multiple output documents with correct naming

- GIVEN a template with fixed table row fields (course_1_name, course_2_name)
- WHEN filling with partial data (only 2 courses)
- THEN remaining fields filled with empty strings, table structure intact

- GIVEN a filename pattern with path traversal characters
- WHEN batch filling
- THEN sanitize filename and prevent escape from output directory

- GIVEN a template with borrowed style placeholders
- WHEN filling with data
- THEN filled text preserves borrowed style

- GIVEN a template requiring field but missing in data
- WHEN filling
- THEN FillError is raised (StrictUndefined)

**Implementation:**
- 实现单文档填充函数（使用 StrictUndefined）
- 实现批量填充函数
- 实现路径安全检查：`_sanitize_filename_component()` 和 `_build_output_path()`
- 实现 `fill_runner.py` CLI 入口
- 固定行字段填充（不用动态循环）

---

## Files

| Path | Purpose |
|------|---------|
| `src/template_gen/__init__.py` | Package entry |
| `src/template_gen/parser.py` | Word 文档结构解析，CLI 入口 |
| `src/template_gen/generate_template.py` | 占位符 JSON 加载与模板生成，CLI 入口 |
| `src/template_gen/filler.py` | 批量填充功能，样式保留函数 |
| `src/template_gen/fill_runner.py` | 单文档填充 CLI 入口 |
| `src/template_gen/schemas.py` | 数据结构定义 |
| `src/template_gen/exceptions.py` | 自定义异常类 |
| `tests/test_parser.py` | 解析功能测试 |
| `tests/test_generator.py` | 生成功能测试 |
| `tests/test_filler.py` | 填充功能测试 |
| `tests/fixtures/` | 测试用示例文档 |
| `templates/` | 模板文件存放目录 |

---

## Symbols

| Symbol | Module | Description |
|--------|--------|-------------|
| `parse_document` | `parser` | 解析 Word 文档结构，输出 JSON 到 `.temp/docx_parsed/` |
| `print_table_coordinates` | `parser` | 打印表格坐标辅助工具 |
| `generate_template` | `filler` | 生成带占位符的模板（内部实现） |
| `generate_template_from_json` | `generate_template` | 从 JSON 配置生成模板（CLI 入口） |
| `load_placeholders_json` | `generate_template` | 加载占位符 JSON 配置文件 |
| `parse_location` | `generate_template` | 解析位置字符串为坐标 |
| `set_cell_text_keep_style` | `filler` | 保留样式设置单元格文本（完整版） |
| `set_cell_text_keep_basic_style` | `filler` | 保留样式设置单元格文本（兼容别名） |
| `detect_merged_cells` | `filler` | 检测表格合并单元格 |
| `fill_template` | `filler` | 单文档填充（内部实现） |
| `batch_fill` | `filler` | 批量文档填充，含路径安全检查 |
| `fill_document` | `fill_runner` | 单文档填充（CLI 入口） |
| `load_data_from_json` | `fill_runner` | 加载数据 JSON 文件 |
| `PlaceholderMapping` | `schemas` | 占位符映射数据类 |
| `DocumentStructure` | `schemas` | 文档结构描述数据类 |
| `ParagraphInfo` | `schemas` | 段落信息数据类 |
| `TableInfo` | `schemas` | 表格信息数据类 |
| `RowInfo` | `schemas` | 行信息数据类 |
| `CellInfo` | `schemas` | 单元格信息数据类 |
| `FieldInfo` | `schemas` | 字段信息数据类 |
| `CoordinateMapping` | `schemas` | 坐标映射数据类 |
| `StyleInfo` | `schemas` | 样式信息数据类 |
| `ParseError` | `exceptions` | 解析失败异常 |
| `FillError` | `exceptions` | 填充失败异常 |
| `TemplateGenError` | `exceptions` | 基础异常类 |

---

## Data Schemas

### StyleInfo

```python
@dataclass
class StyleInfo:
    font_name: Optional[str] = None
    font_size: Optional[int] = None
    bold: bool = False
    italic: bool = False
    alignment: Optional[str] = None
```

### ParagraphInfo

```python
@dataclass
class ParagraphInfo:
    index: int
    text: str
    style: Optional[StyleInfo] = None
```

### CellInfo

```python
@dataclass
class CellInfo:
    row_index: int
    col_index: int
    text: str
    is_empty: bool
    style: Optional[StyleInfo] = None
```

### RowInfo

```python
@dataclass
class RowInfo:
    index: int
    cells: list[CellInfo]
```

### TableInfo

```python
@dataclass
class TableInfo:
    index: int
    rows: list[RowInfo]
```

### DocumentStructure

```python
@dataclass
class DocumentStructure:
    paragraphs: list[ParagraphInfo]
    tables: list[TableInfo]
    styles: dict[str, StyleInfo]
```

### FieldInfo

```python
@dataclass
class FieldInfo:
    location: str           # 路径: "paragraphs[0]" 或 "tables[1].rows[2].cells[0]"
    text: str               # 原始文本内容
    context: str            # 上下文描述（前后文本片段）
    suggested_name: str     # 建议的占位符名称
```

### CoordinateMapping

```python
@dataclass
class CoordinateMapping:
    """单元格坐标到占位符的映射"""
    table_index: int        # 表格索引（文档中第几个表格）
    row_index: int          # 行索引
    col_index: int          # 列索引
    placeholder: str        # 占位符
    is_empty: bool          # 是否为空单元格
```

### PlaceholderMapping

```python
@dataclass
class PlaceholderMapping:
    placeholder: str        # Jinja 占位符 (如 "{{ applicant_name }}")
    field_path: str         # 数据路径 (如 "applicant.name")
    field_info: FieldInfo   # 原始字段信息
```

---

## Failure and Fallback Behavior

### TemplateGenError

**Base exception class for all template_gen errors.**

### ParseError

**When raised:**
- 文件不是有效的 `.docx` 格式
- 文件损坏无法读取
- 编码问题导致解析失败
- 文件不存在

**Behavior:**
- 抛出 `ParseError` 包含文件路径和具体错误原因
- 不尝试恢复，由调用方决定处理方式

### FillError

**When raised:**
- 模板文件不存在或格式无效
- 数据字段与占位符不匹配（使用 StrictUndefined）
- 输出路径不可写
- 输出文件名包含路径遍历字符（安全检查）

**Behavior:**
- 抛出 `FillError` 包含缺失字段列表或具体错误
- 批量填充时，单个记录失败不影响其他记录
- 记录失败记录并继续处理

### TemplateGenError (parse_location/load_placeholders_json)

**When raised:**
- 位置字符串格式不支持（如 "paragraphs[0]"）
- 位置字符串索引无效（非数字）
- JSON 文件中 location 字段格式错误

**Behavior:**
- 抛出 `TemplateGenError` 包含具体错误原因
- 不尝试修复格式，由调用方修正 JSON

---

## Execution constraints

- Python 3.9+
- 依赖: `python-docx`, `docxtpl`, `jinja2`
- 测试框架: `pytest`
- 文档示例使用项目 `samples/` 目录下的空表

---

## Invariants

- 模板文件不修改原始空表的样式和布局
- 填充操作不改变文档的格式结构
- 占位符命名保持语义化和一致性
- 只修改空单元格，跳过非空单元格
- 表格行数固定，不动态增删行
- 样式保留：只修改文本内容，不重建 run 或 paragraph

---

## Deferred follow-up

- LLM API 集成实现（LLM 只生成 JSON，不直接操作 Word）
- GUI/CLI 交互界面增强（当前已有基础 CLI）
- 模板版本管理
- 动态行扩展支持（如确有需求，后续评估风险）
- extract_fillable_fields 函数（当前通过 JSON 输出人工识别）