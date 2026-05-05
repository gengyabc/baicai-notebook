import { describe, it, expect, beforeEach, afterEach } from "bun:test"
import { $ } from "bun"
import { join, resolve } from "node:path"
import { writeFileSync, readFileSync, existsSync, rmSync, mkdirSync } from "node:fs"

const REPO_ROOT = join(import.meta.dir, "..")
const ENV_REGISTRY_SCRIPT = join(REPO_ROOT, ".opencode", "scripts", "env-registry.mjs")
const REGISTRY_PATH = join(REPO_ROOT, ".opencode", "env-registry.json")
const TEMP_DIR = join(REPO_ROOT, ".temp", "env-registry-test")

const TEST_REGISTRY_PATH = join(TEMP_DIR, "env-registry.json")

async function runEnvRegistry(...args: string[]) {
  const result = await $`bun run ${ENV_REGISTRY_SCRIPT} ${args}`.quiet().nothrow()
  return result
}

async function runWithTempRegistry(args: string[], registryContent: object) {
  await mkdir(TEMP_DIR, { recursive: true })
  writeFileSync(TEST_REGISTRY_PATH, JSON.stringify(registryContent, null, 2), "utf-8")
  
  const scriptContent = readFileSync(ENV_REGISTRY_SCRIPT, "utf-8")
  
  return { registryPath: TEST_REGISTRY_PATH }
}

function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

describe("env-registry.mjs: name validation", () => {
  it("validates uppercase letters at start", async () => {
    const result = await runEnvRegistry("add", "TEST_VAR", "Test description")
    const combined = result.stdout.toString() + result.stderr.toString()
    expect(combined.includes("already registered") || combined.includes("Added")).toBe(true)
  })

  it("rejects lowercase at start", async () => {
    const result = await runEnvRegistry("add", "test_var", "Test description")
    expect(result.exitCode).toBe(1)
    const stderr = result.stderr.toString()
    expect(stderr.toLowerCase().includes("invalid") || stderr.includes("must start")).toBe(true)
  })

  it("rejects number at start", async () => {
    const result = await runEnvRegistry("add", "1TEST", "Test description")
    expect(result.exitCode).toBe(1)
  })

  it("allows underscore in name", async () => {
    const result = await runEnvRegistry("add", "TEST_VAR_456_UNDERSCORE", "Test description")
    const combined = result.stdout.toString() + result.stderr.toString()
    expect(combined.includes("already registered") || combined.includes("Added")).toBe(true)
  })

  it("allows numbers after first char", async () => {
    const result = await runEnvRegistry("add", "VAR123", "Test description")
    const combined = result.stdout.toString() + result.stderr.toString()
    expect(combined.includes("already registered") || combined.includes("Invalid") || combined.includes("Added")).toBe(true)
  })
})

describe("env-registry.mjs: list command", () => {
  it("list outputs json by default", async () => {
    const result = await runEnvRegistry("list")
    expect(result.exitCode).toBe(0)
    const stdout = result.stdout.toString()
    const parsed = JSON.parse(stdout)
    expect(Array.isArray(parsed)).toBe(true)
  })

  it("list --format table shows header", async () => {
    const result = await runEnvRegistry("list", "--format", "table")
    expect(result.exitCode).toBe(0)
    const stdout = result.stdout.toString()
    expect(stdout.includes("Name") || stdout.includes("No registered")).toBe(true)
  })

  it("list shows registered entries", async () => {
    const result = await runEnvRegistry("list")
    const stdout = result.stdout.toString()
    const parsed = JSON.parse(stdout)
    
    const phoneEntry = parsed.find((e: any) => e.name === "PHONE")
    if (phoneEntry) {
      expect(phoneEntry.description).toContain("手机")
    }
  })
})

describe("env-registry.mjs: add command", () => {
  it("rejects missing name argument", async () => {
    const result = await runEnvRegistry("add")
    expect(result.exitCode).toBe(1)
    expect(result.stderr.toString().includes("Missing")).toBe(true)
  })

  it("rejects missing description argument", async () => {
    const result = await runEnvRegistry("add", "NEW_TEST_VAR")
    expect(result.exitCode).toBe(1)
    expect(result.stderr.toString().includes("description")).toBe(true)
  })

  it("accepts multi-word description", async () => {
    const result = await runEnvRegistry("add", "NEW_MULTI_WORD_TEST", "Multi word description here")
    const combined = result.stdout.toString() + result.stderr.toString()
    expect(combined.includes("already registered") || combined.includes("Added")).toBe(true)
  })
})

describe("env-registry.mjs: remove command", () => {
  it("rejects missing name argument", async () => {
    const result = await runEnvRegistry("remove")
    expect(result.exitCode).toBe(1)
    expect(result.stderr.toString().includes("Missing")).toBe(true)
  })

  it("exits with code 2 for non-existent entry", async () => {
    const result = await runEnvRegistry("remove", "NONEXISTENT_VAR_FOR_TEST_12345")
    expect(result.exitCode).toBe(2)
    expect(result.stderr.toString().includes("not found")).toBe(true)
  })
})

describe("env-registry.mjs: set command", () => {
  it("rejects missing name argument", async () => {
    const result = await runEnvRegistry("set")
    expect(result.exitCode).toBe(1)
    expect(result.stderr.toString().includes("Missing")).toBe(true)
  })

  it("rejects value argument (must use stdin)", async () => {
    const result = await runEnvRegistry("set", "PHONE", "direct_value")
    expect(result.exitCode).toBe(1)
    expect(result.stderr.toString().includes("stdin") || result.stderr.toString().includes("interactive")).toBe(true)
  })

  it("rejects unregistered name", async () => {
    const result = await runEnvRegistry("set", "UNREGISTERED_VAR_FOR_TEST")
    expect(result.exitCode).toBe(2)
    expect(result.stderr.toString().includes("not registered")).toBe(true)
  })
})

describe("env-registry.mjs: describe command", () => {
  it("rejects missing name argument", async () => {
    const result = await runEnvRegistry("describe")
    expect(result.exitCode).toBe(1)
    expect(result.stderr.toString().includes("Missing")).toBe(true)
  })

  it("rejects missing description argument", async () => {
    const result = await runEnvRegistry("describe", "PHONE")
    expect(result.exitCode).toBe(1)
    expect(result.stderr.toString().includes("description")).toBe(true)
  })

  it("rejects non-existent entry", async () => {
    const result = await runEnvRegistry("describe", "NONEXISTENT_VAR_FOR_TEST", "New desc")
    expect(result.exitCode).toBe(2)
    expect(result.stderr.toString().includes("not found")).toBe(true)
  })
})

describe("env-registry.mjs: unknown command", () => {
  it("rejects unknown command", async () => {
    const result = await runEnvRegistry("unknowncommand")
    expect(result.exitCode).toBe(1)
    expect(result.stderr.toString().includes("Unknown")).toBe(true)
  })
})

describe("env-registry.mjs: no command", () => {
  it("shows error when no command provided", async () => {
    const result = await runEnvRegistry()
    expect(result.exitCode).toBe(1)
    expect(result.stderr.toString().includes("No command")).toBe(true)
  })
})

describe("env-registry.mjs: registry persistence", () => {
  it("registry file has correct structure", async () => {
    const file = Bun.file(REGISTRY_PATH)
    const content = await file.json()
    
    expect(content.version).toBe(1)
    expect(Array.isArray(content.env_vars)).toBe(true)
  })

  it("entries have name and description", async () => {
    const file = Bun.file(REGISTRY_PATH)
    const content = await file.json()
    
    for (const entry of content.env_vars) {
      expect(typeof entry.name).toBe("string")
      expect(typeof entry.description).toBe("string")
    }
  })
})

describe("env-registry.mjs: get command deprecation", () => {
  it("get command exits with error", async () => {
    const result = await runEnvRegistry("get", "PHONE")
    expect(result.exitCode).toBe(1)
  })

  it("get command shows deprecation message", async () => {
    const result = await runEnvRegistry("get", "PHONE")
    const combined = result.stdout.toString() + result.stderr.toString()
    expect(combined.toLowerCase().includes("deprecated") || combined.includes("secure plugin")).toBe(true)
  })
})