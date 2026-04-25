import fs from "fs/promises"
import path from "path"
import { stringify } from "yaml"
import { computeHash } from "./hash.mjs"
import { splitFrontmatter, parseFrontmatter } from "./utils.mjs"
import { createRequire } from "module"
import { getVaultRootPath, getManagedPaths, getVaultConfig } from "../../scripts/vault-paths.mjs"

const require = createRequire(import.meta.url)
const config = require("./config.json")
const VAULT_ROOT = getVaultRootPath()

const TARGET_PATHS = getManagedPaths()
const RESOURCE_BUCKETS = ["inbox", "web", "local", "archive"]
const SYSTEM_TAG_PREFIXES = ["state/", "source/", "role/"]
const RESOLVED_EXCLUDE_DIRS = config.excludeDirs.map((dir) => path.resolve(VAULT_ROOT, dir))
const EXCLUDE_PATTERNS = config.excludePatterns
const vaultConfig = getVaultConfig()

export async function backfillFile(filePath) {
  if (!filePath.endsWith(".md")) {
    return { changed: false, message: null, skipped: true }
  }
  
  if (!isTargetPath(filePath)) {
    return { changed: false, message: null, skipped: true }
  }

  await ensureManagedBuckets(filePath)
  
  const source = await fs.readFile(filePath, "utf8")
  const { frontmatter, body } = splitFrontmatter(source)
  const existing = parseFrontmatter(frontmatter)
  const next = buildFrontmatter(existing, body, filePath)
  const nextSource = renderDocument(next, body)

  if (source === nextSource) return { changed: false, message: null }

  await atomicWrite(filePath, nextSource)
  return { changed: true, message: filePath }
}

export async function main() {
  await cleanupOrphanedTempFiles()
  
  const isDryRun = process.argv.includes("--dry-run")
  const targets = process.argv.slice(2).filter((arg) => !arg.startsWith("--"))
  const requestedRoots = targets.length ? targets : TARGET_PATHS.map((targetPath) => path.join(VAULT_ROOT, targetPath))
  const roots = await resolveUniquePaths(requestedRoots)
  const files = []

  for (const root of roots) {
    const stat = await safeStat(root)
    if (!stat) continue
    if (stat.isFile()) {
      if (root.endsWith(".md")) files.push(root)
      continue
    }

    if (stat.isDirectory()) {
      await collectMarkdownFiles(root, files)
    }
  }

  let changed = 0
  for (const filePath of files) {
    const result = await processFile(filePath, isDryRun)
    if (result.changed) changed += 1
    if (result.message) console.log(result.message)
  }

  console.log(`Processed ${files.length} file(s), changed ${changed}.`)
}

async function collectMarkdownFiles(dir, files) {
  if (isExcluded(dir)) return

  const entries = await fs.readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (isExcluded(fullPath)) continue
      await collectMarkdownFiles(fullPath, files)
      continue
    }
    if (entry.isFile() && entry.name.endsWith(".md") && isTargetPath(fullPath) && !isExcluded(fullPath)) {
      files.push(fullPath)
    }
  }
}

async function processFile(filePath, isDryRun = false) {
  if (!isTargetPath(filePath)) return { changed: false, message: null }

  const source = await fs.readFile(filePath, "utf8")
  const { frontmatter, body } = splitFrontmatter(source)
  const existing = parseFrontmatter(frontmatter)
  const next = buildFrontmatter(existing, body, filePath)
  const nextSource = renderDocument(next, body)

  if (source === nextSource) return { changed: false, message: null }
  if (isDryRun) return { changed: true, message: `[dry-run] ${filePath}` }

  await atomicWrite(filePath, nextSource)
  return { changed: true, message: filePath }
}

function buildFrontmatter(existing, body, filePath) {
  const imageKey = deriveImageKey(filePath)
  const sourceRef = existing.source_ref || extractFirstUrl(body)
  const sourceType = existing.source_type || guessSourceType(sourceRef, body, filePath)
  const status = existing.status || defaultStatus(filePath)
  const description = existing.description || deriveDescription(body)
  const descriptionDone = existing.llm_description_done === true || isDescriptionWhitelisted(filePath, sourceRef)
  const canonicalTopic = !existing.canonical_topic || /[^a-z0-9-]/.test(existing.canonical_topic) ? imageKey : existing.canonical_topic
  const now = today()
  const sourceHash = computeHash(body)
  const sourcePath = deriveSourcePath(filePath)

  const next = {}
  next.type = existing.type || defaultType(filePath)
  next.kind = existing.kind || defaultKind(filePath)
  next.source_type = sourceType
  next.content_role = existing.content_role || defaultContentRole(filePath)
  next.created = existing.created || now
  next.updated = now
  next.image_key = imageKey
  next.description = description
  next.llm_description_done = descriptionDone
  next.status = status
  next.trust_level = existing.trust_level || defaultTrustLevel(filePath)
  next.verification = existing.verification || defaultVerification(filePath)
  next.llm_stage = existing.llm_stage || defaultLlmStage(filePath)
  next.canonical_topic = existing.canonical_topic || canonicalTopic
  if (sourceRef) next.source_ref = sourceRef
  next.derived_from = Array.isArray(existing.derived_from) ? existing.derived_from : []
  next.entity_refs = Array.isArray(existing.entity_refs) ? existing.entity_refs : []
  next.topic_refs = Array.isArray(existing.topic_refs) ? existing.topic_refs : []
  next.tags = mergeTags(existing.tags, sourceType, status, next.content_role)

  if (!existing.ingest_status) {
    next.ingest_status = "pending"
  } else {
    next.ingest_status = existing.ingest_status
  }

  next.normalized_at = !existing.normalized_at || existing.source_hash !== sourceHash
    ? now
    : existing.normalized_at
  next.source_hash = sourceHash

  next.source_path = shouldRefreshSourcePath(existing.source_path, sourcePath)
    ? sourcePath
    : existing.source_path

  for (const key of Object.keys(existing)) {
    if (key in next) continue
    if (key === "llm_rename_done") continue
    next[key] = existing[key]
  }

  return next
}

function deriveSourcePath(filePath) {
  const parts = filePath.split(path.sep)
  const vaultRootFolder = vaultConfig.vaultRoot
  
  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i]
    for (const [key, folderName] of Object.entries(vaultConfig.folders)) {
      if (part === folderName) {
        return deriveContainerPath(parts, i)
      }
    }
  }
  
  return "unknown"
}

function deriveContainerPath(parts, rootIndex) {
  const root = parts[rootIndex]
  const child = parts[rootIndex + 1]

  if (!child || child.endsWith(".md")) return root
  return `${root}/${child}`
}

function shouldRefreshSourcePath(existingSourcePath, derivedSourcePath) {
  if (!existingSourcePath || existingSourcePath === "unknown") return true
  if (existingSourcePath.includes(".md")) return true

  return existingSourcePath !== derivedSourcePath
}

function guessSourceType(sourceRef, body, filePath) {
  const folders = vaultConfig.folders
  if (isUnder(filePath, folders.wiki)) return "generated"
  if (isUnder(filePath, folders.output)) return "manual"
  if (isUnder(filePath, folders.myWork)) return "manual"
  if (isUnder(filePath, folders.brainstorm)) return "manual"
  if (sourceRef || /https?:\/\//i.test(body) || /github\.com/i.test(body)) return "web"
  return "local"
}

function renderDocument(frontmatter, body) {
  const content = `---\n${stringify(frontmatter, { lineWidth: 0 }).trimEnd()}\n---\n\n${body.replace(/^\n+/, "")}`
  return content.replace(/\n{3,}$/u, "\n\n")
}

async function atomicWrite(filePath, content) {
  const tempPath = path.join(
    path.dirname(filePath),
    `.frontmatter-${process.pid}-${Date.now()}-${computeHash(filePath)}.tmp`
  )
  try {
    await fs.writeFile(tempPath, content, "utf8")
    await fs.rename(tempPath, filePath)
  } catch (err) {
    try {
      await fs.unlink(tempPath).catch(() => {})
    } catch {}
    throw err
  }
}

async function cleanupOrphanedTempFiles() {
  const roots = await resolveUniquePaths(TARGET_PATHS.map((targetPath) => path.join(VAULT_ROOT, targetPath)))
  for (const root of roots) {
    try {
      const stat = await safeStat(root)
      if (!stat || !stat.isDirectory()) continue
      await cleanupTempFilesInDir(root)
    } catch {}
  }
}

async function ensureManagedBuckets(filePath) {
  const root = getResourceRoot(filePath)
  if (!root) return

  await Promise.all(RESOURCE_BUCKETS.map((bucket) => fs.mkdir(path.join(root, bucket), { recursive: true })))
}

function getResourceRoot(filePath) {
  const parts = filePath.split(path.sep)
  const resourcesFolder = vaultConfig.folders.resources
  const index = parts.findIndex((part) => part === resourcesFolder)
  if (index === -1) return null
  return parts.slice(0, index + 1).join(path.sep)
}

async function cleanupTempFilesInDir(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      await cleanupTempFilesInDir(fullPath)
    } else if (entry.name.startsWith(".frontmatter-") && entry.name.endsWith(".tmp")) {
      try {
        const stat = await fs.stat(fullPath)
        const ageMs = Date.now() - stat.mtimeMs
        if (ageMs > 60000) {
          await fs.unlink(fullPath)
          console.log(`[cleanup] Removed orphaned temp file: ${fullPath}`)
        }
      } catch {}
    }
  }
}

function mergeTags(tags, sourceType, status, contentRole) {
  const preserved = []
  const topics = []

  for (const tag of Array.isArray(tags) ? tags : []) {
    if (SYSTEM_TAG_PREFIXES.some((prefix) => tag.startsWith(prefix))) continue
    if (tag.startsWith("topic/")) {
      if (topics.length < 2 && !topics.includes(tag)) topics.push(tag)
      continue
    }
    if (!preserved.includes(tag)) preserved.push(tag)
  }

  const required = [stateTag(status), `source/${sourceType}`, roleTag(contentRole)]
  return [...preserved, ...topics, ...required]
}

function stateTag(status) {
  if (status === "active") return "state/active"
  if (status === "draft") return "state/draft"
  if (status === "reviewed") return "state/reviewed"
  if (status === "archived") return "state/archived"
  return "state/inbox"
}

function roleTag(contentRole) {
  if (contentRole === "index") return "role/index"
  if (contentRole === "log") return "role/log"
  if (contentRole === "synthesis") return "role/synthesis"
  if (contentRole === "draft") return "role/draft"
  return "role/raw"
}

function deriveImageKey(filePath) {
  return path
    .basename(filePath, path.extname(filePath))
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function extractFirstUrl(body) {
  const markdownUrl = body.match(/\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/i)
  if (markdownUrl) return markdownUrl[1]

  const rawUrl = body.match(/https?:\/\/[^\s)]+/i)
  return rawUrl ? rawUrl[0] : ""
}

function deriveDescription(body) {
  const paragraphs = body
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((part) => cleanupMarkdown(part))
    .filter(Boolean)

  for (const paragraph of paragraphs) {
    if (paragraph.length >= 24) return paragraph.slice(0, 160).replace(/\s+\S*$/, "")
  }

  return "Resource note."
}

function cleanupMarkdown(text) {
  return text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/[`*_>#]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function defaultType(filePath) {
  const folders = vaultConfig.folders
  if (isUnder(filePath, folders.resources)) return "resource"
  if (isUnder(filePath, folders.brainstorm)) return "brainstorm"
  if (isUnder(filePath, folders.wiki)) return "wiki"
  if (isUnder(filePath, folders.output)) return "output"
  if (isUnder(filePath, folders.myWork)) return "my-work"
  return "resource"
}

function defaultKind(filePath) {
  if (path.basename(filePath) === "index.md") return "index"
  return "note"
}

function defaultContentRole(filePath) {
  if (path.basename(filePath) === "index.md") return "index"
  return "raw"
}

function defaultStatus(filePath) {
  if (path.basename(filePath) === "index.md") return "active"
  return "inbox"
}

function defaultTrustLevel(filePath) {
  if (path.basename(filePath) === "index.md") return "verified"
  return "raw"
}

function defaultVerification(filePath) {
  if (path.basename(filePath) === "index.md") return "verified"
  return "unverified"
}

function defaultLlmStage(filePath) {
  if (path.basename(filePath) === "index.md") return "integrated"
  return "unprocessed"
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function isUnder(filePath, folder) {
  const parts = filePath.split(path.sep)
  const folderIndex = parts.indexOf(folder)
  return folderIndex !== -1 && folderIndex < parts.length - 1
}

function isDescriptionWhitelisted(filePath, sourceRef) {
  const basename = path.basename(filePath)
  if (basename === "index.md" || basename === "log.md") return true
  
  if (sourceRef && sourceRef.includes("github.com")) return true
  
  return false
}

function isTargetPath(filePath) {
  if (!filePath.endsWith(".md")) return false

  const relativePath = path.relative(VAULT_ROOT, filePath)
  if (relativePath.startsWith("..")) return false

  const normalized = relativePath.split(path.sep).join("/")
  return TARGET_PATHS.some((targetPath) => normalized === targetPath || normalized.startsWith(`${targetPath}/`))
}

function isExcluded(filePath) {
  if (RESOLVED_EXCLUDE_DIRS.some((excludeDir) => filePath.startsWith(excludeDir))) return true

  for (const pattern of EXCLUDE_PATTERNS) {
    try {
      if (new RegExp(pattern).test(filePath)) return true
    } catch {}
  }

  return false
}

async function safeStat(filePath) {
  try {
    return await fs.stat(filePath)
  } catch {
    return null
  }
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

if (import.meta.url === `file://${process.argv[1]}`) {
  await main()
}
