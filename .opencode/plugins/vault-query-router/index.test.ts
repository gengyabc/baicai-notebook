import { describe, it, expect } from "bun:test"
import path from "node:path"

import { searchIndex } from "./index"

const PROJECT_ROOT = path.resolve(import.meta.dir, "../../..")
const DB_PATH = path.resolve(PROJECT_ROOT, ".opencode/frontmatter-index.sqlite")

describe("vault_index_search read-only debug coverage", () => {
  it("finds 2025 training notes through the structured index", () => {
    const result = searchIndex(
      DB_PATH,
      "2025 培训",
      8,
      undefined,
      undefined,
      {
        timeMode: "event",
        start: "2025-01-01",
        end: "2025-12-31",
        tags: ["topic/training"],
      }
    )

    expect(result.mode).toBe("structured")
    expect(result.rows.length).toBeGreaterThan(0)
    expect(result.rows.map((row) => row.path)).toContain(
      "my-work/myself/对外培训/2025/华强集团.md"
    )
  })
})
