# Auto Frontmatter 插件 (v2)

LLM 摄取管道，用于标准化已纳入管理的 markdown 内容，标记处理状态，并支持下游 LLM 工作流。

## v2 架构

```
[任意来源写入]
        │
        ▼
   watch.mjs (chokidar + 300ms 防抖)
        │
        ▼
   waitForStableFile (文件大小/mtime 稳定性检测)
        │
        ▼
   backfill.mjs (v2 摄取引擎)
        │
        ├─ ingest_status: pending
        ├─ image_key: <slugified 文件名>
        ├─ description: <提取的首段内容>
        ├─ llm_description_done: true (白名单) 或 false (待增强)
        │
        ▼
   [可选：OpenCode 中执行 /process-pending]
        │
        ├─ 查找文件：llm_description_done: false
        ├─ LLM 增强 description
        ├─ 设置 llm_description_done: true
        ├─ 设置 ingest_status: processed
```

## 技术说明

- 运行时：Bun（非 Node.js）
- SQLite：`bun:sqlite`（非 `node:sqlite` — Bun 不支持 Node.js 22+ 内置模块）
- 文件监听：`chokidar` 包
- 两个插件通过 `bun run watch` 脚本同时运行（`watch.mjs` + `sqlite-index.mjs` 并行）

## 目标文件夹

文件夹路径在 `.opencode/vault-config.json` 中配置。当前知识库根目录：`workbook/`。

托管文件夹：
- `workbook/resources/`
- `workbook/brainstorm/managed/`

`workbook/brainstorm/` 默认由人工管理。只有显式托管的子文件夹才应进入 LLM 摄取管道。

未来扩展：`workbook/wiki/`、`workbook/output/`、`workbook/my-work/`

## v2 Frontmatter Schema

### 摄取层字段

```yaml
ingest_status: pending | processed | error
normalized_at: 2026-04-15
source_hash: a1b2c3d4e5f6...
source_path: workbook/resources/web
```

### 描述标记

```yaml
llm_description_done: true | false
```

- `true`：描述已完成（白名单或 LLM 增强）
- `false`：需要通过 `/process-pending` 进行 LLM 增强

**白名单**（自动设为 `true`）：
- `index.md` 和 `log.md`
- `source_ref` 中包含 `github.com` 的文件

## 核心原则

1. **文件稳定后才处理**：使用 `size + mtime` 稳定性检测（800ms 稳定时间）
2. **幂等写入**：仅在内容实际变更时写入
3. **backfill 独立于 watcher**：可独立运行（扫描模式）
4. **原子写入**：临时文件 → 重命名，确保并发安全
5. **LLM 通过 OpenCode**：使用 `/process-pending` 命令进行描述增强

## 命令

### 文件监听器 (bun scripts)

```bash
# 首先安装依赖
bun run --cwd .opencode install

# 启动文件监听器（合并 frontmatter + sqlite 索引）
bun run --cwd .opencode watch

# 或单独运行：
bun run --cwd .opencode frontmatter:watch      # 仅 Frontmatter 监听器
bun run --cwd .opencode frontmatter:index:watch # 仅 SQLite 索引监听器

# 一次性批量扫描
bun run --cwd .opencode frontmatter:scan

# 手动 backfill
bun run --cwd .opencode frontmatter:backfill

# 扫描需要描述增强的文件
bun run --cwd .opencode frontmatter:scan-pending

# SQLite 索引操作
bun run --cwd .opencode frontmatter:index:scan     # 扫描并索引所有文件
bun run --cwd .opencode frontmatter:index:rebuild  # 从头重建索引
bun run --cwd .opencode frontmatter:index:reconcile # 清理过期条目
```

**注意**：使用 `bun run --cwd <dir> <script>`（而非 `bun --cwd <dir> run <script>`）

### LLM 处理 (OpenCode)

在 OpenCode 会话中：
```
/process-pending
```

此命令处理托管文件夹中所有 `llm_description_done: false` 的文件：
1. 使用 LLM 增强 description
2. 更新 frontmatter
3. 设置 `llm_description_done: true`、`ingest_status: processed`

## 配置

参见 `config.json`：
- `debounceMs`：300ms
- `settleTimeMs`：800ms
- `pollIntervalMs`：200ms
- `maxWaitMs`：10000ms
- `antiLoopWindowMs`：5000ms

## 工作流

### 自动化

1. 文件监听器添加 frontmatter，设置 `ingest_status: pending`
2. 从首段提取 description
3. 根据白名单设置 `llm_description_done`

### 手动增强

```bash
bun run --cwd .opencode frontmatter:scan-pending  # 列出需要增强的文件
```

然后在 OpenCode 中：
```
/process-pending
```

## 白名单

自动标记为 `llm_description_done: true` 的文件：
- `index.md` 和 `log.md`（结构化文件）
- `source_ref` 包含 `github.com` 的文件（源仓库）

## 防循环策略

主要策略：「内容不变则不写入 → 不触发变更」
次要策略：processedMap 带 5s 防循环窗口

## 文件

| 文件 | 用途 |
|------|------|
| `watch.mjs` | 使用 chokidar 的文件系统监听器 |
| `stable-check.mjs` | 文件稳定性检测器 |
| `backfill.mjs` | 带 v2 字段 + 白名单的摄取引擎 |
| `scan-pending.mjs` | 扫描需要描述增强的文件 |
| `hash.mjs` | SHA1 哈希计算 |
| `config.json` | 配置 schema |
| `index.js` | OpenCode 插件兼容性 |

## 相关文件

| 文件 | 用途 |
|------|------|
| `.opencode/commands/process-pending.md` | OpenCode LLM 增强命令 |
| `.opencode/workflows/process-pending-resources.md` | 工作流定义 |

## 部署

```bash
bun run --cwd .opencode install
bun run --cwd .opencode watch
```

在 OpenCode 会话中：
```
/process-pending  # 按需增强描述
```

## 演进

v1：「补 frontmatter」→ v2：「构建可计算的内容入口层」→ v2.1：「描述增强与白名单」

从元数据补全 → 数据标准化 → 基于白名单的描述处理

## 边界范围

- 人工管理笔记默认不应被 LLM 专用管道字段自动增强
- `workbook/resources/` 始终在范围内
- `workbook/brainstorm/` 仅当笔记位于显式托管子文件夹（如 `workbook/brainstorm/managed/`）时才在范围内