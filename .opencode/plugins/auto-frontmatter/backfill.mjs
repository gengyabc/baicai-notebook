import fs from "fs/promises"
import path from "path"
import { parseDocument, stringify } from "yaml"

const TARGET_ROOTS = ["resources", "Resources"]
const SYSTEM_TAG_PREFIXES = ["state/", "source/", "role/"]
const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/

const isDryRun = process.argv.includes("--dry-run")
const targets = process.argv.slice(2).filter((arg) => !arg.startsWith("--"))

await main()

async function main() {
  const roots = targets.length ? targets : TARGET_ROOTS.map((root) => path.join(process.cwd(), root))
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
    const result = await processFile(filePath)
    if (result.changed) changed += 1
    if (result.message) console.log(result.message)
  }

  console.log(`Processed ${files.length} file(s), changed ${changed}.`)
}

async function collectMarkdownFiles(dir, files) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      await collectMarkdownFiles(fullPath, files)
      continue
    }
    if (entry.isFile() && entry.name.endsWith(".md") && isTargetPath(fullPath)) {
      files.push(fullPath)
    }
  }
}

async function processFile(filePath) {
  if (!isTargetPath(filePath)) return { changed: false, message: null }

  const source = await fs.readFile(filePath, "utf8")
  const { frontmatter, body } = splitFrontmatter(source)
  const existing = parseFrontmatter(frontmatter)
  const next = buildFrontmatter(existing, body, filePath)
  const nextSource = renderDocument(next, body)

  if (source === nextSource) return { changed: false, message: null }
  if (isDryRun) return { changed: true, message: `[dry-run] ${filePath}` }

  await fs.writeFile(filePath, nextSource)
  return { changed: true, message: filePath }
}

function buildFrontmatter(existing, body, filePath) {
  const imageKey = deriveImageKey(filePath)
  const sourceRef = existing.source_ref || extractFirstUrl(body)
  const sourceType = existing.source_type || guessSourceType(sourceRef, body)
  const status = existing.status || defaultStatus(filePath)
  const description = existing.description || deriveDescription(body)
  const descriptionDone = existing.llm_description_done === true || Boolean(existing.description) || Boolean(description)
  const canonicalTopic = !existing.canonical_topic || /[^a-z0-9-]/.test(existing.canonical_topic) ? imageKey : existing.canonical_topic
  const now = today()

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
  next.llm_rename_done = existing.llm_rename_done === true
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

  for (const key of Object.keys(existing)) {
    if (key in next) continue
    next[key] = existing[key]
  }

  return next
}

function renderDocument(frontmatter, body) {
  const content = `---\n${stringify(frontmatter, { lineWidth: 0 }).trimEnd()}\n---\n\n${body.replace(/^\n+/, "")}`
  return content.replace(/\n{3,}$/u, "\n\n")
}

function splitFrontmatter(source) {
  const match = source.match(FRONTMATTER_RE)
  if (!match) return { frontmatter: "", body: source }

  return {
    frontmatter: match[1],
    body: source.slice(match[0].length),
  }
}

function parseFrontmatter(frontmatter) {
  if (!frontmatter.trim()) return {}

  const doc = parseDocument(frontmatter, { strict: false })
  const value = doc.toJS()
  return value && typeof value === "object" ? value : {}
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

function guessSourceType(sourceRef, body) {
  if (sourceRef || /https?:\/\//i.test(body) || /github\.com/i.test(body)) return "web"
  return "local"
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
  if (isUnder(filePath, "Resources") || isUnder(filePath, "resources")) return "resource"
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
  return filePath.includes(`${path.sep}${folder}${path.sep}`) || filePath.startsWith(`${folder}${path.sep}`)
}

function isTargetPath(filePath) {
  return filePath.endsWith(".md") && TARGET_ROOTS.some((root) => isUnder(filePath, root))
}

async function safeStat(filePath) {
  try {
    return await fs.stat(filePath)
  } catch {
    return null
  }
}
