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

### 目录结构与子文件夹

#### `workbook/resources/` — 来源证据层

| 子目录 | 用途 | 说明 |
|--------|------|------|
| `inbox/` | 缓冲队列 | 新摄取内容暂存，等待 `second-brain-ingest` 分类路由 |
| `web/` | 网络来源 | URL 捕获、网页笔记 |
| `local/` | 本地来源 | 本地文件导入（PDF、笔记等） |
| `archive/` | 归档资源 | 不再活跃但保留的证据 |

`source_type` 字段与子目录对应：`web` → `web/`，`local` → `local/`

**摄取流程：**
- `web-to-resource` 捕获外部内容 → 写入 `inbox/`
- `second-brain-ingest` 分类路由 → 移至最终目录（`resources/`、`brainstorm/`、`wiki/`、`my-work/`）

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

**单个资源摄取**

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
2. 创建资源笔记并保存到 `workbook/resources/inbox/`（缓冲队列）
3. 使用 `second-brain-ingest` 分类并路由至最终目录：
   - `workbook/resources/` — 证据、来源
   - `workbook/brainstorm/` — 推测性想法
   - `workbook/wiki/` — 稳定知识（需强证据）
   - `workbook/my-work/` — 活跃意图
4. 如有强证据，建议提升至 `workbook/wiki/`

**批量 PDF 处理**

如果需要批量处理多个 PDF 文件：

1. 将所有待处理的 PDF 放入 `raw/` 目录
2. 运行 `/pdf2md` 命令
3. 系统会自动：
   - 将 `raw/` 中的 PDF 转换为 Markdown
   - 保存到 `workbook/resources/local/`
   - 将处理完的 PDF 移至 `raw/processed/`

这种批量方式适合一次性处理大量文献资料，无需逐个使用 `/ingest`。

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
- Tag 容量是否超过阈值

#### Tag 维护

知识库使用规范化的 tag 系统，确保检索一致性和可维护性。

**自动生成 Tag**

当资源笔记完成描述增强后（`llm_description_done: true`），可以批量生成主题标签：

```
/enhance-tags
```

系统会：
1. 查询所有已完成描述但未生成 tag 的资源笔记
2. 分析内容并生成符合规范的 `topic/*` 标签
3. 遵循 tag 命名空间规则和容量限制
4. 如遇到新概念，会按三步决策流程处理（见下文）

**核心配置文件：**

| 文件 | 用途 | 何时修改 |
|------|------|---------|
| `.opencode/canonical-tags.json` | 规范标签的唯一法律来源 | 添加新概念 tag |
| `.opencode/tag-aliases.json` | 别名映射（同义词到规范标签） | 发现现有 tag 的同义词 |
| `.opencode/tag-expansions.json` | 检索扩展关系（相关标签） | 新 tag 批准后建议关联 |

**Tag 命名空间规则：**

| 命名空间 | 扩展策略 | 示例 |
|---------|---------|------|
| `topic/*` | 可扩展（用户审批） | `topic/training`、`topic/ai-tools`、`topic/cv` |
| `state/*` | 固定（系统管理） | `state/active`、`state/archived`、`state/draft` |
| `source/*` | 固定（系统管理） | `source/web`、`source/local`、`source/paper` |
| `role/*` | 固定（系统管理） | `role/raw`、`role/summary`、`role/synthesis` |

**特殊约束：**

某些 tag 有添加者限制，防止混淆：

- `topic/training`：**仅限用户添加**（user-only）——标记个人培训事件
- `topic/tutorial`：**仅限 LLM 添加**（llm-only）——标记外部教程资源

这两者的区别：
- `topic/training`：用户参与的培训、研讨会、学习活动
- `topic/tutorial`：从网络捕获的教程、how-to 文档

**维护流程（三步决策）：**

检测到 tag 缺口时，按以下顺序处理：

1. **检查是否为别名**（同义词）
   - 查看现有 `canonical-tags.json` 和 `tag-aliases.json`
   - 如果概念匹配现有规范 tag → 添加别名，**不提议新 tag**
   - 示例：检测到 "job-hunting" → 匹配 `topic/career` → 添加 `"job-hunting": "topic/career"`

2. **提议新 tag**（新概念）
   - 如果是真正的新概念 → 提议 `topic/<name>`
   - 示例：检测到 "finance" → 无匹配 → 提议 `topic/finance`
   - 注意：只提议 `topic/*` 命名空间，其他命名空间固定

3. **添加扩展关系**（可选，审批后）
   - 新 tag 批准后，可建议相关 tag 的检索扩展
   - 示例：`topic/career` 批准 → 建议扩展 `topic/career ↔ topic/cv`

**实际操作示例：**

**场景 1：检测到同义词**

```
# 处理资源笔记时发现 tag "教育"
# 检查 canonical-tags.json → 发现已有 topic/education
# 检查 tag-aliases.json → 发现已有 "教育": "topic/education"
# 结果：无需操作，系统已能识别
```

**场景 2：发现新别名**

```
# 处理资源笔记时发现 tag "edu/child"
# 检查 canonical-tags.json → 无匹配
# 检查 tag-aliases.json → 发现 "edu": "topic/education"
# 判断："edu/child" 是 "education" 的变体形式
# 操作：添加别名 "edu/child": "topic/education" 到 tag-aliases.json
```

**场景 3：提议新 tag**

```
# 处理 3 篇关于职业规划的资源笔记
# 检查 canonical-tags.json → 无相关 tag（只有 topic/cv）
# 检查 tag-aliases.json → 无别名
# 判断："career" 是新概念，不同于 cv（简历只是工具）
# 操作：
#   1. 提议新 tag：topic/career
#   2. 用户审批 → 添加到 canonical-tags.json
#   3. 建议扩展：topic/career ↔ topic/cv（可选）
```

**批量处理模式：**

`/enhance-description` 或 `/lint-vault` 可能批量发现 tag 缺口。系统会收集所有候选：

```
## Tag 处理提案

### 待添加别名
| 别名 | 目标规范 tag | 适用笔记数 | 理由 |
|------|-------------|-----------|------|
| `job` | `topic/career` | 2 | 同义词 |
| `简历` | `topic/cv` | 1 | 中文别名 |

审批别名？[y/n]

### 待添加新 tag
| 提议 tag | 适用笔记数 | 理由 |
|---------|-----------|------|
| `topic/finance` | 3 | 财务主题，无匹配 |
| `topic/health` | 2 | 健康主题，无匹配 |

审批新 tag？[all/none/1,2]

### 扩展关系建议
| Tag | 相关 tag | 理由 |
|-----|---------|------|
| `topic/career` | `topic/cv` | 检索邻近 |

添加扩展？[y/n]
```

**Tag 容量阈值：**

`canonical-tags.json` 的 tag 数量有阈值限制，防止过度膨胀：

| vault 规模 | 推荐 tag 容量 |
|-----------|-------------|
| < 200 笔记 | 50-80 |
| 200-500 笔记 | 80-120 |
| 500-1000 笔记 | 100-150 |
| > 1000 笔记 | 150-200 |

配置位置：`.opencode/vault-config.json`

```json
{
  "tagCapThreshold": 100
}
```

超过阈值时，`/lint-vault` 会发出警告并建议：
- 合理使用少于 3 笔记的 tag
- 合并语义相似的 tag（别名候选）
- 移除未使用的扩展关系

**查看当前 tag 状态：**

```bash
# 查看 tag 列表
cat .opencode/canonical-tags.json

# 查看别名映射
cat .opencode/tag-aliases.json

# 查看扩展关系
cat .opencode/tag-expansions.json
```

详细规则见 `.opencode/rules/tag-expansion.md`。

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
/enhance-description
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

### 敏感数据管理

在填充表格时，可能需要使用身份证号、手机号等敏感个人信息。系统提供安全的环境变量管理：

```
/env-helper <操作> <键名>
```

**操作类型：**
- `add` - 添加新的敏感数据
- `query` - 查询已存储的数据
- `update` - 更新现有数据
- `remove` - 删除数据

**使用场景：**
填充表格前，可以先添加所需的敏感信息：

```
/env-helper add id_number
/env-helper add phone_number
```

系统会安全地存储这些信息，在填充时自动调用，且不会暴露实际值。

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
| `/pdf2md` | 批量转换 raw/ 中的 PDF 为 Markdown |
| `/solidify <主题或笔记>` | 将有据可依的知识提升至 `workbook/wiki/` |
| `/lint-vault` | 审计元数据、索引和知识库卫生 |
| `/enhance-description` | 增强资源笔记描述 |
| `/enhance-tags` | 批量生成资源笔记的主题标签 |
| `/debug` | 启动只读沙箱会话用于调试 |
| `/generate-template [docx-file]` | 从 Word 空表生成 Jinja 模板 |
| `/export-csv [edit]` | 导出占位符描述为 CSV |
| `/fill-docx [--free yes/no]` | 导入编辑后的 CSV 并填充模板 |
| `/env-helper <操作> <键名>` | 管理敏感数据（添加/查询/更新/删除） |
| `/rename-vault <旧路径> <新路径>` | 迁移 vault 路径并更新所有引用 |

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

#### Vault 路径迁移

如果需要更改知识库的存储位置或名称：

```
/rename-vault <旧路径> <新路径>
```

**使用场景：**
- 更改 `workbook/` 目录名称
- 迁移知识库到新位置
- 统一团队协作时的路径引用

**执行效果：**
1. 更新所有配置文件中的路径引用
2. 修改 `.opencode/vault-config.json`
3. 更新相对路径引用（如文档中的链接）

**注意事项：**
- 执行前备份知识库
- 确保新路径可访问
- 迁移后重启监听服务

---

## 相关文档

- [路由流程图](./routing-flows.md)：系统命令、工作流、技能和规则的完整路由图
- [元数据字段矩阵](./metadata-field-matrix.md)：所有 frontmatter 字段的详细说明
- [SQLite 数据视图对齐](./sqlite-dataview-alignment.md)：SQLite 索引机制说明
