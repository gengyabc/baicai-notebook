import fs from "fs/promises"
import { sleep } from "./utils.mjs"

export async function waitForStableFile(filePath, options = {}) {
  const {
    pollInterval = 200,
    settleTime = 800,
    maxWait = 10000
  } = options
  
  let lastSize = -1
  let lastMtime = null
  let stableStart = null
  const startTime = Date.now()
  
  while (Date.now() - startTime < maxWait) {
    try {
      const stat = await fs.stat(filePath)
      const currentSize = stat.size
      const currentMtime = stat.mtime.getTime()
      
      if (currentSize !== lastSize || currentMtime !== lastMtime) {
        lastSize = currentSize
        lastMtime = currentMtime
        stableStart = null
      } else {
        if (!stableStart) stableStart = Date.now()
        if (Date.now() - stableStart >= settleTime) {
          return true
        }
      }
      
      await sleep(pollInterval)
    } catch (err) {
      if (err.code === "ENOENT") {
        return false
      }
      throw err
    }
  }
  
  return false
}
