import { readFile, writeFile } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { getPassword } from "cross-keychain"

const KEYRING_SERVICE = "opencode-env-registry"
const SIMPLE_PLACEHOLDER_PATTERN = /^\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}$/

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(join(__dirname, "..", ".."))
const DEFAULT_STATE_PATH = join(REPO_ROOT, ".temp", ".current_task.json")

function parseArgs(argv) {
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

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf-8"))
}

function extractFieldName(placeholder) {
  const match = SIMPLE_PLACEHOLDER_PATTERN.exec(placeholder)
  return match ? match[1] : null
}

function setMatchingField(node, fieldName, value) {
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

async function loadTaskPaths(parsedArgs) {
  if (parsedArgs.descriptionsPath && parsedArgs.fillDataPath) {
    return {
      descriptionsPath: parsedArgs.descriptionsPath,
      fillDataPath: parsedArgs.fillDataPath,
    }
  }

  const statePath = parsedArgs.statePath ?? DEFAULT_STATE_PATH
  const state = await readJson(statePath)
  if (!state || typeof state.task !== "string" || typeof state.version !== "number") {
    throw new Error(`Invalid task state: ${statePath}`)
  }

  const baseDir = join(REPO_ROOT, ".temp", state.task, `temp-v${state.version}`)
  return {
    descriptionsPath: join(baseDir, "descriptions.json"),
    fillDataPath: join(baseDir, "fill_data.json"),
  }
}

async function fillSecretsIntoFillData({ descriptionsPath, fillDataPath }) {
  const descriptions = await readJson(descriptionsPath)
  const placeholders = Array.isArray(descriptions.placeholders) ? descriptions.placeholders : null
  if (!placeholders) {
    throw new Error(`Descriptions JSON must contain a placeholders array: ${descriptionsPath}`)
  }

  const fillData = await readJson(fillDataPath)
  const secretBindings = new Map()

  for (const item of placeholders) {
    if (!item || typeof item !== "object") continue
    const placeholder = item.placeholder
    const secretName = item.secret_name
    if (typeof placeholder !== "string" || typeof secretName !== "string" || !secretName) continue
    const fieldName = extractFieldName(placeholder)
    if (!fieldName) continue
    secretBindings.set(fieldName, secretName)
  }

  let filledCount = 0
  const missing = []
  for (const [fieldName, secretName] of secretBindings.entries()) {
    let secretValue = null
    try {
      secretValue = await getPassword(KEYRING_SERVICE, secretName)
    } catch (err) {
      missing.push({ fieldName, secretName, reason: err.message || "unknown error" })
      continue
    }

    if (!secretValue) {
      missing.push({ fieldName, secretName, reason: "not found in keychain" })
      continue
    }

    if (setMatchingField(fillData, fieldName, secretValue)) {
      filledCount += 1
    }
  }

  if (missing.length > 0) {
    process.stderr.write(`Warning: ${missing.length} secret(s) could not be retrieved:\n`)
    for (const { fieldName, secretName, reason } of missing) {
      process.stderr.write(`  - {{ ${fieldName} }} (${secretName}): ${reason}\n`)
    }
  }

  await writeFile(fillDataPath, JSON.stringify(fillData, null, 2) + "\n", "utf-8")
  return { filledCount, fillDataPath }
}

async function main() {
  const parsedArgs = parseArgs(process.argv.slice(2))
  const paths = await loadTaskPaths(parsedArgs)
  const result = await fillSecretsIntoFillData(paths)
  process.stdout.write(`Sensitive fill data updated: ${result.filledCount} field(s) filled at ${result.fillDataPath}\n`)
}

main().catch((err) => {
  process.stderr.write(`Error: ${err.message}\n`)
  process.exit(1)
})
