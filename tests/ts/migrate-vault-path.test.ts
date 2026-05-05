import { describe, it, expect, beforeEach, afterEach } from "bun:test"
import { $ } from "bun"
import { join, resolve } from "node:path"
import { writeFileSync, readFileSync, existsSync, rmSync, mkdirSync } from "node:fs"

const REPO_ROOT = join(import.meta.dir, "..", "..")
const SCRIPT = join(REPO_ROOT, ".opencode", "scripts", "migrate-vault-path.mjs")
const TEMP_DIR = join(REPO_ROOT, ".temp", "migrate-vault-test")

function migrateContent(content: string, oldRoot: string, newRoot: string): string {
  const FOLDER_NAMES = ["my-work", "resources", "brainstorm", "wiki", "output"]
  const FOLDER_ALIASES: Record<string, string[]> = {
    "my-work": ["My-work", "My-Work"],
    "resources": ["Resources"],
    "brainstorm": ["Brainstorm"],
    "wiki": ["Wiki"],
    "output": ["Output"],
  }

  function escapeRegExp(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  }

  let result = content

  for (const folder of FOLDER_NAMES) {
    const patterns = [
      `${oldRoot}/${folder}/`,
      `${oldRoot}/${folder}`,
    ]

    for (const alias of FOLDER_ALIASES[folder] || []) {
      patterns.push(`${oldRoot}/${alias}/`)
      patterns.push(`${oldRoot}/${alias}`)
    }

    for (const pattern of patterns) {
      const newPattern = pattern.replace(oldRoot, newRoot)
      result = result.split(pattern).join(newPattern)
    }
  }

  result = result.replace(new RegExp(`\\b${escapeRegExp(oldRoot)}\\b`, "g"), newRoot)

  return result
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function shouldProcessFile(fileName: string): boolean {
  const TEXT_FILE_EXTENSIONS = new Set([".md", ".py", ".mjs", ".js", ".ts", ".json", ".yaml", ".yml", ".txt"])
  const ext = fileName.split(".").pop() || ""
  return TEXT_FILE_EXTENSIONS.has(`.${ext}`) || fileName === "AGENTS.md"
}

describe("migrate-vault-path.mjs: migrateContent", () => {
  it("migrates workbook/my-work to notebook/my-work", () => {
    const content = "See workbook/my-work/notes.md for details"
    const result = migrateContent(content, "workbook", "notebook")
    expect(result).toBe("See notebook/my-work/notes.md for details")
  })

  it("migrates folder without trailing slash", () => {
    const content = "Path: workbook/wiki"
    const result = migrateContent(content, "workbook", "notebook")
    expect(result).toBe("Path: notebook/wiki")
  })

  it("migrates folder aliases (case variations)", () => {
    const content = "Check workbook/My-work/ and workbook/Wiki/"
    const result = migrateContent(content, "workbook", "notebook")
    expect(result).toBe("Check notebook/My-work/ and notebook/Wiki/")
  })

  it("migrates all five folders", () => {
    const content = `
      workbook/my-work/
      workbook/resources/
      workbook/brainstorm/
      workbook/wiki/
      workbook/output/
    `
    const result = migrateContent(content, "workbook", "notebook")
    expect(result).toContain("notebook/my-work/")
    expect(result).toContain("notebook/resources/")
    expect(result).toContain("notebook/brainstorm/")
    expect(result).toContain("notebook/wiki/")
    expect(result).toContain("notebook/output/")
  })

  it("handles standalone workbook word", () => {
    const content = "The workbook folder contains all data"
    const result = migrateContent(content, "workbook", "notebook")
    expect(result).toBe("The notebook folder contains all data")
  })

  it("does not replace partial matches", () => {
    const content = "myworkbook is different from workbook"
    const result = migrateContent(content, "workbook", "notebook")
    expect(result).toBe("myworkbook is different from notebook")
  })

  it("handles multiple occurrences", () => {
    const content = "workbook/wiki/a.md and workbook/wiki/b.md and workbook/wiki/c.md"
    const result = migrateContent(content, "workbook", "notebook")
    expect(result).toBe("notebook/wiki/a.md and notebook/wiki/b.md and notebook/wiki/c.md")
  })

  it("preserves content without workbook references", () => {
    const content = "This is plain text with no folder references"
    const result = migrateContent(content, "workbook", "notebook")
    expect(result).toBe(content)
  })

  it("handles JSON content", () => {
    const content = '{"path": "workbook/resources/file.md"}'
    const result = migrateContent(content, "workbook", "notebook")
    expect(result).toBe('{"path": "notebook/resources/file.md"}')
  })

  it("handles markdown links", () => {
    const content = "[Link](workbook/wiki/index.md)"
    const result = migrateContent(content, "workbook", "notebook")
    expect(result).toBe("[Link](notebook/wiki/index.md)")
  })
})

describe("migrate-vault-path.mjs: escapeRegExp", () => {
  it("escapes special characters", () => {
    expect(escapeRegExp("work.book")).toBe("work\\.book")
    expect(escapeRegExp("work*book")).toBe("work\\*book")
    expect(escapeRegExp("work+book")).toBe("work\\+book")
    expect(escapeRegExp("work?book")).toBe("work\\?book")
    expect(escapeRegExp("work^book")).toBe("work\\^book")
    expect(escapeRegExp("work$book")).toBe("work\\$book")
    expect(escapeRegExp("work{book")).toBe("work\\{book")
    expect(escapeRegExp("work}book")).toBe("work\\}book")
    expect(escapeRegExp("work|book")).toBe("work\\|book")
    expect(escapeRegExp("work[book")).toBe("work\\[book")
    expect(escapeRegExp("work]book")).toBe("work\\]book")
    expect(escapeRegExp("work\\book")).toBe("work\\\\book")
  })

  it("does not modify normal strings", () => {
    expect(escapeRegExp("workbook")).toBe("workbook")
    expect(escapeRegExp("my_work")).toBe("my_work")
  })
})

describe("migrate-vault-path.mjs: shouldProcessFile", () => {
  it("accepts .md files", () => {
    expect(shouldProcessFile("test.md")).toBe(true)
  })

  it("accepts .py files", () => {
    expect(shouldProcessFile("script.py")).toBe(true)
  })

  it("accepts .mjs files", () => {
    expect(shouldProcessFile("module.mjs")).toBe(true)
  })

  it("accepts .js files", () => {
    expect(shouldProcessFile("script.js")).toBe(true)
  })

  it("accepts .ts files", () => {
    expect(shouldProcessFile("module.ts")).toBe(true)
  })

  it("accepts .json files", () => {
    expect(shouldProcessFile("config.json")).toBe(true)
  })

  it("accepts .yaml files", () => {
    expect(shouldProcessFile("config.yaml")).toBe(true)
  })

  it("accepts .yml files", () => {
    expect(shouldProcessFile("config.yml")).toBe(true)
  })

  it("accepts .txt files", () => {
    expect(shouldProcessFile("notes.txt")).toBe(true)
  })

  it("accepts AGENTS.md specifically", () => {
    expect(shouldProcessFile("AGENTS.md")).toBe(true)
  })

  it("rejects .png files", () => {
    expect(shouldProcessFile("image.png")).toBe(false)
  })

  it("rejects .pdf files", () => {
    expect(shouldProcessFile("document.pdf")).toBe(false)
  })

  it("rejects .exe files", () => {
    expect(shouldProcessFile("program.exe")).toBe(false)
  })
})

describe("migrate-vault-path.mjs: CLI validation", () => {
  it("errors with no arguments", async () => {
    const result = await $`bun run ${SCRIPT}`.quiet().nothrow()
    expect(result.exitCode).toBe(1)
    expect(result.stderr.toString()).toContain("Usage")
  })

  it("errors with only one argument", async () => {
    const result = await $`bun run ${SCRIPT} workbook`.quiet().nothrow()
    expect(result.exitCode).toBe(1)
    expect(result.stderr.toString()).toContain("Usage")
  })

  it("errors when oldRoot equals newRoot", async () => {
    const result = await $`bun run ${SCRIPT} workbook workbook`.quiet().nothrow()
    expect(result.exitCode).toBe(1)
    expect(result.stderr.toString()).toContain("must be different")
  })
})

describe("migrate-vault-path.mjs: dry-run mode", () => {
  it("shows changes without modifying in dry-run", async () => {
    const result = await $`bun run ${SCRIPT} workbook notebook --dry-run`.quiet().nothrow()
    expect(result.exitCode).toBe(0)
    expect(result.stdout.toString()).toContain("dry-run")
    expect(result.stdout.toString()).toContain("Dry-run complete")
  })

  it("lists files to be updated in dry-run", async () => {
    const result = await $`bun run ${SCRIPT} workbook notebook --dry-run`.quiet().nothrow()
    expect(result.exitCode).toBe(0)
    expect(result.stdout.toString()).toContain("vault-config.json")
    expect(result.stdout.toString()).toContain("AGENTS.md")
  })
})