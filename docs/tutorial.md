# 个人知识库使用教程

本教程采用 PBL（Problem-Based Learning）方法，以真实使用场景为驱动，通过案例形式展示如何组合命令完成特定任务。每个案例聚焦用户需求，而非孤立地介绍单一命令。

## 目录

- [个人知识库使用教程](#个人知识库使用教程)
  - [目录](#目录)
  - [快速开始](#快速开始)
    - [安装依赖](#安装依赖)
    - [启动服务](#启动服务)
  - [知识库层级结构](#知识库层级结构)
    - [管理模式说明](#管理模式说明)
  - [场景案例](#场景案例)
    - [案例 1：日常知识问答](#案例-1日常知识问答)
    - [案例 2：新项目调研与知识积累](#案例-2新项目调研与知识积累)
    - [案例 3：批量 PDF 文献处理](#案例-3批量-pdf-文献处理)
    - [案例 4：文档自动填表（含敏感信息）](#案例-4文档自动填表含敏感信息)
    - [案例 5：知识库定期维护](#案例-5知识库定期维护)
    - [案例 6：系统调试与问题排查](#案例-6系统调试与问题排查)
    - [案例 7：知识库路径迁移](#案例-7知识库路径迁移)
  - [Vault 路径迁移](#vault-路径迁移)
  - [相关文档](#相关文档)

---

## 快速开始

### 安装依赖

首次使用前，需要安装项目依赖：

```bash
bun run --cwd .opencode install
```

### 启动服务

**一键启动（推荐）**

```bash
bun run --cwd .opencode watch
```

这会同时启动 frontmatter 监听和 SQLite 索引监听，确保知识库变更被实时捕获。

---

## 知识库层级结构

知识库根目录为 `workbook/`，包含以下层级：

| 目录 | 用途 | 管理模式 |
|------|------|----------|
| `workbook/my-work/` | 当前意图、草稿、决策和项目思考 | 人工管理 |
| `workbook/resources/` | 捕获的外部来源和支撑证据 | LLM 管理 |
| `workbook/resources/inbox/` | 缓冲队列，新摄取内容暂存待分类 | LLM 管理 |
| `workbook/brainstorm/` | 推测性笔记（`todo/` 和 `active/`） | 人工管理（`managed/` 子目录可显式启用 LLM 管理） |
| `workbook/wiki/` | 稳定知识，索引优先维护 | 合作管理（人工决策 + LLM 辅助提升） |
| `workbook/output/` | 交付物，索引优先维护 | 合作管理 |

### 管理模式说明

**人工管理**
- 用户完全控制内容的创建、编辑和删除
- 使用最小必需 frontmatter（`type`、`kind`、`created`、`updated`、`description`、`status`、`tags`）
- 不进入 LLM 自动化流程
- 适合：个人思考、临时草稿、项目规划

**LLM 管理**
- 通过 `/ingest` 等命令自动创建和维护
- 使用完整的 frontmatter schema（包含 `source_type`、`content_role`、`trust_level`、`verification`、`llm_stage` 等）
- 自动进入 frontmatter 监听和索引更新流程
- 适合：外部资源捕获、证据提取、知识整理

**合作管理**
- 人工决策内容是否稳定、是否提升
- LLM 辅助格式化、溯源和索引维护
- 通过 `/solidify` 命令将资源提升为稳定知识
- 适合：经确认的知识、交付物

---

## 场景案例

### 案例 1：日常知识问答

**用户需求：** 在开始新知识摄取前，先了解知识库中已有的相关积累，避免重复工作。

**场景描述：** 用户想学习某个主题（如 "Rust 并发编程"），希望先查看知识库中是否已有相关资料。

**操作流程：**

1. **直接提问知识库**
   
   在 OpenCode 会话中直接提问：
   
   ```
   Rust 并发编程有哪些优势？
   ```
   
   系统会自动查询：
   - `workbook/wiki/index.md` 获取稳定知识索引
   - 相关 `workbook/wiki/` 页面获取详细信息
   - `workbook/resources/` 获取支撑证据
   - `workbook/brainstorm/` 查看是否有相关推测性想法

2. **评估结果并决策**
   
   根据查询结果，用户可以选择：
   - **已有足够知识**：直接使用现有知识，无需额外操作
   - **部分缺失**：补充摄取新资源（见 [案例 2](#案例-2新项目调研与知识积累)）
   - **完全空白**：从零开始新主题调研（见 [案例 2](#案例-2新项目调研与知识积累)）

**命令组合：**
- 无需特定命令，系统自动查询知识库

**预期结果：**
- 获得已有关于该主题的知识摘要
- 明确需要补充的内容方向

---

### 案例 2：新项目调研与知识积累

**用户需求：** 为某个新主题（如 "AI Agent 架构设计"）积累知识，从外部资源摄取到稳定知识提升的完整流程。

**场景描述：** 用户需要系统性学习新领域，通过摄取多个外部资源并逐步提升为稳定知识。

**操作流程：**

1. **摄取外部资源**
   
   ```
   /ingest https://example.com/article-on-ai-agents
   /ingest ~/Documents/ai-agent-architecture.pdf
   ```
   
   系统会自动分类路由到最终目录（`resources/`、`brainstorm/`、`wiki/`、`my-work/`）。

2. **批量增强资源描述**
   
   当多个资源等待 LLM 处理时：
   
   ```
   /enhance-description
   ```
   
   系统会扫描所有 `llm_description_done: false` 的文件并生成描述。

3. **批量生成主题标签**
   
   描述增强完成后：
   
   ```
   /enhance-tags
   ```
   
   系统会为资源笔记生成符合规范的 `topic/*` 标签。

4. **提升至 Wiki**
   
   当某些知识足够稳定时：
   
   ```
   /solidify AI Agent 架构设计
   ```
   
   系统会将经确认的知识提升至 `workbook/wiki/`。

5. **定期审计知识库**
   
   调研完成后：
   
   ```
   /lint-vault
   ```
   
   检查元数据完整性、索引一致性和 Tag 容量。

**命令组合：**
- `/ingest` - 摄取外部资源
- `/enhance-description` - 增强资源笔记描述
- `/enhance-tags` - 批量生成主题标签
- `/solidify` - 提升稳定知识至 wiki
- `/lint-vault` - 审计知识库卫生

**预期结果：**
- 多个外部资源被分类存储到知识库
- 所有资源笔记有清晰的描述和标签
- 稳定知识被提升至 wiki 层
- 知识库卫生状态良好

**详细命令参考：**
- [/ingest 命令详情](../.opencode/commands/ingest.md)
- [/enhance-description 命令详情](../.opencode/commands/enhance-description.md)
- [/enhance-tags 命令详情](../.opencode/commands/enhance-tags.md)
- [/solidify 命令详情](../.opencode/commands/solidify.md)
- [/lint-vault 命令详情](../.opencode/commands/lint-vault.md)

---

### 案例 3：批量 PDF 文献处理

**用户需求：** 一次性处理多个 PDF 文献（如下载的学术论文、技术资料），转换为 Markdown 并纳入知识库。

**场景描述：** 用户有 10 篇与 "大模型微调" 相关的 PDF 需要导入知识库。

**操作流程：**

1. **准备 PDF 文件**
   
   将所有待处理的 PDF 放入 `raw/` 目录：
   
   ```
   raw/
   ├── paper1-llm-fine-tuning.pdf
   ├── paper2-lora-technique.pdf
   └── paper3-qlora-optimization.pdf
   ```

2. **批量转换 PDF**
   
   ```
   /pdf2md
   ```
   
   系统会自动：
   - 将 `raw/` 中的 PDF 转换为 Markdown
   - 保存到 `workbook/resources/local/`
   - 将处理完的 PDF 移至 `raw/processed/`

3. **增强描述和标签**
   
   ```
   /enhance-description
   /enhance-tags
   ```
   
   为转换后的 Markdown 笔记生成描述和标签。

4. **知识提升（可选）**
   
   如果有足够证据支持某些知识点：
   
   ```
   /solidify 大模型微调
   ```

**命令组合：**
- `/pdf2md` - 批量转换 PDF 为 Markdown
- `/enhance-description` - 增强资源笔记描述
- `/enhance-tags` - 批量生成主题标签
- `/solidify` - 提升稳定知识至 wiki（可选）

**预期结果：**
- 所有 PDF 转换为 Markdown 格式
- 转换后的笔记存储在 `workbook/resources/local/`
- 每个笔记有清晰的描述和主题标签
- 原始 PDF 归档到 `raw/processed/`

**详细命令参考：**
- [/pdf2md 命令详情](../.opencode/commands/pdf2md.md)

---

### 案例 4：文档自动填表（含敏感信息）

**用户需求：** 使用知识库内容自动填充 Word 表格（如申请表、报告模板），并安全处理敏感个人信息。

**场景描述：** 用户需要填写一份培训申请表，包含个人信息、培训经历等字段。

**操作流程：**

1. **准备空白 Word 文档**
   
   将空白表格放入 `.temp/[task-name]/input/`：
   
   ```
   .temp/training-application/input/
   └── application-form.docx
   ```

2. **生成 Jinja 模板**
   
   ```
   /generate-template
   ```
   
   系统会自动找到最新的 `.docx` 文件并生成 Jinja 模板。

3. **导出占位符描述**
   
   ```
   /export-csv
   ```
   
   系统会导出 `output-v{N}/descriptions.csv`，包含 `placeholder,description` 两列。

4. **编辑 CSV 描述**
   
   人工编辑 `descriptions.csv`，为每个占位符提供准确描述：
   ```csv
   placeholder,description
   applicant_name,"申请人姓名"
   id_number,"身份证号码"
   training_date,"培训日期"
   ```

5. **管理敏感数据**
   
   填充前设置敏感信息（如身份证号）：
   
   ```
   # 注册敏感数据条目
   /env-helper add MY_ID_CARD
   > 输入描述：身份证号
   
   # 交互式设置实际值
   bun run .opencode/scripts/env-registry.mjs set MY_ID_CARD
   > 输入值：[不回显]
   ```

6. **填充文档**
   
   仅使用知识库内容：
   ```
   /fill-docx
   ```
   
   或允许网络搜索补充：
   ```
   /fill-docx --free yes
   ```

7. **查看结果**
   
   检查生成的文档：`output-v{N}/template.docx`

**命令组合：**
- `/generate-template` - 从 Word 生成 Jinja 模板
- `/export-csv` - 导出占位符描述 CSV
- `/env-helper` - 管理敏感数据
- `/fill-docx` - 填充文档模板（可选 `--free yes`）

**预期结果：**
- 生成填充完整的 Word 文档
- 敏感信息通过 Keychain 安全调用，不暴露实际值
- 知识库内容被正确映射到表格字段

**详细命令参考：**
- [/generate-template 命令详情](../.opencode/commands/generate-template.md)
- [/export-csv 命令详情](../.opencode/commands/export-csv.md)
- [/fill-docx 命令详情](../.opencode/commands/fill-docx.md)
- [/env-helper 命令详情](../.opencode/commands/env-helper.md)
- [敏感数据管理完整指南](../.opencode/env-registry-README.md)

---

### 案例 5：知识库定期维护

**用户需求：** 定期检查知识库卫生状态，处理积压的待处理笔记，维护 Tag 系统。

**场景描述：** 用户每周或每月进行一次知识库维护，确保知识库质量。

**操作流程：**

1. **审计知识库**
   
   ```
   /lint-vault
   ```
   
   系统会检查：
   - 元数据完整性
   - 索引一致性
   - Tag 容量是否超过阈值
   - 知识库整体卫生状况

2. **处理待描述笔记**
   
   如果有待处理笔记：
   
   ```
   /enhance-description
   ```

3. **生成主题标签**
   
   描述增强完成后：
   
   ```
   /enhance-tags
   ```

4. **处理 Tag 提案**
   
   系统可能提出 Tag 处理建议（别名、新 Tag、扩展关系），用户审批：
   
   ```
   审批别名？[y/n]
   审批新 tag？[all/none/1,2]
   添加扩展？[y/n]
   ```

5. **重建索引（必要时）**
   
   如果发现索引问题：
   
   ```bash
   bun run --cwd .opencode frontmatter:index:rebuild
   ```

**命令组合：**
- `/lint-vault` - 审计知识库卫生
- `/enhance-description` - 增强资源笔记描述
- `/enhance-tags` - 批量生成主题标签
- 维护命令 - 重建索引等

**预期结果：**
- 知识库元数据完整一致
- 所有资源笔记有描述和标签
- Tag 系统保持规范，无重复或冗余
- 索引状态良好

**详细命令参考：**
- [维护命令详情](../.opencode/package.json) - 查看 `scripts` 部分

---

### 案例 6：系统调试与问题排查

**用户需求：** 遇到知识库查询问题或系统行为异常时，安全地排查问题而不影响现有数据。

**场景描述：** 用户发现知识库查询结果不完整，或某些命令行为不符合预期。

**操作流程：**

1. **启动调试会话**
   
   ```
   /debug 知识库查询问题
   ```
   
   系统进入只读沙箱模式：
   - 禁用所有知识库自动化策略
   - 阻止写入 `workbook/wiki/`、`workbook/resources/` 和 `workbook/brainstorm/`
   - SQLite vault 检索 (`vault_index_search`) 正常工作

2. **检查知识库状态**
   
   在调试会话中：
   - 检查 `workbook/wiki/index.md` 索引状态
   - 查看相关笔记的 frontmatter
   - 验证 SQLite 索引数据

3. **询问命令使用方法**
   
   在调试模式下，可以安全地询问任何命令的使用方法、参数说明或使用场景，系统不会执行实际写入操作：
   
   ```
   ingest 命令如何使用？
   solidify 和 enhance-description 有什么区别？
   批量处理 PDF 应该用什么命令？
   ```
   
   适合：
   - 学习新命令的用法
   - 了解命令参数选项
   - 查看命令适用场景
   - 测试命令组合效果

4. **排查问题**
   
   根据调试结果：
   - **索引不同步** → 运行 `bun run --cwd .opencode frontmatter:index:rebuild`
   - **缺失 frontmatter** → 运行 `bun run --cwd .opencode frontmatter:backfill`
   - **重复资源** → 系统自动检测并更新现有笔记
   - **提升失败** → 检查证据是否充分，补充 `workbook/resources/` 后重试

5. **退出调试**
   
   调试模式是会话级的，启动新会话即可退出。

**命令组合：**
- `/debug [主题]` - 启动只读沙箱会话

**预期结果：**
- 安全地排查问题，不影响现有数据
- 明确问题根源并采取修复措施
- 恢复知识库正常运行

**详细命令参考：**
- [/debug 命令详情](../.opencode/commands/debug.md)

---

### 案例 7：知识库路径迁移

**用户需求：** 更改知识库的存储位置或名称（如重命名 `workbook/` 目录）。

**场景描述：** 用户需要将知识库目录从 `workbook/` 迁移到 `knowledge-base/`。

**操作流程：**

1. **执行路径迁移**
   
   ```
   /rename-vault workbook knowledge-base
   ```
   
   系统会自动：
   - 更新所有配置文件中的路径引用
   - 修改 `.opencode/vault-config.json`
   - 更新相对路径引用（如文档中的链接）

2. **重启监听服务**
   
   ```bash
   bun run --cwd .opencode watch
   ```

**命令组合：**
- `/rename-vault <旧> <新>` - 迁移 vault 路径

**预期结果：**
- 知识库目录成功迁移到新路径
- 所有配置文件和引用更新完成
- 监听服务正常运行

**详细命令参考：**
- [/rename-vault 命令详情](../.opencode/commands/rename-vault.md)

---

## Vault 路径迁移

如果需要更改知识库的存储位置或名称，参见 [案例 7：知识库路径迁移](#案例-7知识库路径迁移)。

**注意事项：**
- 执行前备份知识库
- 确保新路径可访问
- 迁移后重启监听服务

---

## 相关文档

- [路由流程图](./routing-flows.md)：系统命令、工作流、技能和规则的完整路由图
- [元数据字段矩阵](./metadata-field-matrix.md)：所有 frontmatter 字段的详细说明
- [SQLite 数据视图对齐](./sqlite-dataview-alignment.md)：SQLite 索引机制说明
- [OpenCode 命令参考](../README.md#常用-opencode-命令)：README 中的命令速查表
- [维护命令参考](../README.md#运行服务)：README 中的维护命令速查表
