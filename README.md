# 个人知识库

基于 OpenCode 的个人知识系统，用于摄取来源、查询有据可依的知识，并将稳定的笔记提升至 `workbook/wiki/` 并保留溯源信息。

## 目的

- 在 `AGENTS.md` 中保持仓库指令简洁且面向路由
- 在此 `README.md` 中保持面向人类的项目概览和维护命令
- 将仓库作为持久知识和智能体行为的记录系统

## 运行服务

从仓库根目录执行：

**一键启动（推荐）**

- `bun run --cwd .opencode watch`: 同时启动 frontmatter 监听和 SQLite 索引监听

**单独命令**

- `bun run --cwd .opencode frontmatter:watch`: 持续监听库文件并更新 frontmatter
- `bun run --cwd .opencode frontmatter:scan`: 对知识库执行一次性扫描
- `bun run --cwd .opencode frontmatter:backfill`: 批量补全缺失的 frontmatter 字段
- `bun run --cwd .opencode frontmatter:scan-pending`: 扫描待处理的资源笔记
- `bun run --cwd .opencode frontmatter:index:scan`: 构建 SQLite frontmatter 索引
- `bun run --cwd .opencode frontmatter:index:rebuild`: 清空并重建 SQLite frontmatter 索引
- `bun run --cwd .opencode frontmatter:index:reconcile`: 重扫并清理陈旧的 SQLite 索引记录
- `bun run --cwd .opencode frontmatter:index:watch`: 持续监听并增量更新 SQLite frontmatter 索引

**首次运行需安装依赖**

```bash
bun run --cwd .opencode install
```

## 运行模型

仓库使用以下调用栈：

`命令 -> 工作流 -> 技能 -> 规则`

- 命令是面向用户的入口点
- 工作流编排多步骤行为
- 技能提供专注的能力
- 规则定义可复用的约束和策略

`AGENTS.md` 是智能体的入口地图。详细行为位于 `.opencode/` 下，应延迟加载。

## 知识库层级

知识库根目录由 `.opencode/vault-config.json` 定义，当前为 `workbook/`。

- `workbook/my-work/`: 当前意图、草稿、决策和项目思考
- `workbook/resources/`: 捕获的来源和支撑证据
- `workbook/brainstorm/`: `todo/` 和 `active/` 中的推测性笔记
- `workbook/wiki/`: 稳定知识，索引优先维护
- `workbook/output/`: 交付物，索引优先维护
- `docs/plans/`: 日期前缀的计划和需求
- `.opencode/`: 命令、工作流、技能和规则

如需重命名 vault 根目录，运行：
```bash
node .opencode/scripts/migrate-vault-path.mjs <oldRoot> <newRoot>
```

## 常用 OpenCode 命令

在 OpenCode 会话中执行：

- `/ingest <路径或URL>`: 摄取本地笔记、文件、URL 或会话产物
- `/solidify <主题或笔记>`: 将有据可依的知识提升至 `workbook/wiki/`
- `/lint-vault`: 审计元数据、索引和知识库卫生
- `/process-pending`: 处理待 LLM 描述的笔记
- `/debug`: 启动只读沙箱会话用于知识库行为调试
- `/generate-template <docx-file>`: 从 Word 空表生成 Jinja 模板（解析结构 -> 生成语义化占位符 -> 写出模板）

## 检索与提升

- 正常会话中，每条用户消息应先查询知识库
- 唯一例外是以 `/debug` 命令启动的会话
- 知识库问答从 `workbook/wiki/index.md` 开始，然后是相关的 `workbook/wiki/` 页面，再从 `workbook/resources/` 获取证据
- `workbook/brainstorm/` 用于试探性综合，不是稳定事实
- `workbook/my-work/` 用于当前上下文和用户意图
- 提升至 `workbook/wiki/` 通过 `solidify` 工作流进行；未解决的推测不进入稳定记忆

## 关键文件

- `AGENTS.md`: 智能体入口地图和路由策略
- `.opencode/workflows/query-vault.md`: 知识库查询工作流
- `.opencode/workflows/ingest-resources.md`: 外部来源摄取工作流
- `.opencode/workflows/solidify-to-wiki.md`: 提升至 `workbook/wiki/` 的工作流
- `workbook/wiki/index.md`: 主要 wiki 发现入口
- `workbook/output/index.md`: 主要交付物发现入口

## Frontmatter 模式

### 元数据策略

- 人工管理笔记使用最小必需 frontmatter。
- LLM 管理笔记使用更丰富的检索、溯源、流程字段。
- `workbook/brainstorm/` 默认按人工管理处理，只有显式托管的子目录才进入 LLM frontmatter 流程。
- 领域字段是一级公民，例如 `start_date`、`participants`、`location` 等，不应为了统一 schema 被移除。

详见 `.opencode/rules/metadata-conventions.md` 与 `docs/metadata-field-matrix.md`。

### 核心字段

| 字段 | 含义 |
|------|------|
| `type` | 笔记类型：`vault`/`resource`/`brainstorm`/`wiki`/`output`/`my-work` |
| `kind` | 内容分类：`note`/`index`/`log`/`topic`/`entity`/`concept`/`project`/`deliverable` |
| `created` | 创建日期 |
| `updated` | 最近更新日期 |
| `image_key` | 图片/附件关联键 |
| `description` | 笔记的简短说明；人工笔记和 LLM 笔记都要求 |
| `status` | 工作流状态，人工笔记至少要可区分当前状态 |
| `tags` | 必填；人工笔记可以更自由，LLM 笔记应保持结构化 |

### 仅 LLM 管理笔记要求的字段

| 字段 | 含义 |
|------|------|
| `source_type` | 来源类型：`web`/`paper`/`local`/`chat`/`manual`/`generated` |
| `content_role` | 内容角色：`raw`/`summary`/`topic`/`entity`/`synthesis`/`draft`/`index`/`log` |
| `trust_level` | 可信度：`raw`/`extracted`/`synthesized`/`verified`/`disputed` |
| `verification` | 验证状态：`unverified`/`spot_checked`/`verified` |
| `llm_stage` | LLM 处理阶段：`unprocessed`/`parsed`/`linked`/`summarized`/`integrated` |

### 模板差异

不同管理方式的笔记使用不同的默认值：

**人工管理笔记最小要求**

```yaml
type:
kind:
created:
updated:
image_key:
description:
status: active
tags: []
```

**LLM 管理笔记基础字段**

```yaml
type:
kind:
created:
updated:
image_key:
description:
status:
tags: []
source_type:
content_role:
trust_level:
verification:
llm_stage:
```

**LLM 摄取层（仅进入 ingestion 流程的笔记）**

```yaml
ingest_status: pending
normalized_at:
source_hash:
source_path:
llm_description_done: false
```

`workbook/brainstorm/` 默认按人工管理；只有例如 `workbook/brainstorm/managed/` 这样的显式托管子目录才应进入 LLM 摄取流程。

### LLM 摄取字段 (v2)

| 字段 | 含义 |
|------|------|
| `ingest_status` | 入口状态：`pending`/`processed`/`error` |
| `llm_description_done` | 描述是否已完善 |
| `source_hash` | SHA1 哈希（16字符），用于去重 |
| `source_path` | 原始导入路径 |

### 引用字段

- `derived_from`: 衍生来源
- `entity_refs`: 实体引用
- `topic_refs`: 主题引用
- `source_ref`: 来源链接

### 领域字段

- 保留对具体领域真正有价值的结构化字段
- 例如：`start_date`、`end_date`、`location`、`host`、`participants`、`organizer`
- 不要为了统一 schema 删除这些字段

## 注意事项

- `/debug` 会话禁用知识库自动化策略，并阻止写入 `workbook/wiki/`、`workbook/resources/` 和 `workbook/brainstorm/`
- 编辑知识库笔记时保持溯源信息、本地链接、`image_key` 和附件位置的完整性
