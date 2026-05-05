import { describe, it, expect, beforeAll, afterAll } from "bun:test"
import { $ } from "bun"
import { join } from "node:path"

const REPO_ROOT = join(import.meta.dir, "..")
const OPENCODE_DIR = join(REPO_ROOT, ".opencode")
const HARNESS = join(OPENCODE_DIR, "scripts", "run-secure-action-harness.mjs")

async function runHarness(...args: string[]) {
  return await $`bun run ${HARNESS} ${args}`.quiet().nothrow().cwd(OPENCODE_DIR)
}

describe("run-secure-action-harness.mjs: command routing", () => {
  it("rejects unknown command", async () => {
    const result = await runHarness("unknown-command")
    expect(result.exitCode).toBe(1)
    expect(result.stderr.toString()).toContain("Unknown command")
  })

  it("accepts run-secure-action command", async () => {
    const input = JSON.stringify({ service: "fixture-secret", operation: "derive-digest", args: { salt: "test" } })
    const result = await runHarness("run-secure-action", input)
    expect(result.exitCode).toBe(0)
  })

  it("accepts seed-secret command", async () => {
    const result = await runHarness("seed-secret", "TEST_SECRET_FOR_HARNESS", "test-value")
    expect(result.exitCode).toBe(0)
    expect(result.stdout.toString()).toContain("ok")
  })

  it("accepts remove-secret command", async () => {
    await runHarness("seed-secret", "TEST_SECRET_FOR_REMOVE", "value")
    const result = await runHarness("remove-secret", "TEST_SECRET_FOR_REMOVE")
    expect(result.exitCode).toBe(0)
    expect(result.stdout.toString()).toContain("ok")
  })

  it("accepts test-sanitize command", async () => {
    const payload = JSON.stringify({ ok: true, data: "secret-value" })
    const result = await runHarness("test-sanitize", payload, "secret-value")
    expect(result.exitCode).toBe(0)
    expect(result.stdout.toString()).toContain("wasRedacted")
  })
})

describe("run-secure-action-harness.mjs: seed-secret", () => {
  const TEST_SECRET_NAME = "HARNESS_TEST_SEED_SECRET"

  afterAll(async () => {
    await runHarness("remove-secret", TEST_SECRET_NAME)
  })

  it("seeds a secret and returns ok", async () => {
    const result = await runHarness("seed-secret", TEST_SECRET_NAME, "test-secret-value-123")
    expect(result.exitCode).toBe(0)
    const output = JSON.parse(result.stdout.toString().trim())
    expect(output.ok).toBe(true)
  })
})

describe("run-secure-action-harness.mjs: remove-secret", () => {
  it("removes existing secret", async () => {
    const name = "HARNESS_TEST_REMOVE_SECRET"
    await runHarness("seed-secret", name, "value")
    const result = await runHarness("remove-secret", name)
    expect(result.exitCode).toBe(0)
    const output = JSON.parse(result.stdout.toString().trim())
    expect(output.ok).toBe(true)
  })

  it("handles removing non-existent secret gracefully", async () => {
    const result = await runHarness("remove-secret", "NONEXISTENT_SECRET_HARNESS")
    expect(result.exitCode).toBe(0)
    const output = JSON.parse(result.stdout.toString().trim())
    expect(output.ok).toBe(true)
  })
})

describe("run-secure-action-harness.mjs: test-sanitize", () => {
  it("redacts secret from payload", async () => {
    const secret = "my-secret-value-123"
    const payload = JSON.stringify({ ok: true, message: "my-secret-value-123 was used" })
    const result = await runHarness("test-sanitize", payload, secret)
    expect(result.exitCode).toBe(0)
    const output = JSON.parse(result.stdout.toString().trim())
    expect(output.wasRedacted).toBe(true)
    expect(output.result.message).toContain("[REDACTED_SECRET]")
  })

  it("does not redact when secret not present", async () => {
    const secret = "my-secret-value-123"
    const payload = JSON.stringify({ ok: true, message: "no secrets here" })
    const result = await runHarness("test-sanitize", payload, secret)
    expect(result.exitCode).toBe(0)
    const output = JSON.parse(result.stdout.toString().trim())
    expect(output.wasRedacted).toBe(false)
    expect(output.result.message).toBe("no secrets here")
  })

  it("handles nested object sanitization", async () => {
    const secret = "nested-secret"
    const payload = JSON.stringify({ data: { nested: { value: "nested-secret" } } })
    const result = await runHarness("test-sanitize", payload, secret)
    expect(result.exitCode).toBe(0)
    const output = JSON.parse(result.stdout.toString().trim())
    expect(output.wasRedacted).toBe(true)
    expect(output.result.data.nested.value).toBe("[REDACTED_SECRET]")
  })

  it("handles array sanitization", async () => {
    const secret = "array-secret"
    const payload = JSON.stringify({ items: ["array-secret", "other", "array-secret"] })
    const result = await runHarness("test-sanitize", payload, secret)
    expect(result.exitCode).toBe(0)
    const output = JSON.parse(result.stdout.toString().trim())
    expect(output.wasRedacted).toBe(true)
    expect(output.result.items[0]).toBe("[REDACTED_SECRET]")
    expect(output.result.items[1]).toBe("other")
    expect(output.result.items[2]).toBe("[REDACTED_SECRET]")
  })
})

describe("run-secure-action-harness.mjs: run-secure-action", () => {
  const TEST_SECRET_NAME = "FIXTURE_SECRET_FOR_TEST"

  beforeAll(async () => {
    await runHarness("seed-secret", TEST_SECRET_NAME, "fixture-test-secret-value")
  })

  afterAll(async () => {
    await runHarness("remove-secret", TEST_SECRET_NAME)
  })

  it("validates malformed input missing service", async () => {
    const input = JSON.stringify({ service: "", operation: "derive-digest", args: { salt: "test" } })
    const result = await runHarness("run-secure-action", input)
    expect(result.exitCode).toBe(0)
    const output = JSON.parse(result.stdout.toString().trim())
    expect(output.ok).toBe(false)
    expect(output.error).toBe("malformed-input")
  })

  it("validates malformed input missing operation", async () => {
    const input = JSON.stringify({ service: "fixture-secret", operation: "", args: { salt: "test" } })
    const result = await runHarness("run-secure-action", input)
    expect(result.exitCode).toBe(0)
    const output = JSON.parse(result.stdout.toString().trim())
    expect(output.ok).toBe(false)
    expect(output.error).toBe("malformed-input")
  })

  it("rejects unknown service", async () => {
    const input = JSON.stringify({ service: "unknown-service", operation: "any", args: {} })
    const result = await runHarness("run-secure-action", input)
    expect(result.exitCode).toBe(0)
    const output = JSON.parse(result.stdout.toString().trim())
    expect(output.ok).toBe(false)
    expect(output.error).toBe("unknown-service")
  })
})