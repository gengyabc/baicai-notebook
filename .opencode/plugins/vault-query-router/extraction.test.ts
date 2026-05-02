import { describe, it, expect } from "bun:test"
import fs from "node:fs"
import path from "node:path"

import {
  inferTimeRangeFromQuery,
  inferStructuredConstraints,
  TAG_KEYWORDS,
  LOCATION_ALIASES,
} from "./extraction-logic"

const now = new Date()
const currentYear = now.getFullYear()
const currentMonth = now.getMonth() + 1
const lastYear = currentYear - 1

function pad2(n: number) {
  return String(n).padStart(2, "0")
}

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

function monthStart(year: number, month: number) {
  return `${year}-${pad2(month)}-01`
}

function monthEnd(year: number, month: number) {
  return `${year}-${pad2(month)}-${pad2(daysInMonth(year, month))}`
}

describe("time inference", () => {
  it("resolves year, month, and relative phrases", () => {
    const thisYear = inferTimeRangeFromQuery("今年的培训", "今年的培训")
    expect(thisYear.timeMode).toBe("event")
    expect(thisYear.start).toMatch(new RegExp(`^${currentYear}-01-01`))
    expect(thisYear.end).toMatch(new RegExp(`^${currentYear}-12-31`))

    const lastMonth = inferTimeRangeFromQuery("上个月的培训", "上个月的培训")
    const lmYear = currentMonth === 1 ? lastYear : currentYear
    const lmMonth = currentMonth === 1 ? 12 : currentMonth - 1
    expect(lastMonth.start).toMatch(new RegExp(`^${monthStart(lmYear, lmMonth)}`))
    expect(lastMonth.end).toMatch(new RegExp(`^${monthEnd(lmYear, lmMonth)}`))

    const ranged = inferTimeRangeFromQuery("2025年3月的培训", "2025年3月的培训")
    expect(ranged.start).toMatch(/^2025-03-01/)
    expect(ranged.end).toMatch(/^2025-03-31/)
  })
})

describe("structured extraction", () => {
  it("extracts canonical tags from the minimal retrieval contract", () => {
    const result = inferStructuredConstraints("深圳的培训")
    expect(result.constraints).not.toBeNull()
    expect(result.constraints!.tags).toEqual(["topic/training"])
    // Location fields are no longer part of the structured retrieval contract
    // They are preserved in frontmatter_json for downstream LLM-side filtering
    expect(result.constraints!.city).toBeUndefined()
    expect(result.constraints!.country).toBeUndefined()
    expect(result.constraints!.province).toBeUndefined()
  })

  it("reports unresolved hints instead of guessing", () => {
    const result = inferStructuredConstraints("LLM training in 深圳")
    expect(result.constraints!.tags).toContain("topic/training")
    expect(result.unresolvedHints).toContain("LLM")
    // Location is no longer extracted as a structured constraint
    expect(result.constraints!.city).toBeUndefined()
  })

  it("does not silently map ambiguous phrases", () => {
    const result = inferStructuredConstraints("RAG approach")
    expect(result.constraints?.tags).toBeUndefined()
    expect(result.unresolvedHints).toContain("RAG")
  })

  it("keeps alias coverage bounded to governed tags", () => {
    const canonicalPath = path.resolve(import.meta.dir, "../../canonical-tags.json")
    const canonicalTags = JSON.parse(fs.readFileSync(canonicalPath, "utf-8"))
    const canonicalSet = new Set(canonicalTags.tags)
    for (const entry of TAG_KEYWORDS) {
      expect(canonicalSet.has(entry.canonical)).toBe(true)
    }
    expect(LOCATION_ALIASES.city.size).toBeGreaterThan(0)
  })

  it("emits note-chronology windows only for note-time queries", () => {
    const noteResult = inferStructuredConstraints("2025年创建的笔记")
    // Created-time query should produce only created window, not updated
    expect(noteResult.constraints).not.toBeNull()
    expect(noteResult.constraints!.createdStart).toBeDefined()
    expect(noteResult.constraints!.createdEnd).toBeDefined()
    expect(noteResult.constraints!.updatedStart).toBeUndefined()
    expect(noteResult.constraints!.updatedEnd).toBeUndefined()
    // Event-time fields are not part of the minimal contract
    expect(noteResult.constraints!.timeMode).toBeUndefined()
    expect(noteResult.constraints!.start).toBeUndefined()
    expect(noteResult.constraints!.end).toBeUndefined()
  })

  it("emits only updated window for update-time queries", () => {
    const updatedResult = inferStructuredConstraints("2025年更新的笔记")
    expect(updatedResult.constraints).not.toBeNull()
    expect(updatedResult.constraints!.updatedStart).toBeDefined()
    expect(updatedResult.constraints!.updatedEnd).toBeDefined()
    expect(updatedResult.constraints!.createdStart).toBeUndefined()
    expect(updatedResult.constraints!.createdEnd).toBeUndefined()
  })

  it("emits both windows when query mentions both created and updated", () => {
    const bothResult = inferStructuredConstraints("2025年创建并更新的笔记")
    expect(bothResult.constraints).not.toBeNull()
    expect(bothResult.constraints!.createdStart).toBeDefined()
    expect(bothResult.constraints!.createdEnd).toBeDefined()
    expect(bothResult.constraints!.updatedStart).toBeDefined()
    expect(bothResult.constraints!.updatedEnd).toBeDefined()
  })

  it("defaults to created-only for ambiguous note-time queries", () => {
    const ambiguousResult = inferStructuredConstraints("2025年的笔记")
    expect(ambiguousResult.constraints).not.toBeNull()
    expect(ambiguousResult.constraints!.createdStart).toBeDefined()
    expect(ambiguousResult.constraints!.createdEnd).toBeDefined()
    expect(ambiguousResult.constraints!.updatedStart).toBeUndefined()
    expect(ambiguousResult.constraints!.updatedEnd).toBeUndefined()
  })

  it("does not emit chronology windows for event-time queries", () => {
    const eventResult = inferStructuredConstraints("2025年的培训")
    // Event-time queries should not map to created/updated
    expect(eventResult.constraints!.createdStart).toBeUndefined()
    expect(eventResult.constraints!.updatedStart).toBeUndefined()
  })
})
