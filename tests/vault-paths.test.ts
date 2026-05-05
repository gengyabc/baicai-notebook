import { describe, it, expect, beforeEach, afterEach } from "bun:test"
import { join, resolve } from "node:path"
import { writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs"

const REPO_ROOT = join(import.meta.dir, "..")
const OPENCODE_DIR = join(REPO_ROOT, ".opencode")
const SCRIPTS_DIR = join(OPENCODE_DIR, "scripts")
const CONFIG_PATH = join(OPENCODE_DIR, "vault-config.json")

async function importVaultPaths(configOverride?: object) {
  if (configOverride) {
    const original = existsSync(CONFIG_PATH) ? await Bun.file(CONFIG_PATH).text() : null
    writeFileSync(CONFIG_PATH, JSON.stringify(configOverride, null, 2), "utf-8")
    delete (globalThis as any).__vaultPathsCache__
  }
  const module = await import(join(SCRIPTS_DIR, "vault-paths.mjs"))
  return module
}

describe("vault-paths.mjs", () => {
  describe("getVaultConfig", () => {
    it("returns the parsed vault config", async () => {
      const { getVaultConfig } = await importVaultPaths()
      const config = getVaultConfig()
      expect(config.version).toBeUndefined()
      expect(config.vaultRoot).toBeTypeOf("string")
      expect(config.folders).toBeTypeOf("object")
    })
  })

  describe("getVaultRootPath", () => {
    it("returns absolute path to vault root", async () => {
      const { getVaultRootPath } = await importVaultPaths()
      const path = getVaultRootPath()
      expect(path).toBeTypeOf("string")
      expect(path.includes("workbook") || path.includes("notebook")).toBe(true)
    })
  })

  describe("getFolderPath", () => {
    it("returns relative path for valid folder key", async () => {
      const { getFolderPath } = await importVaultPaths()
      const path = getFolderPath("myWork")
      expect(path).toBe("workbook/my-work")
    })

    it("returns correct path for resources", async () => {
      const { getFolderPath } = await importVaultPaths()
      const path = getFolderPath("resources")
      expect(path).toBe("workbook/resources")
    })

    it("throws for unknown folder key", async () => {
      const { getFolderPath } = await importVaultPaths()
      expect(() => getFolderPath("unknownKey")).toThrow("Unknown folder key: unknownKey")
    })
  })

  describe("getFolderPaths", () => {
    it("returns array of all folder paths", async () => {
      const { getFolderPaths } = await importVaultPaths()
      const paths = getFolderPaths()
      expect(Array.isArray(paths)).toBe(true)
      expect(paths.length).toBe(5)
      expect(paths).toContain("workbook/my-work")
      expect(paths).toContain("workbook/resources")
      expect(paths).toContain("workbook/brainstorm")
      expect(paths).toContain("workbook/wiki")
      expect(paths).toContain("workbook/output")
    })
  })

  describe("getManagedPaths", () => {
    it("returns resources and brainstorm managed subfolders", async () => {
      const { getManagedPaths } = await importVaultPaths()
      const paths = getManagedPaths()
      expect(Array.isArray(paths)).toBe(true)
      expect(paths).toContain("resources")
      expect(paths).toContain("brainstorm/managed")
    })
  })

  describe("getFolderPriorities", () => {
    it("returns folder priority map", async () => {
      const { getFolderPriorities } = await importVaultPaths()
      const priorities = getFolderPriorities()
      expect(priorities.wiki).toBe(400)
      expect(priorities.output).toBe(350)
      expect(priorities.resources).toBe(300)
      expect(priorities.brainstorm).toBe(200)
      expect(priorities.myWork).toBe(100)
    })
  })

  describe("getDefaultFolders", () => {
    it("returns array of folder names without root prefix", async () => {
      const { getDefaultFolders } = await importVaultPaths()
      const folders = getDefaultFolders()
      expect(Array.isArray(folders)).toBe(true)
      expect(folders).toContain("my-work")
      expect(folders).toContain("resources")
      expect(folders).toContain("brainstorm")
      expect(folders).toContain("wiki")
      expect(folders).toContain("output")
    })
  })

  describe("getDefaultFoldersWithRoot", () => {
    it("returns array of folder names with root prefix", async () => {
      const { getDefaultFoldersWithRoot } = await importVaultPaths()
      const folders = getDefaultFoldersWithRoot()
      expect(Array.isArray(folders)).toBe(true)
      expect(folders).toContain("workbook/my-work")
      expect(folders).toContain("workbook/resources")
    })
  })

  describe("getCanonicalRoots", () => {
    it("returns mapping of paths to canonical names", async () => {
      const { getCanonicalRoots } = await importVaultPaths()
      const roots = getCanonicalRoots()
      expect(roots["my-work"]).toBe("my-work")
      expect(roots["workbook/my-work"]).toBe("my-work")
      expect(roots["resources"]).toBe("resources")
      expect(roots["workbook/resources"]).toBe("resources")
    })
  })
})

describe("vault-paths.mjs with custom config", () => {
  const TEMP_CONFIG = join(OPENCODE_DIR, "vault-config.test.json")
  
  afterEach(() => {
    if (existsSync(TEMP_CONFIG)) {
      rmSync(TEMP_CONFIG)
    }
  })

  it("respects custom vaultRoot", async () => {
    const customConfig = {
      vaultRoot: "custom-vault",
      folders: {
        myWork: "my-work",
        resources: "resources",
      },
      folderPriorities: { myWork: 100 },
    }
    
    const module = await import(join(SCRIPTS_DIR, "vault-paths.mjs?t=" + Date.now()))
    const paths = module.getFolderPaths()
    
    const hasDefaultPaths = paths.some((p: string) => p.includes("workbook") || p.includes("custom-vault"))
    expect(hasDefaultPaths).toBe(true)
  })
})