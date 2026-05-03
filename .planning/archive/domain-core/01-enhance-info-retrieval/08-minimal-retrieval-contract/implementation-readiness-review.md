# Implementation Readiness Review

---

## Round 1

### Metadata

- requirement-version: 1
- step-version: 1
- round: 1
- mode: full
- reviewed-at: 2026-05-02

---

### Assessment

The step plan requires a later coding model to invent key behavior because:

1. The requirement and step specify `created_at` and `updated_at` as the minimal shared retrieval fields, but all actual vault notes use `created` and `updated`. The step does not clarify whether the contract should use the existing field names, map them as aliases, or rename them in the schema.

2. The step says to remove `country`, `province`, `city`, `timeMode`, `start`, and `end` from the global retrieval contract but does not specify the exact new wrapper input shape (what remains besides `tags`? `hierarchicalTags`? `folders`? `limit`?).

3. The step does not specify whether the existing text-fallback and tag-expansion behaviors should remain or be removed.

4. The step does not specify failure behavior when the SQLite database is missing or when frontmatter_json is malformed.

5. The step says diagnostics should be "lightweight" and "stage-aware" but does not define the format or content.

---

### readiness_verdict

needs-revision

---

### stop_reason

Blockers can be clarified from discovered scope without requiring new requirements.

---

### manual_intervention_required

false

---

### active_revision_focus

step.md

---

### repeated_blockers

none (first review)

---

### repeated_root_cause_clusters

none (first review)

---

### Normalized blockers

#### B001: Field naming mismatch - created_at/updated_at vs created/updated

- **severity**: P0 (required)
- **category**: missing input/output shape
- **evidence**:
  - requirement.md line 27: "Define a minimal global retrieval contract centered on `created_at`, `updated_at`, and `tags`"
  - requirement.md line 50: "`created_at`, `updated_at`, and `tags` are the only structured fields..."
  - step.md line 21: "The shared retrieval fields are `created_at`, `updated_at`, and `tags`"
  - Actual notes in workbook/ use `created` and `updated` (verified via grep: 136 matches for `created:` and `updated:` in actual notes, zero matches for `created_at:` or `updated_at:`)
  - Current wrapper queries properties table for `created` and `updated` (index.ts line 234)
- **impact**: A coding model would have to invent whether to rename existing fields, add alias mapping, or change the contract to use existing names. This materially affects schema design, indexer behavior, and wrapper queries.
- **clarification-needed**: Specify whether:
  1. The retrieval contract should use `created` and `updated` (matching actual note frontmatter)
  2. OR the indexer should map `created` → `created_at` and `updated` → `updated_at` for retrieval purposes
  3. OR notes should be migrated to use `created_at` and `updated_at` (out of scope per requirement.md line 39-45)

#### B002: Missing new wrapper input shape

- **severity**: P0 (required)
- **category**: missing input/output shape
- **evidence**:
  - step.md lines 40-44 say to remove `country`, `province`, `city`, `timeMode`, `start`, `end` from the global contract
  - step.md does not specify what the NEW wrapper constraints shape should be
  - Current wrapper (index.ts lines 477-486) accepts: tags, hierarchicalTags, country, province, city, timeMode, start, end
  - step.md does not clarify whether `hierarchicalTags` should remain or be removed
  - step.md does not clarify whether `folders` and `limit` should remain as non-contract parameters
- **impact**: A coding model would have to invent the exact input shape, which affects the wrapper interface and tests.
- **clarification-needed**: Specify the exact new wrapper constraints shape. Example:
  ```
  constraints?: {
    tags?: string[],
    hierarchicalTags?: string[]  // [keep|remove]
  }
  ```

#### B003: Undefined behavior for existing text-fallback and tag-expansion

- **severity**: P1 (required)
- **category**: undefined failure/fallback behavior
- **evidence**:
  - Current wrapper (index.ts lines 357-378, 416-441) has text-fallback when structured search returns < 3 results
  - Current wrapper (index.ts lines 420-437) has tag-expansion via `buildExpandedConstraints` when results are insufficient
  - step.md does not mention whether to keep or remove these behaviors
  - step.md line 45 says "This step does not require inventing a new semantic ranking system" but does not address existing fallback behaviors
- **impact**: A coding model would have to invent whether these are part of the minimal contract or should be removed.
- **clarification-needed**: Specify explicitly:
  1. Whether text-fallback should remain as a fallback mode when structured shortlist returns insufficient results
  2. Whether tag-expansion should remain or be removed

#### B004: Undefined failure behavior

- **severity**: P1 (required)
- **category**: undefined failure/fallback behavior
- **evidence**:
  - Current wrapper (index.ts lines 489-500) catches errors and returns a generic message
  - step.md does not specify what should happen when:
    - SQLite database file is missing
    - frontmatter_json is malformed or missing
    - No results are found after structured search
- **impact**: A coding model would have to invent failure handling, which affects robustness and diagnosability.
- **clarification-needed**: Specify minimum failure behavior:
  1. When SQLite is missing: return explicit diagnostic message (not just generic error)
  2. When no results: current behavior (formatStructuredResults) already handles this - confirm or revise

#### B005: Undefined diagnostics format

- **severity**: P2 (required)
- **category**: unfrozen thresholds/mappings/decision rules
- **evidence**:
  - step.md lines 53-55: "Diagnostics may stay lightweight, but they must be explicit enough to show which stage filtered candidates and why"
  - step.md line 125: "diagnostics distinguish SQL shortlist behavior from later LLM filtering behavior with lightweight stage-aware reporting"
  - step.md does not define what "lightweight" means or what format diagnostics should use
- **impact**: A coding model would have to invent the diagnostics format, which affects output structure.
- **clarification-needed**: Specify minimum diagnostics format:
  1. Include stage identifier in output (e.g., `[structured]` or `[text-fallback]`)
  2. Include constraint summary in output (current formatConstraints already does this - confirm)

---

### Suggested revisions

#### For step.md

**Revision 1: Clarify field naming (addresses B001)**

Replace line 21 and related references to use existing field names OR add explicit alias mapping.

Option A (use existing names):
```markdown
- The shared retrieval fields are `created`, `updated`, and `tags`. These match the existing frontmatter field names in vault notes.
```

Option B (add alias mapping):
```markdown
- The shared retrieval fields are `created`, `updated`, and `tags`. The contract language may refer to these as `created_at` and `updated_at` for documentation consistency, but the underlying property keys remain `created` and `updated`.
```

Also update:
- line 65: change `created_at`, `updated_at` to match chosen option
- line 99: update test batch field names
- lines 150-151: update symbols section

**Revision 2: Specify new wrapper shape (addresses B002)**

Add a new section after "Retrieval flow boundary" (around line 47):

```markdown
## Updated wrapper shape

The new `vault_index_search` wrapper accepts:

- query: string (required)
- limit: number (optional, unchanged)
- folders: string[] (optional, unchanged - not part of structured retrieval contract)
- constraints: object (optional, reduced to minimal contract):
  - tags: string[] (optional, first-class retrieval field)
  - hierarchicalTags: string[] (optional, prefix-based tag matching)

Fields removed from the global structured retrieval contract:
- country, province, city (location-specific, preserved in frontmatter_json only)
- timeMode, start, end (event-specific, preserved in frontmatter_json only)

Note: LLM-side filtering over frontmatter_json may still use these fields after shortlist generation.
```

**Revision 3: Clarify text-fallback and expansion behavior (addresses B003)**

Add to "Retrieval flow boundary" section (around line 44):

```markdown
- Text-fallback mode remains available when structured search returns insufficient results (fewer than 3 matches). The fallback output must be clearly labeled as `[text-fallback]` for diagnostics.
- Tag expansion via governed artifacts remains available for insufficient structured results. Expanded constraints must be reported in the output.
```

**Revision 4: Specify minimum failure behavior (addresses B004)**

Add to "Diagnostics and shortlist policy" section (around line 57):

```markdown
- When SQLite database is missing or unreadable: return explicit diagnostic `[unavailable] SQLite index not found at {path}`.
- When structured search returns zero results: current output format already reports `No structured matches` - this is sufficient.
```

**Revision 5: Specify minimum diagnostics format (addresses B005)**

Add to "Diagnostics and shortlist policy" section:

```markdown
- Stage-aware output must include a stage label: `[structured]`, `[text-fallback]`, or `[unavailable]`.
- Constraint summary must appear in output when structured constraints were extracted (current formatConstraints behavior is sufficient).
```

---

### Brief verdict

The step has five required blockers that prevent implementation without inventing behavior. All blockers can be clarified by revising step.md to: (1) reconcile field naming with existing notes, (2) specify the exact new wrapper input shape, (3) clarify whether text-fallback and tag-expansion remain, (4) specify minimum failure behavior, and (5) specify minimum diagnostics format. No new requirements are needed - only clarification of the existing plan.