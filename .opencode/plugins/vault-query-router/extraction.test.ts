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
  it("extracts canonical tags and locations", () => {
    const result = inferStructuredConstraints("深圳的培训")
    expect(result.constraints).not.toBeNull()
    expect(result.constraints!.tags).toEqual(["topic/training"])
    expect(result.constraints!.city).toEqual(["深圳市"])
  })

  it("reports unresolved hints instead of guessing", () => {
    const result = inferStructuredConstraints("LLM training in 深圳")
    expect(result.constraints!.tags).toContain("topic/training")
    expect(result.constraints!.city).toContain("深圳市")
    expect(result.unresolvedHints).toContain("LLM")
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
})
