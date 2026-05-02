import { describe, it, expect, beforeAll } from "bun:test"
import fs from "node:fs"
import path from "node:path"

import {
  loadCanonicalTags,
  loadTagAliases,
  loadTagExpansions,
  loadLocationAliases,
  isCanonicalTag,
  resolveTagAlias,
  resolveLocationAlias,
  getExpansionNeighbors,
  validateTagAliasesIntegrity,
  validateTagExpansionsIntegrity,
  shouldExpand,
  buildExpandedConstraints,
  invalidateGovernedArtifactCache,
  type TraceEntry,
  type PassDiagnostics,
  type GovernedRetrievalDiagnostics,
} from "./governed-artifacts"
import {
  inferStructuredConstraints,
  TAG_KEYWORDS,
  LOCATION_ALIASES,
  refreshGovernedDerivedTables,
} from "./extraction-logic"

const PROJECT_ROOT = path.resolve(import.meta.dir, "../../..")
const ARTIFACTS_DIR = path.resolve(PROJECT_ROOT, ".opencode")

function readDoc(filename: string): string {
  return fs.readFileSync(path.resolve(ARTIFACTS_DIR, filename), "utf-8")
}

describe("Batch 1: Freeze machine-readable governance artifact boundaries", () => {
  let contract: string
  let canonicalTagsJson: ReturnType<typeof loadCanonicalTags>
  let tagAliasesJson: ReturnType<typeof loadTagAliases>
  let tagExpansionsJson: ReturnType<typeof loadTagExpansions>
  let locationAliasesJson: ReturnType<typeof loadLocationAliases>

  beforeAll(() => {
    invalidateGovernedArtifactCache()
    contract = readDoc("docs/sqlite-retrieval-contract.md")
    canonicalTagsJson = loadCanonicalTags()
    tagAliasesJson = loadTagAliases()
    tagExpansionsJson = loadTagExpansions()
    locationAliasesJson = loadLocationAliases()
  })

  it("contract names all four governance artifacts with distinct responsibilities", () => {
    expect(contract).toContain("canonical-tags.json")
    expect(contract).toContain("tag-aliases.json")
    expect(contract).toContain("tag-expansions.json")
    expect(contract).toContain("location-aliases.json")
  })

  it("contract states canonical-tags.json is the only legal runtime source for final canonical tag outputs", () => {
    expect(contract).toMatch(/canonical-tags\.json.*(?:only|unique|sole).*(?:legal|runtime|canonical).*(?:source|authority)/i)
  })

  it("contract no longer describes alias-registry.md as the legal runtime source for final canonical tag outputs", () => {
    const filtered = contract.split("\n").filter(l =>
      l.includes("alias-registry.md") && (
        l.toLowerCase().includes("runtime source") ||
        l.toLowerCase().includes("legal source") ||
        l.toLowerCase().includes("only source")
      )
    )
    for (const line of filtered) {
      expect(line).not.toMatch(/(?:only|sole|unique).*(?:runtime|legal).*(?:source|authority)/i)
    }
  })

  it("canonical-tags.json contains the expected governed tags", () => {
    expect(canonicalTagsJson.tags).toContain("topic/training")
    expect(canonicalTagsJson.tags).toContain("topic/education")
    expect(canonicalTagsJson.tags).toContain("topic/idea")
    expect(canonicalTagsJson.tags).toContain("topic/design")
    expect(canonicalTagsJson.tags).toContain("topic/cv")
    expect(canonicalTagsJson.tags).toContain("topic/ai-tools")
    expect(canonicalTagsJson.tags).toContain("state/active")
    expect(canonicalTagsJson.tags).toContain("state/inbox")
  })

  it("tag-aliases.json maps aliases to canonical tags that exist in canonical-tags.json", () => {
    const result = validateTagAliasesIntegrity()
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it("tag-expansions.json references only tags that exist in canonical-tags.json", () => {
    const result = validateTagExpansionsIntegrity()
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it("location-aliases.json contains country, province, and city mappings", () => {
    expect(Object.keys(locationAliasesJson.country).length).toBeGreaterThan(0)
    expect(Object.keys(locationAliasesJson.province).length).toBeGreaterThan(0)
    expect(Object.keys(locationAliasesJson.city).length).toBeGreaterThan(0)
  })

  it("tag-aliases.json contains expected alias mappings from alias-registry.md", () => {
    expect(tagAliasesJson.mappings["培训"]).toBe("topic/training")
    expect(tagAliasesJson.mappings["education"]).toBe("topic/education")
    expect(tagAliasesJson.mappings["ai-tools"]).toBe("topic/ai-tools")
    expect(tagAliasesJson.mappings["agent-native-cli"]).toBe("topic/ai-tools")
    expect(tagAliasesJson.mappings["design"]).toBe("topic/design")
    expect(tagAliasesJson.mappings["cv"]).toBe("topic/cv")
  })

  it("tag-expansions.json contains training/education expansion pair", () => {
    expect(tagExpansionsJson.expansions["topic/training"]).toContain("topic/education")
    expect(tagExpansionsJson.expansions["topic/education"]).toContain("topic/training")
  })
})

describe("Batch 2: Enforce caller-side normalization before structured execution", () => {
  let workflow: string
  let skill: string
  beforeAll(() => {
    workflow = readDoc("workflows/query-vault.md")
    skill = readDoc("skills/second-brain-query/SKILL.md")
  })
  it("workflow requires caller-side governed normalization before vault_index_search", () => {
    expect(workflow).toMatch(/governed.{0,30}normalization/i)
    expect(workflow).toMatch(/structured query summary/i)
    expect(workflow).toMatch(/visible.{0,30}intermediate retrieval trace/i)
    expect(workflow).toContain("vault_index_search")
  })
  it("skill instructs to emit only retrieval-contract-supported fields", () => {
    expect(skill).toMatch(/retrieval-contract-supported|contract-supported/)
  })
  it("skill instructs to emit only governed canonical tag values", () => {
    expect(skill).toMatch(/governed.{0,20}canonical.{0,20}tag/i)
  })
  it("resolveTagAlias returns correct canonical for literal matches", () => {
    const result = resolveTagAlias("topic/training")
    expect(result).not.toBeNull()
    expect(result!.canonical).toBe("topic/training")
    expect(result!.source).toBe("literal")
  })
  it("resolveTagAlias returns correct canonical for alias matches", () => {
    const result = resolveTagAlias("培训")
    expect(result).not.toBeNull()
    expect(result!.canonical).toBe("topic/training")
    expect(result!.source).toBe("alias")
  })
  it("resolveTagAlias returns null for unknown aliases", () => {
    const result = resolveTagAlias("unknown-tag")
    expect(result).toBeNull()
  })
  it("resolveLocationAlias resolves city aliases correctly", () => {
    const result = resolveLocationAlias("深圳", "city")
    expect(result).not.toBeNull()
    expect(result!.canonical).toBe("深圳市")
    expect(result!.source).toBe("alias")
  })
  it("resolveLocationAlias resolves literal city matches", () => {
    const result = resolveLocationAlias("深圳市", "city")
    expect(result).not.toBeNull()
    expect(result!.canonical).toBe("深圳市")
    expect(result!.source).toBe("literal")
  })
  it("no retrieval artifact claims raw SQL generation is permitted", () => {
    const c = readDoc("docs/sqlite-retrieval-contract.md")
    expect(c).toMatch(/not.*bypass|must not.*raw SQL|ad hoc.*SQL.*not/i)
  })
})

describe("Batch 3: Freeze the bounded primary-pass and expansion-pass policy", () => {
  it("primary structured pass uses only primary canonical constraints with no auto-expansion", () => {
    const result = buildExpandedConstraints(["topic/training"], 5)
    expect(result.expandedTags).toEqual(["topic/training"])
    expect(result.expansionTriggerReason).toBeNull()
  })
  it("automatic broadening may run only after a primary pass with fewer than 3 candidates", () => {
    expect(shouldExpand(0)).toBe(true)
    expect(shouldExpand(1)).toBe(true)
    expect(shouldExpand(2)).toBe(true)
    expect(shouldExpand(3)).toBe(false)
    expect(shouldExpand(10)).toBe(false)
  })
  it("broadened pass uses only approved neighbors from tag-expansions.json", () => {
    const result = buildExpandedConstraints(["topic/training"], 0)
    expect(result.expandedTags).toContain("topic/training")
    expect(result.expandedTags).toContain("topic/education")
    expect(result.expansionTriggerReason).not.toBeNull()
  })
  it("broadened pass does not invent new canonical tags", () => {
    const result = buildExpandedConstraints(["topic/idea"], 0)
    expect(result.expandedTags).toEqual(["topic/idea"])
    expect(result.expansionTriggerReason).toBeNull()
  })
  it("3 or more candidates do not trigger first-version automatic expansion", () => {
    const result = buildExpandedConstraints(["topic/training"], 3)
    expect(result.expandedTags).toEqual(["topic/training"])
    expect(result.expansionTriggerReason).toBeNull()
  })
  it("expansion trigger reason explains why broadening was triggered", () => {
    const result = buildExpandedConstraints(["topic/training"], 1)
    expect(result.expansionTriggerReason).toContain("fewer than 3")
    expect(result.expansionTriggerReason).toContain("topic/education")
  })
})

describe("Batch 4: Distinguish literal, alias, inference, and pass-level diagnostics", () => {
  it("resolveTagAlias distinguishes literal and alias mappings", () => {
    const literal = resolveTagAlias("topic/training")
    expect(literal!.source).toBe("literal")
    const alias = resolveTagAlias("培训")
    expect(alias!.source).toBe("alias")
  })
  it("resolveLocationAlias distinguishes literal and alias mappings", () => {
    const literal = resolveLocationAlias("深圳市", "city")
    expect(literal!.source).toBe("literal")
    const alias = resolveLocationAlias("深圳", "city")
    expect(alias!.source).toBe("alias")
  })
  it("TraceEntry type supports literal, alias, and inference source values", () => {
    const tl: TraceEntry = { family: "tags", field: "tags", matchedPhrase: "topic/training", normalizedValue: "topic/training", source: "literal" }
    const ta: TraceEntry = { family: "tags", field: "tags", matchedPhrase: "培训", normalizedValue: "topic/training", source: "alias" }
    const ti: TraceEntry = { family: "tags", field: "tags", matchedPhrase: "some-phrase", normalizedValue: "topic/training", source: "inference" }
    expect(tl.source).toBe("literal")
    expect(ta.source).toBe("alias")
    expect(ti.source).toBe("inference")
  })
  it("PassDiagnostics distinguishes primary-structured-pass from expansion-structured-pass", () => {
    const pp: PassDiagnostics = { passType: "primary-structured-pass", constraints: { tags: ["topic/training"] }, candidateCount: 1, structuredTrace: [] }
    const ep: PassDiagnostics = { passType: "expansion-structured-pass", constraints: { tags: ["topic/training", "topic/education"] }, candidateCount: 5, expansionTriggerReason: "primary returned 1", structuredTrace: [] }
    expect(pp.passType).toBe("primary-structured-pass")
    expect(ep.passType).toBe("expansion-structured-pass")
  })
  it("PassDiagnostics reports constraints used and candidate counts per pass", () => {
    const p: PassDiagnostics = { passType: "primary-structured-pass", constraints: { tags: ["topic/training"], city: ["深圳市"] }, candidateCount: 2, structuredTrace: [] }
    expect(p.constraints).toHaveProperty("tags")
    expect(p.constraints).toHaveProperty("city")
    expect(p.candidateCount).toBe(2)
  })
  it("unresolved/ambiguous hints are reported rather than silently converted", () => {
    const result = inferStructuredConstraints("LLM training in 深圳")
    expect(result.constraints).not.toBeNull()
    expect(result.unresolvedHints).toContain("LLM")
    expect(result.constraints!.tags).not.toContain("LLM")
    expect(result.constraints!.tags).toContain("topic/training")
  })
})

describe("Batch 5: Align implementation surfaces with governance source of truth", () => {
  it("governed-artifacts module loads and validates all JSON artifacts", () => {
    const ct = loadCanonicalTags()
    expect(ct.tags.length).toBeGreaterThan(0)
    const ta = loadTagAliases()
    expect(Object.keys(ta.mappings).length).toBeGreaterThan(0)
    const te = loadTagExpansions()
    expect(Object.keys(te.expansions).length).toBeGreaterThan(0)
    const la = loadLocationAliases()
    expect(Object.keys(la.country).length).toBeGreaterThan(0)
  })
  it("isCanonicalTag uses canonical-tags.json as the runtime source of truth", () => {
    expect(isCanonicalTag("topic/training")).toBe(true)
    expect(isCanonicalTag("topic/education")).toBe(true)
    expect(isCanonicalTag("not-a-tag")).toBe(false)
    expect(isCanonicalTag("培训")).toBe(false)
  })
  it("TAG_KEYWORDS entries are all present in canonical-tags.json", () => {
    const ct = loadCanonicalTags()
    const cs = new Set(ct.tags)
    for (const entry of TAG_KEYWORDS) {
      expect(cs.has(entry.canonical)).toBe(true)
    }
  })
  it("LOCATION_ALIASES values are all present in location-aliases.json", () => {
    const la = loadLocationAliases()
    for (const [alias, canonical] of LOCATION_ALIASES.country.entries()) {
      expect(la.country[alias]).toBe(canonical)
    }
    for (const [alias, canonical] of LOCATION_ALIASES.province.entries()) {
      expect(la.province[alias]).toBe(canonical)
    }
    for (const [alias, canonical] of LOCATION_ALIASES.city.entries()) {
      expect(la.city[alias]).toBe(canonical)
    }
  })
  it("alias-registry.md remains aligned with the JSON artifacts for seeding", () => {
    const ar = readDoc("alias-registry.md")
    const ct = loadCanonicalTags()
    for (const tag of ct.tags) {
      if (tag.startsWith("topic/")) {
        expect(ar).toContain(tag)
      }
    }
  })
  it("contract references JSON artifacts as runtime governance sources", () => {
    const c = readDoc("docs/sqlite-retrieval-contract.md")
    expect(c).toContain("canonical-tags.json")
    expect(c).toContain("tag-aliases.json")
    expect(c).toContain("tag-expansions.json")
    expect(c).toContain("location-aliases.json")
  })
  it("existing shortlist-first retrieval and fallback behavior remain intact", () => {
    const w = readDoc("workflows/query-vault.md")
    expect(w).toContain("vault_index_search")
    expect(w).toMatch(/shortlist-first|shortlist first/i)
    expect(w).toMatch(/progressive.{0,10}relaxation/i)
  })

  it("system instruction requires commentary-visible structured query summary before tool call", () => {
    const index = readDoc("plugins/vault-query-router/index.ts")
    expect(index).toMatch(/state that summary in commentary/i)
    expect(index).toMatch(/structured query summary/i)
    expect(index).toMatch(/visible intermediate retrieval trace/i)
  })
})

describe("Batch 6: Human-review workflow for governed artifact changes", () => {
  it("governance artifacts document a propose-approve-reject workflow", () => {
    const c = readDoc("docs/sqlite-retrieval-contract.md")
    const hasWorkflow = c.match(/propose.{0,30}approv/i) !== null || c.match(/review.{0,30}workflow/i) !== null
    expect(hasWorkflow).toBe(true)
  })
  it("canonical tag additions require explicit human approval", () => {
    const c = readDoc("docs/sqlite-retrieval-contract.md")
    expect(c).toMatch(/canonical.{0,30}tag.{0,30}(human|explicit).{0,30}approv/i)
  })
  it("alias and expansion additions are reviewable before merging", () => {
    const ar = readDoc("alias-registry.md")
    expect(ar).toMatch(/human.{0,30}(review|approv)/i)
  })
  it("workflow is documented in at least one retrieval-facing artifact", () => {
    const c = readDoc("docs/sqlite-retrieval-contract.md")
    const w = readDoc("workflows/query-vault.md")
    const s = readDoc("skills/second-brain-query/SKILL.md")
    const hasRW = c.match(/governance|propose|approv|review/i) !== null || w.match(/governance|propose|approv|review/i) !== null || s.match(/governance|propose|approv|review/i) !== null
    expect(hasRW).toBe(true)
  })
})

describe("Batch 7: Machine-readable wrapper response diagnostics", () => {
  it("contract defines machine-readable diagnostics fields for the wrapper response", () => {
    const c = readDoc("docs/sqlite-retrieval-contract.md")
    expect(c).toMatch(/diagnostics/i)
    expect(c).toMatch(/appliedConstraints|candidateCounts|fallbackReason/i)
  })
  it("diagnostics fields distinguish primary-structured-pass from expansion-structured-pass", () => {
    const c = readDoc("docs/sqlite-retrieval-contract.md")
    expect(c).toMatch(/primary-structured-pass/)
    expect(c).toMatch(/expansion-structured-pass/)
  })
  it("wrapper response contract stays backward-compatible", () => {
    const c = readDoc("docs/sqlite-retrieval-contract.md")
    expect(c).toMatch(/text-formatted|text.{0,10}shortlist/i)
  })
  it("contract honestly marks which diagnostics fields are live vs planned", () => {
    const c = readDoc("docs/sqlite-retrieval-contract.md")
    expect(c).toMatch(/planned|not yet supported|not yet exposed/i)
  })
  it("GovernedRetrievalDiagnostics type supports multi-pass diagnostics", () => {
    const diag: GovernedRetrievalDiagnostics = {
      passes: [
        { passType: "primary-structured-pass", constraints: { tags: ["topic/training"] }, candidateCount: 1, structuredTrace: [] },
        { passType: "expansion-structured-pass", constraints: { tags: ["topic/training", "topic/education"] }, candidateCount: 5, expansionTriggerReason: "primary-structured-pass returned 1 candidates (fewer than 3); expanded with neighbors: topic/education", structuredTrace: [] },
      ],
      unresolvedHints: [],
      rejectedStructuredHints: [],
    }
    expect(diag.passes.length).toBe(2)
    expect(diag.passes[0].passType).toBe("primary-structured-pass")
    expect(diag.passes[1].passType).toBe("expansion-structured-pass")
    expect(diag.passes[1].expansionTriggerReason).toContain("fewer than 3")
  })
})

describe("Batch 8: Extraction logic derives from JSON governance artifacts (P1-003 fix)", () => {
  beforeAll(() => {
    refreshGovernedDerivedTables()
  })

  it("TAG_KEYWORDS canonical set matches canonical-tags.json exactly", () => {
    const ct = loadCanonicalTags()
    const canonicalFromArtifacts = new Set(ct.tags)
    const canonicalFromKeywords = new Set(TAG_KEYWORDS.map(e => e.canonical))
    expect(canonicalFromKeywords).toEqual(canonicalFromArtifacts)
  })

  it("every TAG_KEYWORDS alias exists in tag-aliases.json or canonical-tags.json", () => {
    const ta = loadTagAliases()
    const ct = loadCanonicalTags()
    const allCanonicalSet = new Set(ct.tags)
    const allAliasKeys = new Set(Object.keys(ta.mappings))
    for (const entry of TAG_KEYWORDS) {
      for (const alias of entry.aliases) {
        expect(
          allCanonicalSet.has(alias) || allAliasKeys.has(alias),
          `alias "${alias}" from TAG_KEYWORDS not found in canonical-tags.json or tag-aliases.json`
        ).toBe(true)
      }
    }
  })

  it("no alias in tag-aliases.json targeting a topic canonical tag is missing from TAG_KEYWORDS", () => {
    const ta = loadTagAliases()
    const keywordAliasSet = new Set<string>()
    for (const entry of TAG_KEYWORDS) {
      for (const alias of entry.aliases) {
        keywordAliasSet.add(alias.toLowerCase())
      }
    }
    for (const [alias, canonical] of Object.entries(ta.mappings)) {
      if (!canonical.startsWith("topic/")) continue
      expect(
        keywordAliasSet.has(alias.toLowerCase()),
        `tag-aliases.json alias "${alias}" -> "${canonical}" missing from TAG_KEYWORDS`
      ).toBe(true)
    }
  })

  it("LOCATION_ALIASES country keys match location-aliases.json country keys exactly", () => {
    const la = loadLocationAliases()
    const artifactKeys = new Set(Object.keys(la.country))
    const derivedKeys = new Set(LOCATION_ALIASES.country.keys())
    expect(derivedKeys).toEqual(artifactKeys)
  })

  it("LOCATION_ALIASES province keys match location-aliases.json province keys exactly", () => {
    const la = loadLocationAliases()
    const artifactKeys = new Set(Object.keys(la.province))
    const derivedKeys = new Set(LOCATION_ALIASES.province.keys())
    expect(derivedKeys).toEqual(artifactKeys)
  })

  it("LOCATION_ALIASES city keys match location-aliases.json city keys exactly", () => {
    const la = loadLocationAliases()
    const artifactKeys = new Set(Object.keys(la.city))
    const derivedKeys = new Set(LOCATION_ALIASES.city.keys())
    expect(derivedKeys).toEqual(artifactKeys)
  })

  it("LOCATION_ALIASES country values match location-aliases.json country values exactly", () => {
    const la = loadLocationAliases()
    for (const [alias, canonical] of LOCATION_ALIASES.country.entries()) {
      expect(la.country[alias]).toBe(canonical)
    }
  })

  it("LOCATION_ALIASES province values match location-aliases.json province values exactly", () => {
    const la = loadLocationAliases()
    for (const [alias, canonical] of LOCATION_ALIASES.province.entries()) {
      expect(la.province[alias]).toBe(canonical)
    }
  })

  it("LOCATION_ALIASES city values match location-aliases.json city values exactly", () => {
    const la = loadLocationAliases()
    for (const [alias, canonical] of LOCATION_ALIASES.city.entries()) {
      expect(la.city[alias]).toBe(canonical)
    }
  })

  it("refreshGovernedDerivedTables rebuilds tables from current artifacts", () => {
    const beforeTags = TAG_KEYWORDS.length
    const beforeCountrySize = LOCATION_ALIASES.country.size
    refreshGovernedDerivedTables()
    expect(TAG_KEYWORDS.length).toBe(beforeTags)
    expect(LOCATION_ALIASES.country.size).toBe(beforeCountrySize)
  })
})
