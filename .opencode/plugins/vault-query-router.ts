import path from "node:path"
import fs from "node:fs"
import { createRequire } from "node:module"
import { DatabaseSync } from "node:sqlite"
import type { Plugin } from "@opencode-ai/plugin"
import { tool } from "@opencode-ai/plugin"
import { getDefaultFoldersWithRoot, getFolderPriorities, getVaultConfig } from "../scripts/vault-paths.mjs"

const require = createRequire(import.meta.url)
const frontmatterIndexConfig = require("./frontmatter-index/config.json") as {
  dbPath: string
  folderPriorities?: Record<string, number>
}

const vaultConfig = getVaultConfig()
const DEFAULT_LIMIT = 8
const MAX_LIMIT = 12
const DEFAULT_FOLDERS = getDefaultFoldersWithRoot()
const SESSION_CLEANUP_INTERVAL_MS = 60 * 1000

type SessionState = {
  debug: boolean
  pendingDebugCommand: boolean
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

const sessions = new Map<string, SessionState>()
const SESSION_TTL_MS = 60 * 60 * 1000
const MAX_SESSIONS = 128
type CachedDatabase = {
  db: DatabaseSync
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

  const db = new DatabaseSync(dbPath)
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
    lastAccess: Date.now(),
  }
  sessions.set(sessionID, state)
  return state
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

function folderPriorityExpr(priorities: Record<string, number>) {
  const clauses: string[] = []
  const sorted = Object.entries(priorities).sort((a, b) => b[1] - a[1])
  for (const [folder, score] of sorted) {
    const escaped = escapeLikePattern(folder)
    clauses.push(`WHEN n.path LIKE '${escaped}/%' ESCAPE '\\' OR n.path = '${escaped}' THEN ${score}`)
  }
  clauses.push("ELSE 0")
  return `CASE ${clauses.join("\n      ")} END`
}

function buildSearchQuery(
  queryText: string,
  tokens: string[],
  folders: string[],
  limit: number,
  priorities: Record<string, number>
) {
  const folderParams: Array<string | number> = []
  const queryLike = `%${queryText}%`

  const folderClauses = folders.map(() => "(n.path LIKE ? ESCAPE '\\' OR n.path = ?)")
  for (const folder of folders) {
    folderParams.push(`${escapeLikePattern(folder)}/%`, folder)
  }

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

  const scoreParts = [
    folderPriorityExpr(priorities),
    "CASE WHEN lower(n.title) = ? THEN 150 ELSE 0 END",
    "CASE WHEN lower(n.path) = ? THEN 130 ELSE 0 END",
    "CASE WHEN lower(n.title) LIKE ? THEN 90 ELSE 0 END",
    "CASE WHEN lower(n.path) LIKE ? THEN 70 ELSE 0 END",
    "COALESCE(n.exact_property_key, 0) * 65",
    "COALESCE(n.property_score, 0) * 14",
  ]
  const scoreParams: Array<string | number> = [
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
      WHERE (${folderClauses.join(" OR ")})
        AND (${[...baseMatchClauses, ...tokenClauses].join(" OR ")})
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
    ...folderParams,
    ...baseMatchParams,
    ...tokenClauseParams,
    ...scoreParams,
    ...reasonParams,
    limit,
  ]

  return { sql, finalParams }
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

function searchIndex(
  dbPath: string,
  query: string,
  limit?: number,
  folders?: string[],
  priorities?: Record<string, number>
) {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) {
    return {
      rows: [] as SearchRow[],
      output: "No query provided to vault_index_search.",
    }
  }

  const tokens = tokenizeQuery(normalizedQuery)
  const effectiveTokens = tokens.length ? tokens : [normalizedQuery]
  const effectiveFolders = normalizeFolders(folders)
  const effectiveLimit = clampLimit(limit)
  const effectivePriorities = priorities || getFolderPriorities()
  const { sql, finalParams } = buildSearchQuery(
    normalizedQuery,
    effectiveTokens,
    effectiveFolders,
    effectiveLimit,
    effectivePriorities
  )

  const db = getDatabase(dbPath)

  const rows = db.query(sql).all(...finalParams) as SearchRow[]
  return {
    rows,
    output: formatResults(query, rows),
  }
}

function buildSystemInstruction() {
  const folders = vaultConfig.folders
  const vaultRoot = vaultConfig.vaultRoot
  return [
    "Vault retrieval routing is enabled for this session.",
    "For vault-grounded questions, call `vault_index_search` first before reading vault files.",
    `Read the shortlisted files first and preserve folder priority: ${vaultRoot}/${folders.wiki} -> ${vaultRoot}/${folders.output} -> ${vaultRoot}/${folders.resources} -> ${vaultRoot}/${folders.brainstorm} -> ${vaultRoot}/${folders.myWork}.`,
    "Soft fallback is allowed only when the SQLite shortlist is empty or clearly insufficient. If you broaden retrieval, say that explicitly before reading outside the shortlist.",
    "When answering from the vault, include confidence and provenance.",
  ].join("\n")
}

export const VaultQueryRouter: Plugin = async ({ worktree, client }) => {
  const dbPath = path.resolve(worktree, frontmatterIndexConfig.dbPath)

  return {
    event: async ({ event }) => {
      if (event.type === "command.executed") {
        const sessionID = event.properties.sessionID
        if (!sessionID) return

        const state = getSessionState(sessionID)
        if (event.properties.name === "debug") {
          state.debug = true
          state.pendingDebugCommand = false
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
        },
        async execute(args, context) {
          const state = getSessionState(context.sessionID)
          if (state.debug || state.pendingDebugCommand) {
            return "Debug mode is active for this session, so vault_index_search auto-routing is disabled."
          }

          try {
            const result = searchIndex(
              dbPath,
              args.query,
              args.limit,
              args.folders,
              frontmatterIndexConfig.folderPriorities
            )
            context.metadata({
              title: "Vault index shortlist",
              metadata: {
                query: args.query,
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
