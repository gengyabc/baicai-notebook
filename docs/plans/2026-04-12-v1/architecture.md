
我帮你做一个**最终收敛版（工程级）结构设计**，重点满足你三点：

* ✅ resources：完全交给 LLM，自由组织（你不看）
* ✅ brainstorm：极简（active / todo）
* ✅ wiki / output：允许复杂，但**必须可索引（index-first）**

同时保证：

* 不破坏你现有结构
* 完全兼容 Obsidian + OpenCode
* 支持你“懒人模式”

---

# 🧠 一、最终结构（收敛版）

这是我帮你压到最合理的版本：

```text
vault/

  my-work/

  resources/
    inbox/
    web/
    papers/
    local-files/

  brainstorm/
    todo/
    active/

  wiki/
    index.md
    log.md

  output/
    index.md

  .opencode/
  AGENTS.md
```

👉 注意：

* **wiki / output 不预设子目录**
* 结构由 LLM 自己长出来（你允许复杂）
* 但必须 obey index

---

# 🧠 二、resources：完全 LLM 托管（放开，但加护栏）

你这句很关键：

> 我不会看 resources，LLM 找给我

👉 那我们直接设计成：

> **resources = LLM 的“私有数据库”**

---

## ✅ LLM 可以做：

```text
resources/
  web/
    ai/
      llm/
      agents/
    math/
    education/

  papers/
    transformers/
    learning-theory/

  local-files/
    finance/
    legal/
```

甚至：

```text
resources/web/ai/llm/attention/
```

👉 ✅ 允许深层结构（和你之前不同，这是优化点）

---

## 🚨 但必须有 3 个约束（核心）

### 1️⃣ 不删除

```md
NEVER delete files in resources/
```

---

### 2️⃣ 不重命名原始文件

```md
NEVER rename original files
```

---

### 3️⃣ 只能“渐进整理”

```md
- Only reorganize small batches
- Never restructure entire tree at once
```

---

## 🧠 本质

resources =

> **LLM optimized storage, NOT human-readable storage**

---

# 🌱 三、brainstorm（你最终极简版）

你已经做了正确选择 👍

---

## 最终结构：

```text
brainstorm/
  todo/
  active/
```

---

## 🔥 核心语义

| 目录     | 含义         |
| ------ | ---------- |
| todo   | 原始想法 / 未处理 |
| active | 正在思考 / 推演  |

---

## 🤖 LLM 行为规则

```md
- new ideas → todo
- explored ideas → active
- NEVER move to wiki directly
```

---

## 🧠 关键（你系统的灵魂）

brainstorm 是：

> **LLM 的“思考缓冲区”**

不是知识库
不是整理层
不是归档层

---

# 📚 四、wiki（允许复杂，但 index-first）

你说的非常对：

> 可以复杂，但必须通过 index 找

👉 这是正确设计

---

## ✅ wiki 内部结构（完全开放）

LLM可以自由生成：

```text
wiki/
  concepts/
  entities/
  projects/
  synthesis/
  maps/
  methods/
  experiments/
```

甚至：

```text
wiki/ai/llm/attention.md
```

---

## 🚨 唯一强约束：index-first

### index.md 必须：

```md
# Wiki Index

## Concepts
- [[Transformer]]
- [[Scaling Law]]

## Projects
- [[AI Course]]

## Synthesis
- [[Future of AI Agents]]
```

---

## 🤖 LLM必须保证：

```md
- Every new wiki page must be added to index.md
- Index must stay human-readable
```

---

## log.md（来自 Karpathy）

你 PDF 里也强调了：

> 每次 ingest 更新 log 

---

## log.md 示例：

```md
## 2026-04-13

- Added [[Transformer]]
- Updated [[Attention]]
- Linked [[Scaling Law]] ↔ [[Data Efficiency]]
```

---

# 📦 五、output（和 wiki 同逻辑）

你说：

> 可以复杂 + index

👉 完全正确

---

## 结构：

```text
output/
  index.md
```

---

## LLM可以自由生成：

```text
output/
  writing/
  reports/
  ai-book/
  experiments/
```

---

## index.md：

```md
# Output Index

## Writing
- [[AI Learning Guide]]

## Reports
- [[LLM Market Analysis]]
```

---

# 🖼️ 六、attachments（最终规则版）

你这个要求已经很高级了，我帮你定最终规范：

---

## ✅ 规则

```text
任何目录：

xxx/
  a.md
  b.md
  attachments/
```

---

## ❗ 强制规则

```md
- Attachments MUST be local to folder
- NEVER use global assets folder
- NEVER reference parent folder attachments
```

---

## 🧠 image_key（最终版）

你现在的设计很好，我帮你定标准：

```yaml
image_key: transformer
```

---

## 图片命名：

```text
attachments/
  transformer-01.png
  transformer-02.png
```

---

## 🤖 LLM规则：

```md
- use image_key as prefix
- auto increment index
```

---

# 🤖 七、OpenCode 关键适配（必须写 AGENTS.md）

你系统能不能跑，关键就在这里

---

## 必写规则（精简版）

```md
# SYSTEM RULES

## Resources
- LLM can reorganize freely
- Never delete or rename original files
- Treat as LLM-managed storage

## Brainstorm
- Only todo/active
- No direct promotion to wiki

## Wiki
- Must maintain index.md
- Only stable knowledge

## Output
- Must maintain index.md

## Attachments
- Always local attachments/
- Use image_key naming
```

---

# 🧠 八、最终架构总结（非常关键）

你现在的系统，本质是：

```text
resources   = LLM 的数据仓库（你不看）
brainstorm  = LLM 的思考空间
wiki        = LLM 的长期记忆
output      = LLM 的表达层
my-work     = 你的意图输入
```

---

# 🔥 一句话总结你的系统

> **你不管理结构，LLM负责结构；你只管理输入和判断。**

---

