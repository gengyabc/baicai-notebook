---
step-key: vault-grounded-data-fill
step-number: 03
step-folder: 03-vault-grounded-data-fill
phase-topic: word-template-generation-and-filling
status: discovered
requirement-version: 1
updated-at: 2026-04-25
source: discover-requirements
supersedes: null
---

## Restated Request

在 CSV 人工编辑完成后，需要用描述信息和 vault 中的资料生成最终数据 JSON，并通过单独命令把数据填入 DOCX 模板，产出最终文档。

## Real Objective

让最终填表内容尽量由可追溯的 vault 资料驱动，而不是只依赖手工输入，同时把数据生成和文档填充放进清晰的自动化收口步骤。

## Problem Statement

用户不想在 CSV 之后再手动拼最终数据，也不希望填充逻辑硬编码依赖当前 vault 名称。需要一个独立步骤，能读取编辑后的描述、结合 vault 内容生成数据，再输出最终 DOCX。

## In Scope

- 定义从编辑后的描述信息生成最终数据 JSON 的规则
- 定义如何读取 vault 内容作为数据生成依据
- 定义 vault 根目录通过配置解析，支持未来重命名
- 定义生成数据 JSON 后再填充 DOCX 的独立命令边界
- 保持最终填充面向现有模板流程

## Out of Scope

- 占位符发现与模板生成
- CSV 导出与 CSV 人工编辑
- 重新设计 Word 模板结构
- 增加与此目标无关的数据源

## Constraints

- 必须支持当前 `workbook` 作为 vault root，同时不把路径写死到实现里
- 最终结果仍然是基于 DOCX 模板的填充输出
- 该步骤应独立于人工编辑环节，作为后续命令执行
- 只处理与当前模板字段相关的数据

## Assumptions

- CSV 中的描述足以引导数据生成
- vault 中存在可用于补全字段的信息
- 填充模板所需字段集合已由前序步骤固定

## Open Questions

- 无阻塞性问题。

## Success Criteria

- 能根据描述和 vault 内容生成稳定的数据 JSON
- 能用该数据 JSON 完成 DOCX 模板填充
- vault root 可通过配置解析，支持重命名场景

## Suggested Planning Focus

先明确数据生成输入输出，再明确 vault 读取配置和最终填充命令的职责边界。
