import { describe, it, expect, beforeAll, afterAll } from "bun:test"
import { $ } from "bun"
import { join } from "node:path"
import { createHash } from "node:crypto"

const REPO_ROOT = join(import.meta.dir, "..")
const OPENCODE_DIR = join(REPO_ROOT, ".opencode")
const HARNESS = join(OPENCODE_DIR, "scripts", "run-secure-action-harness.mjs")
const FIXTURE_SECRET_NAME = "SECURE_PLUGIN_FIXTURE_SECRET"
const FIXTURE_SECRET_VALUE = "test-secret-value-for-plugin-08"

async function bunRun(...args: string[]) {
  return await $`bun run ${HARNESS} ${args}`.quiet().nothrow().cwd(OPENCODE_DIR)
}

async function runSecureAction(service: string, operation: string, args?: Record<string, string>) {
  const input = JSON.stringify({ service, operation, args: args ?? {} })
  const result = await bunRun("run-secure-action", input)
  if (result.exitCode !== 0) {
    throw new Error(`harness failed: ${result.stderr.toString()}`)
  }
  return JSON.parse(result.stdout.toString().trim())
}

describe("Batch1: Plugin contract", () => {
  it("malformed input missing service", async () => {
    const result = await runSecureAction("", "derive-digest", { salt: "x" })
    expect(result.ok).toBe(false)
    expect(result.error).toBe("malformed-input")
  })

  it("malformed input missing operation", async () => {
    const result = await runSecureAction("fixture-secret", "", { salt: "x" })
    expect(result.ok).toBe(false)
    expect(result.error).toBe("malformed-input")
  })

  it("malformed input no args", async () => {
    const input = JSON.stringify({ service: "fixture-secret", operation: "derive-digest" })
    const result = await bunRun("run-secure-action", input)
    const parsed = JSON.parse(result.stdout.toString().trim())
    expect(parsed.ok).toBe(false)
    expect(parsed.error).toBe("malformed-input")
  })

  it("unknown service rejected", async () => {
    const result = await runSecureAction("unknown-service", "any", {})
    expect(result.ok).toBe(false)
    expect(result.error).toBe("unknown-service")
  })

  it("unknown operation rejected", async () => {
    const result = await runSecureAction("fixture-secret", "unknown-op", {})
    expect(result.ok).toBe(false)
    expect(result.error).toBe("unknown-operation")
  })

  it("extra arg keys rejected", async () => {
    const result = await runSecureAction("fixture-secret", "derive-digest", { salt: "x", extra: "bad" })
    expect(result.ok).toBe(false)
    expect(result.error).toContain("invalid-args")
  })

  it("missing required arg rejected", async () => {
    const result = await runSecureAction("fixture-secret", "derive-digest", {})
    expect(result.ok).toBe(false)
    expect(result.error).toContain("invalid-args")
  })

  it("allowlisted operation returns deterministic digest", async () => {
    await bunRun("seed-secret", FIXTURE_SECRET_NAME, FIXTURE_SECRET_VALUE)
    try {
      const result = await runSecureAction("fixture-secret", "derive-digest", { salt: "test-salt" })
      expect(result.ok).toBe(true)
      const expected = createHash("sha256")
        .update(FIXTURE_SECRET_VALUE + ":test-salt")
        .digest("hex")
      expect(result.digest).toBe(expected)
      expect(result.digest).not.toBe(FIXTURE_SECRET_VALUE)
    } finally {
      await bunRun("remove-secret", FIXTURE_SECRET_NAME)
    }
  })

  it("result does not contain secret", async () => {
    await bunRun("seed-secret", FIXTURE_SECRET_NAME, FIXTURE_SECRET_VALUE)
    try {
      const result = await runSecureAction("fixture-secret", "derive-digest", { salt: "test-salt" })
      const resultStr = JSON.stringify(result)
      expect(resultStr).not.toContain(FIXTURE_SECRET_VALUE)
    } finally {
      await bunRun("remove-secret", FIXTURE_SECRET_NAME)
    }
  })
})

describe("Batch2: Sanitization", () => {
  it("error containing secret is sanitized", async () => {
    await bunRun("seed-secret", FIXTURE_SECRET_NAME, FIXTURE_SECRET_VALUE)
    try {
      const result = await runSecureAction("fixture-secret", "derive-digest", { salt: "" })
      expect(result.ok).toBe(false)
      const resultStr = JSON.stringify(result)
      expect(resultStr).not.toContain(FIXTURE_SECRET_VALUE)
    } finally {
      await bunRun("remove-secret", FIXTURE_SECRET_NAME)
    }
  })

  it("missing secret returns generic failure", async () => {
    await bunRun("remove-secret", FIXTURE_SECRET_NAME)
    const result = await runSecureAction("fixture-secret", "derive-digest", { salt: "x" })
    expect(result.ok).toBe(false)
    expect(result.error).toBe("secret-missing")
    const resultStr = JSON.stringify(result)
    expect(resultStr).not.toContain(FIXTURE_SECRET_VALUE)
    expect(resultStr).not.toContain(FIXTURE_SECRET_NAME)
  })
})

describe("Batch2: Code paths", () => {
  it("plugin source has sanitized-output-blocked path", async () => {
    const file = Bun.file(join(OPENCODE_DIR, "plugins", "secure-plugin-access.ts"))
    const source = await file.text()
    expect(source.includes("sanitized-output-blocked")).toBe(true)
  })

  it("plugin source has handler-not-found path", async () => {
    const file = Bun.file(join(OPENCODE_DIR, "plugins", "secure-plugin-access.ts"))
    const source = await file.text()
    expect(source.includes("handler-not-found")).toBe(true)
  })

  it("plugin sanitize value function exists", async () => {
    const file = Bun.file(join(OPENCODE_DIR, "plugins", "secure-plugin-access.ts"))
    const source = await file.text()
    expect(source.includes("sanitizeValue") || source.includes("sanitizePayload")).toBe(true)
    expect(source.includes("[REDACTED_SECRET]")).toBe(true)
  })

  it("allowlist handlers all present in plugin", async () => {
    const allowlistFile = Bun.file(join(OPENCODE_DIR, "plugin-allowlist.json"))
    const allowlist = await allowlistFile.json()
    const pluginFile = Bun.file(join(OPENCODE_DIR, "plugins", "secure-plugin-access.ts"))
    const source = await pluginFile.text()
    for (const [serviceName, service] of Object.entries(allowlist.services as Record<string, any>)) {
      for (const [opName, opConfig] of Object.entries(service.operations)) {
        const handlerName = opConfig.handler
        expect(source.includes(handlerName)).toBe(true)
      }
    }
  })

  it("sanitize payload redacts secret from result", async () => {
    const payload = JSON.stringify({ ok: true, data: FIXTURE_SECRET_VALUE })
    const result = await bunRun("test-sanitize", payload, FIXTURE_SECRET_VALUE)
    const parsed = JSON.parse(result.stdout.toString().trim())
    expect(parsed.wasRedacted).toBe(true)
    const resultStr = JSON.stringify(parsed.result)
    expect(resultStr).not.toContain(FIXTURE_SECRET_VALUE)
    expect(resultStr).toContain("[REDACTED_SECRET]")
  })

  it("sanitize payload detects semantic drift in digest", async () => {
    const payload = JSON.stringify({ ok: true, digest: FIXTURE_SECRET_VALUE })
    const result = await bunRun("test-sanitize", payload, FIXTURE_SECRET_VALUE)
    const parsed = JSON.parse(result.stdout.toString().trim())
    expect(parsed.wasRedacted).toBe(true)
    expect(parsed.result.digest).not.toBe(FIXTURE_SECRET_VALUE)
  })

  it("sanitize payload no redaction when secret absent", async () => {
    const payload = JSON.stringify({ ok: true, digest: "abc123" })
    const result = await bunRun("test-sanitize", payload, FIXTURE_SECRET_VALUE)
    const parsed = JSON.parse(result.stdout.toString().trim())
    expect(parsed.wasRedacted).toBe(false)
    expect(parsed.result.digest).toBe("abc123")
  })
})