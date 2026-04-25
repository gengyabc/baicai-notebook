# Template Gen

基于 `python-docx` 和 `docxtpl` 的 Word 模板生成与填充库。

## 目的

将 Word 空表转换为 Jinja 模板，并使用结构化数据批量填充。

## 工作流

**步骤 1：生成模板**
```
/generate-template .temp/docx/form.docx
```

此命令遵循 `generate-template` 工作流：
- 解析文档 → `.temp/docx_parsed/form.json`
- 生成占位符 → `.temp/docx_placeholders/form_placeholders.json`
- 创建模板 → `.temp/docx_template/form_template.docx`

**步骤 2：导出占位符供人工编辑描述**
```bash
/export-csv .temp/docx_placeholders/form_placeholders.json
```

此命令会调用 `template_gen.export_placeholder_csv`，导出文件保持最小化，仅包含：
- `placeholder`
- `description`

输出：`.temp/docx_placeholders/form_placeholder_descriptions.csv`

**步骤 3：导入描述、生成填充数据并填充模板**
```bash
/fill-docx \
  .temp/docx_placeholders/form_placeholder_descriptions.csv \
  .temp/docx_template/form_template.docx \
  .temp/docx_filled/output.docx
```

此命令会依次：
- 调用 `template_gen.import_placeholder_csv` 生成 `.temp/docx_placeholders/form_placeholder_descriptions.json`
- 调用 `template_gen.generate_fill_data` 生成 `.temp/docx_data/form_fill_data.json`
- 调用 `template_gen.fill_runner` 产出 `.temp/docx_filled/output.docx`

输出：`.temp/docx_placeholders/form_placeholder_descriptions.json`、`.temp/docx_data/form_fill_data.json`、`.temp/docx_filled/output.docx`

## 核心函数

| 函数 | 模块 | 用途 |
|------|------|------|
| `parse_document` | parser | 从 `.docx` 提取段落、表格、样式 |
| `print_table_coordinates` | parser | 表格结构调试辅助 |
| `generate_template` | filler | 从 `CoordinateMapping` 列表创建 Jinja 模板 |
| `generate_template_from_json` | generate_template | 从占位符 JSON 创建 Jinja 模板 |
| `export_placeholder_csv` | export_placeholder_csv | 从占位符 JSON 导出最小 CSV |
| `import_placeholder_csv` | import_placeholder_csv | 从编辑后的 CSV 导回最小 JSON |
| `fill_template` | filler | 用数据字典填充模板 |
| `fill_document` | fill_runner | 从数据 JSON 文件填充模板 |
| `generate_fill_data` | generate_fill_data | 从占位符描述生成填充数据 JSON |
| `batch_fill` | filler | 从记录批量生成多个文档 |
| `set_cell_text_keep_basic_style` | filler | 设置单元格文本时保留样式 |

## 数据结构

- `DocumentStructure`：段落、表格、样式
- `FieldInfo`：位置、文本、上下文、建议名称
- `CoordinateMapping`：表格/行/列索引到占位符的映射
- `PlaceholderMapping`：Jinja 占位符到字段路径的映射

## 样式保留

`set_cell_text_keep_basic_style()` 仅修改第一个 run 的文本，保留字体、字号、粗体、斜体。次要 run 会被清空但不会删除。

## 约束

- 仅支持 `.docx` 格式
- 固定表格行（不支持 `{% for %}` 循环）
- 仅处理空单元格（跳过非空单元格）
- 不重建表格或段落
