# Personal Knowledge Vault

OpenCode 驱动的个人知识系统，支持从用户意图到稳定知识的渐进式沉淀与溯源。

---

## 系统主要功能

**核心能力**

- 知识摄取：从 `my-work/`、`resources/` 等来源自动分类、路由、提炼，默认先进入 `brainstorm/` 推演层
- 知识查询：按 `wiki -> resources -> brainstorm` 的顺序检索，并输出置信度与证据来源
- 推演整理：在 `brainstorm/todo` 与 `brainstorm/active` 中迭代想法，保持明确的不确定性标记
- 知识固化：通过唯一 `solidify` gate 将 grounded 内容提升进入 `wiki/`，并维护 `index.md` 与 `log.md`
- 结构审计：检查元数据、索引覆盖、附件局部性、重复概念、promotion candidates 等健康指标

**系统定位**

- `my-work/`：用户意图层，存放工作笔记、决策、项目思考
- `resources/`：LLM-managed storage，存放外部来源、网页捕获、Zotero 笔记，受护栏约束（不删、不改原名、只渐进整理）
- `brainstorm/`：推演层，固定为 `todo/` 与 `active/`，承载假设、矛盾、开放问题
- `wiki/`：稳定记忆层，仅通过 `solidify` gate 入场，必须维护 `wiki/index.md`，结构性更新记录在 `wiki/log.md`
- `output/`：交付层，面向用户输出成果，必须维护 `output/index.md`

---

## 使用指南

### 基本流程

**1. 摄取内容**

从 `my-work/` 或外部来源进入 vault：

- `/ingest my-work/decision.md` → 提炼要点 → 默认路由到 `brainstorm/`
- `/ingest https://example.com/article` → 创建 `resources/` 笔记 → 提炼后路由到 `brainstorm/`
- `/ingest Resources/paper.pdf` → 增加摘要与 provenance → 不删不改原文件，可渐进归类

**2. 查询知识**

从稳定层向下检索，带置信度与来源：

- `/query what is the relationship between AI and governance?`
- 系统先读 `wiki/index.md` → 找相关 `wiki/` 页 → 补 `resources/` 证据 → 若无稳定结论，才参考 `brainstorm/`
- 输出时明确：confirmed facts / working hypotheses / evidence conflicts

**3. 整理推演**

在 `brainstorm/` 中迭代想法，不自动进入 wiki：

- `/brainstorm brainstorm/todo/ai-governance.md`
- 在 `todo/` 与 `active/` 之间移动笔记，标记 `derived_from`、`confidence`、`status`
- 可标记为 promotion candidate，但不自动写入 `wiki/`

**4. 固化稳定知识**

通过唯一 promotion gate 进入 wiki：

- `/solidify brainstorm/active/ai-governance-hypothesis.md`
- 检查 provenance、confidence、deduplication
- 更新 `wiki/index.md`，必要时记录 `wiki/log.md`
- 不提升 unresolved speculation

**5. 审计 vault**

定期检查结构与元数据健康：

- `/lint-brain` → 查 frontmatter、`image_key`、index entry、attachment locality、promotion candidates
- 按严重度排序输出问题，并建议最小修正动作

---

### 特殊流程

**从 my-work 直接进入 wiki**

极少数情况，如果 `my-work/` 中的决策已稳定且验证过：

- `/ingest my-work/final-decision.md` → `/solidify` → 进入 `wiki/`
- 仍需经过 explicit `solidify` gate

**从 resources 直接进入 wiki**

仅当资源证据强且稳定：

- `/ingest Resources/strong-evidence.pdf` → `/solidify` → 更新 `wiki/`
- 不建议默认如此，仍需 explicit gate

**批量补齐 image_key**

使用 lint 发现缺失后，可手动补齐：

- `/lint-brain` → 标记 missing `image_key` 的笔记
- 后续批次补齐 frontmatter

**删除或重命名 resources 文件**

禁止：

- 规则层明确不允许删除或改名 `resources/` 原始文件
- 可做渐进整理，小批次移动到合适子目录，但不改 source identity

---

## Commands

| Command | 文件路径 | 功能描述 | 使用场景 |
|---------|---------|---------|---------|
| `/ingest` | `.opencode/commands/ingest.md` | 摄取 `my-work` 或 `resources` 内容进入 vault，默认路由到 `brainstorm/` | 新笔记、外部来源、PDF、网页、Zotero 条目需要进入知识体系 |
| `/query` | `.opencode/commands/query.md` | 按 `wiki/index.md` → `wiki/` → `resources/` → `brainstorm/` 查询，带置信度 | 需要从 vault 中回答问题、检索稳定知识、了解证据来源 |
| `/brainstorm` | `.opencode/commands/brainstorm.md` | 整理 `brainstorm/todo` 或 `brainstorm/active` 中的推演材料 | 推演想法、整理假设、标记 promotion candidate、不自动进入 wiki |
| `/solidify` | `.opencode/commands/solidify.md` | 通过唯一 promotion gate 将 grounded 知识提升到 `wiki/`，并维护 `wiki/index.md` | 确认推演内容已稳定且有 provenance，需要进入稳定记忆层 |
| `/lint-brain` | `.opencode/commands/lint-brain.md` | 审计 vault 的结构、元数据、索引覆盖、附件局部性、promotion candidates | 定期维护、发现 drift、准备批量提升前检查健康度 |

---

## Workflows

| Workflow | 文件路径 | 功能描述 | 使用场景 |
|----------|---------|---------|---------|
| `ingest-my-work` | `.opencode/workflows/ingest-my-work.md` | 从 `my-work/` 提炼要点，默认路由到 `brainstorm/`，需 `solidify` 才能进入 `wiki/` | 处理用户笔记、决策、项目思考，保持用户意图 intact |
| `ingest-resources` | `.opencode/workflows/ingest-resources.md` | 将外部来源转换为 `resources/` Markdown，支持渐进整理护栏，不删不改原名 | 网页捕获、PDF、Zotero、本地文件需要进入来源层 |
| `distill-brainstorm` | `.opencode/workflows/distill-brainstorm.md` | 在 `brainstorm/todo` 与 `brainstorm/active` 中整理推演，不自动 promotion | 推演层内容 messy、promising、或太 broad 时整理 |
| `solidify-to-wiki` | `.opencode/workflows/solidify-to-wiki.md` | 作为唯一 promotion gate，检查 provenance、confidence、deduplication，并维护 `wiki/index.md` 与 `wiki/log.md` | 需要将 grounded 内容从 `brainstorm/` 提升到 `wiki/` |
| `query-vault` | `.opencode/workflows/query-vault.md` | 按 `wiki/index.md` → `wiki/` → `resources/` → `brainstorm/` 查询，输出置信度与证据 | 用户提问、知识检索、需要明确证据来源 |
| `lint-vault` | `.opencode/workflows/lint-vault.md` | 检查 frontmatter、`image_key`、index entry、attachment locality、`wiki/log.md` 格式、promotion candidates | vault 健康审计、发现 drift、准备批量提升前检查 |

---

## Rules

| Rule | 文件路径 | 功能描述 | 使用场景 |
|------|---------|---------|---------|
| `core-vault` | `.opencode/rules/core-vault.md` | 定义五层架构语义、`resources` LLM-managed storage 定位、`wiki/output` index-first、attachment locality、查询顺序 | 所有 vault 操作的基础规则，全局加载 |
| `edit-policy` | `.opencode/rules/edit-policy.md` | 各层编辑策略：`my-work` 保留用户 voice、`resources` 可组织但不删不改、`brainstorm` 自由推演、`wiki` 谨慎稳定、`output` 自由生成 | 执行任何编辑操作时的约束 |
| `metadata-conventions` | `.opencode/rules/metadata-conventions.md` | 所有 vault Markdown 必须包含 `image_key`；resource/brainstorm/wiki/output 的 frontmatter schema；`wiki/index.md` 与 `output/index.md` 可读风格；`wiki/log.md` 日期前缀 | 创建或更新任何 vault 笔记时遵守 schema |
| `promotion-policy` | `.opencode/rules/promotion-policy.md` | promotion 默认路径 `my-work/resources -> brainstorm -> wiki -> output`；`solidify` 是唯一 gate；只提升 grounded claims；不自动直升 | 任何 promotion 相关判断与流程 |
| `query-confidence` | `.opencode/rules/query-confidence.md` | 查询顺序 `wiki/index.md` → `wiki/` → `resources/` → `brainstorm/`；回答必须分离 confirmed facts 与 working hypotheses | 回答任何 vault 问题时的检索与输出风格 |

---

## Skills

| Skill | 文件路径 | 功能描述 | 使用场景 |
|-------|---------|---------|---------|
| `second-brain-ingest` | `.opencode/skills/second-brain-ingest/SKILL.md` | 分类与路由摄取内容，默认先进入 `brainstorm/`，`resources/` 渐进整理护栏，新建笔记含 `image_key` | workflow 调用，执行实际路由与笔记创建 |
| `second-brain-query` | `.opencode/skills/second-brain-query/SKILL.md` | 按 `wiki/index.md` → `wiki/` → `resources/` → `brainstorm/` 查询，分离 confirmed facts 与 hypotheses | workflow 调用，执行实际检索与答案组装 |
| `second-brain-lint` | `.opencode/skills/second-brain-lint/SKILL.md` | 检查 metadata、orphan notes、missing index entry、attachment locality、`image_key` coverage、promotion candidates | workflow 调用，执行 vault 审计 |
| `brainstorm-distill` | `.opencode/skills/brainstorm-distill/SKILL.md` | 在 `brainstorm/todo` 与 `brainstorm/active` 中整理推演，不自动 promotion，保持 speculative identity | workflow 调用，执行推演层整理 |
| `solidify-to-wiki` | `.opencode/skills/solidify-to-wiki/SKILL.md` | 作为唯一 promotion gate，检查 provenance、confidence、deduplication，维护 `wiki/index.md` 与 `wiki/log.md` | workflow 调用，执行 wiki 提升与索引维护 |
| `web-to-resource` | `.opencode/skills/web-to-resource/SKILL.md` | 将 URL 或外部 artifact 转换为 `resources/` Markdown 笔记，保留 provenance 与原始 identity，不做 tree-wide refactor | workflow 调用，执行网页捕获与资源层标准化 |

---

## 快速开始

**1. 配置环境**

确保 `opencode.json` 已正确加载 5 个 rules：

```json
{
  "$schema": "https://opencode.ai/config.json",
  "instructions": [
    ".opencode/rules/core-vault.md",
    ".opencode/rules/edit-policy.md",
    ".opencode/rules/metadata-conventions.md",
    ".opencode/rules/promotion-policy.md",
    ".opencode/rules/query-confidence.md"
  ]
}
```

**2. 确认骨架目录**

- `wiki/index.md`、`wiki/log.md` 已存在
- `output/index.md` 已存在
- `brainstorm/todo/` 与 `brainstorm/active/` 已存在
- `my-work/` 与 `resources/` 兼容大小写别名

**3. 尝试基本流程**

```bash
opencode ingest my-work/first-note.md
opencode query what is the core vault structure?
opencode brainstorm brainstorm/todo/first-hypothesis.md
opencode solidify brainstorm/active/first-hypothesis.md
opencode lint-brain
```

---

## 配置与维护

**全局规则加载**

- 所有 rules 通过 `opencode.json` 的 `instructions` 字段全局加载
- 新建 vault 笔记时需遵守 metadata-conventions 的 schema

**索引维护**

- 新建 `wiki/` 页后，必须登记到 `wiki/index.md`
- 新建 `output/` 页后，必须登记到 `output/index.md`
- `wiki/` 结构性更新后，需在 `wiki/log.md` 中追加日期前缀日志条目

**附件规则**

- 所有附件使用本地 `attachments/` 目录
- 不使用全局 assets bucket
- 不跨目录复用父级附件

**image_key 规则**

- 所有 vault Markdown（包括 `index.md`、`log.md`）必须包含 `image_key` 字段
- 新建笔记时由 skill/workflow 自动填写
- 历史笔记可通过 lint 发现缺失后批次补齐

**资源层护栏**

- `resources/` 可建立深层 topic 结构
- 只允许渐进整理，小批次移动
- 不删除 captured source files
- 不改名原始 source files

---

## 架构总览

```
Command (用户入口) -> Workflow (多步流程) -> Skill (原子能力) -> Rule (全局约束)
                    ↘ Subagent (深度推理、证据审查、聚类、提升)
```

### 预期目录结构

```
future/
├── my-work/          # 用户意图层：工作笔记、决策、项目思考
│   └── My-work/     # (别名，兼容大小写)
├── resources/        # LLM 管理存储：外部来源、网页捕获、Zotero 笔记
│   └── Resources/   # (别名，兼容大小写)
├── brainstorm/       # 推演层：假设、矛盾、开放问题
│   ├── todo/        # 待整理的推演材料
│   └── active/       # 活跃的推演内容
├── wiki/             # 稳定记忆层：经 solidify gate 提升的 grounded 知识
│   ├── index.md     # wiki 导航索引
│   └── log.md       # 结构性更新日志 (可选)
└── output/           # 交付层：面向用户的输出成果
    └── index.md     # output 导航索引
```

**目录职责**

- **`my-work/`**: 活跃意图层，存放工作笔记、决策、会议记录和项目思考。保留用户写作风格，不自动提升到 wiki。
- **`resources/`**: LLM 管理存储，存放外部来源、证据和支持材料。受护栏约束：不删除、不改原名、只允许渐进整理。
- **`brainstorm/`**: 推演思考层，存放假设、矛盾和开放问题。固定在 `todo/` 与 `active/` 中迭代，不自动进入 wiki。
- **`wiki/`**: 稳定记忆层，仅通过 explicit `solidify` gate 入场。必须维护 `index.md`，结构性更新记录在 `log.md`。
- **`output/`**: 交付层，面向用户的输出成果。必须维护 `index.md`，保持 index-first 组织。

**层级职责**

- Commands：解释用户意图，路由到 workflow
- Workflows：编排多步逻辑，决定笔记去向，管理输出
- Skills：执行单一能力，不控制流程
- Subagents：处理深度推理、证据审查、聚类、提升等任务
- Rules：全局约束、元数据、promotion 纪律、答案质量

**检索优先级**

1. `wiki/index.md` 先读
2. `wiki/` 页提供稳定答案
3. `resources/` 提供证据与 provenance
4. `brainstorm/` 仅用于 tentative synthesis
5. `my-work/` 仅用于当前意图与上下文

**promotion 路径**

```
my-work/resources -> brainstorm -> wiki -> output
```

- 默认不跳过 `brainstorm`
- 进入 `wiki` 需要 explicit `solidify` gate
- 只提升 grounded claims

---

## 进一步资源

- `AGENTS.md`：项目总纲，定义五层架构与全局规则
- `build_plan.md`：本次系统配置层改造的设计文档
- `.opencode/rules/`：全局规则层
- `.opencode/workflows/`：多步流程定义
- `.opencode/commands/`：用户入口语义
- `.opencode/skills/`：原子能力说明

---

## 开发与维护指南

**新增 command**

- 在 `.opencode/commands/` 中新建 `.md` 文件
- frontmatter 必须包含 `description` 与 `agent`
- 指向对应 workflow 文件
- 不在 command 中直接定义流程逻辑

**新增 workflow**

- 在 `.opencode/workflows/` 中新建 `.md` 文件
- 明确 Goal、Inputs、Steps、Skills、Subagents、Outputs
- 不重复 rule 内容，只编排步骤

**新增 skill**

- 在 `.opencode/skills/<name>/` 中新建 `SKILL.md`
- frontmatter 必须包含 `name` 与 `description`
- 指明 What I do、When to use me、Constraints
- 保持 atomic，不控制流程

**新增 rule**

- 在 `.opencode/rules/` 中新建 `.md` 文件
- 定义 reusable constraints 或 schemas
- 若需要全局生效，需在 `opencode.json` 的 `instructions` 中增加装载路径

**修改现有配置**

- 优先保持最小改动
- 遵守 `optimize-config` skill 的 validation 规则
- 修改后做文本一致性检查，避免新旧语义冲突

---

## 许可与贡献

- 本项目为个人知识系统，当前为私人仓库
- 配置层改造基于 `build_plan.md` 与 AGENTS.md 的统一规则
- 如需贡献，请先阅读 `AGENTS.md` 与 `.opencode/rules/` 理解全局约束

---

## 状态记录

- 2026-04-13：完成配置层统一与最小骨架补齐，系统功能与流程已对齐 `build_plan.md` 设计
- 当前目录：`wiki/index.md`、`wiki/log.md`、`output/index.md`、`brainstorm/todo/`、`brainstorm/active/` 已初始化
- 历史内容迁移与 `image_key` 批量补齐待后续批次完成