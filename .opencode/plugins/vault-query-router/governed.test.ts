import { describe, it, expect, beforeAll } from "bun:test"

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
} from "./governed-artifacts"
import { inferStructuredConstraints, refreshGovernedDerivedTables } from "./extraction-logic"

describe("governed artifacts", () => {
  beforeAll(() => {
    invalidateGovernedArtifactCache()
  })

  it("loads governed JSON artifacts", () => {
    expect(loadCanonicalTags().tags.length).toBeGreaterThan(0)
    expect(Object.keys(loadTagAliases().mappings).length).toBeGreaterThan(0)
    expect(Object.keys(loadTagExpansions().expansions).length).toBeGreaterThan(0)
    expect(Object.keys(loadLocationAliases().city).length).toBeGreaterThan(0)
  })

  it("resolves tag and location aliases", () => {
    expect(resolveTagAlias("培训")?.canonical).toBe("topic/training")
    expect(resolveTagAlias("topic/training")?.source).toBe("literal")
    expect(resolveLocationAlias("深圳", "city")?.canonical).toBe("深圳市")
    expect(resolveLocationAlias("深圳市", "city")?.source).toBe("literal")
  })

  it("validates governed expansion mappings", () => {
    expect(validateTagAliasesIntegrity()).toEqual({ valid: true, errors: [] })
    expect(validateTagExpansionsIntegrity()).toEqual({ valid: true, errors: [] })
    expect(getExpansionNeighbors("topic/training")).toContain("topic/education")
    expect(shouldExpand(2)).toBe(true)
    expect(shouldExpand(3)).toBe(false)
  })

  it("expands only approved neighboring tags", () => {
    const result = buildExpandedConstraints(["topic/training"], 0)
    expect(result.expandedTags).toContain("topic/training")
    expect(result.expandedTags).toContain("topic/education")
    expect(result.expansionTriggerReason).toContain("fewer than 3")
  })

  it("keeps derived tables in sync with artifacts", () => {
    refreshGovernedDerivedTables()
    expect(isCanonicalTag("topic/training")).toBe(true)
    const extracted = inferStructuredConstraints("深圳的培训")
    expect(extracted.constraints?.tags).toContain("topic/training")
  })
})
