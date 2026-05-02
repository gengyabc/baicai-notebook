import path from "node:path"
import fs from "node:fs"
import { createRequire } from "node:module"
import { Database } from "bun:sqlite"
import type { Plugin } from "@opencode-ai/plugin"
import { tool } from "@opencode-ai/plugin"
import { getFolderPriorities, getVaultConfig } from "../../scripts/vault-paths.mjs"
import {
  inferStructuredConstraints as inferStructuredConstraintsLogic,
  type StructuredConstraintsInput,
} from "./extraction-logic.ts"
import { buildExpandedConstraints } from "./governed-artifacts"

const require = createRequire(import.meta.url)
const frontmatterIndexConfig = require("../frontmatter-index/config.json") as {
  dbPath: string
  folderPriorities?: Record<string, number>
}

const vaultConfig = getVaultConfig()
const DEFAULT_LIMIT = 8
const MAX_LIMIT = 12

type SearchRow = {
  path: string
  title: string | null
  folder: string | null
  score: number
}

type StructuredSearchRow = {
  path: string
  title: string | null
  folder: string | null
  description: string | null
}

type StructuredConstraints = {
  tags: string[]
  hierarchicalTags: string[]
  country: string[]
  province: string[]
  city: string[]
  timeMode: "event" | "note" | null
  start: string | null
  end: string | null
}

type SearchResult = {
  mode: "structured" | "text-fallback"
  rows: (SearchRow | StructuredSearchRow)[]
  output: string
}

type CachedDatabase = {
  db: Database
  mtimeMs: number
  size: number
}

const searchDatabases = new Map<string, CachedDatabase>()

process.on("exit", () => {
  for (const cached of searchDatabases.values()) {
    try {
      cached.db.close()
    } catch {}
  }
  searchDatabases.clear()
})

function getDatabase(dbPath: string) {
  const stat = fs.statSync(dbPath)
  const cached = searchDatabases.get(dbPath)

  if (cached && cached.mtimeMs === stat.mtimeMs && cached.size === stat.size) {
    return cached.db
  }

  if (cached) {
    try {
      cached.db.close()
    } catch {}
  }

  const db = new Database(dbPath)
  searchDatabases.set(dbPath, { db, mtimeMs: stat.mtimeMs, size: stat.size })
  return db
}

function invalidateDatabase(dbPath: string) {
  const cached = searchDatabases.get(dbPath)
  if (!cached) return

  try {
    cached.db.close()
  } catch {}
  searchDatabases.delete(dbPath)
}

function clampLimit(limit?: number) {
  if (!Number.isFinite(limit)) return DEFAULT_LIMIT
  return Math.max(1, Math.min(MAX_LIMIT, Math.floor(limit as number)))
}

function escapeLikePattern(str: string) {
  return str.replace(/[%_\\]/g, "\\$&")
}

function tokenizeQuery(query: string) {
  const seen = new Set<string>()
  const tokens: string[] = []

  for (const token of query.toLowerCase().split(/[^\p{L}\p{N}_-]+/u)) {
    if (!isMeaningfulToken(token) || seen.has(token)) continue
    seen.add(token)
    tokens.push(token)
    if (tokens.length >= 6) break
  }

  return tokens
}

function isMeaningfulToken(token: string) {
  if (token.length >= 2) return true
  return /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{N}]/u.test(token)
}

function normalizeConstraintValues(values?: string[]) {
  if (!values?.length) return []

  const seen = new Set<string>()
  const normalized: string[] = []
  for (const value of values) {
    const trimmed = value.trim()
    if (!trimmed || seen.has(trimmed)) continue
    seen.add(trimmed)
    normalized.push(trimmed)
  }
  return normalized
}

function normalizeStructuredConstraints(constraints?: StructuredConstraintsInput) {
  if (!constraints) return null

  const normalized: StructuredConstraints = {
    tags: normalizeConstraintValues(constraints.tags),
    hierarchicalTags: normalizeConstraintValues(constraints.hierarchicalTags),
    country: normalizeConstraintValues(constraints.country),
    province: normalizeConstraintValues(constraints.province),
    city: normalizeConstraintValues(constraints.city),
    timeMode: constraints.timeMode === "event" || constraints.timeMode === "note" ? constraints.timeMode : null,
    start: constraints.start?.trim() || null,
    end: constraints.end?.trim() || null,
  }

  const hasTimeWindow = Boolean(normalized.start && normalized.end && normalized.timeMode)
  const hasConstraints =
    normalized.tags.length > 0 ||
    normalized.hierarchicalTags.length > 0 ||
    normalized.country.length > 0 ||
    normalized.province.length > 0 ||
    normalized.city.length > 0 ||
    hasTimeWindow

  if (!hasConstraints) return null
  return normalized
}

function folderPriorityExpr(priorities: Record<string, number>) {
  const clauses: string[] = []
  const params: Array<string | number> = []
  const sorted = Object.entries(priorities).sort((a, b) => b[1] - a[1])

  for (const [folder, score] of sorted) {
    if (!Number.isFinite(score)) continue
    clauses.push(`WHEN n.path LIKE ? ESCAPE '\\' OR n.path = ? THEN ${score}`)
    params.push(`${escapeLikePattern(folder)}/%`, folder)
  }

  clauses.push("ELSE 0")
  return { sql: `CASE ${clauses.join("\n      ")} END`, params }
}

function buildInClause(values: string[]) {
  return values.map(() => "?").join(", ")
}

function buildStructuredSearchQuery(limit: number, constraints: StructuredConstraints, priorities: Record<string, number>) {
  const whereClauses: string[] = []
  const params: Array<string | number> = []

  if (constraints.tags.length > 0 || constraints.hierarchicalTags.length > 0) {
    const tagClauses: string[] = []
    const tagParams: string[] = []

    if (constraints.tags.length > 0) {
      tagClauses.push(`pt.value_text IN (${buildInClause(constraints.tags)})`)
      tagParams.push(...constraints.tags)
    }

    for (const tag of constraints.hierarchicalTags) {
      tagClauses.push("(pt.value_text = ? OR pt.value_text LIKE ? ESCAPE '\\')")
      tagParams.push(tag, `${escapeLikePattern(tag)}/%`)
    }

    whereClauses.push(`EXISTS (
      SELECT 1 FROM properties pt
      WHERE pt.note_id = n.id AND pt.key = 'tags' AND (${tagClauses.join(" OR ")})
    )`)
    params.push(...tagParams)
  }

  for (const [key, values] of [
    ["country", constraints.country],
    ["province", constraints.province],
    ["city", constraints.city],
  ] as const) {
    if (values.length === 0) continue
    whereClauses.push(`EXISTS (
      SELECT 1 FROM properties p_${key}
      WHERE p_${key}.note_id = n.id AND p_${key}.key = '${key}' AND p_${key}.value_text IN (${buildInClause(values)})
    )`)
    params.push(...values)
  }

  if (constraints.timeMode === "event" && constraints.start && constraints.end) {
    whereClauses.push("EXISTS (SELECT 1 FROM properties ps WHERE ps.note_id = n.id AND ps.key = 'start_date' AND ps.value_date <= ?)")
    whereClauses.push("EXISTS (SELECT 1 FROM properties pe WHERE pe.note_id = n.id AND pe.key = 'end_date' AND pe.value_date >= ?)")
    params.push(constraints.end, constraints.start)
  }

  if (constraints.timeMode === "note" && constraints.start && constraints.end) {
    whereClauses.push("EXISTS (SELECT 1 FROM properties pn WHERE pn.note_id = n.id AND pn.key IN ('created', 'updated') AND pn.value_date BETWEEN ? AND ?)")
    params.push(constraints.start, constraints.end)
  }

  const priorityExpr = folderPriorityExpr(priorities)
  const whereSql = whereClauses.length > 0 ? whereClauses.join("\n      AND ") : "1=1"

  const sql = `
    SELECT n.path, n.title, n.folder, d.value_text AS description, ${priorityExpr.sql} AS folder_score
    FROM notes n
    LEFT JOIN properties d ON d.note_id = n.id AND d.key = 'description'
    WHERE ${whereSql}
    ORDER BY folder_score DESC, n.path ASC
    LIMIT ?
  `

  return { sql, params: [...priorityExpr.params, ...params, limit] }
}

function buildSearchQuery(queryText: string, tokens: string[], limit: number, priorities: Record<string, number>) {
  const queryLower = queryText.toLowerCase()
  const queryLike = `%${queryLower}%`

  const priorityExpr = folderPriorityExpr(priorities)
  const scoreParts = [
    priorityExpr.sql,
    "CASE WHEN lower(n.title) = ? THEN 150 ELSE 0 END",
    "CASE WHEN lower(n.path) = ? THEN 130 ELSE 0 END",
    "CASE WHEN lower(n.title) LIKE ? THEN 90 ELSE 0 END",
    "CASE WHEN lower(n.path) LIKE ? THEN 70 ELSE 0 END",
    "COALESCE((SELECT SUM(CASE WHEN lower(p.key) = ? THEN 3 ELSE 0 END + CASE WHEN lower(p.key) LIKE ? THEN 2 ELSE 0 END + CASE WHEN lower(COALESCE(p.value_text, '')) LIKE ? THEN 1 ELSE 0 END) FROM properties p WHERE p.note_id = n.id), 0) * 14",
  ]
  const scoreParams: Array<string | number> = [
    ...priorityExpr.params,
    queryLower,
    queryLower,
    queryLike,
    queryLike,
    queryLower,
    queryLike,
    queryLike,
  ]

  for (const token of tokens) {
    scoreParts.push("CASE WHEN lower(n.title) LIKE ? THEN 25 ELSE 0 END")
    scoreParams.push(`%${token}%`)
    scoreParts.push("CASE WHEN lower(n.path) LIKE ? THEN 15 ELSE 0 END")
    scoreParams.push(`%${token}%`)
  }

  const whereParts = [
    "lower(n.title) = ?",
    "lower(n.path) = ?",
    "lower(n.title) LIKE ?",
    "lower(n.path) LIKE ?",
    "EXISTS (SELECT 1 FROM properties p WHERE p.note_id = n.id AND (lower(p.key) LIKE ? ESCAPE '\\' OR lower(COALESCE(p.value_text, '')) LIKE ? ESCAPE '\\'))",
  ]
  const whereParams: Array<string | number> = [queryLower, queryLower, queryLike, queryLike, queryLike, queryLike]

  for (const token of tokens) {
    whereParts.push("lower(n.title) LIKE ?")
    whereParams.push(`%${token}%`)
    whereParts.push("lower(n.path) LIKE ?")
    whereParams.push(`%${token}%`)
  }

  const sql = `
    SELECT n.path, n.title, n.folder, ${scoreParts.join(" + ")} AS score
    FROM notes n
    WHERE ${whereParts.join(" OR ")}
    ORDER BY score DESC, n.path ASC
    LIMIT ?
  `

  return { sql, params: [...scoreParams, ...whereParams, limit] }
}

function formatConstraints(constraints: StructuredConstraints) {
  const parts: string[] = []
  if (constraints.tags.length > 0) parts.push(`tags=${constraints.tags.join(",")}`)
  if (constraints.hierarchicalTags.length > 0) parts.push(`hTags=${constraints.hierarchicalTags.join(",")}`)
  if (constraints.country.length > 0) parts.push(`country=${constraints.country.join(",")}`)
  if (constraints.province.length > 0) parts.push(`province=${constraints.province.join(",")}`)
  if (constraints.city.length > 0) parts.push(`city=${constraints.city.join(",")}`)
  if (constraints.timeMode && constraints.start && constraints.end) {
    parts.push(`time(${constraints.timeMode})=${constraints.start}..${constraints.end}`)
  }
  return parts.join(" ")
}

function formatStructuredResults(query: string, rows: StructuredSearchRow[], constraints: StructuredConstraints) {
  if (!rows.length) {
    return [`No structured matches for \`${query}\`. Constraints: ${formatConstraints(constraints)}`, "Read these files first. If they are insufficient, say so before broadening retrieval."].join("\n")
  }

  const lines = [
    `Structured shortlist for \`${query}\` [${formatConstraints(constraints)}]:`,
    ...rows.map((row, index) => {
      const title = row.title?.trim() || path.posix.basename(row.path, ".md")
      const description = row.description?.trim()
      return `${index + 1}. ${row.path} | ${title}${description ? ` | ${description}` : ""}`
    }),
    "Read these files first. If they are insufficient, say so before broadening retrieval.",
  ]
  return lines.join("\n")
}

function formatResults(query: string, rows: SearchRow[]) {
  if (!rows.length) {
    return `No matches for \`${query}\`. State the shortlist was insufficient before broadening.`
  }

  const lines = [
    `Shortlist for \`${query}\`:`,
    ...rows.map((row, index) => {
      const title = row.title?.trim() || path.posix.basename(row.path, ".md")
      return `${index + 1}. ${row.path} | ${title} | score ${row.score}`
    }),
    "Read these files first. If they are insufficient, say so before broadening retrieval.",
  ]
  return lines.join("\n")
}

function runTextFallbackSearch(
  dbPath: string,
  normalizedQuery: string,
  query: string,
  effectiveLimit: number,
  effectivePriorities: Record<string, number>
): SearchResult {
  const tokens = tokenizeQuery(normalizedQuery)
  const effectiveTokens = tokens.length ? tokens : [normalizedQuery]
  const { sql, params } = buildSearchQuery(normalizedQuery, effectiveTokens, effectiveLimit, effectivePriorities)

  let db = getDatabase(dbPath)
  try {
    const rows = db.query(sql).all(...params) as SearchRow[]
    return { mode: "text-fallback", rows, output: formatResults(query, rows) }
  } catch (err) {
    invalidateDatabase(dbPath)
    db = getDatabase(dbPath)
    const rows = db.query(sql).all(...params) as SearchRow[]
    return { mode: "text-fallback", rows, output: formatResults(query, rows) }
  }
}

export function searchIndex(
  dbPath: string,
  query: string,
  limit?: number,
  priorities?: Record<string, number>,
  constraints?: StructuredConstraintsInput
): SearchResult {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) {
    return { mode: "text-fallback", rows: [] as SearchRow[], output: "No query provided." }
  }

  const effectiveLimit = clampLimit(limit)
  const effectivePriorities = priorities || frontmatterIndexConfig.folderPriorities || getFolderPriorities()
  const extracted = constraints
    ? { constraints, reasons: [] as string[], unresolvedHints: [] as string[] }
    : inferStructuredConstraintsLogic(query)
  const normalizedConstraints = normalizeStructuredConstraints(extracted.constraints || undefined)

  if (!normalizedConstraints) {
    const fallback = runTextFallbackSearch(dbPath, normalizedQuery, query, effectiveLimit, effectivePriorities)
    return { ...fallback, output: `No structured constraints extracted.\n${fallback.output}` }
  }

  const { sql, params } = buildStructuredSearchQuery(effectiveLimit, normalizedConstraints, effectivePriorities)
  let db = getDatabase(dbPath)

  let primaryRows: StructuredSearchRow[] = []
  try {
    primaryRows = db.query(sql).all(...params) as StructuredSearchRow[]
  } catch (err) {
    invalidateDatabase(dbPath)
    db = getDatabase(dbPath)
    primaryRows = db.query(sql).all(...params) as StructuredSearchRow[]
  }

  if (primaryRows.length >= 3) {
    return { mode: "structured", rows: primaryRows, output: formatStructuredResults(query, primaryRows, normalizedConstraints) }
  }

  const expansionResult = buildExpandedConstraints(normalizedConstraints.tags, primaryRows.length)
  if (expansionResult.expansionTriggerReason) {
    const expandedConstraints: StructuredConstraints = { ...normalizedConstraints, tags: expansionResult.expandedTags }
    const { sql: expSql, params: expParams } = buildStructuredSearchQuery(effectiveLimit, expandedConstraints, effectivePriorities)

    let expansionRows: StructuredSearchRow[] = []
    try {
      expansionRows = db.query(expSql).all(...expParams) as StructuredSearchRow[]
    } catch (err) {
      invalidateDatabase(dbPath)
      db = getDatabase(dbPath)
      expansionRows = db.query(expSql).all(...expParams) as StructuredSearchRow[]
    }

    if (expansionRows.length > 0) {
      return { mode: "structured", rows: expansionRows, output: formatStructuredResults(query, expansionRows, expandedConstraints) }
    }
  }

  if (primaryRows.length > 0) {
    return { mode: "structured", rows: primaryRows, output: formatStructuredResults(query, primaryRows, normalizedConstraints) }
  }

  const fallback = runTextFallbackSearch(dbPath, normalizedQuery, query, effectiveLimit, effectivePriorities)
  return {
    ...fallback,
    output: `Structured shortlist insufficient for \`${query}\`. Constraints: ${formatConstraints(normalizedConstraints)}\n${fallback.output}`,
  }
}

function buildSystemInstruction() {
  const folders = vaultConfig.folders
  const vaultRoot = vaultConfig.vaultRoot
  return [
    "Vault retrieval routing is enabled. Call `vault_index_search` first for vault-grounded questions.",
    "Read shortlisted files before citing them. Index hits are not confirmed facts until the source file is read.",
    `If you broaden beyond the shortlist, say so explicitly. Folder priority: ${vaultRoot}/${folders.wiki} -> ${vaultRoot}/${folders.output} -> ${vaultRoot}/${folders.resources} -> ${vaultRoot}/${folders.brainstorm} -> ${vaultRoot}/${folders.myWork}.`,
    "In non-debug sessions, ask before using web search.",
  ].join("\n")
}

export const VaultQueryRouter: Plugin = async ({ worktree }) => {
  const dbPath = path.resolve(worktree, frontmatterIndexConfig.dbPath)

  return {
    "experimental.chat.system.transform": async (input, output) => {
      if (!input.sessionID) return
      output.system.push(buildSystemInstruction())
    },

    tool: {
      vault_index_search: tool({
        description: "Query the vault SQLite index first and return a ranked shortlist of candidate notes to read.",
        args: {
          query: tool.schema.string().min(1),
          limit: tool.schema.number().int().min(1).max(MAX_LIMIT).optional(),
          folders: tool.schema.array(tool.schema.string()).optional(),
          constraints: tool.schema.object({
            tags: tool.schema.array(tool.schema.string()).optional(),
            hierarchicalTags: tool.schema.array(tool.schema.string()).optional(),
            country: tool.schema.array(tool.schema.string()).optional(),
            province: tool.schema.array(tool.schema.string()).optional(),
            city: tool.schema.array(tool.schema.string()).optional(),
            timeMode: tool.schema.string().optional(),
            start: tool.schema.string().optional(),
            end: tool.schema.string().optional(),
          }).optional(),
        },
        async execute(args) {
          try {
            const result = searchIndex(
              dbPath,
              args.query,
              args.limit,
              frontmatterIndexConfig.folderPriorities,
              args.constraints
            )
            return result.output
          } catch (err) {
            return `Vault index search failed: ${err instanceof Error ? err.message : String(err)}. The SQLite shortlist was unavailable.`
          }
        },
      }),
    },
  }
}

export default VaultQueryRouter
