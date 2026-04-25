import fs from "fs/promises"
import path from "path"
import { createRequire } from "module"

const require = createRequire(import.meta.url)
const VAULT_ROOT = path.resolve(import.meta.dirname, "..")
const PROJECT_ROOT = path.resolve(VAULT_ROOT, "..")

const VAULT_CONFIG_PATH = path.join(VAULT_ROOT, "vault-config.json")

const FOLDER_NAMES = ["my-work", "resources", "brainstorm", "wiki", "output"]
const FOLDER_ALIASES = {
  "my-work": ["My-work", "My-Work"],
  "resources": ["Resources"],
  "brainstorm": ["Brainstorm"],
  "wiki": ["Wiki"],
  "output": ["Output"],
}

async function main() {
  const args = process.argv.slice(2)
  
  if (args.length < 2) {
    console.error("Usage: node migrate-vault-path.mjs <oldRoot> <newRoot> [--dry-run]")
    console.error("Example: node migrate-vault-path.mjs workbook notebook")
    console.error("  This will update vault-config.json and all .md references")
    process.exit(1)
  }
  
  const oldRoot = args[0]
  const newRoot = args[1]
  const isDryRun = args.includes("--dry-run")
  
  if (oldRoot === newRoot) {
    console.error("Old and new root must be different")
    process.exit(1)
  }
  
  console.log(`Migrating vault root: ${oldRoot} -> ${newRoot}`)
  if (isDryRun) console.log("(dry-run mode - no files will be modified)")
  console.log("")
  
  const config = require(VAULT_CONFIG_PATH)
  if (config.vaultRoot !== oldRoot) {
    console.error(`Current vaultRoot in config is "${config.vaultRoot}", not "${oldRoot}"`)
    console.error("Please specify the correct current vault root name")
    process.exit(1)
  }
  
  const changes = []
  
  changes.push({
    file: VAULT_CONFIG_PATH,
    type: "config",
    description: `vaultRoot: ${oldRoot} -> ${newRoot}`,
  })
  
  const mdFiles = await collectMarkdownFiles(VAULT_ROOT)
  
  for (const mdFile of mdFiles) {
    const relativePath = path.relative(PROJECT_ROOT, mdFile)
    const content = await fs.readFile(mdFile, "utf8")
    const newContent = migrateContent(content, oldRoot, newRoot)
    
    if (content !== newContent) {
      changes.push({
        file: mdFile,
        relativePath,
        type: "doc",
        description: `Updated folder references`,
      })
    }
  }
  
  console.log(`Found ${changes.length} file(s) to update:\n`)
  
  for (const change of changes) {
    console.log(`  ${change.relativePath || change.file}`)
    console.log(`    ${change.description}`)
  }
  
  if (isDryRun) {
    console.log("\nDry-run complete. Run without --dry-run to apply changes.")
    return
  }
  
  console.log("\nApplying changes...")
  
  const newConfig = { ...config, vaultRoot: newRoot }
  await fs.writeFile(VAULT_CONFIG_PATH, JSON.stringify(newConfig, null, 2) + "\n", "utf8")
  console.log(`  Updated: vault-config.json`)
  
  for (const change of changes) {
    if (change.type === "config") continue
    
    const content = await fs.readFile(change.file, "utf8")
    const newContent = migrateContent(content, oldRoot, newRoot)
    await fs.writeFile(change.file, newContent, "utf8")
    console.log(`  Updated: ${change.relativePath}`)
  }
  
  const oldFolderPath = path.join(PROJECT_ROOT, oldRoot)
  const newFolderPath = path.join(PROJECT_ROOT, newRoot)
  
  try {
    await fs.access(oldFolderPath)
    await fs.rename(oldFolderPath, newFolderPath)
    console.log(`  Renamed folder: ${oldRoot}/ -> ${newRoot}/`)
  } catch (err) {
    if (err.code === "ENOENT") {
      console.log(`  Folder ${oldRoot}/ not found (may already be renamed)`)
    } else if (err.code === "EEXIST") {
      console.log(`  Folder ${newRoot}/ already exists, skipping rename`)
    } else {
      throw err
    }
  }
  
  console.log(`\nMigration complete: ${oldRoot} -> ${newRoot}`)
  console.log(`Total files updated: ${changes.length}`)
}

function migrateContent(content, oldRoot, newRoot) {
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
  
  return result
}

async function collectMarkdownFiles(dir, files = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".git") continue
      await collectMarkdownFiles(fullPath, files)
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(fullPath)
    }
  }
  
  return files
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main()
}