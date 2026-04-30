import { describe, it, expect, beforeAll } from "bun:test"
import fs from "node:fs"

// Dynamic date helpers for time-phrase tests (Q05-003 fix)
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

// Batch 1: Documentation alignment tests
describe("Batch 1: Semantic mapping ownership and first-version boundaries", () => {
  const contractPath = ".opencode/docs/sqlite-retrieval-contract.md"
  const workflowPath = ".opencode/workflows/query-vault.md"
  const skillPath = ".opencode/skills/second-brain-query/SKILL.md"
  const aliasRegistryPath = ".opencode/alias-registry.md"

  let contract: string
  let workflow: string
  let skill: string
  let aliasRegistry: string

  beforeAll(() => {
    contract = fs.readFileSync(contractPath, "utf-8")
    workflow = fs.readFileSync(workflowPath, "utf-8")
    skill = fs.readFileSync(skillPath, "utf-8")
    aliasRegistry = fs.readFileSync(aliasRegistryPath, "utf-8")
  })

  it("contract separates canonical-value ownership (alias-registry) from retrieval-time semantic mapping behavior", () => {
    expect(contract).toContain("alias-registry.md")
    // Contract must state that tag/location canonical values are governed by alias-registry
    expect(contract).toMatch(/tag canonical values and location canonical values are governed by/i)
    expect(contract).toMatch(/semantic.{0,30}mapping/i)
  })

  it("contract states first-version semantic topic expansion resolves only to already-supported canonical tags values", () => {
    // Must state that semantic topic expansion resolves only to already-supported canonical tags
    expect(contract).toMatch(/semantic topic expansion may resolve only to already-supported canonical/i)
    // Must explicitly state it does not introduce canonical_topic
    expect(contract).toMatch(/does not introduce `?canonical_topic`?/i)
  })

  it("contract explicitly says ambiguous phrases remain unresolved and must be reported instead of guessed", () => {
    expect(contract).toMatch(/ambig.{0,40}(unresolved|not.{0,10}guess|not.{0,10}infer|reported|surfaced)/i)
  })

  it("workflow doc consumes the same bounded semantic-mapping policy", () => {
    expect(workflow).toContain("alias-registry.md")
    expect(workflow).toMatch(/low-risk.{0,20}inference/i)
    expect(workflow).toMatch(/obvious.{0,20}stable.{0,20}topic/i)
  })

  it("skill doc consumes the same bounded semantic-mapping policy", () => {
    expect(skill).toContain("alias-registry.md")
    expect(skill).toMatch(/low-risk.{0,20}inference/i)
    expect(skill).toMatch(/obvious.{0,20}stable.{0,20}topic/i)
  })

  it("alias-registry remains the canonical source for tag and location values used as mapping targets", () => {
    expect(aliasRegistry).toContain("topic/training")
    expect(aliasRegistry).toContain("topic/ai-tools")
    expect(aliasRegistry).toContain("topic/idea")
    expect(aliasRegistry).toContain("topic/design")
    expect(aliasRegistry).toContain("topic/cv")
    expect(aliasRegistry).toContain("topic/education")
  })
})

// --- Batch 2+: Router extraction logic tests ---
// Import the extraction functions from the shared module
import {
  inferTimeRangeFromQuery,
  inferStructuredConstraints,
  LOCATION_ALIASES,
  TAG_KEYWORDS,
  formatDiagnosticOutput,
} from "./extraction-logic"

describe("Batch 2: Expand deterministic time and location phrase normalization", () => {
  describe("this year / 今年", () => {
    it("resolves '今年' to current year window in event mode", () => {
      const result = inferTimeRangeFromQuery("今年的培训", "今年的培训")
      expect(result.timeMode).toBe("event")
      expect(result.start).toMatch(new RegExp(`^${currentYear}-01-01`))
      expect(result.end).toMatch(new RegExp(`^${currentYear}-12-31`))
    })

    it("resolves 'this year' to current year window", () => {
      const result = inferTimeRangeFromQuery("this year training", "this year training")
      expect(result.timeMode).toBe("event")
      expect(result.start).toMatch(new RegExp(`^${currentYear}-01-01`))
      expect(result.end).toMatch(new RegExp(`^${currentYear}-12-31`))
    })

    it("uses note mode when note-time hints are present", () => {
      const result = inferTimeRangeFromQuery("今年创建的笔记", "今年创建的笔记")
      expect(result.timeMode).toBe("note")
    })
  })

  describe("last year / 去年", () => {
    it("resolves '去年' to previous year window", () => {
      const result = inferTimeRangeFromQuery("去年的培训", "去年的培训")
      expect(result.timeMode).toBe("event")
      expect(result.start).toMatch(new RegExp(`^${lastYear}-01-01`))
      expect(result.end).toMatch(new RegExp(`^${lastYear}-12-31`))
    })

    it("resolves 'last year' to previous year window", () => {
      const result = inferTimeRangeFromQuery("last year training", "last year training")
      expect(result.timeMode).toBe("event")
      expect(result.start).toMatch(new RegExp(`^${lastYear}-01-01`))
      expect(result.end).toMatch(new RegExp(`^${lastYear}-12-31`))
    })
  })

  describe("this month / 这个月", () => {
    it("resolves '这个月' to current month window", () => {
      const result = inferTimeRangeFromQuery("这个月的培训", "这个月的培训")
      expect(result.timeMode).toBe("event")
      expect(result.start).toMatch(new RegExp(`^${monthStart(currentYear, currentMonth)}`))
      expect(result.end).toMatch(new RegExp(`^${monthEnd(currentYear, currentMonth)}`))
    })

    it("resolves 'this month' to current month window", () => {
      const result = inferTimeRangeFromQuery("this month training", "this month training")
      expect(result.timeMode).toBe("event")
      expect(result.start).toMatch(new RegExp(`^${monthStart(currentYear, currentMonth)}`))
      expect(result.end).toMatch(new RegExp(`^${monthEnd(currentYear, currentMonth)}`))
    })
  })

  describe("last month / 上个月", () => {
    it("resolves '上个月' to previous month window", () => {
      const result = inferTimeRangeFromQuery("上个月的培训", "上个月的培训")
      expect(result.timeMode).toBe("event")
      const lmYear = currentMonth === 1 ? lastYear : currentYear
      const lmMonth = currentMonth === 1 ? 12 : currentMonth - 1
      expect(result.start).toMatch(new RegExp(`^${monthStart(lmYear, lmMonth)}`))
      expect(result.end).toMatch(new RegExp(`^${monthEnd(lmYear, lmMonth)}`))
    })

    it("resolves 'last month' to previous month window", () => {
      const result = inferTimeRangeFromQuery("last month training", "last month training")
      expect(result.timeMode).toBe("event")
      const lmYear = currentMonth === 1 ? lastYear : currentYear
      const lmMonth = currentMonth === 1 ? 12 : currentMonth - 1
      expect(result.start).toMatch(new RegExp(`^${monthStart(lmYear, lmMonth)}`))
      expect(result.end).toMatch(new RegExp(`^${monthEnd(lmYear, lmMonth)}`))
    })
  })

  describe("month with year / YYYY年MM月", () => {
    it("resolves '2025年3月' to March 2025 window", () => {
      const result = inferTimeRangeFromQuery("2025年3月的培训", "2025年3月的培训")
      expect(result.timeMode).toBe("event")
      expect(result.start).toMatch(/^2025-03-01/)
      expect(result.end).toMatch(/^2025-03-31/)
    })

    it("resolves '3月' with implicit current year", () => {
      const result = inferTimeRangeFromQuery("3月的培训", "3月的培训")
      expect(result.timeMode).toBe("event")
      expect(result.start).toMatch(new RegExp(`^${monthStart(currentYear, 3)}`))
      expect(result.end).toMatch(new RegExp(`^${monthEnd(currentYear, 3)}`))
    })
  })

  describe("since / 以来", () => {
    it("resolves '2025年以来' to [2025-01-01, 9999-12-31]", () => {
      const result = inferTimeRangeFromQuery("2025年以来的培训", "2025年以来的培训")
      expect(result.timeMode).toBe("event")
      expect(result.start).toMatch(/^2025-01-01/)
      expect(result.end).toMatch(/^9999-12-31/)
    })

    it("resolves 'since 2025' to [2025-01-01, 9999-12-31]", () => {
      const result = inferTimeRangeFromQuery("since 2025 training", "since 2025 training")
      expect(result.timeMode).toBe("event")
      expect(result.start).toMatch(/^2025-01-01/)
      expect(result.end).toMatch(/^9999-12-31/)
    })
  })

  describe("before / 之前", () => {
    it("resolves '2025年之前' to [0001-01-01, 2024-12-31]", () => {
      const result = inferTimeRangeFromQuery("2025年之前的培训", "2025年之前的培训")
      expect(result.timeMode).toBe("event")
      expect(result.start).toMatch(/^0001-01-01/)
      expect(result.end).toMatch(/^2024-12-31/)
    })

    it("resolves 'before 2025' to [0001-01-01, 2024-12-31]", () => {
      const result = inferTimeRangeFromQuery("before 2025 training", "before 2025 training")
      expect(result.timeMode).toBe("event")
      expect(result.start).toMatch(/^0001-01-01/)
      expect(result.end).toMatch(/^2024-12-31/)
    })
  })

  describe("after / 之后", () => {
    it("resolves '2025年之后' to [2026-01-01, 9999-12-31]", () => {
      const result = inferTimeRangeFromQuery("2025年之后的培训", "2025年之后的培训")
      expect(result.timeMode).toBe("event")
      expect(result.start).toMatch(/^2026-01-01/)
      expect(result.end).toMatch(/^9999-12-31/)
    })

    it("resolves 'after 2025' to [2026-01-01, 9999-12-31]", () => {
      const result = inferTimeRangeFromQuery("after 2025 training", "after 2025 training")
      expect(result.timeMode).toBe("event")
      expect(result.start).toMatch(/^2026-01-01/)
      expect(result.end).toMatch(/^9999-12-31/)
    })
  })

  describe("between / 从X到Y", () => {
    it("resolves '从3月到5月' to [YYYY-03-01, YYYY-05-31]", () => {
      const result = inferTimeRangeFromQuery("从3月到5月的培训", "从3月到5月的培训")
      expect(result.timeMode).toBe("event")
      expect(result.start).toMatch(new RegExp(`^${monthStart(currentYear, 3)}`))
      expect(result.end).toMatch(new RegExp(`^${monthEnd(currentYear, 5)}`))
    })

    it("resolves 'between March and May' to [YYYY-03-01, YYYY-05-31]", () => {
      const result = inferTimeRangeFromQuery("between March and May training", "between march and may training")
      expect(result.timeMode).toBe("event")
      expect(result.start).toMatch(new RegExp(`^${monthStart(currentYear, 3)}`))
      expect(result.end).toMatch(new RegExp(`^${monthEnd(currentYear, 5)}`))
    })
  })

  describe("time mode selection", () => {
    it("chooses event mode for activity queries", () => {
      const result = inferTimeRangeFromQuery("2025年的培训", "2025年的培训")
      expect(result.timeMode).toBe("event")
    })

    it("chooses note mode for note-chronology queries", () => {
      const result = inferTimeRangeFromQuery("2025年创建的笔记", "2025年创建的笔记")
      expect(result.timeMode).toBe("note")
    })

    it("does not satisfy event-time requests with note timestamps", () => {
      const result = inferTimeRangeFromQuery("2025年的培训", "2025年的培训")
      expect(result.timeMode).toBe("event")
      expect(result.timeMode).not.toBe("note")
    })
  })

  describe("existing behavior preserved", () => {
    it("still handles explicit year patterns like '2025年'", () => {
      const result = inferTimeRangeFromQuery("2025年的培训", "2025年的培训")
      expect(result.start).toMatch(/^2025-01-01/)
      expect(result.end).toMatch(/^2025-12-31/)
    })

    it("still handles half-year patterns like '2025年上半年'", () => {
      const result = inferTimeRangeFromQuery("2025年上半年", "2025年上半年")
      expect(result.start).toMatch(/^2025-01-01/)
      expect(result.end).toMatch(/^2025-06-30/)
    })

    it("still handles half-year patterns like '2025年下半年'", () => {
      const result = inferTimeRangeFromQuery("2025年下半年", "2025年下半年")
      expect(result.start).toMatch(/^2025-07-01/)
      expect(result.end).toMatch(/^2025-12-31/)
    })

    it("returns null when no time phrase is found", () => {
      const result = inferTimeRangeFromQuery("深圳的培训", "深圳的培训")
      expect(result.timeMode).toBeNull()
      expect(result.start).toBeNull()
      expect(result.end).toBeNull()
    })
  })

  describe("location normalization", () => {
    it("normalizes only to country/province/city using governed canonical values", () => {
      const result = inferStructuredConstraints("深圳的培训")
      expect(result.constraints).not.toBeNull()
      expect(result.constraints!.city).toEqual(["深圳市"])
      expect(result.constraints!.tags).toEqual(["topic/training"])
    })

    it("does not broaden to fuzzy or multi-hop semantic guesses for location", () => {
      // "南方" is not in the alias registry, so it should not produce a location constraint
      const result = inferStructuredConstraints("南方的培训")
      expect(result.constraints?.city).toBeUndefined()
      expect(result.constraints?.province).toBeUndefined()
      expect(result.constraints?.country).toBeUndefined()
    })
  })
})

// --- Batch 3: Bounded topic phrase expansion on governed canonical tags ---

describe("Batch 3: Bounded topic phrase expansion on governed canonical tags", () => {
  describe("topic/ai-tools coverage", () => {
    it("TAG_KEYWORDS includes topic/ai-tools with aliases from alias-registry", () => {
      const aiToolsEntry = TAG_KEYWORDS.find(e => e.canonical === "topic/ai-tools")
      expect(aiToolsEntry).toBeDefined()
      expect(aiToolsEntry!.aliases).toContain("ai-tools")
      expect(aiToolsEntry!.aliases).toContain("agent-native-cli")
      expect(aiToolsEntry!.aliases).toContain("excalidraw-cli")
    })

    it("inferStructuredConstraints maps 'ai-tools' to topic/ai-tools", () => {
      const result = inferStructuredConstraints("ai-tools notes")
      expect(result.constraints).not.toBeNull()
      expect(result.constraints!.tags).toContain("topic/ai-tools")
    })

    it("inferStructuredConstraints maps 'agent-native-cli' to topic/ai-tools", () => {
      const result = inferStructuredConstraints("agent-native-cli usage")
      expect(result.constraints).not.toBeNull()
      expect(result.constraints!.tags).toContain("topic/ai-tools")
    })
  })

  describe("single canonical tag per phrase", () => {
    it("a matched semantic topic phrase produces at most one canonical tag", () => {
      const result = inferStructuredConstraints("培训")
      expect(result.constraints).not.toBeNull()
      const tags = result.constraints!.tags!
      const trainingCount = tags.filter(t => t === "topic/training").length
      expect(trainingCount).toBeLessThanOrEqual(1)
    })
  })

  describe("phrases without deterministic destination are not silently mapped", () => {
    it("LLM is not silently mapped to any canonical tag", () => {
      const result = inferStructuredConstraints("LLM related notes")
      expect(result.constraints?.tags).toBeUndefined()
    })

    it("RAG is not silently mapped to any canonical tag", () => {
      const result = inferStructuredConstraints("RAG pipeline")
      expect(result.constraints?.tags).toBeUndefined()
    })

    it("Agent is not silently mapped to any canonical tag", () => {
      const result = inferStructuredConstraints("Agent framework")
      expect(result.constraints?.tags).toBeUndefined()
    })

    it("大模型相关 is not silently mapped to any canonical tag", () => {
      const result = inferStructuredConstraints("大模型相关的笔记")
      expect(result.constraints?.tags).toBeUndefined()
    })
  })

  describe("alias-registry and extraction logic alignment", () => {
    it("all canonical tags in TAG_KEYWORDS exist in alias-registry", () => {
      const aliasRegistryPath = ".opencode/alias-registry.md"
      const aliasRegistry = fs.readFileSync(aliasRegistryPath, "utf-8")
      for (const entry of TAG_KEYWORDS) {
        expect(aliasRegistry).toContain(entry.canonical)
      }
    })
  })
})

// --- Batch 4: Mapped and unmapped phrase diagnostics in current router output ---

describe("Batch 4: Mapped and unmapped phrase diagnostics in current router output", () => {
  describe("mapped phrases reported in output", () => {
    it("structured-shortlist output reports mapped phrases that produced active constraints", () => {
      const result = inferStructuredConstraints("2025年深圳的培训")
      expect(result.constraints).not.toBeNull()
      expect(result.reasons.length).toBeGreaterThan(0)
      // Reasons should include the tag, location, and time mappings
      const reasonStr = result.reasons.join("; ")
      expect(reasonStr).toMatch(/tag:/)
      expect(reasonStr).toMatch(/city:|province:|country:/)
    })
  })

  describe("unresolved semantic hints reported", () => {
    it("when extraction sees semantic hints it cannot safely normalize, they appear in unresolvedHints", () => {
      const result = inferStructuredConstraints("LLM training in 深圳")
      // "LLM" should not be mapped but training and 深圳 should be
      expect(result.constraints).not.toBeNull()
      expect(result.constraints!.tags).toContain("topic/training")
      expect(result.constraints!.city).toContain("深圳市")
      // LLM is not in the governed tag set, so it should be noted as unresolved
      expect(result.unresolvedHints).toContain("LLM")
    })

    it("大模型相关 appears in unresolvedHints when not mapped", () => {
      const result = inferStructuredConstraints("大模型相关的笔记")
      expect(result.unresolvedHints).toContain("大模型相关")
    })

    it("RAG appears in unresolvedHints when not mapped", () => {
      const result = inferStructuredConstraints("RAG approach")
      expect(result.unresolvedHints).toContain("RAG")
    })

    it("Agent appears in unresolvedHints when not mapped", () => {
      const result = inferStructuredConstraints("Agent design pattern")
      expect(result.unresolvedHints).toContain("Agent")
    })
  })

  describe("unresolved hints suppressed when covered by accepted mapping (Q05-001)", () => {
    it("'agent-native-cli' maps to topic/ai-tools and does NOT report Agent as unresolved", () => {
      const result = inferStructuredConstraints("agent-native-cli usage")
      expect(result.constraints).not.toBeNull()
      expect(result.constraints!.tags).toContain("topic/ai-tools")
      // "agent" is a substring of the already-matched "agent-native-cli",
      // so it should be suppressed, not reported as unresolved.
      expect(result.unresolvedHints).not.toContain("Agent")
      expect(result.unresolvedHints).not.toContain("agent")
    })

    it("'agent-native-cli' with standalone 'Agent' still reports the standalone hint", () => {
      // If the query has "Agent" OUTSIDE the "agent-native-cli" phrase,
      // the standalone "Agent" should still be reported as unresolved.
      const result = inferStructuredConstraints("Agent using agent-native-cli")
      expect(result.constraints!.tags).toContain("topic/ai-tools")
      // The standalone "Agent" at the start is not covered by the
      // "agent-native-cli" match range, so it should appear.
      expect(result.unresolvedHints).toContain("Agent")
    })

    it("pure 'Agent' query with no governed mapping still reports Agent as unresolved", () => {
      const result = inferStructuredConstraints("Agent framework")
      expect(result.unresolvedHints).toContain("Agent")
    })

    it("'agent-native-cli Agent' reports standalone Agent as unresolved (Q05-001 multi-occurrence fix)", () => {
      // The first "agent" is inside "agent-native-cli" (covered by the alias match),
      // but the standalone "Agent" at the end is outside that range and should be
      // reported as an unresolved hint.
      const result = inferStructuredConstraints("agent-native-cli Agent")
      expect(result.constraints!.tags).toContain("topic/ai-tools")
      expect(result.unresolvedHints).toContain("Agent")
    })
  })

  describe("fallback output distinguishes cases", () => {
    it("formatStructuredResults reports mapped constraints with reasons", () => {
      // Test the formatting function produces diagnostic output
      const reasons = ["tag:培训->topic/training", "city:深圳->深圳市"]
      const output = formatDiagnosticOutput("深圳的培训", reasons, [], true)
      expect(output).toContain("Mapped phrases:")
      expect(output).toContain("tag:培训->topic/training")
      expect(output).toContain("city:深圳->深圳市")
    })

    it("formatDiagnosticOutput reports unresolved hints", () => {
      const reasons = ["tag:培训->topic/training"]
      const unresolved = ["LLM"]
      const output = formatDiagnosticOutput("LLM培训", reasons, unresolved, true)
      expect(output).toContain("Unresolved semantic hints")
      expect(output).toContain("LLM")
    })

    it("formatDiagnosticOutput distinguishes 'no constraints' from 'shortlist insufficient'", () => {
      const outputNoConstraints = formatDiagnosticOutput("random query", [], [], false)
      expect(outputNoConstraints).toContain("No structured constraints were extracted")

      const outputInsufficient = formatDiagnosticOutput("深圳的培训", ["city:深圳->深圳市"], [], true)
      expect(outputInsufficient).toContain("Mapped phrases:")
    })
  })

  describe("docs do not overclaim diagnostics", () => {
    it("contract doc states diagnostics are text-mode only, not structured response fields", () => {
      const contractPath = ".opencode/docs/sqlite-retrieval-contract.md"
      const contract = fs.readFileSync(contractPath, "utf-8")
      // The contract must acknowledge that current diagnostics are text, not structured
      expect(contract).toMatch(/text-formatted|text-formatted shortlist/i)
      expect(contract).toMatch(/planned.*contract work|not yet supported|does not yet expose/i)
    })
  })
})
