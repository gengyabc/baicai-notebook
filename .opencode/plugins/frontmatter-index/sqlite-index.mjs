import fs from "fs/promises"
import { watch as fsWatch } from "fs"
import path from "path"
import { Database } from "bun:sqlite"
import { createRequire } from "module"
import { parseFrontmatter, splitFrontmatter } from "../auto-frontmatter/utils.mjs"

const require = createRequire(import.meta.url)
const config = require("./config.json")

const VAULT_ROOT = path.resolve(import.meta.dirname, "../../..")
const DB_PATH = path.resolve(VAULT_ROOT, config.dbPath)
const ROOTS = config.roots.map((root) => path.resolve(VAULT_ROOT, root))
const EXCLUDE_DIRS = config.excludeDirs.map((dir) => path.resolve(VAULT_ROOT, dir))
const EXCLUDE_PATTERNS = config.excludePatterns.map((pattern) => new RegExp(pattern))
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}(?:[Tt ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})?)?$/
const CANONICAL_ROOTS = {
  "Resources": "resources",
  "Brainstorm": "brainstorm",
  "Wiki": "wiki",
  "Output": "output",
  "My-work": "my-work",
}

let managedRootsPromise = null

async function main() {
  const args = process.argv.slice(2)

  if (args.includes("--scan")) {
    const store = await createStore()
    try {
      const result = await scanAll(store)
      if (args.includes("--reconcile")) {
        const removed = await reconcile(store, result.paths)
        console.log(`[sqlite-index] reconciled ${removed} stale note(s).`)
      }
      console.log(`[sqlite-index] scanned ${result.scanned} file(s), synced ${result.synced}.`)
    } finally {
      store.close()
    }
    return
  }

  if (args.includes("--rebuild")) {
    const tempDbPath = createTempDbPath()
    const store = await createStore(tempDbPath, "DELETE")
    try {
      store.clearAll()
      const result = await scanAll(store)
      closeQuietly(store)
      await fs.rename(tempDbPath, DB_PATH)
      try {
        await removeDatabaseArtifacts(DB_PATH)
      } catch (error) {
        console.warn(`[sqlite-index] cleanup warning: ${formatError(error)}`)
      }
      console.log(`[sqlite-index] rebuilt index from ${result.scanned} file(s), synced ${result.synced}.`)
    } finally {
      closeQuietly(store)
      await fs.rm(tempDbPath, { force: true })
    }
    return
  }

  if (args.includes("--single")) {
    const filePath = args[args.indexOf("--single") + 1]
    if (!filePath) {
      throw new Error("--single requires a file path")
    }
    const store = await createStore()
    try {
      const changed = await syncSinglePath(store, filePath)
      console.log(changed ? `[sqlite-index] synced ${filePath}` : `[sqlite-index] skipped ${filePath}`)
    } finally {
      store.close()
    }
    return
  }

  if (args.includes("--delete")) {
    const filePath = args[args.indexOf("--delete") + 1]
    if (!filePath) {
      throw new Error("--delete requires a file path")
    }
    const store = await createStore()
    try {
      const noteId = toVaultPath(resolveInputPath(filePath))
      store.deleteNote(noteId)
      console.log(`[sqlite-index] deleted ${noteId}`)
    } finally {
      store.close()
    }
    return
  }

  await runWatchMode()
}

async function createStore(dbPath = DB_PATH, journalMode = "WAL") {
  await fs.mkdir(path.dirname(dbPath), { recursive: true })
  return new IndexStore(dbPath, journalMode)
}

function createTempDbPath() {
  const dir = path.dirname(DB_PATH)
  const base = path.basename(DB_PATH)
  return path.join(dir, `.${base}.rebuild-${process.pid}-${Date.now()}`)
}

async function removeDatabaseArtifacts(dbPath) {
  await Promise.all([
    fs.rm(`${dbPath}-wal`, { force: true }),
    fs.rm(`${dbPath}-shm`, { force: true }),
    fs.rm(`${dbPath}-journal`, { force: true }),
  ])
}

function closeQuietly(store) {
  try {
    store.close()
  } catch (error) {
    const msg = formatError(error)
    if (!msg.includes("already closed") && !msg.includes("closed")) {
      console.warn(`[sqlite-index] unexpected close error: ${msg}`)
    }
  }
}

function formatError(error) {
  return error instanceof Error ? error.message : String(error)
}

async function runWatchMode() {
  const store = await createStore()
  const pending = new Map()
  let timer = null
  const watchers = []
  const managedRoots = await getManagedRoots()

  const initial = await scanAll(store)
  const initialRemoved = await reconcileMissingNotes(store)
  console.log(`[sqlite-index] initial scan ${initial.scanned} file(s), synced ${initial.synced}.`)
  if (initialRemoved) {
    console.log(`[sqlite-index] removed ${initialRemoved} stale note(s).`)
  }

  const flush = async () => {
    timer = null
    const entries = Array.from(pending.entries())
    pending.clear()

    for (const [filePath, eventName] of entries) {
      try {
        if (eventName === "unlink") {
          const noteId = toVaultPath(filePath)
          store.deleteNote(noteId)
          console.log(`[sqlite-index] deleted ${noteId}`)
        } else {
          const changed = await syncAbsolutePath(store, filePath)
          if (changed) {
            console.log(`[sqlite-index] synced ${toVaultPath(filePath)}`)
          }
        }
      } catch (error) {
        console.error(`[sqlite-index] ${filePath}: ${formatError(error)}`)
      }
    }

    const removed = await reconcileMissingNotes(store)
    if (removed) {
      console.log(`[sqlite-index] removed ${removed} stale note(s).`)
    }
  }

  const schedule = (eventName, filePath) => {
    pending.set(filePath, eventName)
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      flush().catch((error) => console.error(`[sqlite-index] flush failed: ${formatError(error)}`))
    }, config.debounceMs)
  }

  for (const root of managedRoots) {
    const stat = await safeStat(root)
    if (!stat || !stat.isDirectory()) continue

    const watcher = fsWatch(root, { recursive: true }, async (eventType, fileName) => {
      if (!fileName) return
      const filePath = path.join(root, fileName.toString())
      if (!filePath.endsWith(".md") || shouldIgnore(filePath)) return

      const current = await safeStat(filePath)
      if (current && current.isFile()) {
        schedule(eventType === "rename" ? "add" : "change", filePath)
      } else {
        schedule("unlink", filePath)
      }
    })

    watcher.on("error", (error) => console.error(`[sqlite-index] watch error: ${formatError(error)}`))
    watchers.push(watcher)
  }

  console.log(`[sqlite-index] watching ${managedRoots.join(", ")}`)

  const shutdown = async () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    for (const watcher of watchers) {
      watcher.close()
    }
    store.close()
    console.log("[sqlite-index] shutdown complete")
  }

  process.on("SIGINT", shutdown)
  process.on("SIGTERM", shutdown)
}

async function scanAll(store) {
  let scanned = 0
  let synced = 0
  const paths = new Set()
  const managedRoots = await getManagedRoots()

  for (const root of managedRoots) {
    const stat = await safeStat(root)
    if (!stat || !stat.isDirectory()) continue
    const files = []
    try {
      await collectMarkdownFiles(root, files)
    } catch (error) {
      console.error(`[sqlite-index] ${root}: ${formatError(error)}`)
      continue
    }

    for (const filePath of files) {
      scanned += 1
      paths.add(toVaultPath(filePath))
      try {
        if (await syncAbsolutePath(store, filePath)) {
          synced += 1
        }
      } catch (error) {
        console.error(`[sqlite-index] ${filePath}: ${formatError(error)}`)
      }
    }
  }

  return { scanned, synced, paths }
}

async function reconcile(store, existingPaths) {
  let removed = 0
  for (const notePath of store.listNotePaths()) {
    if (!existingPaths.has(notePath)) {
      store.deleteNote(notePath)
      removed += 1
    }
  }
  return removed
}

async function reconcileMissingNotes(store) {
  let removed = 0

  for (const notePath of store.listNotePaths()) {
    const absolutePath = path.resolve(VAULT_ROOT, notePath)
    const stat = await safeStat(absolutePath)
    if (stat && stat.isFile()) continue

    store.deleteNote(notePath)
    removed += 1
  }

  return removed
}

async function collectMarkdownFiles(dir, files) {
  if (shouldIgnore(dir)) return

  const entries = await fs.readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      await collectMarkdownFiles(fullPath, files)
      continue
    }

    if (entry.isFile() && isManagedMarkdown(fullPath)) {
      files.push(fullPath)
    }
  }
}

async function syncSinglePath(store, inputPath) {
  return syncAbsolutePath(store, resolveInputPath(inputPath))
}

async function syncAbsolutePath(store, filePath) {
  if (!isManagedMarkdown(filePath)) return false

  const source = await fs.readFile(filePath, "utf8")
  const { frontmatter, body } = splitFrontmatter(source)
  const parsedFrontmatter = parseFrontmatter(frontmatter)
  const noteId = toVaultPath(filePath)
  const title = typeof parsedFrontmatter.title === "string" && parsedFrontmatter.title.trim()
    ? parsedFrontmatter.title.trim()
    : path.basename(filePath, ".md")

  store.syncNote({
    id: noteId,
    path: noteId,
    title,
    folder: path.posix.dirname(noteId) === "." ? "" : path.posix.dirname(noteId),
    frontmatter: parsedFrontmatter,
    contentText: body,
  })

  return true
}

function resolveInputPath(inputPath) {
  return path.isAbsolute(inputPath) ? inputPath : path.resolve(VAULT_ROOT, inputPath)
}

function isManagedMarkdown(filePath) {
  return filePath.endsWith(".md") && isUnderManagedRoot(filePath) && !shouldIgnore(filePath)
}

function isUnderManagedRoot(filePath) {
  const normalized = path.resolve(filePath)
  return ROOTS.some((root) => normalized === root || normalized.startsWith(root + path.sep))
}

function shouldIgnore(filePath) {
  const normalized = path.resolve(filePath)

  if (normalized === DB_PATH) return true

  for (const excludeDir of EXCLUDE_DIRS) {
    if (normalized === excludeDir || normalized.startsWith(excludeDir + path.sep)) {
      return true
    }
  }

  return EXCLUDE_PATTERNS.some((pattern) => pattern.test(normalized))
}

function toVaultPath(filePath) {
  const relativePath = path.relative(VAULT_ROOT, path.resolve(filePath)).split(path.sep).join(path.posix.sep)
  return canonicalizeVaultPath(relativePath)
}

function canonicalizeVaultPath(filePath) {
  const parts = filePath.split(path.posix.sep)
  if (!parts[0]) return filePath

  parts[0] = CANONICAL_ROOTS[parts[0]] || parts[0]
  return parts.join(path.posix.sep)
}

async function getManagedRoots() {
  if (!managedRootsPromise) {
    managedRootsPromise = resolveUniqueRoots(ROOTS)
  }

  return managedRootsPromise
}

async function resolveUniqueRoots(roots) {
  const uniqueRoots = []
  const seen = new Set()

  for (const root of roots) {
    const key = await rootIdentity(root)
    if (seen.has(key)) continue

    seen.add(key)
    uniqueRoots.push(root)
  }

  return uniqueRoots
}

async function rootIdentity(root) {
  try {
    return (await fs.realpath(root)).toLowerCase()
  } catch {
    return path.resolve(root).toLowerCase()
  }
}

function isIsoLikeDate(value) {
  return ISO_DATE_RE.test(value) && !Number.isNaN(Date.parse(value))
}

function normalizeDate(value) {
  return new Date(value).toISOString()
}

function flattenFrontmatter(frontmatter) {
  const rows = []
  for (const [key, value] of Object.entries(frontmatter)) {
    rows.push(...flattenValue(value, key))
  }
  return rows
}

function flattenValue(value, key, arrayGroup = null, arrayIndex = null) {
  const rows = []

  if (value instanceof Date) {
    const normalized = normalizeDate(value)
    rows.push({
      key,
      valueText: normalized,
      valueNum: null,
      valueBool: null,
      valueDate: normalized,
      valueType: "date",
      isNull: 0,
      arrayGroup,
      arrayIndex,
    })
    return rows
  }

  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const item = value[index]
      if (item && typeof item === "object" && !Array.isArray(item)) {
        const groupId = `${key}#${index}`
        for (const [childKey, childValue] of Object.entries(item)) {
          rows.push(...flattenValue(childValue, `${key}[].${childKey}`, groupId, index))
        }
      } else if (Array.isArray(item)) {
        rows.push(...flattenValue(item, `${key}[]`, `${key}#${index}`, index))
      } else {
        rows.push(toPropertyRow(key, item, null, index))
      }
    }
    return rows
  }

  if (value && typeof value === "object") {
    for (const [childKey, childValue] of Object.entries(value)) {
      rows.push(...flattenValue(childValue, `${key}.${childKey}`, arrayGroup, arrayIndex))
    }
    return rows
  }

  rows.push(toPropertyRow(key, value, arrayGroup, arrayIndex))
  return rows
}

function toPropertyRow(key, value, arrayGroup = null, arrayIndex = null) {
  if (value === null || value === undefined) {
    return {
      key,
      valueText: null,
      valueNum: null,
      valueBool: null,
      valueDate: null,
      valueType: value === null ? "null" : "undefined",
      isNull: 1,
      arrayGroup,
      arrayIndex,
    }
  }

  if (typeof value === "boolean") {
    return {
      key,
      valueText: value ? "true" : "false",
      valueNum: null,
      valueBool: value ? 1 : 0,
      valueDate: null,
      valueType: "boolean",
      isNull: 0,
      arrayGroup,
      arrayIndex,
    }
  }

  if (typeof value === "number") {
    return {
      key,
      valueText: String(value),
      valueNum: value,
      valueBool: null,
      valueDate: null,
      valueType: "number",
      isNull: 0,
      arrayGroup,
      arrayIndex,
    }
  }

  if (typeof value === "string" && isIsoLikeDate(value)) {
    return {
      key,
      valueText: value,
      valueNum: null,
      valueBool: null,
      valueDate: normalizeDate(value),
      valueType: "date_string",
      isNull: 0,
      arrayGroup,
      arrayIndex,
    }
  }

  return {
    key,
    valueText: String(value),
    valueNum: null,
    valueBool: null,
    valueDate: null,
    valueType: typeof value,
    isNull: 0,
    arrayGroup,
    arrayIndex,
  }
}

async function safeStat(filePath) {
  try {
    return await fs.stat(filePath)
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return null
    throw error
  }
}

class IndexStore {
  constructor(dbPath, journalMode = "WAL") {
    this.db = new Database(dbPath)
    this.db.exec(`PRAGMA journal_mode = ${journalMode}`)
    this.db.exec("PRAGMA busy_timeout = 5000")
    this.db.exec("PRAGMA foreign_keys = ON")
    this.initSchema()

    this.upsertNoteStmt = this.db.prepare(`
      INSERT OR REPLACE INTO notes (id, path, title, folder, frontmatter_json, content_text)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    this.deletePropsStmt = this.db.prepare("DELETE FROM properties WHERE note_id = ?")
    this.deleteNoteStmt = this.db.prepare("DELETE FROM notes WHERE id = ?")
    this.insertPropStmt = this.db.prepare(`
      INSERT INTO properties (
        note_id,
        key,
        value_text,
        value_num,
        value_bool,
        value_date,
        value_type,
        is_null,
        array_group,
        array_index
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    this.listNotePathsStmt = this.db.prepare("SELECT path FROM notes")
  }

  initSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        path TEXT NOT NULL UNIQUE,
        title TEXT,
        folder TEXT,
        frontmatter_json TEXT,
        content_text TEXT
      );

      CREATE TABLE IF NOT EXISTS properties (
        note_id TEXT NOT NULL,
        key TEXT NOT NULL,
        value_text TEXT,
        value_num REAL,
        value_bool INTEGER,
        value_date TEXT,
        value_type TEXT,
        is_null INTEGER NOT NULL DEFAULT 0,
        array_group TEXT,
        array_index INTEGER,
        FOREIGN KEY(note_id) REFERENCES notes(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_notes_path ON notes(path);
      CREATE INDEX IF NOT EXISTS idx_properties_note_key ON properties(note_id, key);
      CREATE INDEX IF NOT EXISTS idx_properties_key_type_text ON properties(key, value_type, value_text);
      CREATE INDEX IF NOT EXISTS idx_properties_key_type_num ON properties(key, value_type, value_num);
      CREATE INDEX IF NOT EXISTS idx_properties_key_type_bool ON properties(key, value_type, value_bool);
      CREATE INDEX IF NOT EXISTS idx_properties_key_type_date ON properties(key, value_type, value_date);
      CREATE INDEX IF NOT EXISTS idx_properties_array_group ON properties(note_id, array_group, key);
    `)
  }

  clearAll() {
    this.db.exec("DELETE FROM properties; DELETE FROM notes;")
  }

  syncNote(note) {
    const rows = flattenFrontmatter(note.frontmatter)
    this.db.exec("BEGIN")
    try {
      this.upsertNoteStmt.run(
        note.id,
        note.path,
        note.title,
        note.folder,
        JSON.stringify(note.frontmatter),
        note.contentText,
      )
      this.deletePropsStmt.run(note.id)
      for (const row of rows) {
        this.insertPropStmt.run(
          note.id,
          row.key,
          row.valueText,
          row.valueNum,
          row.valueBool,
          row.valueDate,
          row.valueType,
          row.isNull,
          row.arrayGroup,
          row.arrayIndex,
        )
      }
      this.db.exec("COMMIT")
    } catch (error) {
      rollbackQuietly(this.db)
      throw error
    }
  }

  deleteNote(noteId) {
    this.db.exec("BEGIN")
    try {
      this.deletePropsStmt.run(noteId)
      this.deleteNoteStmt.run(noteId)
      this.db.exec("COMMIT")
    } catch (error) {
      rollbackQuietly(this.db)
      throw error
    }
  }

  listNotePaths() {
    return this.listNotePathsStmt.all().map((row) => row.path)
  }

  close() {
    this.db.close()
  }
}

function rollbackQuietly(db) {
  try {
    db.exec("ROLLBACK")
  } catch {
    // Ignore rollback failures when the transaction is already closed.
  }
}

await main()
