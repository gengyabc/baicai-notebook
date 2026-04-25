---
step-key: word-form-template-filling
step-number: 01
step-folder: 01-word-form-template-filling
phase-topic: word-template-generation-and-filling
status: discovered
requirement-version: 1
updated-at: 2026-04-25
source: discover-requirements
supersedes: null
---

## Restated Request

用户有现成的 Word 文档（空表），希望通过开源工具链实现：先用 LLM 分析空表结构并生成 Jinja 占位符模板，人工校对后，再用结构化数据批量填充生成最终文档。

## Real Objective

构建一个可重复使用的自动化流程，将多种版式的 Word 空表转化为可编程填充的模板，支持批量生成结构化文档，减少手工填表工作量。

## Problem Statement

现有 Word 空表需要手动填写，缺乏自动化填充能力。用户希望利用 LLM 辅助生成模板占位符，校对后实现批量填充，但不确定应该采用哪些开源工具、如何划分工具职责边界。

## In Scope

- 工具选型：评估 `python-docx`、`docxtpl` 及相关库的职责分工
- 两阶段流程定义：
  1. 模板生成阶段：LLM 分析空表 → 生成占位符 → 人工校对 → 输出模板
  2. 批量填充阶段：结构化数据 → 模板填充 → 输出文档
- 支持复杂内容：段落、表格扩展
- 支持多种版式模板

## Out of Scope

- 图片处理
- 签名处理
- PDF 输入或输出
- 非 `.docx` 格式

## Constraints

- 输入文件始终是可编辑的 `.docx`
- 模板版式多样，每种版式对应固定字段集合
- LLM 生成占位符后必须人工校对
- 必须使用开源工具

## Assumptions

- 表格结构相对固定，适合模板化
- 用户有能力提供结构化字段数据或让 LLM 生成结构化字段值
- LLM 可访问（API 或本地部署）

## Open Questions

无阻塞性问题。

## Success Criteria

- 明确工具链选型及各工具职责边界
- 定义清晰的模板生成流程（LLM 辅助 + 人工校对）
- 定义清晰的批量填充流程
- 支持多种版式模板

## Suggested Planning Focus

优先确定：
1. `python-docx` 与 `docxtpl` 的职责划分
2. LLM 辅助模板生成的具体交互方式（输入什么、输出什么）
3. 占位符命名规范与校对检查点