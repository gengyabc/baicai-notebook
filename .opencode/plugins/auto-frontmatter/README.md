# Auto Frontmatter Plugin (v2)

LLM ingestion pipeline that standardizes all incoming markdown content, marks processing status, and enables downstream LLM workflows.

## v2 Architecture

```
[Any Source Write]
        │
        ▼
  watch.mjs (chokidar + debounce 300ms)
        │
        ▼
  waitForStableFile (size/mtime stability)
        │
        ▼
  backfill.mjs (v2 ingestion engine)
        │
        ├─ ingest_status: pending
        ├─ image_key: <slugified filename>
        ├─ description: <extracted first paragraph>
        ├─ llm_description_done: true (whitelisted) or false (needs enhancement)
        │
        ▼
  [Optional: /process-pending in OpenCode]
        │
        ├─ Find files: llm_description_done: false
        ├─ LLM enhances description
        ├─ Set llm_description_done: true
        ├─ Set ingest_status: processed
```

## Technical Notes

- Runtime: Bun (not Node.js)
- SQLite: `bun:sqlite` (not `node:sqlite` - Bun doesn't support Node.js 22+ built-in modules)
- File watching: `chokidar` package
- Both plugins run together via `bun run watch` script

## Target Folders

- `resources/` and `Resources/`
- `brainstorm/`

Future expansion: `wiki/`, `output/`, `my-work/`

## v2 Frontmatter Schema

### Ingestion Layer Fields

```yaml
ingest_status: pending | processed | error
normalized_at: 2026-04-15
source_hash: a1b2c3d4e5f6...
source_path: resources/web
```

### Description Marker

```yaml
llm_description_done: true | false
```

- `true`: Description complete (whitelisted or LLM-enhanced)
- `false`: Needs LLM enhancement via `/process-pending`

**Whitelist** (automatically `true`):
- `index.md` and `log.md`
- Files with `github.com` in `source_ref`

## Core Principles

1. **Process Only After File Stability**: Uses `size + mtime` stability check (800ms settle time)
2. **Idempotent Write**: Only writes when content actually changes
3. **backfill Independent of watcher**: Can run standalone (scan mode)
4. **Atomic Write**: temp file → rename for safe concurrent access
5. **LLM via OpenCode**: Use `/process-pending` command for description enhancement

## Commands

### File Watcher (bun scripts)

```bash
# Install dependencies first
bun run --cwd .opencode install

# Start file watcher (combines frontmatter + sqlite index)
bun run --cwd .opencode watch

# Or run separately:
bun run --cwd .opencode frontmatter:watch      # Frontmatter watcher only
bun run --cwd .opencode frontmatter:index:watch # SQLite index watcher only

# One-time batch scan
bun run --cwd .opencode frontmatter:scan

# Manual backfill
bun run --cwd .opencode frontmatter:backfill

# Scan for files needing description enhancement
bun run --cwd .opencode frontmatter:scan-pending

# SQLite index operations
bun run --cwd .opencode frontmatter:index:scan     # Scan and index all files
bun run --cwd .opencode frontmatter:index:rebuild  # Rebuild index from scratch
bun run --cwd .opencode frontmatter:index:reconcile # Remove stale entries
```

**Note**: Use `bun run --cwd <dir> <script>` (not `bun --cwd <dir> run <script>`)

### LLM Processing (OpenCode)

In OpenCode session:
```
/process-pending
```

This processes all files with `llm_description_done: false`:
1. Enhances description with LLM
2. Updates frontmatter
3. Sets `llm_description_done: true`, `ingest_status: processed`

## Configuration

See `config.json`:
- `debounceMs`: 300ms
- `settleTimeMs`: 800ms
- `pollIntervalMs`: 200ms
- `maxWaitMs`: 10000ms
- `antiLoopWindowMs`: 5000ms

## Workflow

### Automatic

1. File watcher adds frontmatter with `ingest_status: pending`
2. Description extracted from first paragraph
3. `llm_description_done` set based on whitelist

### Manual Enhancement

```bash
bun run --cwd .opencode frontmatter:scan-pending  # List files needing enhancement
```

Then in OpenCode:
```
/process-pending
```

## Whitelist

Files automatically marked `llm_description_done: true`:
- `index.md` and `log.md` (structured files)
- Files with `source_ref` containing `github.com` (source repos)

## Anti-Loop Strategy

Primary: "If content unchanged, don't write → won't trigger change"
Secondary: processedMap with 5s anti-loop window

## Files

| File | Purpose |
|------|---------|
| `watch.mjs` | File system watcher with chokidar |
| `stable-check.mjs` | File stability detector |
| `backfill.mjs` | Ingestion engine with v2 fields + whitelist |
| `scan-pending.mjs` | Scan for files needing description enhancement |
| `hash.mjs` | SHA1 hash computation |
| `config.json` | Configuration schema |
| `index.js` | OpenCode plugin compatibility |

## Related Files

| File | Purpose |
|------|---------|
| `.opencode/commands/process-pending.md` | OpenCode command for LLM enhancement |
| `.opencode/workflows/process-pending-resources.md` | Workflow definition |

## Deployment

```bash
bun run --cwd .opencode install
bun run --cwd .opencode watch
```

In OpenCode session:
```
/process-pending  # Enhance descriptions when needed
```

## Evolution

v1: "补 frontmatter" → v2: "构建可计算的内容入口层" → v2.1: "描述增强与白名单"

From metadata completion → data standardization → whitelist-based description processing