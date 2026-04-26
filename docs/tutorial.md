# 个人知识库使用教程

本教程介绍如何使用基于 OpenCode 的个人知识系统，包括知识库的日常使用、文档自动填充功能以及常见问题处理。

## 目录

- [快速开始](#快速开始)
- [知识库层级结构](#知识库层级结构)
- [基本使用流程](#基本使用流程)
  - [正常路径](#正常路径)
  - [异常路径](#异常路径)
- [文档自动填表功能](#文档自动填表功能)
  - [步骤 1：生成模板](#步骤-1生成模板)
  - [步骤 2：导出占位符](#步骤-2导出占位符)
  - [步骤 3：填充文档](#步骤-3填充文档)
- [常用命令速查](#常用命令速查)
- [故障排查](#故障排查)

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

**单独命令**

如果只需要一次性扫描：

```bash
bun run --cwd .opencode frontmatter:scan
```

---

## 知识库层级结构

知识库根目录为 `workbook/`，包含以下层级：

| 目录 | 用途 | 管理模式 |
|------|------|----------|
| `workbook/my-work/` | 当前意图、草稿、决策和项目思考 | 人工管理 |
| `workbook/resources/` | 捕获的外部来源和支撑证据 | LLM 管理 |
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

### 目录结构与子文件夹

#### `workbook/resources/` — 来源证据层

| 子目录 | 用途 | 说明 |
|--------|------|------|
| `inbox/` | 待处理资源 | 新导入的资源暂存，等待分类 |
| `web/` | 网络来源 | URL 捕获、网页笔记 |
| `local/` | 本地来源 | 本地文件导入（PDF、笔记等） |
| `archive/` | 归档资源 | 不再活跃但保留的证据 |

`source_type` 字段与子目录对应：`web` → `web/`，`local` → `local/`

#### `workbook/brainstorm/` — 推测性思考层

| 子目录/文件 | 用途 | 说明 |
|-------------|------|------|
| `todo/` | 排队想法 | 待探索的想法队列 |
| `active/` | 活跃想法 | 正在处理的想法 |
| `managed/` | LLM 托管（可选） | 显式启用 LLM 管理的子目录 |
| `index.md` | 索引文件 | 列出活跃和排队的想法 |

**特殊规则：**
- 默认为人工管理，保持轻量级
- 如需启用 LLM 管理，需显式创建 `managed/` 子目录
- 该目录下的笔记才会进入 LLM frontmatter 流程

#### `workbook/wiki/` — 稳定知识层

| 文件 | 用途 | 说明 |
|------|------|------|
| `index.md` | 知识索引 | **必需**，wiki 入口，列出所有稳定知识主题 |
| `log.md` | 变更日志 | **推荐**，记录 wiki 变更历史 |

子目录按主题组织，如 `workbook/wiki/programming/`、`workbook/wiki/projects/`

#### `workbook/output/` — 交付物层

| 文件 | 用途 | 说明 |
|------|------|------|
| `index.md` | 交付物索引 | **必需**，列出所有交付物 |

子目录按项目或类型组织

#### `workbook/my-work/` — 个人工作区

无固定子目录结构，由用户自组织。常见用法：
- 按项目创建子目录
- 存放会议记录、决策文档、草稿
- 不进入 LLM 自动化流程

---

## 基本使用流程

### 正常路径

#### 1. 摄取外部资源

使用 `/ingest` 命令将外部资源导入知识库：

```
/ingest <路径或URL>
```

**支持的来源类型：**
- 本地文件（PDF、笔记等）
- URL 链接
- Zotero 条目

系统会自动：
1. 判断来源类型
2. 创建资源笔记并保存到 `workbook/resources/`
3. 提取关键信息并生成衍生笔记到 `workbook/brainstorm/`
4. 如有强证据，建议提升至 `workbook/wiki/`

#### 2. 查询知识库

正常会话中，系统会自动查询知识库。你也可以主动查询：

- 从 `workbook/wiki/index.md` 开始浏览稳定知识
- 查看相关 `workbook/wiki/` 页面获取详细信息
- 从 `workbook/resources/` 获取支撑证据
- `workbook/brainstorm/` 用于探索性想法（非稳定事实）

#### 3. 提升至 Wiki

当知识足够稳定时，使用 `/solidify` 命令将其提升至 wiki：

```
/solidify <主题或笔记>
```

**提升标准：**
- 必须有据可依（来自 `workbook/resources/` 的强证据）
- 保留溯源信息
- 未解决的推测保留在 `workbook/brainstorm/`

#### 4. 维护知识库卫生

定期运行审计：

```
/lint-vault
```

这会检查：
- 元数据完整性
- 索引一致性
- 知识库整体卫生状况

### 异常路径

#### 调试模式

遇到问题时，使用 `/debug` 命令启动沙箱会话：

```
/debug
```

**调试模式特性：**
- 禁用所有知识库自动化策略
- 阻止写入 `workbook/wiki/`、`workbook/resources/` 和 `workbook/brainstorm/`
- 只读模式，适合安全地排查问题

#### 处理待处理项目

如果有待处理的笔记：

```
/process-pending
```

这会处理等待 LLM 描述的笔记。

#### 常见问题及解决方案

| 问题 | 解决方案 |
|------|----------|
| 索引不同步 | 运行 `bun run --cwd .opencode frontmatter:index:rebuild` 重建索引 |
| 缺失 frontmatter | 运行 `bun run --cwd .opencode frontmatter:backfill` 批量补全 |
| 重复资源 | 系统会自动检测并更新现有笔记 |
| 提升失败 | 检查证据是否充分，补充 `workbook/resources/` 内容后重试 |

---

## 文档自动填表功能

本系统支持从 Word 文档生成 Jinja 模板，并从知识库自动填充内容。

### 步骤 1：生成模板

将空白 Word 表格转换为 Jinja 模板：

```
/generate-template [docx-file]
```

**参数：**
- `docx-file`（可选）：Word 文件路径
- 如果不提供，系统会使用 `.temp/*/input/` 中最新的 `.docx` 文件

**执行过程：**
1. 解析文档结构
2. 生成语义化占位符（使用 `snake_case` 命名）
3. 创建 Jinja 模板文件

**占位符命名规则：**
- 使用英文 `snake_case`（如 `applicant_name`）
- 表格行使用数字前缀（如 `course_1_name`、`course_2_name`）
- 根据相邻单元格中文内容推断语义（如"姓名" → `name`）

### 步骤 2：导出占位符

导出占位符描述为 CSV 供人工编辑：

```
/export-csv [edit]
```

**模式：**
- **默认模式**：从现有 `temp-v{N}/placeholders.json` 导出 CSV
- **编辑模式**（添加 `edit` 参数）：从当前模板重新生成占位符并导出

**编辑模式使用场景：**
- 模板结构发生变化
- 需要重新生成占位符列表

执行后，系统会：
1. 导出 `output-v{N}/descriptions.csv`（包含 `placeholder,description` 两列）
2. 自动为每个占位符填写中文描述

**人工编辑：**
编辑 `descriptions.csv` 文件，为每个占位符提供准确描述。描述应用引号包裹，避免逗号干扰。

### 步骤 3：填充文档

导入编辑后的 CSV 并填充模板：

```
/fill-docx [--free yes/no]
```

**参数：**
- `--free no`（默认）：仅使用知识库内容填充
- `--free yes`：允许使用非知识库内容和网络搜索

**执行过程：**
1. 导入 CSV 为 JSON 格式
2. 验证新鲜度（确保描述与当前模板匹配）
3. 查询知识库填充数据
4. 运行填充脚本生成最终文档

**填充规则：**
- 优先使用知识库中的真实数据
- 未找到数据时留空（不编造数据）
- 数组类型字段：填充实际项目或保留单个空模板项
- 保留数据来源溯源信息

**`--free yes` 模式额外规则：**
- 优先使用知识库数据
- 缺失内容可通过网络搜索补充
- 绝不编造个人信息

### 填表工作流完整示例

```
# 1. 准备空白 Word 文档，放入 .temp/[task-name]/input/

# 2. 生成模板
/generate-template

# 3. 导出占位符描述
/export-csv

# 4. 编辑 output-v{N}/descriptions.csv，完善每个占位符的描述

# 5. 如果模板有修改，重新导出
/export-csv edit

# 6. 填充文档（仅使用知识库）
/fill-docx

# 或填充文档（允许网络搜索）
/fill-docx --free yes

# 7. 查看生成的文档：output-v{N}/template.docx
```

---

## 常用命令速查

### OpenCode 命令

| 命令 | 用途 |
|------|------|
| `/ingest <路径或URL>` | 摄取本地笔记、文件、URL 或会话产物 |
| `/solidify <主题或笔记>` | 将有据可依的知识提升至 `workbook/wiki/` |
| `/lint-vault` | 审计元数据、索引和知识库卫生 |
| `/process-pending` | 处理待 LLM 描述的笔记 |
| `/debug` | 启动只读沙箱会话用于调试 |
| `/generate-template [docx-file]` | 从 Word 空表生成 Jinja 模板 |
| `/export-csv [edit]` | 导出占位符描述为 CSV |
| `/fill-docx [--free yes/no]` | 导入编辑后的 CSV 并填充模板 |

### 维护命令

| 命令 | 用途 |
|------|------|
| `bun run --cwd .opencode watch` | 同时启动 frontmatter 和 SQLite 索引监听 |
| `bun run --cwd .opencode frontmatter:scan` | 一次性扫描知识库 |
| `bun run --cwd .opencode frontmatter:backfill` | 批量补全缺失的 frontmatter |
| `bun run --cwd .opencode frontmatter:index:rebuild` | 清空并重建 SQLite 索引 |
| `bun run --cwd .opencode frontmatter:index:reconcile` | 清理陈旧的索引记录 |

---

## 故障排查

### 索引问题

**症状：** 查询结果不完整或过期

**解决方案：**
```bash
# 重建索引
bun run --cwd .opencode frontmatter:index:rebuild

# 清理陈旧记录
bun run --cwd .opencode frontmatter:index:reconcile
```

### Frontmatter 缺失

**症状：** 笔记缺少元数据字段

**解决方案：**
```bash
bun run --cwd .opencode frontmatter:backfill
```

### 模板填充失败

**症状：** `/fill-docx` 报错或生成空白文档

**排查步骤：**
1. 确认 `descriptions.csv` 格式正确
2. 运行 `/export-csv edit` 重新生成占位符
3. 检查知识库中是否有相关内容
4. 尝试 `/fill-docx --free yes` 允许网络搜索

### 调试模式

遇到任何不确定问题时，首先：

```
/debug
```

进入沙箱模式后，可以安全地检查知识库状态而不影响现有数据。

---

## 相关文档

- [路由流程图](./routing-flows.md)：系统命令、工作流、技能和规则的完整路由图
- [元数据字段矩阵](./metadata-field-matrix.md)：所有 frontmatter 字段的详细说明
- [SQLite 数据视图对齐](./sqlite-dataview-alignment.md)：SQLite 索引机制说明
