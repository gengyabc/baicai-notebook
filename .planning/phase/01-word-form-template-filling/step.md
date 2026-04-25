---
step-key: word-form-template-filling
step-version: 1
requirement-version: 1
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
def set_cell_text_keep_basic_style(cell, text):
    """
    保留样式设置单元格文本：
    只修改第一个段落的第一个 run，
    如果没有 run 才新增 run。
    """
    paragraph = cell.paragraphs[0]
    if paragraph.runs:
        paragraph.runs[0].text = text
        for run in paragraph.runs[1:]:
            run.text = ""
    else:
        paragraph.add_run(text)
```

**Why This Pattern:**
- 不重建单元格结构
- 保留原有字体、对齐等样式
- 避免因重建 run 导致格式丢失

### Two-Phase Workflow

**Phase 1: Template Generation**
1. 输入: Word 空表文件 (`.docx`)
2. `python-docx` 解析文档结构（段落、表格、样式）
3. 提取结构化描述（字段位置、表格行列、可填充区域）
4. LLM 分析结构描述，生成 Jinja 占位符建议
5. 人工校对占位符命名和位置
6. 输出: 带占位符的模板文件 (`.docx`)

**Phase 2: Batch Filling**
1. 输入: 模板文件 + 结构化数据 (JSON/YAML/CSV)
2. `docxtpl` 加载模板
3. 数据映射到占位符
4. 批量生成输出文档
5. 输出: 填充后的文档集合

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
- 样式保留函数实现
- 辅助坐标工具

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

**Implementation:**
- 创建 `src/template_gen/` 目录结构
- 实现文档结构解析函数
- 实现模板填充基础函数

---

## Batch 2: Template Generation Workflow

**Primary Concern:** 空表分析 → 占位符生成 → 模板输出（保留样式）

**Tests:**
- GIVEN an empty form document with text fields
- WHEN analyzing document structure
- THEN extract field positions and context

- GIVEN an empty table cell with existing style
- WHEN setting placeholder text
- THEN cell style (font, alignment) is preserved

- GIVEN document structure analysis
- WHEN generating placeholder suggestions
- THEN output semantic Jinja placeholders with field mapping

- GIVEN reviewed placeholders and coordinate mapping
- WHEN writing to template file
- THEN output valid docxtpl-compatible template with styles preserved

**Implementation:**
- 实现文档结构分析模块
- 实现 `set_cell_text_keep_basic_style()` 样式保留函数
- 实现辅助坐标工具 `print_table_coordinates()`
- 定义 LLM 输入输出接口（不实现 LLM 调用）
- 实现占位符写入逻辑（只修改空单元格）

---

## Batch 3: Batch Filling Workflow

**Primary Concern:** 结构化数据 → 模板渲染 → 文档输出

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

**Implementation:**
- 实现单文档填充函数
- 实现批量填充函数
- 固定行字段填充（不用动态循环）

---

## Files

| Path | Purpose |
|------|---------|
| `src/template_gen/__init__.py` | Package entry |
| `src/template_gen/parser.py` | Word 文档结构解析 |
| `src/template_gen/generator.py` | 占位符生成与模板创建 |
| `src/template_gen/filler.py` | 批量填充功能 |
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
| `parse_document` | `parser` | 解析 Word 文档结构 |
| `extract_fillable_fields` | `parser` | 提取可填充字段列表 |
| `print_table_coordinates` | `parser` | 打印表格坐标辅助工具 |
| `generate_template` | `generator` | 生成带占位符的模板 |
| `set_cell_text_keep_basic_style` | `generator` | 保留样式设置单元格文本 |
| `PlaceholderMapping` | `schemas` | 占位符映射数据类 |
| `DocumentStructure` | `schemas` | 文档结构描述数据类 |
| `FieldInfo` | `schemas` | 字段信息数据类 |
| `CoordinateMapping` | `schemas` | 坐标映射数据类 |
| `fill_template` | `filler` | 单文档填充 |
| `batch_fill` | `filler` | 批量文档填充 |
| `ParseError` | `exceptions` | 解析失败异常 |
| `FillError` | `exceptions` | 填充失败异常 |

---

## Data Schemas

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

### ParseError

**When raised:**
- 文件不是有效的 `.docx` 格式
- 文件损坏无法读取
- 编码问题导致解析失败

**Behavior:**
- 抛出 `ParseError` 包含文件路径和具体错误原因
- 不尝试恢复，由调用方决定处理方式

### FillError

**When raised:**
- 模板文件不存在或格式无效
- 数据字段与占位符不匹配（缺少必需字段）
- 输出路径不可写

**Behavior:**
- 抛出 `FillError` 包含缺失字段列表
- 批量填充时，单个记录失败不影响其他记录
- 记录失败记录并继续处理

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
- GUI/CLI 交互界面（后续步骤）
- 模板版本管理（后续步骤）
- 动态行扩展支持（如确有需求，后续评估风险）