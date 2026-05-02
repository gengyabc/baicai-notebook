/**
 * Extraction logic for vault-query-router.
 *
 * This module contains the pure constraint-extraction functions that are also
 * used by the router plugin. It is the single source of truth for time-range
 * inference, location alias matching, and tag keyword matching so that the
 * test suite and the live router consume the same logic.
 *
 * Governed normalization: tag and location resolution consume the JSON
 * governance artifacts (canonical-tags.json, tag-aliases.json,
 * location-aliases.json, tag-expansions.json) via the governed-artifacts
 * module. The router-local keyword tables are strictly derived consumers
 * of the governed artifacts, not independent sources of truth.
 */

import {
  loadCanonicalTags,
  loadTagAliases,
  loadLocationAliases,
  invalidateGovernedArtifactCache,
} from "./governed-artifacts"

function buildTagKeywordsFromArtifacts(): Array<{ canonical: string; aliases: string[]; source: "literal" | "alias" | "inference" }> {
  const canonicalTags = loadCanonicalTags()
  const tagAliases = loadTagAliases()
  const tagToAliases = new Map<string, string[]>()
  for (const tag of canonicalTags.tags) {
    tagToAliases.set(tag, [tag])
  }
  for (const [alias, canonical] of Object.entries(tagAliases.mappings)) {
    const existing = tagToAliases.get(canonical)
    if (existing && !existing.includes(alias)) {
      existing.push(alias)
    }
  }
  return Array.from(tagToAliases.entries()).map(([canonical, aliases]) => ({
    canonical,
    aliases,
    source: "literal" as const,
  }))
}

function buildLocationAliasesFromArtifacts() {
  const locationAliases = loadLocationAliases()
  return {
    country: new Map<string, string>(Object.entries(locationAliases.country)),
    province: new Map<string, string>(Object.entries(locationAliases.province)),
    city: new Map<string, string>(Object.entries(locationAliases.city)),
  }
}

export let TAG_KEYWORDS: Array<{ canonical: string; aliases: string[]; source: "literal" | "alias" | "inference" }> = buildTagKeywordsFromArtifacts()

export let LOCATION_ALIASES: {
  country: Map<string, string>
  province: Map<string, string>
  city: Map<string, string>
} = buildLocationAliasesFromArtifacts()

export function refreshGovernedDerivedTables() {
  invalidateGovernedArtifactCache()
  TAG_KEYWORDS = buildTagKeywordsFromArtifacts()
  LOCATION_ALIASES = buildLocationAliasesFromArtifacts()
}

// --- Time hints ---

// Hints that distinguish created vs updated chronology intent.
// When a query explicitly refers to creation time, only created windows
// should be emitted; when it refers to update time, only updated windows.
// Ambiguous note-time hints (like "笔记") default to created-only per
// the minimal retrieval contract.
const CREATED_TIME_HINTS = ["created", "创建"]
const UPDATED_TIME_HINTS = ["updated", "更新", "修改"]
const AMBIGUOUS_NOTE_TIME_HINTS = ["笔记"]
const ALL_NOTE_TIME_HINTS = [...CREATED_TIME_HINTS, ...UPDATED_TIME_HINTS, ...AMBIGUOUS_NOTE_TIME_HINTS]
const EVENT_TIME_HINTS = ["培训", "training", "会议", "meeting", "talk", "trip", "旅行", "出行"]

// --- Month name mapping ---

const MONTH_NAMES_EN: Record<string, number> = {
  january: 1, jan: 1,
  february: 2, feb: 2,
  march: 3, mar: 3,
  april: 4, apr: 4,
  may: 5,
  june: 6, jun: 6,
  july: 7, jul: 7,
  august: 8, aug: 8,
  september: 9, sep: 9, sept: 9,
  october: 10, oct: 10,
  november: 11, nov: 11,
  december: 12, dec: 12,
}

// --- Helper functions ---

function isoStart(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0)).toISOString()
}

function isoEnd(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999)).toISOString()
}

function getDaysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

function getCurrentYear() {
  return new Date().getFullYear()
}

function getCurrentMonth() {
  return new Date().getMonth() + 1
}

export function matchesAlias(loweredQuery: string, alias: string) {
  const normalizedAlias = alias.trim().toLowerCase()
  if (!normalizedAlias) return false

  if (/^[a-z0-9\s'-]+$/i.test(normalizedAlias)) {
    const escaped = normalizedAlias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(loweredQuery)
  }

  return loweredQuery.includes(normalizedAlias)
}

function resolveMonthValue(monthStr: string): number | null {
  const lower = monthStr.trim().toLowerCase()
  if (MONTH_NAMES_EN[lower]) return MONTH_NAMES_EN[lower]
  const asNum = parseInt(monthStr, 10)
  if (asNum >= 1 && asNum <= 12) return asNum
  return null
}

// --- Time range inference ---

export type TimeRangeResult = {
  timeMode: "event" | "note" | null
  start: string | null
  end: string | null
  reason: string | null
}

/**
 * Infer a time range from a query string. This function is the live
 * implementation of the time-phrase alias tables defined in
 * `.opencode/docs/sqlite-retrieval-contract.md`.
 */
export function inferTimeRangeFromQuery(query: string, lowered: string): TimeRangeResult {
  const isNoteTime = ALL_NOTE_TIME_HINTS.some((hint) => lowered.includes(hint))
  const hasEventHint = EVENT_TIME_HINTS.some((hint) => lowered.includes(hint))
  const timeMode: "event" | "note" = isNoteTime ? "note" : "event"

  // --- Explicit year extraction ---
  const yearMatch = query.match(/\b(20\d{2})\b|(?:(20\d{2})年)/)
  const explicitYear = yearMatch?.[1] || yearMatch?.[2] || null
  const year = explicitYear ? Number(explicitYear) : null

  // --- Before / 之前 (exclusive of the boundary year) ---
  const beforeMatch = lowered.match(/(?:before\s+(20\d{2})|(20\d{2})\s*年?\s*之前)/)
  if (beforeMatch) {
    const beforeYear = parseInt(beforeMatch[1] || beforeMatch[2], 10)
    return {
      timeMode,
      start: "0001-01-01T00:00:00.000Z",
      end: isoEnd(beforeYear - 1, 12, 31),
      reason: `${timeMode}:before ${beforeYear}`,
    }
  }

  // --- After / 之后 (exclusive of the boundary year) ---
  const afterMatch = lowered.match(/(?:after\s+(20\d{2})|(20\d{2})\s*年?\s*之后)/)
  if (afterMatch) {
    const afterYear = parseInt(afterMatch[1] || afterMatch[2], 10)
    return {
      timeMode,
      start: isoStart(afterYear + 1, 1, 1),
      end: isoEnd(9999, 12, 31),
      reason: `${timeMode}:after ${afterYear}`,
    }
  }

  // --- Since / 以来 (inclusive of the boundary year) ---
  const sinceMatch = lowered.match(/(?:since\s+(20\d{2})|(20\d{2})\s*年?\s*以来)/)
  if (sinceMatch) {
    const sinceYear = parseInt(sinceMatch[1] || sinceMatch[2], 10)
    return {
      timeMode,
      start: isoStart(sinceYear, 1, 1),
      end: isoEnd(9999, 12, 31),
      reason: `${timeMode}:since ${sinceYear}`,
    }
  }

  // --- Between / 从X到Y ---
  const betweenCnMatch = lowered.match(/从\s*(\d{1,2})\s*月\s*到\s*(\d{1,2})\s*月/)
  if (betweenCnMatch) {
    const fromMonth = parseInt(betweenCnMatch[1], 10)
    const toMonth = parseInt(betweenCnMatch[2], 10)
    if (fromMonth >= 1 && fromMonth <= 12 && toMonth >= 1 && toMonth <= 12) {
      const effectiveYear = year || getCurrentYear()
      return {
        timeMode,
        start: isoStart(effectiveYear, fromMonth, 1),
        end: isoEnd(effectiveYear, toMonth, getDaysInMonth(effectiveYear, toMonth)),
        reason: `${timeMode}:between ${fromMonth}月 and ${toMonth}月 ${effectiveYear}`,
      }
    }
  }

  const betweenEnMatch = lowered.match(/between\s+(\w+)\s+and\s+(\w+)/)
  if (betweenEnMatch) {
    const fromMonth = resolveMonthValue(betweenEnMatch[1])
    const toMonth = resolveMonthValue(betweenEnMatch[2])
    if (fromMonth && toMonth) {
      const effectiveYear = year || getCurrentYear()
      return {
        timeMode,
        start: isoStart(effectiveYear, fromMonth, 1),
        end: isoEnd(effectiveYear, toMonth, getDaysInMonth(effectiveYear, toMonth)),
        reason: `${timeMode}:between month ${fromMonth} and month ${toMonth} ${effectiveYear}`,
      }
    }
  }

  // --- This year / 今年 ---
  if (lowered.includes("今年") || /\bthis\s+year\b/.test(lowered)) {
    const currentYear = getCurrentYear()
    return {
      timeMode,
      start: isoStart(currentYear, 1, 1),
      end: isoEnd(currentYear, 12, 31),
      reason: `${timeMode}:this year ${currentYear}`,
    }
  }

  // --- Last year / 去年 ---
  if (lowered.includes("去年") || /\blast\s+year\b/.test(lowered)) {
    const lastYear = getCurrentYear() - 1
    return {
      timeMode,
      start: isoStart(lastYear, 1, 1),
      end: isoEnd(lastYear, 12, 31),
      reason: `${timeMode}:last year ${lastYear}`,
    }
  }

  // --- This month / 这个月 ---
  if (lowered.includes("这个月") || /\bthis\s+month\b/.test(lowered)) {
    const currentYear = getCurrentYear()
    const currentMonth = getCurrentMonth()
    return {
      timeMode,
      start: isoStart(currentYear, currentMonth, 1),
      end: isoEnd(currentYear, currentMonth, getDaysInMonth(currentYear, currentMonth)),
      reason: `${timeMode}:this month ${currentYear}-${currentMonth}`,
    }
  }

  // --- Last month / 上个月 ---
  if (lowered.includes("上个月") || /\blast\s+month\b/.test(lowered)) {
    let lastMonthYear = getCurrentYear()
    let lastMonth = getCurrentMonth() - 1
    if (lastMonth < 1) {
      lastMonth = 12
      lastMonthYear -= 1
    }
    return {
      timeMode,
      start: isoStart(lastMonthYear, lastMonth, 1),
      end: isoEnd(lastMonthYear, lastMonth, getDaysInMonth(lastMonthYear, lastMonth)),
      reason: `${timeMode}:last month ${lastMonthYear}-${lastMonth}`,
    }
  }

  // --- Month with year / YYYY年MM月 ---
  const monthYearMatch = query.match(/(20\d{2})\s*年\s*(\d{1,2})\s*月/)
  if (monthYearMatch) {
    const y = parseInt(monthYearMatch[1], 10)
    const m = parseInt(monthYearMatch[2], 10)
    if (m >= 1 && m <= 12) {
      return {
        timeMode,
        start: isoStart(y, m, 1),
        end: isoEnd(y, m, getDaysInMonth(y, m)),
        reason: `${timeMode}:month ${y}-${m}`,
      }
    }
  }

  // --- Month only / MM月 (use current year) ---
  const monthOnlyMatch = query.match(/(?<!\d)(\d{1,2})\s*月/)
  if (monthOnlyMatch && !monthYearMatch) {
    const m = parseInt(monthOnlyMatch[1], 10)
    if (m >= 1 && m <= 12) {
      const effectiveYear = getCurrentYear()
      return {
        timeMode,
        start: isoStart(effectiveYear, m, 1),
        end: isoEnd(effectiveYear, m, getDaysInMonth(effectiveYear, m)),
        reason: `${timeMode}:month ${effectiveYear}-${m}`,
      }
    }
  }

  // --- Existing behavior: explicit year with half-year or full year ---
  if (!year) {
    return {
      timeMode: null,
      start: null,
      end: null,
      reason: null,
    }
  }

  if (lowered.includes("上半年") || lowered.includes("h1")) {
    return {
      timeMode,
      start: isoStart(year, 1, 1),
      end: isoEnd(year, 6, 30),
      reason: `${timeMode}:H1 ${year}`,
    }
  }

  if (lowered.includes("下半年") || lowered.includes("h2")) {
    return {
      timeMode,
      start: isoStart(year, 7, 1),
      end: isoEnd(year, 12, 31),
      reason: `${timeMode}:H2 ${year}`,
    }
  }

  if (query.includes("年") || hasEventHint || isNoteTime) {
    return {
      timeMode,
      start: isoStart(year, 1, 1),
      end: isoEnd(year, 12, 31),
      reason: `${timeMode}:year ${year}`,
    }
  }

  return {
    timeMode: null,
    start: null,
    end: null,
    reason: null,
  }
}

// --- Constraint extraction types ---

export type StructuredConstraintsInput = {
  tags?: string[]
  hierarchicalTags?: string[]
  createdStart?: string
  createdEnd?: string
  updatedStart?: string
  updatedEnd?: string
}

export type ExtractedConstraints = {
  constraints: StructuredConstraintsInput | null
  reasons: string[]
  unresolvedHints: string[]
}

// --- Unresolved semantic hint detection ---
// These are common retrieval phrases that are NOT in the governed tag set.
// They should be reported as unresolved rather than silently mapped.

const UNRESOLVED_SEMANTIC_HINTS = [
  "LLM", "llm",
  "RAG", "rag",
  "Agent", "agent",
  "大模型相关",
  "大模型",
  "GPT", "gpt",
  "AIGC", "aigc",
]

/**
 * Find ALL character ranges [start, end) of a pattern within the lowered
 * query string. Each occurrence produces its own range.
 * Uses lookbehind/lookahead to match the same word-boundary logic as
 * `matchesAlias` without consuming boundary characters, so adjacent
 * occurrences are all found.
 */
function findAllMatchRanges(lowered: string, pattern: string): [number, number][] {
  const normalizedPattern = pattern.trim().toLowerCase()
  if (!normalizedPattern) return []

  const results: [number, number][] = []

  if (/^[a-z0-9\s'-]+$/i.test(normalizedPattern)) {
    const escaped = normalizedPattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    const regex = new RegExp(`(?<=^|[^a-z0-9])${escaped}(?=[^a-z0-9]|$)`, "gi")
    let match: RegExpExecArray | null
    while ((match = regex.exec(lowered)) !== null) {
      const start = match.index
      const end = start + normalizedPattern.length
      results.push([start, end])
    }
  } else {
    let searchFrom = 0
    while (searchFrom <= lowered.length - normalizedPattern.length) {
      const idx = lowered.indexOf(normalizedPattern, searchFrom)
      if (idx === -1) break
      results.push([idx, idx + normalizedPattern.length])
      searchFrom = idx + 1
    }
  }

  return results
}

/** Check whether two [start, end) ranges overlap. */
function rangesOverlap(a: [number, number], b: [number, number]): boolean {
  return a[0] < b[1] && b[0] < a[1]
}

function detectUnresolvedHints(lowered: string, mappedCanonicals: Set<string>, matchedRanges: [number, number][]): string[] {
  const hints: string[] = []

  for (const hint of UNRESOLVED_SEMANTIC_HINTS) {
    if (!matchesAlias(lowered, hint)) continue
    // Find ALL occurrences of the hint. Report the hint if at least one
    // occurrence does NOT overlap with an already-matched alias range.
    // This handles the edge case where "agent-native-cli Agent" has the
    // first "agent" covered by the alias match but the standalone "Agent"
    // at the end is not.
    const hintRanges = findAllMatchRanges(lowered, hint)
    const hasUncoveredOccurrence = hintRanges.some(
      hintRange => !matchedRanges.some(range => rangesOverlap(range, hintRange))
    )
    if (hasUncoveredOccurrence) {
      // Legacy check: suppress if the hint exactly matches an alias of a
      // mapped canonical (covers cases where range tracking is unavailable).
      const hintLower = hint.toLowerCase()
      const alreadyGoverned = Array.from(mappedCanonicals).some(canonical => {
        return TAG_KEYWORDS.some(entry => {
          if (entry.canonical !== canonical) return false
          return entry.aliases.some(alias => alias.toLowerCase() === hintLower)
        })
      })
      if (!alreadyGoverned) {
        hints.push(hint)
      }
    }
  }

  return hints
}

function collectLocationMatches(
  lowered: string,
  aliases: Map<string, string>,
  target: Set<string>,
  label: string,
  reasons: string[]
) {
  for (const [alias, canonical] of aliases.entries()) {
    if (!matchesAlias(lowered, alias)) continue
    if (target.has(canonical)) continue
    target.add(canonical)
    reasons.push(`${label}:${alias}->${canonical}`)
  }
}

/**
 * Full constraint extraction from a query string.
 * This is the live implementation of Stage 0 extraction.
 *
 * The minimal retrieval contract only exposes `tags`, `hierarchicalTags`,
 * `createdStart`/`createdEnd`, and `updatedStart`/`updatedEnd` as structured
 * constraint inputs. Location and event-time constraints are no longer part of
 * the broad structured retrieval contract; they are preserved in
 * frontmatter_json for downstream LLM-side filtering after shortlist
 * generation.
 */
export function inferStructuredConstraints(query: string): ExtractedConstraints {
  const lowered = query.trim().toLowerCase()
  if (!lowered) return { constraints: null, reasons: [], unresolvedHints: [] }

  const tags = new Set<string>()
  const reasons: string[] = []

  // Tag extraction using governed aliases; track matched ranges for
  // unresolved-hint suppression so that overlapping matches are not
  // reported as unresolved.
  const matchedRanges: [number, number][] = []
  for (const entry of TAG_KEYWORDS) {
    for (const alias of entry.aliases) {
      if (!matchesAlias(lowered, alias)) continue
      tags.add(entry.canonical)
      reasons.push(`tag:${alias}->${entry.canonical}`)
      const ranges = findAllMatchRanges(lowered, alias)
      matchedRanges.push(...ranges)
      break
    }
  }

  // Time range extraction - only produce note-chronology constraints
  // (created/updated windows) for the minimal retrieval contract.
  // Event-time queries (training, meetings, etc.) do not map to
  // created/updated and will rely on tags + text-fallback +
  // frontmatter_json filtering.
  const timeRange = inferTimeRangeFromQuery(query, lowered)
  if (timeRange.reason) reasons.push(timeRange.reason)

  // Unresolved semantic hint detection
  const unresolvedHints = detectUnresolvedHints(lowered, tags, matchedRanges)

  const constraints: StructuredConstraintsInput = {}
  if (tags.size > 0) constraints.tags = Array.from(tags)

  // Only emit note-chronology windows (timeMode === "note") as structured
  // constraints for the minimal retrieval contract. Event-time queries
  // are not mapped to created/updated because those fields represent note
  // metadata chronology, not activity timing.
  //
  // Chronology intent resolution:
  //   - If the query explicitly refers to creation time (创建/created),
  //     emit only createdStart/createdEnd.
  //   - If the query explicitly refers to update time (更新/修改/updated),
  //     emit only updatedStart/updatedEnd.
  //   - If the query refers to notes ambiguously (笔记) without specifying
  //     created or updated, default to created-only per the minimal
  //     retrieval contract.
  //   - If the query mentions both created and updated hints, emit both
  //     windows (intersection semantics at the SQL level).
  if (timeRange.start && timeRange.end && timeRange.timeMode === "note") {
    const wantsCreated = CREATED_TIME_HINTS.some((hint) => lowered.includes(hint))
    const wantsUpdated = UPDATED_TIME_HINTS.some((hint) => lowered.includes(hint))

    if (wantsCreated && wantsUpdated) {
      // Explicit both: emit both windows
      constraints.createdStart = timeRange.start
      constraints.createdEnd = timeRange.end
      constraints.updatedStart = timeRange.start
      constraints.updatedEnd = timeRange.end
    } else if (wantsUpdated) {
      // Explicit update intent: emit only updated window
      constraints.updatedStart = timeRange.start
      constraints.updatedEnd = timeRange.end
    } else {
      // Created intent or ambiguous (default): emit only created window
      constraints.createdStart = timeRange.start
      constraints.createdEnd = timeRange.end
    }
  }

  const hasConstraints = Object.keys(constraints).length > 0
  return {
    constraints: hasConstraints ? constraints : null,
    reasons,
    unresolvedHints,
  }
}
