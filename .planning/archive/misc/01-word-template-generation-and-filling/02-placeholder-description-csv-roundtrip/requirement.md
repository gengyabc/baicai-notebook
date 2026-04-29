---
step-key: placeholder-description-csv-roundtrip
step-number: 02
step-folder: 02-placeholder-description-csv-roundtrip
phase-topic: word-template-generation-and-filling
status: discovered
requirement-version: 1
updated-at: 2026-04-25
source: discover-requirements
supersedes: null
---

## Restated Request

在模板校对之后，需要把占位符清单导出为只包含 `placeholder` 和 `description` 的 CSV，供人工编辑；编辑后再导回 JSON，作为后续生成数据的依据。

## Real Objective

把模板审核和人工补充说明拆成清晰、可重复执行的文件交换流程，降低编辑成本，同时保持占位符语义可维护。

## Problem Statement

当前占位符数据只适合机器读写，不适合人直接补充说明。用户希望在模板确认后，用最小化 CSV 作为人工编辑界面，再把结果恢复成结构化 JSON，供后续自动化步骤继续使用。

## In Scope

- 定义占位符到 CSV 的导出格式，仅包含 `placeholder` 和 `description`
- 定义 CSV 到 JSON 的回写格式，保持占位符与描述一一对应
- 明确这是模板检查后的独立命令步骤，而不是混入最终填充流程
- 保留描述字段给 LLM 生成初稿，再由人工修改

## Out of Scope

- 基于 CSV 直接生成最终 DOCX
- 把其他元数据列加入 CSV
- 设计占位符发现逻辑
- 设计最终数据填充逻辑

## Constraints

- CSV 必须尽量精简，只保留人工编辑所需字段
- 该步骤发生在模板检查完成之后
- 输入和输出必须能衔接后续命令
- 需要兼容当前 vault 根目录配置变化，不依赖写死路径

## Assumptions

- 占位符 JSON 已经由前一阶段生成并校对完成
- 每个占位符都能得到一条简短的描述文本
- 用户会在 CSV 中直接编辑描述内容

## Open Questions

- 无阻塞性问题。

## Success Criteria

- 能导出仅含 `placeholder` 和 `description` 的 CSV
- 能把编辑后的 CSV 恢复成可继续处理的 JSON
- 命令边界清晰，便于在模板校对后单独执行

## Suggested Planning Focus

先定义 CSV/JSON 的最小交换契约，再定义两条独立命令的输入输出边界。
