---
step-key: template-edit-aware-csv-json-roundtrip
step-number: 04
step-folder: 04-template-edit-aware-csv-json-roundtrip
phase-topic: word-template-generation-and-filling
status: discovered
requirement-version: 1
updated-at: 2026-04-26
source: discover-requirements
supersedes: null
---

## Restated Request

在 `export-csv` 中增加可选参数 `edit`。当 DOCX 模板已被修改过时，使用该参数让步骤 2 先基于修改后的模板重新生成相关中间 JSON，再导出新的 CSV，供后续步骤继续生成最终 JSON 和填充好的 DOCX。

## Real Objective

让模板修改后产生的占位符变化能够重新回流到导出流程里，避免 CSV、JSON 和最终填充结果继续依赖旧模板数据。

## Problem Statement

当前导出 CSV 的流程默认建立在“模板未变”的前提上。用户在修改 DOCX 模板后，如果占位符名称、数量或结构发生变化，旧的中间 JSON 和 CSV 会失真，导致后续步骤生成的最终 JSON 与填充结果不再匹配。

## In Scope

- 为 `export-csv` 增加可选参数 `edit`
- 当未提供 `edit` 时，保持现有导出行为不变
- 当提供 `edit` 时，以修改后的 DOCX 模板作为当前事实来源
- 重新生成该模板对应的中间占位符 JSON
- 基于重新生成的 JSON 导出新的 CSV
- 让后续步骤使用刷新后的占位符集合继续生成最终 JSON 和填充后的 DOCX
- 在步骤 3 中检测模板与下游中间产物是否一致，并在不一致时快速失败

## Out of Scope

- 设计新的模板编辑界面
- 更改最终填充逻辑本身
- 引入除 `edit` 之外的其他参数方案
- 讨论 CSV 内容字段扩展
- 重新设计占位符发现算法

## Constraints

- `edit` 必须是一个可选参数，不影响当前默认行为
- 修改后的 DOCX 模板必须作为 `edit` 模式下的唯一事实来源
- 中间 JSON 与 CSV 需要保持同一版本语义，避免旧数据残留
- 步骤 3 需要对模板和中间产物失配进行显式保护

## Assumptions

- 用户会在修改 DOCX 模板后主动选择 `edit` 模式
- “相关 JSON”指的是占位符中间 JSON，而不是最终填充数据 JSON
- 重新导出的 CSV 会成为后续人工编辑的输入

## Open Questions

- 无阻塞性问题。

## Success Criteria

- `export-csv` 在不传 `edit` 时保持当前行为
- `export-csv --edit` 能触发基于修改后模板的重新导出流程
- 重新生成的中间 JSON 与 CSV 能反映模板中的占位符增删改
- 步骤 3 能在检测到陈旧中间产物时失败并阻止错误填充

## Suggested Planning Focus

先明确 `edit` 模式下的事实来源切换和中间产物重建边界，再定义步骤 3 的一致性校验与失败条件。
