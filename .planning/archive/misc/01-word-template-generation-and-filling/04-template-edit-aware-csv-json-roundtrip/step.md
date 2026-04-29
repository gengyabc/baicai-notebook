---
step-key: template-edit-aware-csv-json-roundtrip
step-version: 1
requirement-version: 1
---

# Template Edit Aware CSV JSON Roundtrip

---

## Objective

让 `/export-csv edit` 把当前任务下经过人工修改的 `template.docx` 重新视为占位符事实来源：从该模板重新提取并覆盖当前版本的 `placeholders.json`，再导出新的 `descriptions.csv`；随后 `/fill-docx` 必须基于当前 `placeholders.json` 对导入后的 `descriptions.json` 做一致性校验，发现模板占位符与下游描述产物失配时立即失败，阻止继续生成错误的 `fill_data.json` 或最终 DOCX。

---

## Workflow Consumption Boundary

- `edit` 只属于步骤 2 的 `/export-csv` / `template_gen.export_placeholder_csv`，默认不传时继续沿用当前 `placeholders.json -> descriptions.csv` 行为。
- `edit` 模式下的输入事实来源从 `TaskPaths.placeholders_json` 切换为 `TaskPaths.template_docx`，不回退到原始 `input_docx`，也不重新走“空表语义命名”流程。
- `edit` 模式下重新生成的是当前任务当前版本的规范占位符清单 `placeholders.json`，随后立刻导出对应的 `descriptions.csv`。
- `/fill-docx` 继续沿用现有命令边界：先导入 CSV 到 `descriptions.json`，再生成 `fill_data.json`，最后调用 `fill_runner` 填充 DOCX。

## Source Of Truth And Freshness Boundary

- `TaskPaths.template_docx` 是 `edit` 模式下唯一允许的模板事实来源。
- `TaskPaths.placeholders_json` 仍是当前版本下游步骤使用的唯一规范占位符 JSON，`edit` 时必须原位覆盖，而不是创建并行副本。
- 重新提取 `placeholders.json` 时，必须按模板出现顺序保留每个占位符出现位置；同名占位符可在 JSON 中重复出现，因为它们代表模板中的多个实际落点。
- `TaskPaths.descriptions_csv` 仍是人工编辑入口，`edit` 导出时必须原位覆盖，确保其字段集合与新的 `placeholders.json` 完全一致。
- `TaskPaths.descriptions_json` 不是 `edit` 的输入来源；它只能由 `/fill-docx` 的 CSV 导入步骤刷新生成。
- `/fill-docx` 在生成 `fill_data.json` 前，必须把当前 `placeholders.json` 与刚导入的 `descriptions.json` 做一一对应校验，避免旧 CSV 或旧描述 JSON 混入新模板流程。

## Failure Behavior

- 当 `edit` 模式下找不到 `template.docx` 时，`/export-csv` 必须显式失败，不能静默退回旧 `placeholders.json`。
- 当从 `template.docx` 提取不到任何可支持的占位符结构，或发现无法映射到当前最小占位符 JSON 合同的内容时，`/export-csv edit` 必须失败，不能导出猜测结果。
- 当 `/fill-docx` 发现 `placeholders.json` 与导入后的 `descriptions.json` 在占位符集合、顺序、或重复性约束上不一致时，必须在 `generate_fill_data` 之前失败。
- 失败信息必须明确指出需要用户先重新执行 `/export-csv edit` 并基于新的 CSV 重新编辑，再重试 `/fill-docx`。

---

## Locked constraints

- `edit` 必须作为可选参数存在；未提供时保持当前默认行为不变。
- `edit` 只解决“已修改模板后的占位符重新基线化”，不引入新的模板编辑 UI。
- 重新生成的 `placeholders.json` 与 `descriptions.csv` 必须反映模板中的占位符增删改。
- 不创建并行的“edited”中间文件分支；当前任务当前版本只保留一个规范 `placeholders.json` 和一个规范 `descriptions.csv`。
- 步骤 3 的保护目标是阻止陈旧描述产物继续驱动填充，而不是放宽校验去兼容旧数据。

---

## Scope

### In

- `/export-csv` 命令参数扩展，支持 `edit`
- 从当前 `template.docx` 提取占位符并重建 `placeholders.json`
- 用重建后的 `placeholders.json` 重新导出 `descriptions.csv`
- `/fill-docx` 前置一致性校验：当前 `placeholders.json` 对比导入后的 `descriptions.json`
- 与上述行为对应的 README、命令文档和测试更新

### Out

- 重新设计模板生成步骤或原始空表解析流程
- 更改 CSV 列结构
- 更改 `fill_runner` 的输入输出契约
- 为旧 CSV 自动迁移、自动合并或自动保留旧描述内容
- 引入新的任务版本管理模型或并行 artifact 命名方案

---

# TDD Batches

## Batch 1: Rebuild Canonical Placeholders From Edited Template

**Primary Concern:** 冻结 `edit` 模式下的事实来源切换和规范占位符 JSON 重建行为。

**Tests:**
- GIVEN the current task has `output-v{N}/template.docx`
- WHEN running `/export-csv edit`
- THEN the command reads placeholders from `template.docx` instead of the existing `placeholders.json`

- GIVEN the edited template renamed, added, or removed placeholders
- WHEN regenerating `placeholders.json`
- THEN the rewritten JSON reflects the new placeholder set and current locations in template order

- GIVEN `template.docx` is missing or cannot be converted into the current placeholder JSON contract
- WHEN running `/export-csv edit`
- THEN the command fails explicitly and does not fall back to stale `placeholders.json`

**Implementation:**
- 在 `export_placeholder_csv` 路径内增加 `edit` 模式分支
- 复用现有 DOCX 解析能力读取 `template.docx`
- 从模板实际文本中提取受支持的占位符，并写回最小必要的 `placeholders.json` 结构

---

## Batch 2: Overwrite CSV From The Refreshed Placeholder Baseline

**Primary Concern:** 用新的规范占位符清单覆盖当前人工编辑入口，避免旧 CSV 继续作为有效输入。

**Tests:**
- GIVEN a refreshed `placeholders.json` from `edit`
- WHEN exporting CSV
- THEN `descriptions.csv` is overwritten in place with exactly `placeholder,description` columns for the refreshed placeholder set

- GIVEN `edit` is not provided
- WHEN exporting CSV
- THEN the command preserves the current behavior and uses the existing `placeholders.json` input path

- GIVEN duplicate placeholders appear in the edited template extraction result
- WHEN exporting CSV
- THEN the regenerated `placeholders.json` preserves all occurrences in template order, and the exported CSV still deduplicates by first occurrence order under the existing minimal CSV rule

**Implementation:**
- 保持 `export_placeholder_csv()` 的最小 CSV 合同不变
- 让 `edit` 分支先刷新 `placeholders.json`，再复用现有 CSV 导出逻辑
- 更新 `/export-csv` 命令文档与 `src/template_gen/README.md`，明确 `edit` 的职责边界

---

## Batch 3: Fail Fast On Stale Description Artifacts During Fill

**Primary Concern:** 在 `/fill-docx` 中阻止旧 CSV/旧描述 JSON 继续驱动新模板的填充流程。

**Tests:**
- GIVEN `placeholders.json` was refreshed from an edited template but `descriptions.csv` still comes from the old placeholder set
- WHEN `/fill-docx` imports the CSV and continues
- THEN the workflow fails before generating `fill_data.json`

- GIVEN the imported `descriptions.json` matches the current `placeholders.json` exactly
- WHEN `/fill-docx` runs
- THEN `generate_fill_data` proceeds normally with the existing downstream contract

- GIVEN placeholders were only reordered by the edited template
- WHEN `/fill-docx` compares the canonical placeholder sequence with the imported descriptions
- THEN the workflow enforces the same sequence rather than silently reordering or guessing

**Implementation:**
- 在 `generate_fill_data` 入口前增加当前 `placeholders.json` 与 `descriptions.json` 的一致性校验
- 失败时返回面向用户的修复提示：重新执行 `/export-csv edit` 并基于新 CSV 重新编辑
- 保持 `fill_runner` 和最终 DOCX 填充职责不变

---

## Batch 4: Preserve Current Step Boundaries In Docs And CLI Surface

**Primary Concern:** 让命令入口、README 和工作流说明与新行为一致，但不把相邻步骤职责揉在一起。

**Tests:**
- GIVEN the command help or workflow docs
- WHEN reading `/export-csv` and `/fill-docx`
- THEN the docs describe `edit` as a step-2 regeneration mode and describe fail-fast validation in step 3

- GIVEN the Python CLI entrypoints
- WHEN invoking them with or without `edit`
- THEN the exposed arguments and defaults match the documented workflow

**Implementation:**
- 更新 `.opencode/commands/export-csv.md`
- 更新 `.opencode/workflows/fill-docx.md` 和 `src/template_gen/README.md`
- 让 CLI 参数命名与文档完全一致

---

## Files

- `src/template_gen/export_placeholder_csv.py` - 增加 `edit` 参数、模板占位符重建入口、以及 CSV 覆盖导出流程
- `src/template_gen/generate_fill_data.py` - 增加当前 `placeholders.json` 与 `descriptions.json` 的一致性校验
- `src/template_gen/task_paths.py` - 继续作为 `template.docx`、`placeholders.json`、`descriptions.csv`、`descriptions.json` 的规范路径入口；仅在确有必要时补充最小路径辅助
- `src/template_gen/README.md` - 记录 `edit` 模式和 `/fill-docx` 的失配失败行为
- `.opencode/commands/export-csv.md` - 记录 `edit` 参数
- `.opencode/workflows/fill-docx.md` - 记录步骤 3 前的一致性保护
- `tests/test_placeholder_description_csv.py` - 覆盖 `edit` 导出、模板变更重建、缺失模板失败
- `tests/test_generate_fill_data.py` - 覆盖 stale descriptions fail-fast 和匹配时正常继续

## Symbols

- `export_placeholder_csv()` - 保持最小 CSV 导出主入口，并接纳 `edit` 模式所需参数扩展
- `main()` in `export_placeholder_csv.py` - 暴露 `edit`
- `load_placeholder_description_source()` or a nearby new helper - 继续负责从规范占位符 JSON 读取 CSV 导出源
- `extract_template_placeholders()` or equivalent new helper in `export_placeholder_csv.py` - 从 `template.docx` 提取并重建当前 `placeholders.json`
- `generate_fill_data()` - 在生成 `fill_data.json` 前执行 freshness 校验
- `load_placeholder_descriptions()` - 继续负责读取导入后的最小描述 JSON
- `TaskPaths.template_docx`
- `TaskPaths.placeholders_json`
- `TaskPaths.descriptions_csv`
- `TaskPaths.descriptions_json`

## Execution constraints

- Python 运行方式继续使用 `uv run python -m ...`。
- 只规划当前 live step，不把模板重新生成、CSV 结构扩展、或最终填充逻辑改造并入本步骤。
- `edit` 模式不能依赖 LLM 重新命名字段；它只能尊重用户已在模板里写下的占位符文本。
- 一致性校验必须基于当前任务当前版本路径，不跨任务、不跨版本猜测用户意图。
- 失败保护必须发生在生成新的 `fill_data.json` 之前。

## Invariants

- 默认 `/export-csv` 继续从当前 `placeholders.json` 导出最小 CSV。
- `descriptions.csv` 继续是人工编辑入口，`descriptions.json` 继续由 CSV 导入产生。
- `fill_runner` 继续只负责“模板 + 数据 JSON -> filled.docx”。
- 当前任务当前版本的规范中间文件路径继续由 `TaskPaths` 定义。

## Deferred follow-up

- 如果后续需要保留旧描述文本并把它们映射到模板重命名后的新占位符，应在新的 requirement 中明确迁移规则，而不是在本步骤中猜测。
- 如果后续需要支持超出当前最小合同的复杂模板语法，应在新的 requirement 中单独定义哪些 Jinja 结构可被 `edit` 模式安全提取。
