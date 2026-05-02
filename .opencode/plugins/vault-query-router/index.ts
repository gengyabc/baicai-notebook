import path from "node:path"
import fs from "node:fs"
import { createRequire } from "node:module"
import { Database } from "bun:sqlite"
import type { Plugin } from "@opencode-ai/plugin"
import { tool } from "@opencode-ai/plugin"
import {
  createOpencodeClient as createOpencodeV2Client,
  type PermissionRuleset,
} from "@opencode-ai/sdk/v2/client"
import { getDefaultFoldersWithRoot, getFolderPriorities, getVaultConfig } from "../../scripts/vault-paths.mjs"
import {
  matchesAlias,
  inferTimeRangeFromQuery,
  inferStructuredConstraints as inferStructuredConstraintsLogic,
  formatDiagnosticOutput,
  formatStructuredQueryTrace,
  type StructuredConstraintsInput,
  type ExtractedConstraints,
} from "./extraction-logic.ts"
import {
  buildExpandedConstraints,
} from "./governed-artifacts"

const require = createRequire(import.meta.url)
const frontmatterIndexConfig = require("../frontmatter-index/config.json") as {
  dbPath: string
  folderPriorities?: Record<string, number>
}

const vaultConfig = getVaultConfig()
const DEFAULT_LIMIT = 8
const MAX_LIMIT = 12
const DEFAULT_FOLDERS = getDefaultFoldersWithRoot()
const SESSION_CLEANUP_INTERVAL_MS = 60 * 1000
const DEBUG_PERMISSION_PROFILE_PATH = "opencode.debug.json"
const DEBUG_PLUGIN_EDIT_PATTERN = ".opencode/plugins/**"
const DEBUG_PROTECTED_EDIT_PATTERNS = [
  ".opencode/plugin-allowlist.json",
  "opencode.json",
  "opencode.debug.json",
]

type SessionState = {
  debug: boolean
  pendingDebugCommand: boolean
  debugPermissionOverrideApplied: boolean
  lastAccess?: number
}

type SearchRow = {
  path: string
  title: string | null
  folder: string | null
  score: number
  exactTitle: number
  exactPath: number
  exactPropertyKey: number
  titleMatch: number
  pathMatch: number
  propertyMatch: number
  matchedPropertyKeys: string | null
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

const sessions = new Map<string, SessionState>()
const SESSION_TTL_MS = 60 * 60 * 1000
const MAX_SESSIONS = 128
type CachedDatabase = {
  db: Database
  mtimeMs: number
  size: number
}

const searchDatabases = new Map<string, CachedDatabase>()
let lastSessionCleanupAt = 0

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
  searchDatabases.set(dbPath, {
    db,
    mtimeMs: stat.mtimeMs,
    size: stat.size,
  })

  return db
}

function cleanupStaleSessions() {
  const now = Date.now()
  if (now - lastSessionCleanupAt < SESSION_CLEANUP_INTERVAL_MS && sessions.size <= MAX_SESSIONS) {
    return
  }

  lastSessionCleanupAt = now
  const stale: string[] = []

  for (const [id, state] of sessions) {
    if (state.lastAccess && now - state.lastAccess > SESSION_TTL_MS) {
      stale.push(id)
    }
  }
  for (const id of stale) sessions.delete(id)

  if (sessions.size > MAX_SESSIONS) {
    const entries = Array.from(sessions.entries())
      .sort((a, b) => (a[1].lastAccess || 0) - (b[1].lastAccess || 0))
    const toRemove = entries.slice(0, sessions.size - MAX_SESSIONS)
    for (const [id] of toRemove) sessions.delete(id)
  }
}

function getSessionState(sessionID: string) {
  cleanupStaleSessions()

  const existing = sessions.get(sessionID)
  if (existing) {
    existing.lastAccess = Date.now()
    return existing
  }

  const state: SessionState = {
    debug: false,
    pendingDebugCommand: false,
    debugPermissionOverrideApplied: false,
    lastAccess: Date.now(),
  }
  sessions.set(sessionID, state)
  return state
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function buildDebugSessionPermissionRules(worktree: string): PermissionRuleset | null {
  const profilePath = path.resolve(worktree, DEBUG_PERMISSION_PROFILE_PATH)

  try {
    const raw = JSON.parse(fs.readFileSync(profilePath, "utf8")) as unknown
    if (!isRecord(raw) || !isRecord(raw.permission) || !isRecord(raw.permission.edit)) {
      return null
    }

    const edit = raw.permission.edit
    if (edit[DEBUG_PLUGIN_EDIT_PATTERN] === "deny") {
      return null
    }

    for (const pattern of DEBUG_PROTECTED_EDIT_PATTERNS) {
      if (edit[pattern] !== "deny") {
        return null
      }
    }

    return [
      {
        permission: "edit",
        pattern: DEBUG_PLUGIN_EDIT_PATTERN,
        action: "allow",
      },
      ...DEBUG_PROTECTED_EDIT_PATTERNS.map((pattern) => ({
        permission: "edit",
        pattern,
        action: "deny" as const,
      })),
    ]
  } catch {
    return null
  }
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

function clampLimit(limit?: number) {
  if (!Number.isFinite(limit)) return DEFAULT_LIMIT
  return Math.max(1, Math.min(MAX_LIMIT, Math.floor(limit as number)))
}

function isMeaningfulToken(token: string) {
  if (token.length >= 2) return true

  return /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{N}]/u.test(token)
}

function normalizeFolders(folders?: string[]) {
  if (!folders?.length) return DEFAULT_FOLDERS

  const normalized = folders
    .map((folder) => folder.trim().replace(/^\/+|\/+$/g, ""))
    .filter(Boolean)

  return normalized.length ? normalized : DEFAULT_FOLDERS
}

function escapeLikePattern(str: string) {
  return str.replace(/[%_\\]/g, "\\$&")
}

function escapeLikeValue(str: string) {
  return `%${escapeLikePattern(str)}%`
}

function escapePrefixValue(str: string) {
  return `${escapeLikePattern(str)}/%`
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

function invalidateDatabase(dbPath: string) {
  const cached = searchDatabases.get(dbPath)
  if (!cached) return

  try {
    cached.db.close()
  } catch {}

  searchDatabases.delete(dbPath)
}

function normalizeStructuredConstraints(constraints?: StructuredConstraintsInput) {
  if (!constraints) return null

  const normalized: StructuredConstraints = {
    tags: normalizeConstraintValues(constraints.tags),
    hierarchicalTags: normalizeConstraintValues(constraints.hierarchicalTags),
    country: normalizeConstraintValues(constraints.country),
    province: normalizeConstraintValues(constraints.province),
    city: normalizeConstraintValues(constraints.city),
    timeMode: constraints.timeMode === "event" || constraints.timeMode === "note"
      ? constraints.timeMode
      : null,
    start: normalizeOptionalString(constraints.start),
    end: normalizeOptionalString(constraints.end),
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

function normalizeOptionalString(value?: string) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function inferStructuredConstraints(query: string): ExtractedConstraints {
  return inferStructuredConstraintsLogic(query)
}

function buildInClause(values: string[]) {
  return values.map(() => "?").join(", ")
}

function buildStructuredSearchQuery(
  folders: string[],
  limit: number,
  constraints: StructuredConstraints,
  priorities: Record<string, number>
) {
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
      tagParams.push(tag, escapePrefixValue(tag))
    }

    whereClauses.push(`EXISTS (
      SELECT 1
      FROM properties pt
      WHERE pt.note_id = n.id
        AND pt.key = 'tags'
        AND (${tagClauses.join(" OR ")})
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
      SELECT 1
      FROM properties p_${key}
      WHERE p_${key}.note_id = n.id
        AND p_${key}.key = '${key}'
        AND p_${key}.value_text IN (${buildInClause(values)})
    )`)
    params.push(...values)
  }

  if (constraints.timeMode === "event" && constraints.start && constraints.end) {
    whereClauses.push(`EXISTS (
      SELECT 1
      FROM properties ps
      WHERE ps.note_id = n.id
        AND ps.key = 'start_date'
        AND ps.value_date <= ?
    )`)
    whereClauses.push(`EXISTS (
      SELECT 1
      FROM properties pe
      WHERE pe.note_id = n.id
        AND pe.key = 'end_date'
        AND pe.value_date >= ?
    )`)
    params.push(constraints.end, constraints.start)
  }

  if (constraints.timeMode === "note" && constraints.start && constraints.end) {
    whereClauses.push(`EXISTS (
      SELECT 1
      FROM properties pn
      WHERE pn.note_id = n.id
        AND pn.key IN ('created', 'updated')
        AND pn.value_date BETWEEN ? AND ?
    )`)
    params.push(constraints.start, constraints.end)
  }

  const priorityExpr = folderPriorityExpr(priorities)
  const whereSql = whereClauses.length > 0
    ? whereClauses.join("\n      AND ")
    : "1=1"
  const sql = `
    SELECT
      n.path,
      n.title,
      n.folder,
      d.value_text AS description,
      ${priorityExpr.sql} AS folder_score
    FROM notes n
    LEFT JOIN properties d ON d.note_id = n.id AND d.key = 'description'
    WHERE ${whereSql}
    ORDER BY folder_score DESC, n.path ASC
    LIMIT ?
  `

  return { sql, params: [...priorityExpr.params, ...params, limit] }
}

function buildSearchQuery(
  queryText: string,
  tokens: string[],
  folders: string[],
  limit: number,
  priorities: Record<string, number>
) {
  const queryLike = `%${queryText}%`

  const tokenClauses: string[] = []
  const tokenClauseParams: Array<string | number> = []
  for (const token of tokens) {
    tokenClauses.push("lower(n.title) LIKE ?")
    tokenClauseParams.push(`%${token}%`)
    tokenClauses.push("lower(n.path) LIKE ?")
    tokenClauseParams.push(`%${token}%`)
  }

  const baseMatchClauses = [
    "lower(n.title) = ?",
    "lower(n.path) = ?",
    "lower(n.title) LIKE ?",
    "lower(n.path) LIKE ?",
    "COALESCE(ph.exact_property_key, 0) = 1",
    "COALESCE(ph.property_match, 0) = 1",
    "COALESCE(ph.property_score, 0) > 0",
  ]
  const baseMatchParams: Array<string | number> = [
    queryText,
    queryText,
    queryLike,
    queryLike,
  ]

  const priorityExpr = folderPriorityExpr(priorities)
  const scoreParts = [
    priorityExpr.sql,
    "CASE WHEN lower(n.title) = ? THEN 150 ELSE 0 END",
    "CASE WHEN lower(n.path) = ? THEN 130 ELSE 0 END",
    "CASE WHEN lower(n.title) LIKE ? THEN 90 ELSE 0 END",
    "CASE WHEN lower(n.path) LIKE ? THEN 70 ELSE 0 END",
    "COALESCE(n.exact_property_key, 0) * 65",
    "COALESCE(n.property_score, 0) * 14",
  ]
  const scoreParams: Array<string | number> = [
    ...priorityExpr.params,
    queryText,
    queryText,
    queryLike,
    queryLike,
  ]

  for (const token of tokens) {
    scoreParts.push("CASE WHEN lower(n.title) LIKE ? THEN 25 ELSE 0 END")
    scoreParams.push(`%${token}%`)
    scoreParts.push("CASE WHEN lower(n.path) LIKE ? THEN 15 ELSE 0 END")
    scoreParams.push(`%${token}%`)
  }

  const reasonParams: Array<string | number> = [
    queryText,
    queryText,
    queryLike,
    queryLike,
  ]

  const propertyFilterClauses = [
    "lower(p.key) = ?",
    "lower(p.key) LIKE ?",
    "lower(COALESCE(p.value_text, '')) LIKE ?",
  ]
  const propertyFilterParams: Array<string | number> = [
    queryText,
    queryLike,
    queryLike,
  ]

  const propertyScoreParts = [
    "CASE WHEN lower(p.key) = ? THEN 3 ELSE 0 END",
    "CASE WHEN lower(p.key) LIKE ? THEN 2 ELSE 0 END",
    "CASE WHEN lower(COALESCE(p.value_text, '')) LIKE ? THEN 1 ELSE 0 END",
  ]
  const propertyScoreParams: Array<string | number> = [
    queryText,
    queryLike,
    queryLike,
  ]

  for (const token of tokens) {
    propertyFilterClauses.push("lower(p.key) LIKE ?")
    propertyFilterParams.push(`%${token}%`)
    propertyFilterClauses.push("lower(COALESCE(p.value_text, '')) LIKE ?")
    propertyFilterParams.push(`%${token}%`)

    propertyScoreParts.push("CASE WHEN lower(p.key) LIKE ? THEN 1 ELSE 0 END")
    propertyScoreParams.push(`%${token}%`)
    propertyScoreParts.push("CASE WHEN lower(COALESCE(p.value_text, '')) LIKE ? THEN 1 ELSE 0 END")
    propertyScoreParams.push(`%${token}%`)
  }

  const sql = `
    WITH property_hits AS (
      SELECT
        p.note_id,
        MAX(CASE WHEN lower(p.key) = ? THEN 1 ELSE 0 END) AS exact_property_key,
        1 AS property_match,
        SUM(${propertyScoreParts.join(" + ")}) AS property_score,
        GROUP_CONCAT(DISTINCT p.key) AS matched_property_keys
      FROM properties p
      WHERE (${propertyFilterClauses.join(" OR ")})
      GROUP BY p.note_id
    ),
    candidates AS (
      SELECT n.id, n.path, n.title, n.folder,
        ph.exact_property_key, ph.property_match, ph.property_score, ph.matched_property_keys
      FROM notes n
      LEFT JOIN property_hits ph ON ph.note_id = n.id
      WHERE (${[...baseMatchClauses, ...tokenClauses].join(" OR ")})
    )
    SELECT
      n.path,
      n.title,
      n.folder,
      ${scoreParts.join(" + ")} AS score,
      CASE WHEN lower(n.title) = ? THEN 1 ELSE 0 END AS exactTitle,
      CASE WHEN lower(n.path) = ? THEN 1 ELSE 0 END AS exactPath,
      COALESCE(n.exact_property_key, 0) AS exactPropertyKey,
      CASE WHEN lower(n.title) LIKE ? THEN 1 ELSE 0 END AS titleMatch,
      CASE WHEN lower(n.path) LIKE ? THEN 1 ELSE 0 END AS pathMatch,
      COALESCE(n.property_match, 0) AS propertyMatch,
      n.matched_property_keys AS matchedPropertyKeys
    FROM candidates n
    ORDER BY score DESC, n.path ASC
    LIMIT ?
  `

  const finalParams: Array<string | number> = [
    queryText,
    ...propertyScoreParams,
    ...propertyFilterParams,
    ...baseMatchParams,
    ...tokenClauseParams,
    ...scoreParams,
    ...reasonParams,
    limit,
  ]

  return { sql, finalParams }
}

function formatStructuredConstraints(constraints: StructuredConstraints) {
  const parts: string[] = []
  if (constraints.tags.length > 0) parts.push(`tags=${constraints.tags.join(", ")}`)
  if (constraints.hierarchicalTags.length > 0) {
    parts.push(`hierarchicalTags=${constraints.hierarchicalTags.join(", ")}`)
  }
  if (constraints.country.length > 0) parts.push(`country=${constraints.country.join(", ")}`)
  if (constraints.province.length > 0) parts.push(`province=${constraints.province.join(", ")}`)
  if (constraints.city.length > 0) parts.push(`city=${constraints.city.join(", ")}`)
  if (constraints.timeMode && constraints.start && constraints.end) {
    parts.push(`time(${constraints.timeMode})=${constraints.start}..${constraints.end}`)
  }
  return parts.join("; ")
}

function formatStructuredResults(
  query: string,
  rows: StructuredSearchRow[],
  constraints: StructuredConstraints,
  reasons: string[] = [],
  unresolvedHints: string[] = []
) {
  const queryTrace = formatStructuredQueryTrace(
    query,
    constraints,
    reasons,
    unresolvedHints,
    "primary structured pass"
  )
  const diagnosticLines = formatDiagnosticOutput(query, reasons, unresolvedHints, true)

  if (!rows.length) {
    return [
      queryTrace,
      `Structured SQLite shortlist for \`${query}\` found no matches.`,
      `Applied constraints: ${formatStructuredConstraints(constraints)}`,
      diagnosticLines,
      "The assistant may broaden retrieval, but should first say the structured SQLite shortlist was insufficient.",
    ].join("\n")
  }

  const lines = [
    queryTrace,
    `Structured SQLite shortlist for \`${query}\`:`,
    `Applied constraints: ${formatStructuredConstraints(constraints)}`,
    diagnosticLines,
    ...rows.map((row, index) => {
      const title = row.title?.trim() || path.posix.basename(row.path, ".md")
      const folder = row.folder || "(root)"
      const description = row.description?.trim() || "(no description)"
      return `${index + 1}. ${row.path} | ${title} | ${folder} | ${description}`
    }),
    "Read these files first. If they are insufficient, say so explicitly before reading beyond the shortlist.",
  ]

  return lines.join("\n")
}

function runTextFallbackSearch(
  dbPath: string,
  normalizedQuery: string,
  query: string,
  effectiveFolders: string[],
  effectiveLimit: number,
  effectivePriorities: Record<string, number>
): SearchResult {
  const tokens = tokenizeQuery(normalizedQuery)
  const effectiveTokens = tokens.length ? tokens : [normalizedQuery]
  const { sql, finalParams } = buildSearchQuery(
    normalizedQuery,
    effectiveTokens,
    effectiveFolders,
    effectiveLimit,
    effectivePriorities
  )

  let db = getDatabase(dbPath)

  try {
    const rows = db.query(sql).all(...finalParams) as SearchRow[]
    return {
      mode: "text-fallback" as const,
      rows,
      output: formatResults(query, rows),
    }
  } catch {
    invalidateDatabase(dbPath)
    db = getDatabase(dbPath)
    const rows = db.query(sql).all(...finalParams) as SearchRow[]
    return {
      mode: "text-fallback" as const,
      rows,
      output: formatResults(query, rows),
    }
  }
}

function buildMatchReason(row: SearchRow) {
  if (row.exactTitle) return "exact title match"
  if (row.exactPath) return "exact path match"
  if (row.exactPropertyKey) {
    return row.matchedPropertyKeys ? `exact property key match: ${row.matchedPropertyKeys}` : "exact property key match"
  }
  if (row.titleMatch) return "title match"
  if (row.pathMatch) return "path match"
  if (row.propertyMatch) {
    return row.matchedPropertyKeys ? `property match: ${row.matchedPropertyKeys}` : "property match"
  }
  return "ranked folder match"
}

function formatResults(query: string, rows: SearchRow[]) {
  if (!rows.length) {
    return `No indexed vault notes matched \`${query}\`. The assistant may broaden retrieval if needed, but should first say the SQLite shortlist was insufficient.`
  }

  const lines = [
    `SQLite shortlist for \`${query}\`:`,
    ...rows.map((row, index) => {
      const title = row.title?.trim() || path.posix.basename(row.path, ".md")
      const folder = row.folder || "(root)"
      return `${index + 1}. ${row.path} | ${title} | ${folder} | ${buildMatchReason(row)} | score ${row.score}`
    }),
    "Read these files first. If they are insufficient, say so explicitly before reading beyond the shortlist.",
  ]

  return lines.join("\n")
}

export function searchIndex(
  dbPath: string,
  query: string,
  limit?: number,
  folders?: string[],
  priorities?: Record<string, number>,
  constraints?: StructuredConstraintsInput
): SearchResult {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) {
    return {
      mode: "text-fallback" as const,
      rows: [] as SearchRow[],
      output: "No query provided to vault_index_search.",
    }
  }

  const effectiveFolders = normalizeFolders(folders)
  const effectiveLimit = clampLimit(limit)
  const effectivePriorities = priorities || getFolderPriorities()
  const extracted = constraints
    ? { constraints, reasons: [] as string[], unresolvedHints: [] as string[] }
    : inferStructuredConstraints(query)
  const normalizedConstraints = normalizeStructuredConstraints(extracted.constraints || undefined)
  if (!normalizedConstraints) {
    const fallback = runTextFallbackSearch(
      dbPath,
      normalizedQuery,
      query,
      effectiveFolders,
      effectiveLimit,
      effectivePriorities
    )
    const diagnosticOutput = formatDiagnosticOutput(query, extracted.reasons, extracted.unresolvedHints, false)
    return {
      ...fallback,
      output: [
        formatStructuredQueryTrace(query, null, extracted.reasons, extracted.unresolvedHints, "text fallback"),
        "No structured constraints were provided or extracted, so this used the text fallback instead of the structured SQLite shortlist.",
        diagnosticOutput,
        fallback.output,
      ].join("\n"),
    }
  }

  const { sql, params } = buildStructuredSearchQuery(effectiveFolders, effectiveLimit, normalizedConstraints, effectivePriorities)
  let db = getDatabase(dbPath)

  let primaryRows: StructuredSearchRow[] = []
  try {
    primaryRows = db.query(sql).all(...params) as StructuredSearchRow[]
  } catch {
    invalidateDatabase(dbPath)
    db = getDatabase(dbPath)
    primaryRows = db.query(sql).all(...params) as StructuredSearchRow[]
  }

  if (primaryRows.length >= 3) {
    return {
      mode: "structured" as const,
      rows: primaryRows,
      output: formatStructuredResults(query, primaryRows, normalizedConstraints, extracted.reasons, extracted.unresolvedHints),
    }
  }

  const expansionResult = buildExpandedConstraints(normalizedConstraints.tags, primaryRows.length)
  let expansionRows: StructuredSearchRow[] = []

  if (expansionResult.expansionTriggerReason) {
    const expandedConstraints: StructuredConstraints = {
      ...normalizedConstraints,
      tags: expansionResult.expandedTags,
    }
    const { sql: expSql, params: expParams } = buildStructuredSearchQuery(effectiveFolders, effectiveLimit, expandedConstraints, effectivePriorities)

    try {
      expansionRows = db.query(expSql).all(...expParams) as StructuredSearchRow[]
    } catch {
      invalidateDatabase(dbPath)
      db = getDatabase(dbPath)
      expansionRows = db.query(expSql).all(...expParams) as StructuredSearchRow[]
    }

    if (expansionRows.length > 0) {
      return {
        mode: "structured" as const,
        rows: expansionRows,
        output: formatStructuredResults(query, expansionRows, expandedConstraints, extracted.reasons, extracted.unresolvedHints),
      }
    }
  }

  if (primaryRows.length > 0) {
    return {
      mode: "structured" as const,
      rows: primaryRows,
      output: formatStructuredResults(query, primaryRows, normalizedConstraints, extracted.reasons, extracted.unresolvedHints),
    }
  }

  const fallback = runTextFallbackSearch(
    dbPath,
    normalizedQuery,
    query,
    effectiveFolders,
    effectiveLimit,
    effectivePriorities
  )
  const diagnosticOutput = formatDiagnosticOutput(query, extracted.reasons, extracted.unresolvedHints, true)
  return {
    ...fallback,
    output: [
      formatStructuredQueryTrace(
        query,
        normalizedConstraints,
        extracted.reasons,
        extracted.unresolvedHints,
        "primary structured pass and bounded expansion pass if needed"
      ),
      `Structured SQLite shortlist was insufficient for \`${query}\`.`,
      `Applied constraints: ${formatStructuredConstraints(normalizedConstraints)}`,
      diagnosticOutput,
      "Retrieval was broadened to the text fallback; answer confidence may be reduced.",
      fallback.output,
    ].join("\n"),
  }
}

function buildSystemInstruction() {
  const folders = vaultConfig.folders
  const vaultRoot = vaultConfig.vaultRoot
  return [
    "Vault retrieval routing is enabled for this session.",
    "For vault-grounded questions, call `vault_index_search` first before reading vault files or writing ad hoc SQLite.",
    "Before the tool call, normalize the request into an explicit structured query summary, state that summary in commentary, and pass only the normalized constraints to the wrapper.",
    "Do not collapse or omit the structured query summary or SQLite process trace when answering; preserve the visible intermediate retrieval trace before any paraphrase.",
    "Treat `.opencode/docs/sqlite-retrieval-contract.md` as the canonical schema and wrapper contract for `.opencode/frontmatter-index.sqlite`.",
    `Read the shortlisted files first and preserve folder priority: ${vaultRoot}/${folders.wiki} -> ${vaultRoot}/${folders.output} -> ${vaultRoot}/${folders.resources} -> ${vaultRoot}/${folders.brainstorm} -> ${vaultRoot}/${folders.myWork}.`,
    "Soft fallback is allowed only when the SQLite shortlist is empty or clearly insufficient. If you broaden retrieval, say that explicitly before reading outside the shortlist.",
    "In non-debug sessions, do not use web search without user permission.",
    "Keep file-backed facts, index-only hits, external results, and hypotheses clearly separated.",
    "When answering from the vault, include confidence and provenance.",
  ].join("\n")
}

export const VaultQueryRouter: Plugin = async ({ worktree, client, serverUrl }) => {
  const dbPath = path.resolve(worktree, frontmatterIndexConfig.dbPath)
  const sessionClient = createOpencodeV2Client({
    baseUrl: serverUrl.toString(),
    directory: worktree,
    throwOnError: true,
  })

  async function applyDebugPermissionOverride(sessionID: string) {
    const permission = buildDebugSessionPermissionRules(worktree)
    if (!permission) {
      await client.app.log({
        body: {
          service: "vault-query-router",
          level: "warn",
          message: "debug permission override skipped; profile validation failed",
          extra: {
            sessionID,
            profilePath: DEBUG_PERMISSION_PROFILE_PATH,
          },
        },
      })
      await client.tui.showToast({
        body: {
          variant: "warning",
          message: "Debug mode active, but plugin-edit override was not applied. Using normal permissions.",
          duration: 5000,
        },
      })
      return false
    }

    try {
      await sessionClient.session.update({
        sessionID,
        permission,
      })

      await client.app.log({
        body: {
          service: "vault-query-router",
          level: "info",
          message: "debug permission override applied to session",
          extra: {
            sessionID,
            permission,
          },
        },
      })
      await client.tui.showToast({
        body: {
          variant: "info",
          message: "Debug plugin-edit override active for this session.",
          duration: 3500,
        },
      })
      return true
    } catch (error) {
      await client.app.log({
        body: {
          service: "vault-query-router",
          level: "warn",
          message: "debug permission override skipped; session patch failed",
          extra: {
            sessionID,
            error: error instanceof Error ? error.message : String(error),
          },
        },
      })
      await client.tui.showToast({
        body: {
          variant: "warning",
          message: "Debug mode active, but plugin-edit override could not be applied. Using normal permissions.",
          duration: 5000,
        },
      })
      return false
    }
  }

  return {
    event: async ({ event }) => {
      if (event.type === "command.executed") {
        const sessionID = event.properties.sessionID
        if (!sessionID) return

        const state = getSessionState(sessionID)
        if (event.properties.name === "debug") {
          state.debug = true
          state.pendingDebugCommand = false
          if (!state.debugPermissionOverrideApplied) {
            state.debugPermissionOverrideApplied = await applyDebugPermissionOverride(sessionID)
          }
          return
        }

        state.pendingDebugCommand = false
        return
      }

      if (event.type === "session.idle" || event.type === "session.deleted") {
        const sessionID = "sessionID" in event.properties
          ? event.properties.sessionID
          : event.properties.info.id
        if (sessionID) sessions.delete(sessionID)
      }
    },

    "command.execute.before": async (input) => {
      const state = getSessionState(input.sessionID)
      state.pendingDebugCommand = input.command === "debug"
    },

    "experimental.chat.system.transform": async (input, output) => {
      if (!input.sessionID) return

      const state = getSessionState(input.sessionID)
      if (state.debug || state.pendingDebugCommand) return

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
        async execute(args, context) {
          try {
            const result = searchIndex(
              dbPath,
              args.query,
              args.limit,
              args.folders,
              frontmatterIndexConfig.folderPriorities,
              args.constraints
            )
            context.metadata({
              title: "Vault index shortlist",
              metadata: {
                query: args.query,
                mode: result.mode,
                resultCount: result.rows.length,
                paths: result.rows.map((row) => row.path),
              },
            })
            return result.output
          } catch (error) {
            await client.app.log({
              body: {
                service: "vault-query-router",
                level: "warn",
                message: "vault_index_search failed",
                extra: {
                  query: args.query,
                  error: error instanceof Error ? error.message : String(error),
                },
              },
            })

            return "Vault index search failed. State that the SQLite shortlist was unavailable before broadening retrieval."
          }
        },
      }),
    },
  }
}

export default VaultQueryRouter
