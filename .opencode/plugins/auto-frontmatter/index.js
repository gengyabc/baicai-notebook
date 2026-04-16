import { backfillFile } from "./backfill.mjs"

export const AutoFrontmatter = async () => ({
  event: async ({ event }) => {
    const filePath = getFilePath(event)
    if (!filePath) return

    try {
      await backfillFile(filePath)
    } catch (error) {
      console.error(`[auto-frontmatter] ${filePath}:`, error)
    }
  },
})

export default AutoFrontmatter

function getFilePath(event) {
  return event?.file || event?.filePath || event?.path || event?.args?.filePath || null
}
