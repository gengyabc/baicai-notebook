import { readFileSync, existsSync } from "fs"
import { join, resolve } from "path"

interface VaultConfig {
  vaultRoot: string
}

let cachedVaultRoot: string | null = null
let configLoadTime = 0
const CONFIG_CACHE_TTL = 5000

function loadVaultConfig(directory: string): string {
  const now = Date.now()
  if (cachedVaultRoot && (now - configLoadTime) < CONFIG_CACHE_TTL) {
    return cachedVaultRoot
  }

  try {
    const configPath = resolve(join(directory, ".opencode", "vault-config.json"))
    if (!existsSync(configPath)) {
      cachedVaultRoot = "workbook"
      configLoadTime = now
      return cachedVaultRoot
    }
    const configContent = readFileSync(configPath, "utf-8")
    const config: VaultConfig = JSON.parse(configContent)
    cachedVaultRoot = config.vaultRoot || "workbook"
    configLoadTime = now
    return cachedVaultRoot
  } catch {
    cachedVaultRoot = "workbook"
    configLoadTime = now
    return cachedVaultRoot
  }
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function isVaultDeleteCommand(command: string, vaultRoot: string): boolean {
  const deletePatterns = [
    /\brm\s+(-[a-zA-Z]*\s+)*['"]?[^'"]*vaultRoot['"]?/,
    /\brmdir\s+/,
    /\bfind\s+.*-delete\b/,
    /\bshred\b/,
    /\bunlink\b/,
    /\bdel\s+/,
    /\berase\b/,
  ]

  const hasDeleteCommand = deletePatterns.some(pattern => {
    const patternWithVault = new RegExp(pattern.source.replace("vaultRoot", escapeRegExp(vaultRoot)))
    return patternWithVault.test(command)
  })

  if (!hasDeleteCommand) return false

  const vaultPathPatterns = [
    new RegExp(`(^|\\s)${escapeRegExp(vaultRoot)}[/\\\\]`, "g"),
    new RegExp(`(^|\\s)\\.\\.[/\\\\]${escapeRegExp(vaultRoot)}[/\\\\]`, "g"),
    new RegExp(`(^|\\s)\\.\\/${escapeRegExp(vaultRoot)}[/\\\\]`, "g"),
    new RegExp(`["'].*[/\\\\]${escapeRegExp(vaultRoot)}[/\\\\]`, "g"),
  ]

  return vaultPathPatterns.some(pattern => pattern.test(command))
}

export const VaultDeleteProtection = async ({ directory }: { directory: string }) => {
  const vaultRoot = loadVaultConfig(directory)

  return {
    "tool.execute.before": async (input: any, output: any) => {
      if (input?.tool !== "bash") return

      const command = output?.args?.command || ""
      const trimmedCommand = command.trim()
      if (!trimmedCommand) return

      if (isVaultDeleteCommand(trimmedCommand, vaultRoot)) {
        throw new Error(
          `Vault Delete Protection: Deleting files in the vault directory "${vaultRoot}/" is not allowed. ` +
          `Use move, rename, or archive operations instead. ` +
          `See .opencode/rules/vault-delete-protection.md for details.`
        )
      }
    },
  }
}

export default VaultDeleteProtection
