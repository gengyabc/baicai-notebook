import fs from "fs/promises"
import path from "path"
import { splitFrontmatter, parseFrontmatter } from "./utils.mjs"

const VAULT_ROOT = path.resolve(import.meta.dirname, "../../..")

export async function main() {
  const args = process.argv.slice(2)
  const targets = args.filter((arg) => !arg.startsWith("--"))
  const requestedRoots = targets.length
    ? targets
    : ["resources", "Resources", "brainstorm/managed", "Brainstorm/managed"]
  const roots = await resolveUniqueRoots(requestedRoots)
  
  const pendingFiles = []
  
  for (const root of roots) {
    await scanPendingFiles(root, pendingFiles)
  }

  if (pendingFiles.length === 0) {
    console.log("No files needing LLM description enhancement.")
    return
  }

  console.log(`Found ${pendingFiles.length} files needing description enhancement:\n`)
  
  for (const file of pendingFiles) {
    console.log(`FILE: ${file.path}`)
    console.log(`IMAGE_KEY: ${file.imageKey}`)
    console.log(`DESCRIPTION: ${file.description}`)
    console.log(`PREVIEW: ${file.preview}`)
    console.log("---")
  }
  
  console.log(`\nRun /process-pending in OpenCode to enhance descriptions with LLM.`)
}

async function scanPendingFiles(root, pendingFiles) {
  try {
    const rootPath = path.join(VAULT_ROOT, root)
    const stat = await fs.stat(rootPath)
    if (!stat.isDirectory()) return

    await walkDir(rootPath, pendingFiles)
  } catch (err) {
    if (err.code !== "ENOENT") {
      console.error(`Error scanning ${root}: ${err.message}`)
    }
  }
}

async function walkDir(dir, pendingFiles) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      await walkDir(fullPath, pendingFiles)
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      if (entry.name === "index.md" || entry.name === "log.md") continue
      
      try {
        const source = await fs.readFile(fullPath, "utf8")
        const { frontmatter, body } = splitFrontmatter(source)
        const fm = parseFrontmatter(frontmatter)
        
        if (fm.llm_description_done !== true) {
          pendingFiles.push({
            path: fullPath,
            imageKey: fm.image_key || path.basename(fullPath, ".md"),
            description: fm.description || "(none)",
            preview: extractPreview(body),
            frontmatter: fm,
            body
          })
        }
      } catch (err) {
        console.error(`Error reading ${fullPath}: ${err.message}`)
      }
    }
  }
}

async function resolveUniqueRoots(roots) {
  const uniqueRoots = []
  const seen = new Set()

  for (const root of roots) {
    const rootPath = path.join(VAULT_ROOT, root)
    const key = await rootIdentity(rootPath)
    if (seen.has(key)) continue

    seen.add(key)
    uniqueRoots.push(root)
  }

  return uniqueRoots
}

async function rootIdentity(rootPath) {
  try {
    return (await fs.realpath(rootPath)).toLowerCase()
  } catch {
    return path.resolve(rootPath).toLowerCase()
  }
}

function extractPreview(body) {
  const cleaned = body
    .replace(/\r\n/g, "\n")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/[`*_>#]/g, "")
    .replace(/\n{2,}/g, "\n")
    .trim()
  
  return cleaned.slice(0, 200)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main()
}
