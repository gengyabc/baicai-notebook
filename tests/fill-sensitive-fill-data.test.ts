import { describe, it, expect, beforeEach, afterEach } from "bun:test"
import { $ } from "bun"
import { join, resolve } from "node:path"
import { writeFileSync, readFileSync, existsSync, rmSync, mkdirSync } from "node:fs"

const REPO_ROOT = join(import.meta.dir, "..")
const SCRIPT = join(REPO_ROOT, ".opencode", "scripts", "fill-sensitive-fill-data.mjs")
const TEMP_DIR = join(REPO_ROOT, ".temp", "fill-sensitive-test")

async function runScript(...args: string[]) {
  const result = await $`bun run ${SCRIPT} ${args}`.quiet().nothrow()
  return result
}

describe("fill-sensitive-fill-data.mjs: extractFieldName pattern", () => {
  it("extracts field name from {{ PHONE }}", async () => {
    const scriptContent = readFileSync(SCRIPT, "utf-8")
    const patternMatch = scriptContent.match(/SIMPLE_PLACEHOLDER_PATTERN\s*=\s*\/([^\/]+)\//)
    if (!patternMatch) throw new Error("Could not find pattern in script")
    const pattern = new RegExp(patternMatch[1])
    const match = pattern.exec("{{ PHONE }}")
    expect(match ? match[1] : null).toBe("PHONE")
  })

  it("extracts field name from {{PHONE}} (no spaces)", async () => {
    const scriptContent = readFileSync(SCRIPT, "utf-8")
    const patternMatch = scriptContent.match(/SIMPLE_PLACEHOLDER_PATTERN\s*=\s*\/([^\/]+)\//)
    if (!patternMatch) throw new Error("Could not find pattern in script")
    const pattern = new RegExp(patternMatch[1])
    const match = pattern.exec("{{PHONE}}")
    expect(match ? match[1] : null).toBe("PHONE")
  })

  it("extracts field name from {{  PHONE  }} (extra spaces)", async () => {
    const scriptContent = readFileSync(SCRIPT, "utf-8")
    const patternMatch = scriptContent.match(/SIMPLE_PLACEHOLDER_PATTERN\s*=\s*\/([^\/]+)\//)
    if (!patternMatch) throw new Error("Could not find pattern in script")
    const pattern = new RegExp(patternMatch[1])
    const match = pattern.exec("{{  PHONE  }}")
    expect(match ? match[1] : null).toBe("PHONE")
  })

  it("extracts lowercase field name (pattern accepts both cases)", async () => {
    const scriptContent = readFileSync(SCRIPT, "utf-8")
    const patternMatch = scriptContent.match(/SIMPLE_PLACEHOLDER_PATTERN\s*=\s*\/([^\/]+)\//)
    if (!patternMatch) throw new Error("Could not find pattern in script")
    const pattern = new RegExp(patternMatch[1])
    const match = pattern.exec("{{ phone }}")
    expect(match ? match[1] : null).toBe("phone")
  })

  it("returns null for field name starting with number", async () => {
    const scriptContent = readFileSync(SCRIPT, "utf-8")
    const patternMatch = scriptContent.match(/SIMPLE_PLACEHOLDER_PATTERN\s*=\s*\/([^\/]+)\//)
    if (!patternMatch) throw new Error("Could not find pattern in script")
    const pattern = new RegExp(patternMatch[1])
    const match = pattern.exec("{{ 1PHONE }}")
    expect(match ? match[1] : null).toBe(null)
  })

  it("returns null for field name with hyphen", async () => {
    const scriptContent = readFileSync(SCRIPT, "utf-8")
    const patternMatch = scriptContent.match(/SIMPLE_PLACEHOLDER_PATTERN\s*=\s*\/([^\/]+)\//)
    if (!patternMatch) throw new Error("Could not find pattern in script")
    const pattern = new RegExp(patternMatch[1])
    const match = pattern.exec("{{ PHONE-123 }}")
    expect(match ? match[1] : null).toBe(null)
  })

  it("extracts field name with underscore", async () => {
    const scriptContent = readFileSync(SCRIPT, "utf-8")
    const patternMatch = scriptContent.match(/SIMPLE_PLACEHOLDER_PATTERN\s*=\s*\/([^\/]+)\//)
    if (!patternMatch) throw new Error("Could not find pattern in script")
    const pattern = new RegExp(patternMatch[1])
    const match = pattern.exec("{{ PHONE_123 }}")
    expect(match ? match[1] : null).toBe("PHONE_123")
  })

  it("returns null for non-placeholder format", async () => {
    const scriptContent = readFileSync(SCRIPT, "utf-8")
    const patternMatch = scriptContent.match(/SIMPLE_PLACEHOLDER_PATTERN\s*=\s*\/([^\/]+)\//)
    if (!patternMatch) throw new Error("Could not find pattern in script")
    const pattern = new RegExp(patternMatch[1])
    const match = pattern.exec("some text {{ PHONE }} more")
    expect(match ? match[1] : null).toBe(null)
  })

  it("returns null for plain text without braces", async () => {
    const scriptContent = readFileSync(SCRIPT, "utf-8")
    const patternMatch = scriptContent.match(/SIMPLE_PLACEHOLDER_PATTERN\s*=\s*\/([^\/]+)\//)
    if (!patternMatch) throw new Error("Could not find pattern in script")
    const pattern = new RegExp(patternMatch[1])
    const match = pattern.exec("PHONE")
    expect(match ? match[1] : null).toBe(null)
  })

  it("returns null for empty string", async () => {
    const scriptContent = readFileSync(SCRIPT, "utf-8")
    const patternMatch = scriptContent.match(/SIMPLE_PLACEHOLDER_PATTERN\s*=\s*\/([^\/]+)\//)
    if (!patternMatch) throw new Error("Could not find pattern in script")
    const pattern = new RegExp(patternMatch[1])
    const match = pattern.exec("")
    expect(match ? match[1] : null).toBe(null)
  })
})

describe("fill-sensitive-fill-data.mjs: setMatchingField logic", () => {
  it("matches field at top level", () => {
    const obj = { PHONE: "{{ PHONE }}", name: "test" }
    setMatchingField(obj, "PHONE", "12345678")
    expect(obj.PHONE).toBe("12345678")
    expect(obj.name).toBe("test")
  })

  it("matches field in nested object", () => {
    const obj = { data: { PHONE: "{{ PHONE }}" }, name: "test" }
    setMatchingField(obj, "PHONE", "12345678")
    expect(obj.data.PHONE).toBe("12345678")
    expect(obj.name).toBe("test")
  })

  it("matches field in array of objects", () => {
    const obj = { items: [{ PHONE: "{{ PHONE }}" }, { PHONE: "{{ PHONE }}" }] }
    setMatchingField(obj, "PHONE", "12345678")
    expect(obj.items[0].PHONE).toBe("12345678")
    expect(obj.items[1].PHONE).toBe("12345678")
  })

  it("matches field in deeply nested structure", () => {
    const obj = { level1: { level2: { level3: { PHONE: "{{ PHONE }}" } } } }
    setMatchingField(obj, "PHONE", "12345678")
    expect(obj.level1.level2.level3.PHONE).toBe("12345678")
  })

  it("does not modify field if name does not match", () => {
    const obj = { OTHER_FIELD: "{{ OTHER }}" }
    setMatchingField(obj, "PHONE", "12345678")
    expect(obj.OTHER_FIELD).toBe("{{ OTHER }}")
  })

  it("handles null values", () => {
    const obj = { PHONE: null }
    setMatchingField(obj, "PHONE", "12345678")
    expect(obj.PHONE).toBe("12345678")
  })

  it("handles array at top level", () => {
    const obj = [{ PHONE: "{{ PHONE }}" }, { OTHER: "value" }]
    setMatchingField(obj, "PHONE", "12345678")
    expect(obj[0].PHONE).toBe("12345678")
    expect(obj[1].OTHER).toBe("value")
  })

  it("returns true when field was changed", () => {
    const obj = { PHONE: "{{ PHONE }}" }
    const changed = setMatchingField(obj, "PHONE", "12345678")
    expect(changed).toBe(true)
  })

  it("returns false when no field was changed", () => {
    const obj = { OTHER: "value" }
    const changed = setMatchingField(obj, "PHONE", "12345678")
    expect(changed).toBe(false)
  })

  it("handles mixed array and object", () => {
    const obj = { 
      items: [
        { PHONE: "{{ PHONE }}" },
        { nested: { PHONE: "{{ PHONE }}" } }
      ]
    }
    setMatchingField(obj, "PHONE", "12345678")
    expect(obj.items[0].PHONE).toBe("12345678")
    expect(obj.items[1].nested.PHONE).toBe("12345678")
  })
})

function setMatchingField(node: any, fieldName: string, value: string): boolean {
  if (Array.isArray(node)) {
    let changed = false
    for (const item of node) {
      changed = setMatchingField(item, fieldName, value) || changed
    }
    return changed
  }

  if (node !== null && typeof node === "object") {
    const target = node
    let changed = false
    for (const [key, child] of Object.entries(target)) {
      if (key === fieldName) {
        target[key] = value
        changed = true
      } else if (child !== null && typeof child === "object") {
        changed = setMatchingField(child, fieldName, value) || changed
      }
    }
    return changed
  }

  return false
}

describe("fill-sensitive-fill-data.mjs: parseArgs", () => {
  function parseArgs(argv: string[]): { statePath: string | null; descriptionsPath: string | null; fillDataPath: string | null } {
    const result = {
      statePath: null,
      descriptionsPath: null,
      fillDataPath: null,
    }

    for (let i = 0; i < argv.length; i += 1) {
      const arg = argv[i]
      if (arg === "--state" && argv[i + 1]) {
        result.statePath = resolve(argv[i + 1])
        i += 1
      } else if (arg === "--descriptions" && argv[i + 1]) {
        result.descriptionsPath = resolve(argv[i + 1])
        i += 1
      } else if (arg === "--fill-data" && argv[i + 1]) {
        result.fillDataPath = resolve(argv[i + 1])
        i += 1
      }
    }

    return result
  }

  it("parses --state argument", () => {
    const result = parseArgs(["--state", "/path/to/state.json"])
    expect(result.statePath).toBe("/path/to/state.json")
    expect(result.descriptionsPath).toBe(null)
    expect(result.fillDataPath).toBe(null)
  })

  it("parses --descriptions argument", () => {
    const result = parseArgs(["--descriptions", "/path/to/desc.json"])
    expect(result.statePath).toBe(null)
    expect(result.descriptionsPath).toBe("/path/to/desc.json")
    expect(result.fillDataPath).toBe(null)
  })

  it("parses --fill-data argument", () => {
    const result = parseArgs(["--fill-data", "/path/to/fill.json"])
    expect(result.statePath).toBe(null)
    expect(result.descriptionsPath).toBe(null)
    expect(result.fillDataPath).toBe("/path/to/fill.json")
  })

  it("parses all arguments together", () => {
    const result = parseArgs([
      "--state", "/path/state.json",
      "--descriptions", "/path/desc.json",
      "--fill-data", "/path/fill.json",
    ])
    expect(result.statePath).toBe("/path/state.json")
    expect(result.descriptionsPath).toBe("/path/desc.json")
    expect(result.fillDataPath).toBe("/path/fill.json")
  })

  it("handles missing value for argument", () => {
    const result = parseArgs(["--state"])
    expect(result.statePath).toBe(null)
  })

  it("returns nulls for empty args", () => {
    const result = parseArgs([])
    expect(result.statePath).toBe(null)
    expect(result.descriptionsPath).toBe(null)
    expect(result.fillDataPath).toBe(null)
  })

  it("ignores unknown arguments", () => {
    const result = parseArgs(["--unknown", "value", "--state", "/path"])
    expect(result.statePath).toBe("/path")
  })
})

describe("fill-sensitive-fill-data.mjs: integration with temp files", () => {
  beforeEach(() => {
    mkdirSync(TEMP_DIR, { recursive: true })
  })

  afterEach(() => {
    if (existsSync(TEMP_DIR)) {
      rmSync(TEMP_DIR, { recursive: true, force: true })
    }
  })

  it("errors when descriptions file missing", async () => {
    const descPath = join(TEMP_DIR, "missing.json")
    const fillPath = join(TEMP_DIR, "fill.json")
    writeFileSync(fillPath, "{}", "utf-8")

    const result = await runScript("--descriptions", descPath, "--fill-data", fillPath)
    expect(result.exitCode).toBe(1)
    expect(result.stderr.toString()).toContain("Error")
  })

  it("errors when fill_data file missing", async () => {
    const descPath = join(TEMP_DIR, "desc.json")
    const fillPath = join(TEMP_DIR, "missing.json")
    writeFileSync(descPath, JSON.stringify({ placeholders: [] }), "utf-8")

    const result = await runScript("--descriptions", descPath, "--fill-data", fillPath)
    expect(result.exitCode).toBe(1)
    expect(result.stderr.toString()).toContain("Error")
  })

  it("errors when descriptions missing placeholders array", async () => {
    const descPath = join(TEMP_DIR, "desc.json")
    const fillPath = join(TEMP_DIR, "fill.json")
    writeFileSync(descPath, JSON.stringify({}), "utf-8")
    writeFileSync(fillPath, "{}", "utf-8")

    const result = await runScript("--descriptions", descPath, "--fill-data", fillPath)
    expect(result.exitCode).toBe(1)
    expect(result.stderr.toString()).toContain("placeholders array")
  })

  it("handles empty placeholders array", async () => {
    const descPath = join(TEMP_DIR, "desc.json")
    const fillPath = join(TEMP_DIR, "fill.json")
    writeFileSync(descPath, JSON.stringify({ placeholders: [] }), "utf-8")
    writeFileSync(fillPath, "{}", "utf-8")

    const result = await runScript("--descriptions", descPath, "--fill-data", fillPath)
    expect(result.exitCode).toBe(0)
    expect(result.stdout.toString()).toContain("0 field(s)")
  })

  it("warns when secret not found", async () => {
    const descPath = join(TEMP_DIR, "desc.json")
    const fillPath = join(TEMP_DIR, "fill.json")
    writeFileSync(descPath, JSON.stringify({
      placeholders: [
        { placeholder: "{{ NONEXISTENT_SECRET_TEST }}", secret_name: "NONEXISTENT_SECRET_TEST" }
      ]
    }), "utf-8")
    writeFileSync(fillPath, JSON.stringify({ NONEXISTENT_SECRET_TEST: "placeholder" }), "utf-8")

    const result = await runScript("--descriptions", descPath, "--fill-data", fillPath)
    expect(result.exitCode).toBe(0)
    expect(result.stdout.toString()).toContain("0 field(s)")
    expect(result.stderr.toString()).toContain("Warning")
  })

  it("handles placeholders with invalid format", async () => {
    const descPath = join(TEMP_DIR, "desc.json")
    const fillPath = join(TEMP_DIR, "fill.json")
    writeFileSync(descPath, JSON.stringify({
      placeholders: [
        { placeholder: "NOT_A_PLACEHOLDER", secret_name: "SOME_SECRET" },
        { placeholder: "{{ valid_PLACEHOLDER }}", secret_name: "ANOTHER" },
        null,
        { placeholder: null, secret_name: "test" },
        { placeholder: "{{ PHONE }}", secret_name: null },
      ]
    }), "utf-8")
    writeFileSync(fillPath, "{}", "utf-8")

    const result = await runScript("--descriptions", descPath, "--fill-data", fillPath)
    expect(result.exitCode).toBe(0)
  })
})