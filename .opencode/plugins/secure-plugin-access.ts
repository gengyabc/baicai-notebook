import { createRequire } from "node:module"
import { createHash } from "node:crypto"
import type { Plugin } from "@opencode-ai/plugin"
import { tool } from "@opencode-ai/plugin"

const require = createRequire(import.meta.url)

type AllowlistEntry = {
  secretName: string
  handler: string
  allowedArgs: string[]
}

type AllowlistConfig = {
  version: number
  services: Record<string, {
    operations: Record<string, AllowlistEntry>
  }>
}

type SecureActionInput = {
  service: string
  operation: string
  args: Record<string, unknown>
}

type SecureActionHandler = (input: {
  secret: string
  args: Record<string, unknown>
}) => Promise<Record<string, unknown>>

const KEYRING_SERVICE = "opencode-env-registry"

async function resolveSecret(secretName: string): Promise<string | null> {
  const { getPassword } = await import("cross-keychain")
  return getPassword(KEYRING_SERVICE, secretName)
}

function loadAllowlist(): AllowlistConfig {
  const config = require("../plugin-allowlist.json") as AllowlistConfig
  if (config.version !== 1) {
    throw new Error(`Unsupported allowlist version: ${config.version}`)
  }
  return config
}

const ALLOWLIST = loadAllowlist()

async function fixtureSecretDeriveDigest(
  input: { secret: string; args: Record<string, unknown> }
): Promise<Record<string, unknown>> {
  const salt = input.args.salt
  if (typeof salt !== "string" || salt.length === 0) {
    throw new Error("args.salt is required and must be a non-empty string")
  }
  const digest = createHash("sha256")
    .update(input.secret + ":" + salt)
    .digest("hex")
  return { ok: true, digest }
}

const HANDLERS: Record<string, SecureActionHandler> = {
  fixtureSecretDeriveDigest,
}

export function sanitizeValue(value: unknown, secret: string): unknown {
  if (typeof value === "string") {
    return value.split(secret).join("[REDACTED_SECRET]")
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, secret))
  }
  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(value)) {
      result[key] = sanitizeValue(val, secret)
    }
    return result
  }
  return value
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (typeof a !== typeof b) return false
  if (a === null || b === null) return false
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    return a.every((item, i) => deepEqual(item, b[i]))
  }
  if (typeof a === "object" && typeof b === "object") {
    const aObj = a as Record<string, unknown>
    const bObj = b as Record<string, unknown>
    const aKeys = Object.keys(aObj)
    const bKeys = Object.keys(bObj)
    if (aKeys.length !== bKeys.length) return false
    return aKeys.every((key) => deepEqual(aObj[key], bObj[key]))
  }
  return false
}

function sanitizeString(str: string, secret: string): string {
  return str.split(secret).join("[REDACTED_SECRET]")
}

export function sanitizePayload(
  payload: Record<string, unknown>,
  secret: string
): { result: Record<string, unknown>; wasRedacted: boolean } {
  const sanitized = sanitizeValue(payload, secret) as Record<string, unknown>
  const wasRedacted = !deepEqual(payload, sanitized)
  return { result: sanitized, wasRedacted }
}

function isDigestSemanticallyMeaningful(
  original: Record<string, unknown>,
  sanitized: Record<string, unknown>
): boolean {
  if (typeof original.digest === "string" && typeof sanitized.digest === "string") {
    return original.digest === sanitized.digest
  }
  return true
}

export async function runSecureAction(
  input: SecureActionInput
): Promise<Record<string, unknown>> {
  if (
    !input ||
    typeof input !== "object" ||
    typeof input.service !== "string" ||
    typeof input.operation !== "string" ||
    !input.service ||
    !input.operation
  ) {
    return { ok: false, error: "malformed-input" }
  }

  if (typeof input.args !== "object" || input.args === null || Array.isArray(input.args)) {
    return { ok: false, error: "malformed-input" }
  }

  const serviceConfig = ALLOWLIST.services[input.service]
  if (!serviceConfig) {
    return { ok: false, error: "unknown-service" }
  }

  const operationConfig = serviceConfig.operations[input.operation]
  if (!operationConfig) {
    return { ok: false, error: "unknown-operation" }
  }

  const argKeys = Object.keys(input.args)
  const extraKeys = argKeys.filter((k) => !operationConfig.allowedArgs.includes(k))
  if (extraKeys.length > 0) {
    return { ok: false, error: "invalid-args", detail: `extra keys: ${extraKeys.join(", ")}` }
  }

  for (const requiredKey of operationConfig.allowedArgs) {
    if (!(requiredKey in input.args)) {
      return { ok: false, error: "invalid-args", detail: `missing key: ${requiredKey}` }
    }
  }

  const handler = HANDLERS[operationConfig.handler]
  if (!handler) {
    return { ok: false, error: "handler-not-found" }
  }

  let secret: string
  try {
    const value = await resolveSecret(operationConfig.secretName)

    if (!value) {
      return { ok: false, error: "secret-missing" }
    }
    secret = value
  } catch {
    return { ok: false, error: "secret-missing" }
  }

  try {
    const rawResult = await handler({ secret, args: input.args })

    const { result: sanitizedResult, wasRedacted } = sanitizePayload(rawResult, secret)
    if (wasRedacted && !isDigestSemanticallyMeaningful(rawResult, sanitizedResult)) {
      return { ok: false, error: "sanitized-output-blocked" }
    }

    return sanitizedResult
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, error: sanitizeString(message, secret) }
  }
}

export const SecurePluginAccess: Plugin = async () => {
  return {
    tool: {
      secure_action: tool({
        description:
          "Run an allowlisted secure action that consumes a secret and returns a sanitized result. The secret value is never exposed.",
        args: {
          service: tool.schema.string().min(1),
          operation: tool.schema.string().min(1),
          args: tool.schema.object({
            salt: tool.schema.string().min(1),
          }).strict(),
        },
        async execute(args) {
          const result = await runSecureAction({
            service: args.service,
            operation: args.operation,
            args: args.args as Record<string, unknown>,
          })
          return JSON.stringify(result)
        },
      }),
    },
  }
}

export default SecurePluginAccess
