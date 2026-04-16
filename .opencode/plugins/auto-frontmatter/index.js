import fs from "fs/promises"
import path from "path"
import { parseDocument, stringify } from "yaml"

const TARGET_ROOTS = ["resources", "Resources", "brainstorm", "wiki", "output", "my-work", "My-work"]
const RESOURCE_BUCKETS = ["inbox", "web", "local", "archive"]
const SYSTEM_TAG_PREFIXES = ["state/", "source/", "role/"]
const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/

export const AutoFrontmatter = async () => ({
  event: async ({ event }) => {
    const filePath = getFilePath(event)
    if (!filePath || !shouldHandle(filePath)) return

    try {
      await ensureManagedBuckets(filePath)
      await updateFrontmatter(filePath, event)
    } catch (error) {
      console.error(`[auto-frontmatter] ${filePath}:`, error)
    }
  },
})

export default AutoFrontmatter

function getFilePath(event) {
  return event?.file || event?.filePath || event?.path || event?.args?.filePath || null
}

function shouldHandle(filePath) {
  return filePath.endsWith(".md") && TARGET_ROOTS.some((root) => filePath.includes(`${path.sep}${root}${path.sep}`) || filePath.startsWith(`${root}${path.sep}`) || filePath === `${root}.md`)
}

async function ensureManagedBuckets(filePath) {
  const root = getRootFolder(filePath)
  if (!root) return

  await Promise.all(RESOURCE_BUCKETS.map((bucket) => fs.mkdir(path.join(root, bucket), { recursive: true })))
}

function getRootFolder(filePath) {
  const parts = filePath.split(path.sep)
  const index = parts.findIndex((part) => part === "resources" || part === "Resources")
  if (index === -1) return null
  return parts.slice(0, index + 1).join(path.sep)
}

async function updateFrontmatter(filePath, event) {
  const source = await fs.readFile(filePath, "utf8")
  const { frontmatter, body } = splitFrontmatter(source)
  const existing = parseFrontmatter(frontmatter)
  const next = buildFrontmatter(existing, body, filePath, event)
  const nextSource = `---\n${stringify(next, { lineWidth: 0 }).trimEnd()}\n---\n\n${body.replace(/^\n+/, "")}`.replace(/\n{3,}$/u, "\n\n")

  if (source === nextSource) return
  await fs.writeFile(filePath, nextSource)
}

function splitFrontmatter(source) {
  const match = source.match(FRONTMATTER_RE)
  if (!match) return { frontmatter: "", body: source, hadFrontmatter: false }

  return {
    frontmatter: match[1],
    body: source.slice(match[0].length),
    hadFrontmatter: true,
  }
}

function parseFrontmatter(frontmatter) {
  if (!frontmatter.trim()) return {}

  const doc = parseDocument(frontmatter, { strict: false })
  const value = doc.toJS()
  return value && typeof value === "object" ? value : {}
}

function buildFrontmatter(existing, body, filePath, event) {
  const imageKey = deriveImageKey(filePath)
  const sourceRef = existing.source_ref || extractFirstUrl(body)
  const sourceType = existing.source_type || guessSourceType(sourceRef, body)
  const status = existing.status || defaultStatus(filePath)
  const description = existing.description || deriveDescription(body)
  const descriptionDone = existing.llm_description_done === true || isDescriptionWhitelisted(filePath, sourceRef)
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
    if (key === "llm_rename_done") continue
    next[key] = existing[key]
  }

  return next
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
  if (isUnder(filePath, "wiki")) return "wiki"
  if (isUnder(filePath, "output")) return "output"
  if (isUnder(filePath, "brainstorm")) return "brainstorm"
  if (isUnder(filePath, "my-work") || isUnder(filePath, "My-work")) return "my-work"
  return "resource"
}

function defaultKind(filePath) {
  if (filePath.endsWith(path.sep + "index.md") || path.basename(filePath) === "index.md") return "index"
  if (filePath.endsWith(path.sep + "log.md") || path.basename(filePath) === "log.md") return "log"
  if (isUnder(filePath, "output")) return "deliverable"
  return "note"
}

function defaultContentRole(filePath) {
  if (path.basename(filePath) === "index.md") return "index"
  if (path.basename(filePath) === "log.md") return "log"
  if (isUnder(filePath, "wiki")) return "synthesis"
  if (isUnder(filePath, "output")) return "draft"
  if (isUnder(filePath, "brainstorm")) return "draft"
  return "raw"
}

function defaultStatus(filePath) {
  if (path.basename(filePath) === "index.md" || path.basename(filePath) === "log.md") return "active"
  if (isUnder(filePath, "output")) return "draft"
  if (isUnder(filePath, "brainstorm")) return "active"
  if (isUnder(filePath, "my-work") || isUnder(filePath, "My-work")) return "active"
  return "inbox"
}

function defaultTrustLevel(filePath) {
  if (path.basename(filePath) === "index.md" || path.basename(filePath) === "log.md") return "verified"
  if (isUnder(filePath, "wiki")) return "synthesized"
  if (isUnder(filePath, "output")) return "synthesized"
  return "raw"
}

function defaultVerification(filePath) {
  if (path.basename(filePath) === "index.md" || path.basename(filePath) === "log.md") return "verified"
  return "unverified"
}

function defaultLlmStage(filePath) {
  if (path.basename(filePath) === "index.md" || path.basename(filePath) === "log.md") return "integrated"
  if (isUnder(filePath, "wiki")) return "linked"
  return "unprocessed"
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function isUnder(filePath, folder) {
  return filePath.includes(`${path.sep}${folder}${path.sep}`) || filePath.startsWith(`${folder}${path.sep}`)
}

function isDescriptionWhitelisted(filePath, sourceRef) {
  const basename = path.basename(filePath)
  if (basename === "index.md" || basename === "log.md") return true
  
  if (sourceRef && sourceRef.includes("github.com")) return true
  
  return false
}
