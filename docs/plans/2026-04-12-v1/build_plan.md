**执行目标**

把 `docs/architecture.md` 和 `new_agents.md` 的设计，合并进当前仓库的工程化体系：

- 顶层规则落到 `AGENTS.md`
- 全局约束落到 `.opencode/rules/*`
- 操作流程落到 `.opencode/workflows/*`
- 入口语义落到 `.opencode/commands/*`
- 原子能力落到 `.opencode/skills/*`

并确保最终系统满足这些目标：

- `resources` 完全由 LLM 托管，但有安全护栏
- `brainstorm` 极简，固定为 `todo/active`
- `wiki` 和 `output` 可复杂，但必须 `index-first`
- 查询顺序统一
- promotion 路径统一
- 附件和 `image_key` 规则统一
- 各层规则不自相矛盾

---

**已锁定的决策**

这些不再反复讨论，直接按此执行：

1. 查询优先级
`wiki -> resources -> brainstorm`
`my-work` 只作为当前意图和上下文，不作为稳定知识主检索层。

2. `brainstorm -> wiki`
禁止自动直升。
只有通过 `solidify/promotion` 才能进入 `wiki`。

3. `image_key`
所有 Markdown 文件都要求 `image_key`。

4. `wiki/output`
允许自由生长，不预设强制子目录，但必须维护 `index.md`。

---

**总体实施原则**

1. 保留现有工程骨架
不推翻现有的：
`Command -> Workflow -> Skill / Subagent -> Rules`

2. 只吸收外部项目的“机制”
借鉴 `gengyabc/second-brain`、Karpathy `LLM Wiki`、相关联网资料中的：
- `index-first`
- `append-only log`
- 查询先目录后钻取
- `lint` 作为常规维护动作
- schema 可演化但必须保持一致性

不照搬其目录结构和默认 `raw -> wiki` 流程。

3. 采用最小正确改动
优先修改现有文件，不凭空增加大量新文件。
除非出现明显缺口，否则不新增 command/workflow/skill。

4. 优先复用现有装配点
- 继续复用现有 `opencode.json` 的 `instructions` 装载方式。
- 如果只是更新现有 rule 文件内容，则不修改 `opencode.json`。
- 只有在新增 rule 文件且确有必要时，才调整 `opencode.json`。

5. 保持兼容命名策略
- 继续兼容 `My-work/` 与 `my-work/`、`Resources/` 与 `resources/`。
- 本轮只统一语义，不做目录重命名迁移。
- 对现有命名不准确但已在用的入口，优先修正文案，暂不强制 rename。

---

**实施范围**

需要修改的文件分为 5 组。

1. 顶层配置
- `AGENTS.md`

2. 规则
- `.opencode/rules/core-vault.md`
- `.opencode/rules/edit-policy.md`
- `.opencode/rules/metadata-conventions.md`
- `.opencode/rules/promotion-policy.md`
- `.opencode/rules/query-confidence.md`

3. 工作流
- `.opencode/workflows/ingest-my-work.md`
- `.opencode/workflows/ingest-resources.md`
- `.opencode/workflows/distill-brainstorm.md`
- `.opencode/workflows/solidify-to-wiki.md`
- `.opencode/workflows/query-vault.md`
- `.opencode/workflows/lint-vault.md`

4. Commands
- `.opencode/commands/ingest.md`
- `.opencode/commands/query.md`
- `.opencode/commands/brainstorm.md`
- `.opencode/commands/solidify.md`
- `.opencode/commands/lint-brain.md`

5. Skills
- `.opencode/skills/second-brain-ingest/SKILL.md`
- `.opencode/skills/second-brain-query/SKILL.md`
- `.opencode/skills/second-brain-lint/SKILL.md`
- `.opencode/skills/brainstorm-distill/SKILL.md`
- `.opencode/skills/solidify-to-wiki/SKILL.md`
- `.opencode/skills/web-to-resource/SKILL.md`

6. 配置文件
- `opencode.json` 默认不修改；仅当新增 rule 文件或装载关系变化时再评估

---

**分阶段执行计划**

**阶段 1：统一顶层语义**

目标：先让 `AGENTS.md` 变成唯一可信的总纲。

要做的事：

1. 重写 `Folder roles`
写清楚 5 层职责：
- `my-work`: 用户意图层
- `resources`: LLM-managed storage
- `brainstorm`: thinking buffer
- `wiki`: durable knowledge
- `output`: deliverable layer

2. 重写 `Priority and confidence`
统一优先级：
- 用户意图来自 `my-work`
- 稳定知识来自 `wiki`
- 证据来自 `resources`
- 推演来自 `brainstorm`

并把“回答问题的检索顺序”和“知识层级价值”区分开写，避免混淆。

3. 重写 `Promotion pipeline`
统一为：
`my-work/resources -> brainstorm -> wiki -> output`

并写清：
- 默认不跳过 `brainstorm`
- promotion 需要显式 solidify gate
- 只提升 grounded claims

4. 扩充 `Hard rules`
加入这些新规则：
- `resources` 禁删除
- `resources` 禁重命名原始文件
- `resources` 只允许渐进整理，不整树重构
- `brainstorm` 只允许 `todo/active`
- `wiki` 新页必须登记到 `wiki/index.md`
- `output` 新页必须登记到 `output/index.md`
- 重要结构更新记录到 `wiki/log.md`
- 所有附件必须使用本地 `attachments/`
- 所有 Markdown 必须有 `image_key`

5. 对齐 `Edit policy by folder`
确保每层编辑策略与新架构一致。

验收标准：
- `AGENTS.md` 读完后，外部读者能明确知道五层架构、检索顺序、promotion gate、index/log、附件、`image_key` 规则。
- 不再出现与 `new_agents.md` 冲突的表述。

---

**阶段 2：规则层统一**

目标：把 `AGENTS.md` 的总纲拆成可执行规则。

**2.1 `core-vault.md`**
调整内容：
- 明确五层语义
- 明确 `resources` 是 LLM 托管但受护栏限制
- 明确 `brainstorm` 是 speculation layer，且固定 `todo/active`
- 明确 `wiki/output` 采用 `index-first`
- 明确允许 `wiki/output` 自由长结构，但必须可索引

验收标准：
- 不再把 `resources` 只写成“证据层”，而要兼顾“LLM-managed storage”定位。
- 不再遗漏 `index-first`。

**2.2 `edit-policy.md`**
调整内容：
- `resources`：可组织、可归类、可建子目录，但不得删除和改原始文件名
- `brainstorm`：自由编辑，但仅在 `todo/active` 结构内
- `wiki`：谨慎编辑，维持稳定与可追溯性
- `output`：自由生成，但必须维护索引

验收标准：
- 编辑策略与顶层规则一致。
- 不再暗示可在 `resources` 中做大规模重构。

**2.3 `metadata-conventions.md`**
调整内容：
- 新增全局要求：所有 Markdown 必须包含 `image_key`
- 保留现有 `resource/brainstorm/wiki` frontmatter schema
- 建议给 `wiki` 增加 `summary` 字段，用于 index 和 query preview
- 可补充 `output` 最低元数据规范，如果你希望输出层也规范化
- 明确 `index.md` / `log.md` 这类特殊文件也属于 Markdown，因此同样受 `image_key` 规则约束

验收标准：
- `image_key` 成为规则层显式要求，而不是散落在说明里。
- wiki 的最小可索引性被元数据支持。

**2.4 `promotion-policy.md`**
调整内容：
- 明确 promotion 默认路径必须经过 `brainstorm`
- 明确“禁止自动直升 wiki”
- 明确 `solidify` 是唯一的 promotion gate
- 明确“只提升稳定且可溯源的部分，不整体搬运 brainstorm note”

验收标准：
- promotion 只有一套说法。
- 不再出现 `resources -> wiki` 的默认直达暗示。

**2.5 `query-confidence.md`**
调整内容：
- 查询顺序统一为 `wiki -> resources -> brainstorm`
- `wiki` 提供高置信度答案
- `resources` 提供原始支撑与证据补充
- `brainstorm` 只用于 tentative synthesis
- 回答中必须分离“confirmed facts”和“working hypotheses”

验收标准：
- 与 command/workflow/skill 中的 query 描述一致。
- 不再出现 `wiki -> brainstorm -> resources`。

---

**阶段 3：workflow 层落地**

目标：把抽象规则落实成操作步骤。

**3.1 `ingest-my-work.md`**
要改成：
- 从 `my-work` 中抽取内容时，优先保留原笔记
- 提炼出的想法默认进 `brainstorm`
- 只有明显稳定、重复验证的内容才经由 `solidify` 进入 `wiki`
- 如果新建或更新 `wiki`，必须维护 `index/log`

重点避免：
- 从 `my-work` 直接自动生成大量 wiki 内容

验收标准：
- `my-work` 更偏“意图提炼 + 派生”而非“直接编译为 wiki”。

**3.2 `ingest-resources.md`**
要改成：
- source 进入 `resources` 时，允许建立多层目录和 topic grouping
- 但只允许渐进整理，小批次移动
- 不删除、不改名原始文件
- 资源的默认后续去向是 `brainstorm`，不是直接 `wiki`
- 若资源确实强力支撑稳定知识，也必须经过 `solidify`

验收标准：
- 体现“LLM-managed storage with guardrails”
- 不再保留 `resources -> wiki` 直达的默认语义

**3.3 `distill-brainstorm.md`**
要改成：
- 明确 `brainstorm` 只包含 `todo/active`
- `todo`: 新进入、未处理
- `active`: 已整理、已推演
- 可标记 promotion candidate，但不能自动 promotion
- 继续强化 speculative status 和 derivation

验收标准：
- workflow 不会在整理 brainstorm 时顺手写 wiki。

**3.4 `solidify-to-wiki.md`**
要改成：
- 明确它是唯一 promotion gate
- promotion 必须检查 provenance、confidence、deduplication
- 新增或更新 wiki 后必须：
  - 写 `wiki/index.md`
  - 需要时写 `wiki/log.md`
- 可保留与 `brainstorm`/`resources` 的回链
- 如更新的是已存在 wiki 页，仍需检查 `wiki/index.md` 的摘要和分类是否要同步调整

验收标准：
- 所有进入 wiki 的内容都经过同一套门槛。

**3.5 `query-vault.md`**
要改成：
- 第一步必须读 `wiki/index.md`
- 第二步读相关 wiki 页
- 第三步补读 `resources`
- 第四步必要时参考 `brainstorm`
- 结论输出时标明置信度和证据冲突

验收标准：
- workflow 明确体现 `index-first` 和新查询顺序。

**3.6 `lint-vault.md`**
要扩充检查项：
- missing frontmatter
- missing `image_key`
- missing `wiki/index.md` entries
- missing `output/index.md` entries
- orphan wiki pages
- weak sourcing
- duplicate concepts
- brainstorm 结构是否偏离 `todo/active`
- 附件是否跨目录引用
- promotion candidates 是否存在
- `wiki/index.md` 中的链接是否实际存在
- `output/index.md` 中的链接是否实际存在
- `wiki/log.md` 记录格式是否保持可解析的一致前缀

验收标准：
- lint 不只查元数据，也查结构健康和检索健康。

---

**阶段 4：command 层对齐**

目标：让用户入口描述和真实执行逻辑一致。

**4.1 `ingest.md`**
更新点：
- 区分 `my-work` ingest 与 `resources` ingest
- 强调 `resources` 渐进整理
- 避免让入口描述暗示直接写 wiki

**4.2 `query.md`**
更新点：
- 明确 query 路径：
  `wiki -> resources -> brainstorm`
- 可加一句：先读 `wiki/index.md`

**4.3 `brainstorm.md`**
更新点：
- 明确只处理 `brainstorm/todo` 和 `brainstorm/active`
- 明确 speculative material 默认不进入 wiki

**4.4 `solidify.md`**
更新点：
- 强化“promotion gate”描述
- 明确只提升 grounded knowledge

**4.5 `lint-brain.md`**
这里有一个命名问题。

当前内容实际是“lint vault”，不是“lint brain”。
执行策略建议：
- 先不改文件名，减少改动范围
- 但把 description 改成“Audit the vault...”
- 在正文里明确 follow `lint-vault.md`

如果后续你想追求命名一致，再单独做一次 rename。

验收标准：
- command 描述不再误导。
- 用户从入口名能大致理解行为。

---

**阶段 5：skill 层同步**

目标：让原子能力说明也遵循新规则。

**5.1 `second-brain-ingest`**
新增或调整：
- `resources` 渐进整理
- 不删不改原始文件名
- 默认先路由到 `brainstorm`
- 涉及 wiki 时要维护 `index/log`
- 所有新 Markdown 需要 `image_key`

**5.2 `second-brain-query`**
新增或调整：
- `index-first`
- 查询顺序 `wiki -> resources -> brainstorm`
- `brainstorm` 仅作 tentative synthesis

**5.3 `second-brain-lint`**
新增或调整：
- 查 index entry
- 查 orphan
- 查 `image_key`
- 查 attachment locality
- 查 promotion candidates

**5.4 `brainstorm-distill`**
新增或调整：
- 明确 `todo/active`
- 明确不自动 promotion
- 强化 speculative identity

**5.5 `solidify-to-wiki`**
新增或调整：
- 明确唯一 promotion gate
- 明确 `index.md` 与 `log.md` 维护职责

**5.6 `web-to-resource`**
新增或调整：
- 保持原始 source identity
- 不删除、不改名
- 不做整树重构
- 允许资源层自由长结构但要渐进进行

验收标准：
- skill 文案与 workflow/command/rule 不冲突。
- 不存在旧行为暗示。

---

**阶段 6：全局一致性检查**

目标：避免“每个文件都对，但整体打架”。

检查项：

1. 查询顺序是否全仓一致
必须全部统一为：
`wiki -> resources -> brainstorm`

2. promotion 是否只有一套规则
必须全部统一为：
- 不能自动直升 wiki
- 必须经过 `solidify`

3. `resources` 规则是否全仓一致
必须全部体现：
- 可深层组织
- 不删
- 不改原始文件名
- 只渐进整理

4. `brainstorm` 结构是否全仓一致
必须全部体现：
- 仅 `todo/active`

5. `wiki/output` 是否都体现 `index-first`
必须全部体现：
- 新页写 index
- 结构性更新写 log

6. `image_key` 是否全仓一致
必须全部体现：
- 所有 Markdown 要求 `image_key`

7. 附件规则是否全仓一致
必须全部体现：
- 本地 `attachments/`
- 不使用全局 assets
- 不跨目录复用父级附件

8. 索引与日志格式是否一致
必须全部体现：
- `index.md` 采用可读目录风格，条目尽量带一行 summary
- `wiki/log.md` 使用统一的日期前缀格式，便于后续检索和解析

验收标准：
- 不再出现互相矛盾的规则。
- 用户阅读任一层文件，不会得到不同结论。

---

**执行顺序**

真正动手时按这个顺序最稳：

1. `AGENTS.md`
2. `.opencode/rules/*`
3. `.opencode/workflows/*`
4. `.opencode/commands/*`
5. `.opencode/skills/*`
6. 全局一致性检查
7. 输出变更摘要
8. 如有必要，再决定是否进入“最小骨架补齐”第二阶段

原因：
- 先定总纲
- 再定规则
- 再把规则落实到流程
- 最后才修入口和技能描述

---

**输出物**

执行完成后，应该产出这些结果：

1. 一套统一的知识库操作规范
体现在 `AGENTS.md` 和 `.opencode/rules/*`

2. 一套一致的工作流定义
体现在 `.opencode/workflows/*`

3. 一套与工作流一致的入口命令
体现在 `.opencode/commands/*`

4. 一套同步后的能力描述
体现在 `.opencode/skills/*`

5. 一份最终变更摘要
说明：
- 改了哪些文件
- 统一了哪些冲突
- 借鉴了哪些外部机制
- 哪些点故意没有照搬

6. 一份验收记录
说明：
- 哪些检查项已通过
- 哪些项因仓库当前为空目录或无历史内容而暂无法完全验证

---

**风险点与处理策略**

1. `image_key` 扩大范围
风险：
- 规则变严格，后续新建 Markdown 的门槛更高
处理：
- 先只改规则，不批量补历史文件
- 后续让 lint 去发现缺失项

2. `resources -> wiki` 旧语义残留
风险：
- 某些 workflow 或 skill 还会默认直写 wiki
处理：
- 所有涉及 ingest 和 promotion 的文件逐条对齐

3. `lint-brain.md` 命名不准
风险：
- 用户理解成本略高
处理：
- 当前先修描述，不强制改名

4. `wiki/output` 目前还未建目录
风险：
- 规则已经写了，但仓库现状还没对应骨架
处理：
- 这次先完成规则与流程合并
- 如你需要，下一步再补最小骨架文件：
  - `wiki/index.md`
  - `wiki/log.md`
  - `output/index.md`
  - `brainstorm/todo/`
  - `brainstorm/active/`

5. `image_key` 与索引页的实用性冲突
风险：
- `index.md` / `log.md` / 纯文本资源摘要页也要带 `image_key`，会增加样板字段
处理：
- 本轮先严格按统一规则落文档
- 不在本轮为历史文件补齐
- 后续如觉得过重，再单独讨论是否对特殊页面做例外规则

---

**建议的实施边界**

这次执行建议只做“系统配置层改造”，不顺手做这些事：

- 不批量迁移现有内容
- 不大规模创建新目录树
- 不重命名 command 文件
- 不一次性补所有历史 Markdown 的 `image_key`
- 不在本轮引入 manifest / registry 等新增系统文件，除非执行中发现现有 `log/index` 无法承载关键需求

这样可以先把规则系统稳定下来，再做内容层迁移。

---

**真正执行时的操作步骤**

1. 修改 `AGENTS.md`
2. 修改 5 个 `rules`
3. 修改 6 个 `workflows`
4. 修改 5 个 `commands`
5. 修改 6 个 `skills`
6. 逐文件 grep 检查关键语句是否仍冲突
7. 输出最终 summary
8. 输出验收记录与剩余建议

---

**关键检查关键词**

执行完成后，我会重点检查这些关键词在全仓是否一致：

- `wiki/index.md`
- `output/index.md`
- `wiki/log.md`
- `image_key`
- `attachments`
- `resources`
- `brainstorm`
- `solidify`
- `query`
- `wiki -> resources -> brainstorm`
- `index-first`
- `attachments/`
- `image_key:`

---

**完成定义**

本轮执行完成，至少应满足以下条件：

1. 规则一致
- `AGENTS.md`、rules、workflows、commands、skills 不再出现明显冲突表述。

2. 路由一致
- 查询、ingest、brainstorm、solidify、lint 五类入口的描述与流程一致。

3. 可执行
- 任一新会话只读取 `AGENTS.md` 与已装载 rules，也能推导出正确行为。

4. 可维护
- `index-first`、`log`、attachments、`image_key` 这些高频约束能在 lint 中被检查到。

5. 保守兼容
- 不破坏现有目录命名兼容策略，不引入不必要迁移。

---

**执行后验证方法**

建议在真正修改完成后，用最小验证法复核：

1. 文本一致性检查
- 搜索 `wiki -> brainstorm -> resources`，确认已清理旧顺序。
- 搜索 `directly to wiki`、`promote`、`solidify`，确认 promotion 语义统一。

2. 结构规则检查
- 搜索 `image_key`，确认 rules/workflows/skills 都覆盖到了。
- 搜索 `wiki/index.md`、`output/index.md`、`wiki/log.md`，确认所有写入路径都提及维护责任。

3. 命名兼容检查
- 确认 `My-work/`、`Resources/` 的兼容表述仍然保留。

4. 人工抽样检查
- 任读一个 command、一个 workflow、一个 skill，结论应一致，不需要靠猜测补全规则。

---

**后续可选第二阶段**

如果你认可第一阶段改造，后面还可以做第二阶段：

1. 补最小目录骨架
- `wiki/index.md`
- `wiki/log.md`
- `output/index.md`
- `brainstorm/todo/`
- `brainstorm/active/`

2. 增加模板或示例
- 示例 `wiki/index.md`
- 示例 `output/index.md`
- 示例 `brainstorm` frontmatter

3. 增加 lint 自动化建议
- 检查 index entry
- 检查 `image_key`
- 检查附件局部性

4. 视需要新增一个 onboarding/setup workflow
用于首次搭建空 vault

---

**下一步执行清单**

真正开始实施时，建议按下面这轮次推进：

1. 第一轮：先改总纲和规则
- 修改 `AGENTS.md`
- 修改 5 个 `rules`
- 完成后立即做一次文本一致性检查
- 如果此时仍存在语义冲突，先停在这一轮修正，不进入 workflow

2. 第二轮：再改 workflow
- 修改 6 个 `workflows`
- 重点检查 ingest/query/solidify/lint 是否全部继承了新的顶层规则
- 完成后抽样核对一个 ingest、一个 query、一个 solidify workflow

3. 第三轮：最后改 command 和 skill
- 修改 5 个 `commands`
- 修改 6 个 `skills`
- 重点清理旧文案残留，避免入口层继续传播旧语义

4. 第四轮：统一验收
- 做关键词搜索与人工抽样检查
- 记录通过项、残留项、以及是否进入“最小骨架补齐”第二阶段

**每轮完成条件**

1. 第一轮完成条件
- `AGENTS.md` 与 `rules` 已经可以单独自洽
- 不再出现旧查询顺序
- 不再出现自动直升 wiki 的表述

2. 第二轮完成条件
- 所有 workflow 的输入、路由、输出都与规则层一致
- 涉及 `wiki/output` 的写入路径都提到 index 维护

3. 第三轮完成条件
- commands 和 skills 只复述已定规则，不引入新语义
- 不再出现误导性入口描述

4. 第四轮完成条件
- 已形成可交付的最终变更摘要
- 已形成验收记录

**建议的停顿点**

为了避免一口气改太多后难以回查，建议只在这两个节点停下来复盘：

1. 改完 `AGENTS.md + rules` 后
- 确认总纲是否足够稳定，再继续改 workflow

2. 改完全部文件后
- 决定是否继续进入第二阶段补最小骨架
