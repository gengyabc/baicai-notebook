---
step-key: vault-grounded-data-fill
step-version: 1
requirement-version: 1
---

# Vault Grounded Data Fill

---

## Objective

在占位符描述 CSV 已经人工编辑并回写为最小 JSON 之后，新增一个独立的数据生成命令，读取当前模板字段语义清单并解析 `.opencode/vault-config.json` 中配置的 vault root，基于 vault 中的资料生成可直接供 `template_gen.fill_runner` 使用的最终数据 JSON；最终 DOCX 继续通过现有填充命令产出，不把该职责混入 CSV roundtrip。

---

## Workflow Consumption Boundary

- 上游输入沿用 `02-placeholder-description-csv-roundtrip` 的输出 JSON，结构固定为 `{"placeholders": [{"placeholder": "{{ project_name }}", "description": "..."}]}`。
- 本步骤只负责“描述语义清单 -> 最终填充数据 JSON”的生成，不重新解析 DOCX，也不修改模板占位符文件。
- 最终 DOCX 产出继续复用现有命令边界：`uv run python -m template_gen.fill_runner --template <template.docx> --data <data.json> --output <output.docx>`。
- 该步骤需要把字段全集限定为当前输入 JSON 中出现的占位符，不额外发明模板外字段。

## Vault Source Boundary

- vault 根目录必须从仓库内的 `.opencode/vault-config.json` 读取 `vaultRoot`，不得把 `workbook/` 写死到实现中。
- 仅允许读取解析后 vault root 之下的内容，不跨出该根目录，也不读取 `.opencode/` 作为业务数据源。
- 读取优先级沿用当前仓库的 vault 查询顺序：`<vaultRoot>/wiki/` -> `<vaultRoot>/output/` -> `<vaultRoot>/resources/` -> `<vaultRoot>/brainstorm/` -> `<vaultRoot>/my-work/`。
- `wiki`/`output` 视为稳定优先来源，`resources` 作为支撑证据，`brainstorm`/`my-work` 只能作为较弱上下文，不能在没有更强规则时被静默当作同等权威来源。

## Fill Data Contract

- 输出 JSON 必须是 `template_gen.fill_runner` 可直接加载的扁平对象，键为模板变量名，值为最终填充值字符串。
- 字段键来自输入里的 Jinja 占位符规范化结果，例如 `{{ project_name }}` -> `project_name`；规范化失败时必须显式报错，不能猜测字段名。
- 输出字段集合与输入占位符集合一一对应，每个占位符恰好生成一个最终键值，不因 vault 中出现额外信息而扩展 schema。
- 该步骤不改变现有 `fill_runner` 的数据加载契约。

## Readiness Blocker

- 当前 requirement 尚未冻结“`description` + vault 资料 -> 最终字符串值”的决策机制。
- 对后续实现仍然存在多个同样合理但行为不同的路径：
  - 规则/关键词匹配后直接抽取文本
  - 模型参与的检索后归纳
  - 先产出候选/证据，再由单独确认步骤定稿
- requirement 也没有冻结冲突资料如何裁决、无可靠资料时是输出空字符串还是失败、以及是否需要把证据一并落盘。
- 这些差异会直接改变运行拓扑、测试断言、失败路径和最终命令边界，因此在 discovery 刷新前不能把本步骤标记为 implementation-ready。

---

## Locked constraints

- 必须支持当前 `workbook` 作为 vault root，同时允许未来通过 `.opencode/vault-config.json` 重命名。
- 最终输出仍然是面向现有 DOCX 模板填充流程的数据 JSON。
- 该步骤是 CSV 人工编辑之后的独立命令，不回退到人工拼装最终 JSON。
- 只处理当前模板字段对应的数据，不扩展到无关数据源或无关字段。
- 不修改现有模板生成、CSV roundtrip、以及 `fill_runner` 的既有职责边界。

---

## Scope

### In

- placeholder-description JSON 的读取与字段全集约束
- vault root 配置解析与基于 vault root 的路径边界
- 面向现有 `fill_runner` 的最终数据 JSON 契约
- 生成数据 JSON 与最终 DOCX 填充的命令边界定义
- 对占位符到最终数据键的规范化规则

### Out

- 占位符发现、模板生成、CSV 导出、CSV 导入
- 重新设计 DOCX 填充引擎或 `fill_runner` 输入格式
- 向 vault 写回生成结果或改写 vault 资料
- 在 requirement 未冻结前擅自决定值生成策略、冲突裁决策略或证据落盘策略

---

# TDD Batches

## Batch 1: Freeze IO And Vault Root Resolution

**Primary Concern:** 先把当前已确定的输入输出边界、字段规范化规则和 vault root 配置解析方式固定下来。

**Tests:**
- GIVEN a placeholder-description JSON from step 02
- WHEN loading the step input
- THEN the command accepts only the current `placeholders[].placeholder` and `placeholders[].description` shape

- GIVEN a repository with `.opencode/vault-config.json`
- WHEN resolving the vault root
- THEN the command uses `vaultRoot` from config rather than a hard-coded `workbook/` path

- GIVEN an input placeholder like `{{ project_name }}`
- WHEN normalizing the downstream fill key
- THEN the result is `project_name`

**Implementation:**
- 新增单独的数据生成模块和 CLI 入口
- 读取并校验 step 02 的最小 JSON 语义清单
- 解析 `.opencode/vault-config.json` 并建立 vault 根路径边界
- 实现占位符到填充键的显式规范化与报错路径

---

## Batch 2: Freeze Value Resolution Policy After Discovery Refresh

**Primary Concern:** 在 discovery 刷新后，按冻结后的策略把 `description + vault 资料` 解析成最终字符串值。

**Tests:**
- 待 refreshed discovery 明确后补充：至少需要覆盖命中资料、资料冲突、资料缺失、以及仅出现弱来源时的行为。

**Implementation:**
- 待 refreshed discovery 明确后补充：当前不能在规则抽取、模型归纳、或候选确认流之间自行做产品决策。

---

## Batch 3: Keep Final DOCX Fill As A Separate Existing Command

**Primary Concern:** 让本步骤生成的数据 JSON 能直接进入现有 `fill_runner`，但不把 DOCX 填充重新并入本模块。

**Tests:**
- GIVEN a generated fill data JSON
- WHEN running `uv run python -m template_gen.fill_runner --template --data --output`
- THEN the existing fill command can consume the JSON without any schema adapter

- GIVEN this step's CLI arguments
- WHEN running the command
- THEN it writes only the final data JSON artifact and does not require a DOCX template path

**Implementation:**
- 让新模块只负责写出最终数据 JSON
- 在 README 中把后续 DOCX 填充保留为单独一步
- 不改动 `fill_runner` 的现有命令职责

---

## Files

- `src/template_gen/generate_fill_data.py` - 读取 placeholder-description JSON、解析 vault root、生成最终数据 JSON 的单独入口
- `src/template_gen/__init__.py` - 暴露新的数据生成 API
- `src/template_gen/README.md` - 更新 CSV roundtrip 之后的数据生成与最终填充步骤说明
- `tests/test_generate_fill_data.py` - 输入契约、vault root 解析、占位符规范化和最终命令边界测试

## Symbols

- `generate_fill_data()` - 从 placeholder-description JSON 生成最终填充数据 JSON
- `load_placeholder_descriptions()` - 校验并读取 step 02 产出的最小 JSON 语义清单
- `resolve_vault_root()` - 从 `.opencode/vault-config.json` 解析 vault root
- `normalize_placeholder_key()` - 把 `{{ field_name }}` 规范化为 `field_name`
- `main()` in `generate_fill_data.py`

## Execution constraints

- Python 依赖和运行方式保持仓库工具链：`uv run python -m template_gen.generate_fill_data ...`。
- 只为当前 live step 规划最小必要文件，不额外拆分新的规划步骤。
- 不能把未冻结的值生成策略伪装成“实现细节”；若需要额外产品决策，必须回到 discovery。
- 新命令的输出必须与现有 `fill_runner` 兼容，而不是通过临时适配层绕开未明确的契约。

## Invariants

- `02-placeholder-description-csv-roundtrip` 产生的最小 JSON 仍然是本步骤唯一的字段语义输入。
- 现有 `template_gen.fill_runner` 继续负责“模板 + 数据 JSON -> DOCX”，不因本步骤而承担 vault 检索职责。
- vault root 的真实名称继续由 `.opencode/vault-config.json` 决定。

## Deferred follow-up

- 刷新 discovery，明确值生成策略本身：规则抽取、模型归纳、还是候选确认流。
- 刷新 discovery，明确资料冲突时的裁决规则、资料缺失时的输出规则、以及是否需要单独 evidence artifact。
