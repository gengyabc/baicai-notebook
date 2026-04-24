import fs from "fs/promises"
import path from "path"
import chokidar from "chokidar"
import { waitForStableFile } from "./stable-check.mjs"
import { backfillFile } from "./backfill.mjs"
import { computeHash } from "./hash.mjs"

import { createRequire } from "module"
const require = createRequire(import.meta.url)
const config = require("./config.json")

const VAULT_ROOT = path.resolve(import.meta.dirname, "../../..")
const RESOLVED_EXCLUDE_DIRS = config.excludeDirs.map((dir) => path.join(VAULT_ROOT, dir))
const EXCLUDE_PATTERNS = config.excludePatterns

const processedMap = new Map()
const pendingQueue = new Map()
let debounceTimer = null
let cleanupInterval = null
let watcher = null

await main()

async function main() {
  const args = process.argv.slice(2)
  
  if (args.includes("--scan")) {
    await runScanMode()
    return
  }
  
  if (args.includes("--single")) {
    const filePath = args[args.indexOf("--single") + 1]
    if (!filePath) {
      console.error("Error: --single requires a file path")
      process.exit(1)
    }
    await processSingleFile(path.resolve(filePath))
    return
  }
  
  await runWatchMode()
}

async function runWatchMode() {
  const watchDirs = await resolveUniquePaths(config.watchDirs.map((dir) => path.join(VAULT_ROOT, dir)))
  console.log(`[watch] Starting file watcher`)
  console.log(`[watch] Watching: ${watchDirs.join(", ")}`)
  console.log(`[watch] Vault root: ${VAULT_ROOT}`)
  console.log(`[watch] Use /process-pending in OpenCode for LLM title/description generation`)
  
  cleanupInterval = setInterval(cleanupProcessedMap, config.antiLoopWindowMs || 10000)
  
  watcher = chokidar.watch(watchDirs, {
    ignored: createIgnorePatterns(),
    persistent: true,
    ignoreInitial: false,
    awaitWriteFinish: false
  })
  
  watcher
    .on("add", (filePath) => {
      if (!filePath.endsWith(".md")) return
      scheduleProcess(filePath)
    })
    .on("change", (filePath) => {
      if (!filePath.endsWith(".md")) return
      scheduleProcess(filePath)
    })
    .on("error", (error) => console.error(`[watch] Error: ${error.message}`))
    .on("ready", () => console.log(`[watch] Ready, watching for changes`))
  
  process.on("SIGINT", shutdown)
  process.on("SIGTERM", shutdown)
}

function shutdown() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval)
    cleanupInterval = null
  }
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
  if (watcher) {
    watcher.close()
    watcher = null
  }
  console.log(`[watch] Shutdown complete`)
  setTimeout(() => process.exit(0), 100)
}

async function runScanMode() {
  console.log(`[scan] Scanning target directories`)
  const watchDirs = await resolveUniquePaths(config.watchDirs.map((dir) => path.join(VAULT_ROOT, dir)))
  
  const files = []
  for (const dir of watchDirs) {
    await collectMarkdownFiles(dir, files)
  }
  
  let processed = 0
  let changed = 0
  let errors = 0
  
  for (const filePath of files) {
    const result = await processSingleFile(filePath)
    processed += 1
    if (result.changed) changed += 1
    if (result.error) errors += 1
  }
  
  console.log(`[scan] Complete: ${processed} files, ${changed} changed, ${errors} errors`)
}

async function collectMarkdownFiles(dir, files) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (!isExcluded(fullPath)) {
          await collectMarkdownFiles(fullPath, files)
        }
      } else if (entry.isFile() && entry.name.endsWith(".md") && !isExcluded(fullPath)) {
        files.push(fullPath)
      }
    }
  } catch (err) {
    if (err.code !== "ENOENT") {
      console.error(`[scan] Error reading ${dir}: ${err.message}`)
    }
  }
}

function scheduleProcess(filePath) {
  pendingQueue.set(filePath, Date.now())
  
  if (debounceTimer) clearTimeout(debounceTimer)
  
  debounceTimer = setTimeout(async () => {
    debounceTimer = null
    const entries = Array.from(pendingQueue.entries())
    pendingQueue.clear()
    
    for (const [fp, timestamp] of entries) {
      if (Date.now() - timestamp >= config.debounceMs) {
        try {
          await processWithStability(fp)
        } catch (err) {
          console.error(`[watch] Error processing ${fp}: ${err.message}`)
        }
      }
    }
  }, config.debounceMs)
}

async function processWithStability(filePath) {
  const stable = await waitForStableFile(filePath, {
    pollInterval: config.pollIntervalMs,
    settleTime: config.settleTimeMs,
    maxWait: config.maxWaitMs
  })
  
  if (!stable) {
    console.log(`[watch] File not stable: ${filePath}`)
    return
  }
  
  await processSingleFile(filePath)
}

async function processSingleFile(filePath) {
  try {
    const source = await fs.readFile(filePath, "utf8")
    const hash = computeHash(source)
    
    if (!shouldProcess(filePath, hash)) {
      return { changed: false, skipped: true }
    }
    
    const result = await backfillFile(filePath)
    
    if (result.changed) {
      console.log(`[backfill] ${filePath}`)
    }
    
    return result
  } catch (err) {
    console.error(`[error] ${filePath}: ${err.message}`)
    return { changed: false, error: err.message }
  }
}

function shouldProcess(filePath, hash) {
  const existing = processedMap.get(filePath)
  
  if (existing && existing.hash === hash) {
    const age = Date.now() - existing.timestamp
    if (age < config.antiLoopWindowMs) {
      return false
    }
  }
  
  processedMap.set(filePath, { hash, timestamp: Date.now() })
  return true
}

function cleanupProcessedMap() {
  const now = Date.now()
  const maxAge = config.antiLoopWindowMs || 10000
  for (const [key, value] of processedMap) {
    if (now - value.timestamp > maxAge) {
      processedMap.delete(key)
    }
  }
}

function createIgnorePatterns() {
  return (filePath) => {
    for (const excludeDir of RESOLVED_EXCLUDE_DIRS) {
      if (filePath.startsWith(excludeDir) || filePath.includes(path.sep + excludeDir + path.sep)) {
        return true
      }
    }
    
    for (const pattern of EXCLUDE_PATTERNS) {
      try {
        const regex = new RegExp(pattern)
        if (regex.test(filePath)) {
          return true
        }
      } catch (err) {
        console.error(`[watch] Invalid pattern "${pattern}": ${err.message}`)
      }
    }
    
    return false
  }
}

function isExcluded(filePath) {
  for (const excludeDir of RESOLVED_EXCLUDE_DIRS) {
    if (filePath.startsWith(excludeDir) || filePath.includes(path.sep + path.basename(excludeDir) + path.sep)) {
      return true
    }
  }
  
  for (const pattern of EXCLUDE_PATTERNS) {
    try {
      const regex = new RegExp(pattern)
      if (regex.test(filePath)) {
        return true
      }
    } catch (err) {
      console.error(`[scan] Invalid pattern "${pattern}": ${err.message}`)
    }
  }
  
  return false
}

async function resolveUniquePaths(paths) {
  const uniquePaths = []
  const seen = new Set()

  for (const candidate of paths) {
    const key = await pathIdentity(candidate)
    if (seen.has(key)) continue

    seen.add(key)
    uniquePaths.push(candidate)
  }

  return uniquePaths
}

async function pathIdentity(filePath) {
  try {
    return (await fs.realpath(filePath)).toLowerCase()
  } catch {
    return path.resolve(filePath).toLowerCase()
  }
}
