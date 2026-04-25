import path from "path"
import { createRequire } from "module"

const require = createRequire(import.meta.url)
const VAULT_CONFIG = require("../vault-config.json")

const VAULT_ROOT = path.resolve(import.meta.dirname, "..", "..")

function getVaultRootPath() {
  return path.resolve(VAULT_ROOT, VAULT_CONFIG.vaultRoot)
}

function getFolderPath(folderKey) {
  const folderName = VAULT_CONFIG.folders[folderKey]
  if (!folderName) {
    throw new Error(`Unknown folder key: ${folderKey}`)
  }
  return path.join(VAULT_CONFIG.vaultRoot, folderName)
}

function getFolderPaths() {
  const paths = []
  for (const key of Object.keys(VAULT_CONFIG.folders)) {
    paths.push(getFolderPath(key))
  }
  return paths
}

function getManagedPaths() {
  const paths = []
  const vaultRoot = VAULT_CONFIG.vaultRoot
  
  for (const [key, folderName] of Object.entries(VAULT_CONFIG.folders)) {
    if (key === "resources") {
      paths.push(path.join(vaultRoot, folderName))
    } else if (key === "brainstorm") {
      const managedSubfolders = VAULT_CONFIG.managedSubfolders?.brainstorm || ["managed"]
      for (const subfolder of managedSubfolders) {
        paths.push(path.join(vaultRoot, folderName, subfolder))
      }
    }
  }
  
  return paths
}

function getFolderPriorities() {
  return VAULT_CONFIG.folderPriorities
}

function getDefaultFolders() {
  const folders = []
  
  for (const key of Object.keys(VAULT_CONFIG.folders)) {
    folders.push(VAULT_CONFIG.folders[key])
  }
  
  return folders
}

function getDefaultFoldersWithRoot() {
  const folders = []
  const vaultRoot = VAULT_CONFIG.vaultRoot
  
  for (const key of Object.keys(VAULT_CONFIG.folders)) {
    folders.push(path.join(vaultRoot, VAULT_CONFIG.folders[key]))
  }
  
  return folders
}

function getCanonicalRoots() {
  const roots = {}
  const vaultRoot = VAULT_CONFIG.vaultRoot
  
  for (const [key, folderName] of Object.entries(VAULT_CONFIG.folders)) {
    roots[folderName] = folderName
    roots[path.join(vaultRoot, folderName)] = folderName
  }
  
  return roots
}

function getVaultConfig() {
  return VAULT_CONFIG
}

export {
  getVaultRootPath,
  getFolderPath,
  getFolderPaths,
  getManagedPaths,
  getFolderPriorities,
  getDefaultFolders,
  getDefaultFoldersWithRoot,
  getCanonicalRoots,
  getVaultConfig,
  VAULT_ROOT,
}