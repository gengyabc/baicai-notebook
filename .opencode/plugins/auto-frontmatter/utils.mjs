import { parseDocument } from "yaml"

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/

export function splitFrontmatter(source) {
  const match = source.match(FRONTMATTER_RE)
  if (!match) return { frontmatter: "", body: source }
  return {
    frontmatter: match[1],
    body: source.slice(match[0].length)
  }
}

export function parseFrontmatter(frontmatter) {
  if (!frontmatter.trim()) return {}
  const doc = parseDocument(frontmatter, { strict: false })
  const value = doc.toJS()
  return value && typeof value === "object" ? value : {}
}

export function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}