---
step-key: placeholder-description-csv-roundtrip
step-version: 1
requirement-version: 1
---

# Placeholder Description CSV Roundtrip

---

## Objective

在模板占位符已经校对完成之后，提供两个独立命令，把占位符清单导出为便于人工编辑的最小 CSV，并把编辑结果导回为后续数据生成可消费的最小 JSON 语义清单。

---

## Exchange Contract

### Export Input Boundary

- 输入是上一步已经人工校对过的占位符 JSON 文件。
- 该输入沿用现有模板生成阶段的占位符来源，至少包含 `placeholders` 数组，数组元素至少包含 `placeholder` 字段；其余字段如 `location` 可存在但不进入 CSV。
- 若缺少 `placeholders` 数组、数组元素缺少 `placeholder`、或 `placeholder` 为空字符串，导出命令直接失败，不推断默认值。
- 若输入元素已带有 `description`，导出时保留该值；若没有，导出空字符串，给后续 LLM 初稿或人工编辑使用。

### Export Output Boundary

- 导出的 CSV 仅允许两列，列头固定为 `placeholder,description`。
- 每个唯一 `placeholder` 只导出一行，按输入 JSON 中首次出现顺序保持稳定，避免人工编辑时出现重复项。
- 如果同一个 `placeholder` 在输入 JSON 中出现多次且携带不同的非空 `description`，导出命令失败，而不是静默选择其一。
- `placeholder` 保持与输入 JSON 完全一致，不重命名、不去掉 Jinja 包裹、不做语义改写。
- `description` 原样写出，允许为空。
- CSV 使用 UTF-8 编码并包含表头。

### Import Input Boundary

- 导入仅接受包含 `placeholder` 和 `description` 两列的 CSV。
- 表头顺序必须精确为 `placeholder,description`。
- 列名不匹配、缺列、多列、空 `placeholder`、或重复 `placeholder` 都视为输入错误并失败退出。
- `description` 允许为空字符串；该步骤只负责忠实回写人工编辑结果，不强制完成度校验。

### Import Output Boundary

- 导回 JSON 只保留后续步骤真正需要的语义映射，输出结构固定为：

```json
{
  "placeholders": [
    {
      "placeholder": "{{ project_name }}",
      "description": "项目名称"
    }
  ]
}
```

- 导入后的 JSON 不再携带 `location` 等模板定位信息，因为本步骤的职责是维护占位符语义说明，而不是继续编辑模板坐标。
- 导入顺序与 CSV 行顺序一致，保证人工整理后的顺序可以继续被后续命令消费。

### Workflow Boundary

- 该步骤是模板检查完成后的独立交换流程，不并入模板生成命令，也不并入最终填充命令。
- 推荐命令边界：
  - `uv run python -m template_gen.export_placeholder_csv --input <reviewed_placeholders.json> --output <placeholder_descriptions.csv>`
  - `uv run python -m template_gen.import_placeholder_csv --input <edited_placeholder_descriptions.csv> --output <placeholder_descriptions.json>`

---

## Locked constraints

- CSV 只能包含 `placeholder` 和 `description` 两列。
- 该步骤发生在模板检查完成之后。
- 输入输出必须能衔接后续命令，但不承担最终 DOCX 生成职责。
- 路径处理不能依赖写死 vault 根目录；所有输入输出路径都由 CLI 参数提供。
- 保留 `description` 字段供 LLM 生成初稿后再由人工修改，但本步骤不实现 LLM 生成能力。

---

## Scope

### In

- reviewed placeholder JSON -> minimal CSV 导出
- edited CSV -> minimal JSON 回写
- 唯一占位符去重与稳定顺序规则
- CSV 列校验、重复占位符校验、空占位符校验
- 两个独立 CLI 入口及其路径创建行为
- 面向后续步骤的最小 JSON 契约定义

### Out

- 模板占位符发现或校对逻辑
- 基于 CSV 直接生成最终 DOCX
- 为 CSV 增加额外元数据列
- LLM 生成描述内容本身
- 最终填充数据 schema 设计

---

# TDD Batches

## Batch 1: Export Minimal Placeholder CSV

**Primary Concern:** 从已校对的占位符 JSON 生成稳定、最小、可人工编辑的 CSV。

**Tests:**
- GIVEN a reviewed placeholders JSON with `location`, `placeholder`, and no `description`
- WHEN exporting CSV
- THEN the file contains exactly the `placeholder,description` header and blank descriptions

- GIVEN a reviewed placeholders JSON where the same `placeholder` appears more than once
- WHEN exporting CSV
- THEN only the first occurrence is emitted and row order follows first appearance order

- GIVEN a reviewed placeholders JSON that already contains `description`
- WHEN exporting CSV
- THEN the description text is preserved verbatim

**Implementation:**
- 新增导出函数，读取 reviewed placeholder JSON 并抽取唯一占位符行
- 以标准库 `csv` 写出最小 CSV 契约
- 新增导出 CLI 模块，负责参数解析和输出目录创建
- 对输入缺字段、空占位符和冲突描述使用 `TemplateGenError` 明确失败

---

## Batch 2: Import Edited CSV Back To JSON

**Primary Concern:** 把人工编辑后的 CSV 无损恢复为后续步骤可消费的最小 JSON 语义清单。

**Tests:**
- GIVEN a valid CSV with only `placeholder` and `description`
- WHEN importing
- THEN output JSON contains only those two fields under `placeholders`

- GIVEN a CSV with missing columns, extra columns, or empty `placeholder`
- WHEN importing
- THEN the command fails with a validation error

- GIVEN a CSV with duplicate `placeholder` rows
- WHEN importing
- THEN the command fails instead of guessing which description should win

**Implementation:**
- 新增导入函数，严格校验 CSV 列集合和每行内容
- 新增最小 JSON 写出逻辑，只输出 `placeholder` 和 `description`
- 复用 `TemplateGenError` 作为统一校验失败类型，保证 CLI 失败路径清晰

---

## Batch 3: Keep The Workflow Separate From Fill Commands

**Primary Concern:** 让 CSV roundtrip 成为模板校对后的独立命令步骤，而不是混入现有生成或填充流程。

**Tests:**
- GIVEN the export CLI arguments
- WHEN running the command
- THEN it writes the CSV artifact without invoking template rendering or fill behavior

- GIVEN the import CLI arguments
- WHEN running the command
- THEN it writes the JSON artifact without requiring template or DOCX inputs

- GIVEN an output path whose parent directory does not exist
- WHEN running either CLI
- THEN the parent directory is created before writing the artifact

**Implementation:**
- 新增两个独立模块入口，不修改 `fill_runner.py` 的职责边界
- 在包导出中补充新 roundtrip API，方便命令和测试复用
- 为新 CLI 与现有 `template_gen` 工作流补充最小文档说明

---

## Files

- `src/template_gen/export_placeholder_csv.py` - CSV 导出 CLI 和导出入口
- `src/template_gen/import_placeholder_csv.py` - CSV 导入 CLI 和导入入口
- `src/template_gen/__init__.py` - 暴露新的 roundtrip API
- `tests/test_placeholder_description_csv.py` - roundtrip contract tests
- `src/template_gen/README.md` - 记录该步骤位于模板校对之后的独立命令边界

## Symbols

- `export_placeholder_csv()` - 从 reviewed placeholder JSON 生成最小 CSV
- `import_placeholder_csv()` - 从 edited CSV 生成最小 JSON
- `validate_placeholder_description_csv()` - 严格校验列集合、空值和重复占位符
- `load_placeholder_description_source()` - 校验 export 输入 JSON 并产出唯一占位符行
- `main()` in `export_placeholder_csv.py`
- `main()` in `import_placeholder_csv.py`

## Execution constraints

- 使用 Python 标准库 `json`, `csv`, `pathlib` 即可完成该步骤。
- CLI 运行方式应与仓库工具链一致，使用 `uv run python -m template_gen.<module>`。
- 不改动现有模板生成和填充命令的输入契约。
- 失败路径必须显式报错，不能静默丢弃列、重复行或空占位符。

## Invariants

- 现有 reviewed placeholder JSON 仍然是模板生成阶段的输入依据。
- 现有 `generate_template_from_json()` 和 `fill_document()` 行为不因本步骤而改变。
- 该步骤产出的 JSON 是后续语义生成输入，不替代模板坐标映射文件。

## Deferred follow-up

- 后续步骤再决定如何消费 `placeholder`/`description` JSON 去生成最终填充数据。
- 若以后需要自动生成描述初稿，可在不改变本步骤 CSV 契约的前提下单独扩展。
