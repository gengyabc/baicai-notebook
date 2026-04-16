import crypto from "node:crypto"

export function computeHash(body) {
  const normalized = body
    .replace(/\r\n/g, "\n")
    .replace(/\n{2,}/g, "\n\n")
    .trim()
  
  return crypto.createHash("sha1")
    .update(normalized)
    .digest("hex")
    .slice(0, 16)
}