import { describe, it, expect } from "bun:test"
import { $ } from "bun"
import { join } from "node:path"

const REPO_ROOT = join(import.meta.dir, "..", "..")
const ENV_REGISTRY_SCRIPT = join(REPO_ROOT, ".opencode", "scripts", "env-registry.mjs")

async function runEnvRegistry(...args: string[]) {
  const result = await $`bun run ${ENV_REGISTRY_SCRIPT} ${args}`.quiet().nothrow()
  return result
}

describe("Batch3: Raw get deprecation", () => {
  it("get command exits 1", async () => {
    const result = await runEnvRegistry("get", "ANY_NAME")
    expect(result.exitCode).not.toBe(0)
  })

  it("get command prints deprecation message", async () => {
    const result = await runEnvRegistry("get", "ANY_NAME")
    const combined = result.stdout.toString() + result.stderr.toString()
    const lower = combined.toLowerCase()
    expect(lower.includes("secure plugin") || lower.includes("deprecated") || lower.includes("denied")).toBe(true)
  })

  it("get command no keychain lookup", async () => {
    const result = await runEnvRegistry("get", "NONEXISTENT_SECRET_FOR_TEST_08")
    const combined = result.stdout.toString() + result.stderr.toString()
    const lower = combined.toLowerCase()
    expect(!lower.includes("keychain") || lower.includes("deprecated") || lower.includes("denied")).toBe(true)
  })
})

describe("Batch3: Permission config", () => {
  async function readOpencodeJson() {
    const file = Bun.file(join(REPO_ROOT, "opencode.json"))
    return await file.json()
  }

  it("opencode.json has permission object", async () => {
    const config = await readOpencodeJson()
    expect("permission" in config).toBe(true)
  })

  it("bash denies node -e", async () => {
    const config = await readOpencodeJson()
    const bashRules = config.permission?.bash ?? {}
    const hasNodeEDeny = Object.entries(bashRules).some(
      ([key, value]) => key.includes("node -e") && value === "deny"
    )
    expect(hasNodeEDeny).toBe(true)
  })

  it("bash denies bun -e", async () => {
    const config = await readOpencodeJson()
    const bashRules = config.permission?.bash ?? {}
    const hasBunEDeny = Object.entries(bashRules).some(
      ([key, value]) => key.includes("bun -e") && value === "deny"
    )
    expect(hasBunEDeny).toBe(true)
  })

  it("bash denies bun eval", async () => {
    const config = await readOpencodeJson()
    const bashRules = config.permission?.bash ?? {}
    const hasBunEvalDeny = Object.entries(bashRules).some(
      ([key, value]) => key.includes("bun eval") && value === "deny"
    )
    expect(hasBunEvalDeny).toBe(true)
  })

  it("bash denies cross-keychain", async () => {
    const config = await readOpencodeJson()
    const bashRules = config.permission?.bash ?? {}
    const hasCrossKeychainDeny = Object.entries(bashRules).some(
      ([key, value]) => key.includes("cross-keychain") && value === "deny"
    )
    expect(hasCrossKeychainDeny).toBe(true)
  })

  it("bash denies keytar", async () => {
    const config = await readOpencodeJson()
    const bashRules = config.permission?.bash ?? {}
    const hasKeytarDeny = Object.entries(bashRules).some(
      ([key, value]) => key.includes("keytar") && value === "deny"
    )
    expect(hasKeytarDeny).toBe(true)
  })

  it("bash denies env-registry get", async () => {
    const config = await readOpencodeJson()
    const bashRules = config.permission?.bash ?? {}
    const hasGetDeny = Object.entries(bashRules).some(
      ([key, value]) => key.includes("env-registry.mjs get") && value === "deny"
    )
    expect(hasGetDeny).toBe(true)
  })

  it("edit denies allowlist", async () => {
    const config = await readOpencodeJson()
    const editRules = config.permission?.edit ?? {}
    const hasAllowlistDeny = Object.entries(editRules).some(
      ([key, value]) => key.includes("plugin-allowlist.json") && value === "deny"
    )
    expect(hasAllowlistDeny).toBe(true)
  })

  it("read denies secrets", async () => {
    const config = await readOpencodeJson()
    const readRules = config.permission?.read ?? {}
    const hasSecretsDeny = Object.entries(readRules).some(
      ([key, value]) => key.includes("secrets") && value === "deny"
    )
    expect(hasSecretsDeny).toBe(true)
  })
})

describe("Batch3: Doc boundary", () => {
  it("skill.md no raw get instruction", async () => {
    const file = Bun.file(join(REPO_ROOT, ".opencode", "skills", "env-registry", "SKILL.md"))
    const text = await file.text()
    const lines = text.split("\n")
    const getInstructionLines = lines.filter(
      (line) =>
        line.includes("env-registry.mjs get") &&
        !line.toLowerCase().includes("deny") &&
        !line.toLowerCase().includes("deprecated") &&
        !line.toLowerCase().includes("do not") &&
        !line.includes("不要")
    )
    expect(getInstructionLines.length).toBe(0)
  })

  
})

describe("Batch4: Anti-bypass", () => {
  async function readOpencodeJson() {
    const file = Bun.file(join(REPO_ROOT, "opencode.json"))
    return await file.json()
  }

  it("setup commands still exist", async () => {
    for (const cmd of ["list", "add", "remove", "set", "describe"]) {
      const result = await runEnvRegistry(cmd)
      const combined = result.stdout.toString() + result.stderr.toString()
      expect(combined.includes("Unknown command")).toBe(false)
    }
  })

  it("allowlist and handler mapping is explicit", async () => {
    const file = Bun.file(join(REPO_ROOT, ".opencode", "plugin-allowlist.json"))
    const allowlist = await file.json()
    expect(allowlist.version).toBe(1)
    for (const [serviceName, service] of Object.entries(allowlist.services)) {
      for (const [opName, opConfig] of Object.entries((service as any).operations)) {
        expect("handler" in (opConfig as any)).toBe(true)
        expect("secretName" in (opConfig as any)).toBe(true)
        expect("allowedArgs" in (opConfig as any)).toBe(true)
        expect(Array.isArray((opConfig as any).allowedArgs)).toBe(true)
      }
    }
  })

  it("plugin source no dynamic requires", async () => {
    const file = Bun.file(join(REPO_ROOT, ".opencode", "plugins", "secure-plugin-access.ts"))
    const source = await file.text()
    expect(!source.includes("require(") || source.includes("createRequire")).toBe(true)
    for (const line of source.split("\n")) {
      if (line.includes("import(")) {
        const stripped = line.trim()
        expect(stripped.startsWith("//") || line.split("import(")[1]?.split(")")[0]?.includes("cross-keychain")).toBe(true)
      }
    }
  })

  it("permission config has all required deny patterns", async () => {
    const config = await readOpencodeJson()
    const bashRules = Object.keys(config.permission?.bash ?? {})
    const editRules = Object.keys(config.permission?.edit ?? {})
    const readRules = Object.keys(config.permission?.read ?? {})
    expect(bashRules.some((k) => k.includes("node -e"))).toBe(true)
    expect(bashRules.some((k) => k.includes("bun -e"))).toBe(true)
    expect(bashRules.some((k) => k.includes("cross-keychain"))).toBe(true)
    expect(bashRules.some((k) => k.includes("keytar"))).toBe(true)
    expect(bashRules.some((k) => k.includes("env-registry.mjs get"))).toBe(true)
    expect(bashRules.some((k) => k.includes("security find-generic-password"))).toBe(true)
    expect(bashRules.some((k) => k.includes("security add-generic-password"))).toBe(true)
    expect(bashRules.some((k) => k.includes("security delete-generic-password"))).toBe(true)
    expect(bashRules.some((k) => k.includes("security dump-keychain"))).toBe(true)
    expect(editRules.some((k) => k.includes("plugin-allowlist.json"))).toBe(true)
    expect(readRules.some((k) => k.includes("secrets"))).toBe(true)
  })

  it("bash denies security find-generic-password", async () => {
    const config = await readOpencodeJson()
    const bashRules = config.permission?.bash ?? {}
    const hasSecurityDeny = Object.entries(bashRules).some(
      ([key, value]) => key.includes("security find-generic-password") && value === "deny"
    )
    expect(hasSecurityDeny).toBe(true)
  })

  it("bash denies security find", async () => {
    const config = await readOpencodeJson()
    const bashRules = config.permission?.bash ?? {}
    const hasSecurityFindDeny = Object.entries(bashRules).some(
      ([key, value]) => key.includes("security find") && value === "deny"
    )
    expect(hasSecurityFindDeny).toBe(true)
  })
})