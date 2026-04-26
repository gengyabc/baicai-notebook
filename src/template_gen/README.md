# Template Gen

基于 `python-docx` 和 `docxtpl` 的 Word 模板生成与填充库。

## 目的

将 Word 空表转换为 Jinja 模板，并使用结构化数据批量填充。

## 目录结构

```
.temp/
├── .current_task.json       # 状态文件（task, version, updated_at）
├── {task}/
│   ├── input/
│   │   └── {task}.docx       # 输入文档
│   ├── temp-v{N}/           # 机器可读（JSON）
│   │   ├── parsed.json       # 文档结构
│   │   ├── placeholders.json # 占位符列表
│   │   ├── descriptions.json # 占位符+描述
│   │   └── fill_data.json    # 填充数据
│   └── output-v{N}/         # 人类可读（CSV, DOCX）
│       ├── descriptions.csv  # 可编辑的占位符描述
│       ├── template.docx     # Jinja 模板
│       └── filled.docx       # 最终输出
```

## 工作流

**步骤 1：生成模板**
```bash
/generate-template [docx-file]
```

参数可选；未提供时使用 `.temp/*/input/` 中最新的 docx。
此命令遵循 `generate-template` 工作流：
- 解析文档 → `.temp/{task}/temp-v{N}/parsed.json`
- 生成占位符 → `.temp/{task}/temp-v{N}/placeholders.json`
- 创建模板 → `.temp/{task}/output-v{N}/template.docx`

**步骤 2：导出占位符供人工编辑描述**
```bash
/export-csv
```

当模板已人工修改后，使用：

```bash
/export-csv edit
```

此命令会调用 `template_gen.export_placeholder_csv`，从当前任务的 `placeholders.json` 读取，导出为最小 CSV，仅包含：
- `placeholder`
- `description`

`edit` 模式会先从当前 `template.docx` 重新提取占位符并覆盖 `placeholders.json`，再覆盖导出新的 `descriptions.csv`。

输出：`.temp/{task}/output-v{N}/descriptions.csv`

**步骤 3：导入描述、查询数据并填充模板**
```bash
/fill-docx [--free yes/no]
```

此命令会依次：
- 调用 `template_gen.import_placeholder_csv` → `.temp/{task}/temp-v{N}/descriptions.json`
- 调用 `template_gen.generate_fill_data`（先校验 `placeholders.json` 与 `descriptions.json` 一致性）→ `.temp/{task}/temp-v{N}/fill_data.json`
- LLM 查询知识库（或网络搜索，当 `--free yes`）填充 `fill_data.json`
- 调用 `template_gen.fill_runner` → `.temp/{task}/output-v{N}/filled.docx`

默认仅使用知识库内容填充；添加 `--free yes` 可使用非知识库内容和网络搜索。

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
