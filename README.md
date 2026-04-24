# 个人知识库

基于 OpenCode 的个人知识系统，用于摄取来源、查询有据可依的知识，并将稳定的笔记提升至 `wiki/` 并保留溯源信息。

## 目的

- 在 `AGENTS.md` 中保持仓库指令简洁且面向路由
- 在此 `README.md` 中保持面向人类的项目概览和维护命令
- 将仓库作为持久知识和智能体行为的记录系统

## 运行服务

从仓库根目录执行：

**一键启动（推荐）**

- `bun --cwd .opencode run watch`: 同时启动 frontmatter 监听和 SQLite 索引监听

**单独命令**

- `bun --cwd .opencode run frontmatter:watch`: 持续监听库文件并更新 frontmatter
- `bun --cwd .opencode run frontmatter:scan`: 对知识库执行一次性扫描
- `bun --cwd .opencode run frontmatter:backfill`: 批量补全缺失的 frontmatter 字段
- `bun --cwd .opencode run frontmatter:scan-pending`: 扫描待处理的资源笔记
- `bun --cwd .opencode run frontmatter:index:scan`: 构建 SQLite frontmatter 索引
- `bun --cwd .opencode run frontmatter:index:rebuild`: 清空并重建 SQLite frontmatter 索引
- `bun --cwd .opencode run frontmatter:index:reconcile`: 重扫并清理陈旧的 SQLite 索引记录
- `bun --cwd .opencode run frontmatter:index:watch`: 持续监听并增量更新 SQLite frontmatter 索引

## 运行模型

仓库使用以下调用栈：

`命令 -> 工作流 -> 技能 -> 规则`

- 命令是面向用户的入口点
- 工作流编排多步骤行为
- 技能提供专注的能力
- 规则定义可复用的约束和策略

`AGENTS.md` 是智能体的入口地图。详细行为位于 `.opencode/` 下，应延迟加载。

## 知识库层级

- `my-work/` 和 `My-work/`: 当前意图、草稿、决策和项目思考
- `resources/` 和 `Resources/`: 捕获的来源和支撑证据
- `brainstorm/`: `todo/` 和 `active/` 中的推测性笔记
- `wiki/`: 稳定知识，索引优先维护
- `output/`: 交付物，索引优先维护
- `docs/plans/`: 日期前缀的计划和需求
- `.opencode/`: 命令、工作流、技能和规则

在仓库规范化之前，将大小写文件夹变体视为别名。

## 常用 OpenCode 命令

在 OpenCode 会话中执行：

- `/ingest <路径或URL>`: 摄取本地笔记、文件、URL 或会话产物
- `/solidify <主题或笔记>`: 将有据可依的知识提升至 `wiki/`
- `/lint-vault`: 审计元数据、索引和知识库卫生
- `/process-pending`: 处理待 LLM 描述的笔记
- `/debug`: 启动只读沙箱会话用于知识库行为调试

## 检索与提升

- 正常会话中，每条用户消息应先查询知识库
- 唯一例外是以 `/debug` 命令启动的会话
- 知识库问答从 `wiki/index.md` 开始，然后是相关的 `wiki/` 页面，再从 `resources/` 获取证据
- `brainstorm/` 用于试探性综合，不是稳定事实
- `my-work/` 用于当前上下文和用户意图
- 提升至 `wiki/` 通过 `solidify` 工作流进行；未解决的推测不进入稳定记忆

## 关键文件

- `AGENTS.md`: 智能体入口地图和路由策略
- `.opencode/workflows/query-vault.md`: 知识库查询工作流
- `.opencode/workflows/ingest-resources.md`: 外部来源摄取工作流
- `.opencode/workflows/solidify-to-wiki.md`: 提升至 `wiki/` 的工作流
- `wiki/index.md`: 主要 wiki 发现入口
- `output/index.md`: 主要交付物发现入口

## Frontmatter 模式

详见 `.opencode/rules/metadata-conventions.md`。

### 核心字段

| 字段 | 含义 |
|------|------|
| `type` | 笔记类型：`vault`/`resource`/`brainstorm`/`wiki`/`output`/`my-work` |
| `kind` | 内容分类：`note`/`index`/`log`/`topic`/`entity`/`concept`/`project`/`deliverable` |
| `source_type` | 来源类型：`web`/`paper`/`local`/`chat`/`manual`/`generated` |
| `content_role` | 内容角色：`raw`/`summary`/`topic`/`entity`/`synthesis`/`draft`/`index`/`log` |
| `status` | 工作流状态：`inbox`/`active`/`reviewed`/`archived`/`draft` |
| `trust_level` | 可信度：`raw`/`extracted`/`synthesized`/`verified`/`disputed` |
| `verification` | 验证状态：`unverified`/`spot_checked`/`verified` |
| `llm_stage` | LLM 处理阶段：`unprocessed`/`parsed`/`linked`/`summarized`/`integrated` |
| `image_key` | 图片/附件关联键 |

### 模板差异

不同来源类型的笔记使用不同的默认值：

**人工编写**

`my-work`:
```yaml
source_type: manual
content_role: draft
status: active
trust_level: raw
llm_stage: unprocessed
```

`brainstorm`:
```yaml
source_type: manual
content_role: draft
status: active
trust_level: synthesized
llm_stage: unprocessed
```

**外部来源（resources）**

```yaml
source_type: local/web/paper/chat
content_role: raw
status: inbox
trust_level: raw
llm_stage: unprocessed
ingest_status: pending
```

**稳定知识（wiki）**

```yaml
source_type: generated
content_role: synthesis
status: active
trust_level: synthesized
verification: unverified
llm_stage: linked
```

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

## 注意事项

- `/debug` 会话禁用知识库自动化策略，并阻止写入 `wiki/`、`resources/` 和 `brainstorm/`
- 编辑知识库笔记时保持溯源信息、本地链接、`image_key` 和附件位置的完整性
