import fs from "node:fs"
import path from "node:path"

export type CanonicalTagsDoc = {
  version: number
  description: string
  tags: string[]
}

export type TagAliasesDoc = {
  version: number
  description: string
  mappings: Record<string, string>
}

export type TagExpansionsDoc = {
  version: number
  description: string
  expansions: Record<string, string[]>
}

export type LocationAliasesDoc = {
  version: number
  description: string
  country: Record<string, string>
  province: Record<string, string>
  city: Record<string, string>
}

export type TraceEntry = {
  family: "time" | "location" | "tags" | "extraFields"
  field: string
  matchedPhrase: string
  normalizedValue: string
  source: "literal" | "alias" | "inference"
}

export type PassDiagnostics = {
  passType: "primary-structured-pass" | "expansion-structured-pass"
  constraints: Record<string, unknown>
  candidateCount: number
  expansionTriggerReason?: string
  structuredTrace: TraceEntry[]
}

export type GovernedRetrievalDiagnostics = {
  passes: PassDiagnostics[]
  unresolvedHints: string[]
  rejectedStructuredHints: string[]
}

const GOVERNED_ARTIFACTS_DIR = path.resolve(import.meta.dir, "../../..", ".opencode")

function readJsonFile<T>(filename: string): T {
  const filePath = path.resolve(GOVERNED_ARTIFACTS_DIR, filename)
  const raw = fs.readFileSync(filePath, "utf-8")
  return JSON.parse(raw) as T
}

let cachedCanonicalTags: CanonicalTagsDoc | null = null
let cachedTagAliases: TagAliasesDoc | null = null
let cachedTagExpansions: TagExpansionsDoc | null = null
let cachedLocationAliases: LocationAliasesDoc | null = null

export function loadCanonicalTags(): CanonicalTagsDoc {
  if (!cachedCanonicalTags) {
    cachedCanonicalTags = readJsonFile<CanonicalTagsDoc>("canonical-tags.json")
  }
  return cachedCanonicalTags
}

export function loadTagAliases(): TagAliasesDoc {
  if (!cachedTagAliases) {
    cachedTagAliases = readJsonFile<TagAliasesDoc>("tag-aliases.json")
  }
  return cachedTagAliases
}

export function loadTagExpansions(): TagExpansionsDoc {
  if (!cachedTagExpansions) {
    cachedTagExpansions = readJsonFile<TagExpansionsDoc>("tag-expansions.json")
  }
  return cachedTagExpansions
}

export function loadLocationAliases(): LocationAliasesDoc {
  if (!cachedLocationAliases) {
    cachedLocationAliases = readJsonFile<LocationAliasesDoc>("location-aliases.json")
  }
  return cachedLocationAliases
}

export function invalidateGovernedArtifactCache() {
  cachedCanonicalTags = null
  cachedTagAliases = null
  cachedTagExpansions = null
  cachedLocationAliases = null
}

export function isCanonicalTag(tag: string): boolean {
  const doc = loadCanonicalTags()
  return doc.tags.includes(tag)
}

export function resolveTagAlias(alias: string): { canonical: string; source: "literal" | "alias" } | null {
  const canonicalTags = loadCanonicalTags()
  const tagAliases = loadTagAliases()

  if (canonicalTags.tags.includes(alias)) {
    return { canonical: alias, source: "literal" }
  }

  const mapped = tagAliases.mappings[alias]
  if (mapped && canonicalTags.tags.includes(mapped)) {
    return { canonical: mapped, source: "alias" }
  }

  return null
}

export function resolveTagWithTrace(alias: string): { canonical: string; source: "literal" | "alias" | "inference" } | null {
  return resolveTagAlias(alias)
}

export function resolveLocationAlias(
  alias: string,
  level: "country" | "province" | "city"
): { canonical: string; source: "literal" | "alias" } | null {
  const locationAliases = loadLocationAliases()
  const levelMap = locationAliases[level]

  if (!levelMap) return null

  if (levelMap[alias]) {
    const isLiteral = alias === levelMap[alias]
    return { canonical: levelMap[alias], source: isLiteral ? "literal" : "alias" }
  }

  const lowered = alias.toLowerCase()
  for (const [key, value] of Object.entries(levelMap)) {
    if (key.toLowerCase() === lowered) {
      const isLiteral = key === value && key.toLowerCase() === lowered
      return { canonical: value, source: isLiteral ? "literal" : "alias" }
    }
  }

  return null
}

export function getExpansionNeighbors(canonicalTag: string): string[] {
  const doc = loadTagExpansions()
  return doc.expansions[canonicalTag] || []
}

export function validateTagAliasesIntegrity(): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  const canonicalTags = loadCanonicalTags()
  const tagAliases = loadTagAliases()
  const canonicalSet = new Set(canonicalTags.tags)

  for (const [alias, target] of Object.entries(tagAliases.mappings)) {
    if (!canonicalSet.has(target)) {
      errors.push(`tag-aliases.json: alias "${alias}" maps to "${target}" which is not in canonical-tags.json`)
    }
  }

  return { valid: errors.length === 0, errors }
}

export function validateTagExpansionsIntegrity(): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  const canonicalTags = loadCanonicalTags()
  const tagExpansions = loadTagExpansions()
  const canonicalSet = new Set(canonicalTags.tags)

  for (const [source, targets] of Object.entries(tagExpansions.expansions)) {
    if (!canonicalSet.has(source)) {
      errors.push(`tag-expansions.json: source tag "${source}" is not in canonical-tags.json`)
    }
    for (const target of targets) {
      if (!canonicalSet.has(target)) {
        errors.push(`tag-expansions.json: expansion target "${target}" for source "${source}" is not in canonical-tags.json`)
      }
    }
  }

  return { valid: errors.length === 0, errors }
}

export function shouldExpand(primaryCandidateCount: number): boolean {
  return primaryCandidateCount < 3
}

export function buildExpandedConstraints(
  primaryTags: string[],
  primaryCandidateCount: number
): { expandedTags: string[]; expansionTriggerReason: string | null } {
  if (!shouldExpand(primaryCandidateCount)) {
    return { expandedTags: primaryTags, expansionTriggerReason: null }
  }

  const expandedSet = new Set(primaryTags)
  const addedTags: string[] = []

  for (const tag of primaryTags) {
    const neighbors = getExpansionNeighbors(tag)
    for (const neighbor of neighbors) {
      if (!expandedSet.has(neighbor)) {
        expandedSet.add(neighbor)
        addedTags.push(neighbor)
      }
    }
  }

  if (addedTags.length === 0) {
    return { expandedTags: primaryTags, expansionTriggerReason: null }
  }

  return {
    expandedTags: Array.from(expandedSet),
    expansionTriggerReason: `primary-structured-pass returned ${primaryCandidateCount} candidates (fewer than 3); expanded with neighbors: ${addedTags.join(", ")}`,
  }
}
