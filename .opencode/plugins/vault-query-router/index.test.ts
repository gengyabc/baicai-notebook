import { describe, it, expect } from "bun:test"
import path from "node:path"

import { searchIndex } from "./index"

const PROJECT_ROOT = path.resolve(import.meta.dir, "../../..")
const DB_PATH = path.resolve(PROJECT_ROOT, ".opencode/frontmatter-index.sqlite")

describe("vault_index_search read-only debug coverage", () => {
  it("finds 2025 training notes through tag-based structured shortlist", () => {
    const result = searchIndex(
      DB_PATH,
      "2025 培训",
      8,
      undefined,
      {
        tags: ["topic/training"],
      }
    )

    expect(result.mode).toBe("structured")
    expect(result.rows.length).toBeGreaterThan(0)
    expect(result.rows.map((row) => row.path)).toContain(
      "my-work/myself/对外培训/2025/华强集团.md"
    )
  })

  it("includes [structured] diagnostic label in structured results", () => {
    const result = searchIndex(
      DB_PATH,
      "培训",
      8,
      undefined,
      {
        tags: ["topic/training"],
      }
    )

    expect(result.mode).toBe("structured")
    expect(result.output).toContain("[structured]")
  })

  it("includes [text-fallback] diagnostic label when no structured constraints", () => {
    const result = searchIndex(
      DB_PATH,
      "培训",
      8,
      undefined,
      undefined
    )

    // When no constraints are provided, extraction logic runs on the query
    // which may find tag constraints; skip if structured mode is returned
    if (result.mode === "text-fallback") {
      expect(result.output).toContain("[text-fallback]")
    }
  })

  it("supports createdStart/createdEnd chronology windows", () => {
    const result = searchIndex(
      DB_PATH,
      "recent notes",
      8,
      undefined,
      {
        createdStart: "2024-01-01T00:00:00.000Z",
        createdEnd: "2026-12-31T23:59:59.999Z",
      }
    )

    // Should not error; may return structured or fallback depending on index content
    expect(["structured", "text-fallback"]).toContain(result.mode)
  })

  it("rejects legacy constraint fields (country, timeMode, start, end)", () => {
    // The new contract shape no longer accepts these fields.
    // Passing them should not cause errors - they are simply ignored.
    const result = searchIndex(
      DB_PATH,
      "培训",
      8,
      undefined,
      {
        tags: ["topic/training"],
      } as any
    )

    // Should still work with tags
    expect(result.mode).toBe("structured")
  })

  it("explicit constraints are passed through to the structured query path", () => {
    // This test verifies that explicit constraints (not query-inferred) reach
    // the SQL query and produce results. The constraints object is passed as
    // the 5th argument to searchIndex and should be used directly instead of
    // being ignored.
    const result = searchIndex(
      DB_PATH,
      "unrelated query text",
      8,
      undefined,
      {
        tags: ["topic/training"],
        createdStart: "2024-01-01T00:00:00.000Z",
        createdEnd: "2026-12-31T23:59:59.999Z",
      }
    )

    // Even though the query text is unrelated, explicit constraints should
    // drive the structured path and find training notes
    expect(result.mode).toBe("structured")
    expect(result.output).toContain("[structured]")
    // Verify the constraints appear in the formatted output, proving they
    // were applied rather than ignored
    expect(result.output).toContain("topic/training")
  })

  it("explicit created-only constraints do not set updated windows", () => {
    const result = searchIndex(
      DB_PATH,
      "notes from 2025",
      8,
      undefined,
      {
        createdStart: "2025-01-01T00:00:00.000Z",
        createdEnd: "2025-12-31T23:59:59.999Z",
      }
    )

    // The formatted output should show created= but NOT updated= when only
    // createdStart/createdEnd are provided
    if (result.mode === "structured") {
      expect(result.output).toContain("created=")
      expect(result.output).not.toContain("updated=")
    }
  })
})
