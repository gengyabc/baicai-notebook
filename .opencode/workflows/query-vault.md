# Workflow: Query Vault

## Goal

Answer a user question from the vault with the right confidence level and provenance.

This workflow is enforced by a retrieval hook plus a SQLite-backed shortlist tool with a structured retrieval decision chain.

## Canonical Contract

Treat `.opencode/docs/sqlite-retrieval-contract.md` as the **single canonical reference** for:

- the SQLite database path
- the `notes` and `properties` schema
- retrieval-relevant indexed fields
- the required first-pass wrapper entrypoint: `vault_index_search`
- the provenance separation categories (file-backed facts, index-only hits, network-derived information, working hypotheses)
- the network permission policy

No other file may define a competing schema, wrapper shape, or retrieval-relevant field list.

This workflow remains the source of truth for retrieval behavior, decision order, thresholds, and fallback policy.

## Tool Surface Assumption

- `vault_index_search` is a chat tool exposed by the vault-query-router plugin, not a shell command and not a PATH binary.
- Do not test availability with shell probes such as `which vault_index_search`.
- For normal vault retrieval, do not inspect plugin source or query SQLite directly just to decide whether `vault_index_search` exists.
- If the tool is not present in the live tool surface or returns an unavailable/failure message, treat that as wrapper unavailability and follow the failure policy below. Do not replace Stage 1 with ad hoc raw SQL.

## Governance assumptions

This workflow relies on the metadata governance policy defined in `.opencode/rules/metadata-conventions.md`:

- **The minimal shared retrieval contract uses `tags`, `created_at`, and `updated_at` only**: broad SQLite shortlist generation relies on tags and note-chronology windows. Note-type-specific fields such as `country`, `province`, `city`, `start_date`, and `end_date` are preserved in the serialized frontmatter JSON payload for downstream LLM-side filtering after shortlist generation.
- **Tags follow governed JSON artifacts**: canonical tag values come only from `.opencode/canonical-tags.json`; alias-to-canonical mappings come only from `.opencode/tag-aliases.json`; expansion relationships come only from `.opencode/tag-expansions.json`. `.opencode/alias-registry.md` remains a human-reviewed bootstrap source and migration reference, not the runtime governance source.
- **`canonical_topic` is optional and governed only where retrieval depends on it**: not all note families require `canonical_topic`; it is governed by `.opencode/canonical-tags.json` only when a workflow materially depends on it.
- **Hierarchical tags remain valid**: `topic/*`, `state/*`, `source/*`, and `role/*` forms are supported by the SQLite retrieval layer.
- **Location and event-time metadata are preserved in frontmatter_json**: fields such as `country`, `province`, `city`, `start_date`, and `end_date` remain on notes that need them. They are preserved inside the serialized frontmatter JSON and available for LLM-side filtering after the broad SQLite shortlist. They are not required parts of the global SQLite retrieval schema.
- **Note-type-specific frontmatter is allowed**: the minimal shared retrieval contract does not prohibit note-specific frontmatter. It only defines what the broad SQLite shortlist may rely on for structured filtering.

## Inputs

- user question
- optional topic, note, project, or file scope
- optional structured constraints: tags, note-chronology windows

## Retrieval Decision Chain

The retrieval decision chain is the core of vault query behavior. It proceeds through stages in order, beginning with constraint extraction before any SQLite shortlist execution.

The retrieval flow follows a two-stage boundary:

1. **Broad SQLite shortlist generation** uses only the minimal shared retrieval contract (`tags`, `created_at`, `updated_at`).
2. **LLM-side filtering** evaluates the preserved serialized frontmatter on shortlisted candidates before full file detail reads.

### Stage 0: Constraint Extraction (MANDATORY)

**THIS STAGE IS MANDATORY. It must complete before any `vault_index_search` call. Skipping this stage violates the retrieval contract.**

#### Pre-execution checklist (MUST complete before tool call)

Before calling `vault_index_search`, the assistant MUST complete these steps in order:

1. **Read governance artifacts** (parallel read allowed):
   - `.opencode/canonical-tags.json` - unique legal source for canonical tag values
   - `.opencode/tag-aliases.json` - alias-to-canonical tag mappings
   - `.opencode/tag-expansions.json` - approved tag expansion relationships (if exists)

2. **Extract structured constraints from user query**:
   - Parse user text for tags and note-chronology phrases
   - Follow frozen extraction priority: tags -> chronology

3. **Normalize extracted values using governance artifacts**:
   - Map tag aliases to canonical tags via `tag-aliases.json`

4. **Output structured query summary in commentary**:
   - State the normalized constraints explicitly before the tool call
   - Use the template format below

5. **Call `vault_index_search` with normalized payload**:
   - Pass only the normalized constraint values
   - Do NOT pass raw user text expecting wrapper-side inference

#### Structured query summary template (REQUIRED before tool call)

The assistant MUST output this summary in commentary before calling `vault_index_search`:

```
结构化查询：[user query summary]
  标签：tags=[canonical values from canonical-tags.json]
  时间：created=[start]..[end], updated=[start]..[end]
  来源：[literal|alias|inference] for each constraint
```

Example for "最近创建的培训笔记":

```
结构化查询：最近创建的培训笔记
  标签：tags=["topic/training"] (alias: "培训" → "topic/training" via tag-aliases.json)
  时间：created=2024-01-01..2026-12-31 (inferred from "最近")
  来源：tags=alias, chronology=inference
```

#### Governed normalization requirement

When usable structured clues exist, the caller MUST perform governed normalization before calling `vault_index_search`. Governed normalization means:

- **Tag outputs**: resolve ONLY to canonical values from `.opencode/canonical-tags.json`
- **Tag input normalization**: use `.opencode/tag-aliases.json` for alias resolution
- **Tag expansion**: use ONLY `.opencode/tag-expansions.json` for broadened passes
- **DO NOT delegate** first-pass tag inference back to router-local keyword tables when governed caller-side normalization succeeded

The assistant must move from raw user text to the structured query representation first, then pass only the normalized payload to Stage 1. Raw user text is NOT a sufficient Stage 1 input when structured clues exist.

When the tool returns, preserve the visible intermediate retrieval trace in the response before any paraphrase: the `vault_index_search` call, the normalized constraints, and the SQLite process summary.

**Extraction priority order (frozen):**

1. **tags** - evaluate first for canonical tag mappings and low-risk topic-to-tag mappings
2. **chronology** - evaluate second when the request contains usable created/updated date phrases

**Extraction rules:**

- Map user phrases into the normalized constraint payload defined in `.opencode/docs/sqlite-retrieval-contract.md`.
- Record which phrases were matched literally, by alias, or by low-risk inference.
- Use canonical tag values from `.opencode/canonical-tags.json` (with `.opencode/tag-aliases.json` for alias resolution).
- Empty or unusable structured extraction does not authorize an unbounded structured query. If no usable structured clues are found, the live wrapper falls back to text search (`mode: "text-fallback"`) rather than returning an empty structured shortlist. Proceed to progressive relaxation if the text fallback is insufficient.
- Do not use title-first or body-first search as a substitute for applying usable structured clues through SQLite.
- Low-risk inference for tags is allowed only for obvious stable topic mappings that already align with retrieval and governance language. Inferred tag mappings must be recorded separately from literal or alias-based mappings in the diagnostic trace. Ambiguous semantic phrases that do not map to a single governed canonical tag must remain unresolved and be reported as unmapped rather than being guessed.
- Note-type-specific metadata (such as location, event dates, participants) is not part of the broad structured retrieval contract. It is preserved in `frontmatter_json` for LLM-side filtering after shortlist generation.

**Chronology constraint extraction:**

- Extract `createdStart`/`createdEnd` windows when the user asks about note creation time.
- Extract `updatedStart`/`updatedEnd` windows when the user asks about note update time.
- A request may provide a created window, an updated window, or both; when both are present, they are applied as an intersection.
- Event-time queries (asking when an activity happened) do not map to `created`/`updated` windows. Those queries rely on tags + text-fallback + frontmatter_json LLM-side filtering.

**Diagnostics:**

The extraction pass produces caller-side extraction artifacts: a `structuredTrace` array recording each extracted constraint with its family, field, matched user phrase, normalized value, and normalization source (`literal`, `alias`, or `inference`), plus the normalized constraint values to be passed to the live wrapper through the current request shape. Execution diagnostics are response-side data produced exclusively by the wrapper after shortlist execution.

### Stage 1: Structured SQLite Shortlist

1. Use `vault_index_search` as the required first-pass wrapper for structured SQLite shortlist generation.
2. Pass the normalized constraint payload from Stage 0 extraction to `vault_index_search` through the current request shape defined in `.opencode/docs/sqlite-retrieval-contract.md`.
3. Build the shortlist from the minimal shared retrieval contract:
   - **Tags**: exact match or hierarchical match (e.g., `topic/*` matches `topic/subtopic`).
   - **Chronology**: filter using `createdStart`/`createdEnd` against the `created` property, and `updatedStart`/`updatedEnd` against the `updated` property. When both windows are present, they are applied as an intersection.
4. Execute the shortlist against the SQLite index defined in the contract document.
5. Return a shortlist of candidate note paths with their `description` values.

**Stage 1 execution contract:**

- Structured constraints must be enforced inside SQLite, not by reading a broad result set and manually filtering afterward.
- Structured constraints must come from the Stage 0 extraction pass, passed through the current request shape defined in `.opencode/docs/sqlite-retrieval-contract.md`. Do not use ad hoc raw SQL generation.
- `vault_index_search` is the Stage 1 interface. Do not substitute shell checks, plugin-source inspection, or direct SQLite reads for the Stage 1 call when answering a normal vault question.
- Mixed constraints must be combined as an intersection. Use `JOIN`, `EXISTS`, `GROUP BY ... HAVING`, or an equivalent SQL pattern that guarantees one candidate note satisfies every active constraint.
- Do not substitute path heuristics such as `n.path LIKE '%2025%'` for chronology filtering when a chronology constraint is present.
- Do not use `OR` to combine unrelated tag and chronology constraint families in the same shortlist pass. `OR` is only valid within a single family when expressing alternatives, such as multiple accepted tag values.
- If a user asks for `2025年在江苏的培训`, the shortlist query applies the training tag constraint. Location and event-time filtering are LLM-side responsibilities using serialized frontmatter after shortlist generation, not broad SQLite shortlist inputs.
- **Shortlist-first reading order:** When usable structured clues exist, the retrieval flow must generate the structured shortlist before reading any broad file set. Do not read files outside the shortlist before the shortlist is generated. This is a local-first policy: structured SQLite shortlist first, then read only shortlisted files.
- **Stale-index handling:** If a shortlisted file is missing or unreadable, report it as stale or inconsistent index evidence. Do not present such hits as confirmed facts. The index may lag behind the vault; missing files are an index consistency issue, not a retrieval success.

**Constraint rules:**

- Constraint extraction must run before Stage 1 shortlist (Stage 0). All constraints passed to `vault_index_search` must follow the current request shape from `.opencode/docs/sqlite-retrieval-contract.md`.
- Mixed constraints are intersected: a candidate must satisfy all provided tag and chronology constraints simultaneously.
- An empty constraint set causes the live wrapper to fall back to text search (`mode: "text-fallback"`), not to return an empty structured shortlist. Do not issue unbounded queries against the index.
- Usable structured clues must be applied through SQLite before title-first or body-first search.
- Do not use freeform title or body keyword search as a substitute for structured tag extraction.

**Tag matching detail:**

- Exact match: notes tagged with the exact canonical value are returned.
- Hierarchical match: notes tagged with a prefix and any subtopic beneath it are returned (e.g., `topic/` matches `topic/subtopic`).

**Chronology matching detail:**

- Chronology filters use the `created` and `updated` properties in the `properties` table (with `value_date` column).
- `createdStart`/`createdEnd` filter against `key = 'created'`.
- `updatedStart`/`updatedEnd` filter against `key = 'updated'`.
- When both created and updated windows are provided, a candidate must satisfy both windows (intersection).
- Chronology filters represent note metadata timestamps, not event timing. Event-time queries should rely on tags + text-fallback + frontmatter_json LLM-side filtering rather than created/updated windows.
- The contract explicitly maps `created_at -> created` and `updated_at -> updated` for version 1 compatibility.

**SQL implementation patterns:**

- `query-vault.md` is the source of truth for structured shortlist behavior. Use `.opencode/docs/sqlite-retrieval-contract.md` for schema, table names, column names, and wrapper contract details instead of restating them here.
- Preferred pattern: one `EXISTS` block per active constraint family so each family stays independently testable and the whole query remains an intersection.
- Acceptable alternative: `JOIN` once per active family, with a final `SELECT DISTINCT n.path`.
- For answer-generation reads, run a shortlist query first, then read only the shortlisted notes.
- For concrete SQL shape and table/column conventions, refer to the Schema and Anti-Patterns sections in `.opencode/docs/sqlite-retrieval-contract.md`.

### Stage 2: Context-Budget-Aware Shortlist Decision

Based on the shortlist size after Stage 1, choose the next action. Shortlist tolerance depends on available context budget rather than a single fixed global candidate-count threshold. The following bands are approximate guidance, not frozen contract rules:

| Candidate Count | Action |
|-----------------|--------|
| 0 | Skip to Progressive Relaxation (Stage 3) |
| Small (within context budget) | Read all candidates directly (Stage 4) |
| Moderate | Description-based review then read top candidates (Stage 4) |
| Large (exceeds context budget) | Apply stricter structural narrowing (repeat Stage 1 with tighter constraints) or proceed to Progressive Relaxation (Stage 3) |

Shortlist-size tolerance must be described as context-budget-aware. A single hardcoded global shortlist threshold is prohibited as the contract rule.

### Stage 3: Progressive Relaxation

When the structured shortlist is empty or insufficient, relax constraints in this fixed priority order:

1. **Remove low-value tag constraints first**: Drop tags that are least selective (i.e., tags that match the largest number of notes in the vault, or tags that are least specific to the query).
2. **Broaden chronology constraints second**: Expand date ranges. First extend by 30 days on each side of the current range. If still insufficient, extend by 90 days on each side.
3. **Remove all structured constraints**: Fall back to unstructured pass.

After each relaxation step, retry Stage 1 with the relaxed constraints. Evaluate the candidate count decision (Stage 2) again.

**Round budget mapping (3 rounds max):**

The relaxation order is fixed as tags -> chronology -> unstructured, but the cap of 3 rounds means `full_constraint_removal` is the action of round 3 (the last round before Stage 5). Concretely:

- **Round 1**: Remove low-value tag constraints.
- **Round 2**: Broaden chronology constraints (30 days, then 90 days).
- **Round 3**: Remove all structured constraints. This is the last relaxation attempt before Stage 5.

After 3 rounds without sufficient results, proceed to Stage 5 (broader text retrieval).

**Relaxation logging (Fallback Visibility):**

Each relaxation step must log or expose:

- Which relaxation step triggered: `tag_removal`, `chronology_broadening`, or `full_constraint_removal`.
- How many candidates were found after the relaxed pass.
- The specific constraints that were relaxed (e.g., which tags were dropped, how much the time range was broadened).

### Stage 4: Frontmatter Filtering and Full Note Read

After shortlist generation, the retrieval flow proceeds through two sub-stages:

1. **Frontmatter-based LLM filtering (Stage 4a)**: Evaluate the serialized frontmatter on shortlisted candidates. This is where note-type-specific metadata such as location, event dates, participants, and domain-specific fields are inspected. The LLM may narrow or skip shortlisted candidates based on frontmatter JSON before full file reads. Report as `[frontmatter-filter]`.

2. **Full file detail reads (Stage 4b)**: Read the full content of the remaining candidates after frontmatter filtering. Full file reads are deferred until after shortlist generation and any frontmatter-based narrowing.

Apply folder priority when interpreting candidates:

1. `workbook/wiki/` first
2. `workbook/output/` second
3. `workbook/resources/` third
4. `workbook/brainstorm/` fourth
5. `workbook/my-work/` fifth

Prefer `workbook/wiki/index.md`, `workbook/output/index.md`, and relevant `workbook/wiki/` or `workbook/output/` pages for stable answers when they appear in the shortlist.

Pull `workbook/resources/` for supporting evidence and provenance.

Use `workbook/brainstorm/` only for tentative synthesis or future directions.

Use `workbook/my-work/` only to understand current context and user intent.

### Stage 5: Broader Text Retrieval (Optional Fallback)

If progressive relaxation exhausts its 3 rounds without finding sufficient information:

1. Use `grep` or FTS (when available) as a broader text-based pass.
2. This is a later fallback, not the primary retrieval path.
3. When this fallback is used, mark the answer confidence as lower and explicitly state: "Retrieval was relaxed to an unstructured text pass; answer confidence may be reduced."

## Wrapper Failure Policy

- If `vault_index_search` is unavailable or fails, state that the structured SQLite shortlist was unavailable (report `[unavailable]`).
- Do not replace the missing wrapper with ad hoc raw SQL for a normal user retrieval task.
- Only after stating wrapper unavailability may you broaden to later fallback behavior, and the answer confidence must be lowered.
- Manual SQL remains reserved for retrieval-layer debugging, implementation, or verification work rather than normal user-facing retrieval.
- If a shortlisted note lacks usable serialized frontmatter JSON, report `[unavailable]` for frontmatter filtering on that note and may continue with full file reads or later fallback behavior without inventing JSON-derived facts.
- If the structured pass returns no candidates, the flow may continue into text-fallback behavior and must report that transition.

### Network Search Permission

After all local retrieval stages are exhausted, network search may be considered:

1. In non-debug sessions, `websearch` and `webfetch` require explicit user permission. The permission request must be explicit and short, for example: `Local retrieval was insufficient. Do you want me to search the web?`
2. In debug mode, network search is allowed without asking first, but all network-derived results must still be labeled clearly as external information.
3. Network-derived results must never be blurred into local-vault evidence. Maintain the provenance separation defined in `.opencode/docs/sqlite-retrieval-contract.md`.

## Integration Topology

```
User Query
      |
      v
[Stage 0: Constraint Extraction - MANDATORY]
      |
      +-- 1. READ governance artifacts (canonical-tags.json, tag-aliases.json)
      +-- 2. EXTRACT tags, chronology from user text (priority: tags -> chronology)
      +-- 3. NORMALIZE using governance artifacts (aliases -> canonical values)
      +-- 4. OUTPUT structured query summary in commentary (REQUIRED)
      +-- 5. CALL vault_index_search with normalized payload only
      |
      v
[Stage 1: Structured SQLite Shortlist]
      |
      +-- receive normalized constraints through the minimal retrieval wrapper contract
      +-- execute Stage 1 SQLite shortlist with intersection semantics
      +-- report [structured] with constraints and candidate count
      |
      v
[Stage 2: Context-Budget-Aware Shortlist Decision]
      |
      +-- 0 candidates -----> [Stage 3: Progressive Relaxation] --> retry Stage 1
      |
      +-- within budget -----> [Stage 4]
      |
      +-- exceeds budget ---> [Stricter Stage 1 or Stage 3]
      |
      v
[Stage 4: Frontmatter Filtering and Full Note Read]
      |
      +-- [Stage 4a: Frontmatter-based LLM filtering] -> report [frontmatter-filter]
      +-- [Stage 4b: Full file detail reads]
      |
      v
[Stage 5: Broader Text Retrieval] (after 3 relaxation rounds exhausted) -> report [text-fallback]
```

## Execution Example

**User query**: "2025有哪些培训"

**Correct execution sequence**:

1. **Read governance artifacts**:
   - canonical-tags.json: confirms "topic/training" is a valid canonical tag
   - tag-aliases.json: maps "培训" -> "topic/training"

2. **Extract and normalize**:
   - Tags: "培训" -> `tags: ["topic/training"]` (alias mapping)
   - Chronology: "2025" does not map to created/updated because this is an event-time query about when activities happen, not about note chronology

3. **Output structured query summary**:
   ```
   结构化查询：2025 年相关的培训信息
     标签：tags=["topic/training"] (alias: 培训 -> topic/training)
   ```

4. **Call vault_index_search**:
   ```javascript
   vault_index_search(
     query: "2025 培训",
     constraints: {
       tags: ["topic/training"]
     }
   )
   ```

5. **After shortlist, apply frontmatter filtering**:
   - Read `frontmatter_json` on shortlisted candidates
   - Filter for 2025 event dates using `start_date`/`end_date` fields in frontmatter
   - Report as `[frontmatter-filter]`

6. **Read shortlisted files**:
   - SQLite returns paths like `my-work/myself/对外培训/2025/*.md`
   - Read these files to confirm details

7. **Answer with provenance**:
   - List each training event with file-backed details
   - State confidence: high (file-backed facts)

**Anti-pattern (DO NOT do this)**:

```javascript
// WRONG: passing raw query without normalization
vault_index_search(query: "2025有哪些培训")

// WRONG: skipping governance artifact reads
vault_index_search(query: "2025 培训", constraints: {tags: ["培训"]})  // "培训" is alias, not canonical

// WRONG: using training-specific fields in broad structured contract
vault_index_search(query: "2025 培训", constraints: {country: ["中国"], timeMode: "event"})  // location and timeMode are not part of the minimal contract
```

## Shortlist Policy Summary

| Policy | Value | Rationale |
|-----------|-------|-----------|
| Shortlist tolerance | Context-budget-aware, not a single fixed global threshold | Adapts to available model context |
| Max relaxation rounds | 3 | Prevent infinite relaxation loops |
| Time broadening increment | 30 days, then 90 days | Reasonable expansion for date ranges |
| Diagnostics labels | `[structured]`, `[frontmatter-filter]`, `[text-fallback]`, `[unavailable]` | Stage-aware reporting |

## Skills

- load `second-brain-query`

## Provenance Separation

All answers must keep these four categories distinct:

1. **File-backed local facts** - information confirmed by reading the source Markdown file from the vault.
2. **Index-only hits** - information present in the SQLite index but not yet confirmed by reading the source file. These must not be presented as verified claims.
3. **Network-derived information** - information obtained from `websearch` or `webfetch`. Must be labeled as external regardless of session mode.
4. **Working hypotheses or inferred matches** - conclusions drawn by inference, pattern matching, or relaxation rather than by direct structured retrieval. Must be labeled as hypotheses.

This separation is defined in `.opencode/docs/sqlite-retrieval-contract.md` as the canonical source. All retrieval consumers must follow the same categories without redefining them.

## Outputs

- concise answer
- confidence label
- note or folder provenance when practical
- fallback reason when retrieval was relaxed (which relaxation step, how many candidates found, why confidence may be lower)
- acknowledgement when retrieval had to expand beyond the SQLite shortlist

## Invariants

- Constraint extraction (Stage 0) must run before any SQLite shortlist execution
- SQLite remains the first retrieval layer when structured clues are usable
- Frontmatter remains the source of truth; SQLite is a derived retrieval index
- Structured constraints are applied as intersected families inside SQLite, not as broad post-filtering after a loose search
- The minimal shared retrieval contract uses only `tags`, `created_at`, and `updated_at` for broad SQLite shortlist generation
- Note-type-specific fields (location, event dates, etc.) are preserved in `frontmatter_json` for LLM-side filtering after shortlist generation; they are not broad SQLite shortlist inputs
- Progressive relaxation order is fixed: tags -> chronology -> unstructured. With a 3-round cap, round 3 is full constraint removal (the last resort before Stage 5).
- Fallback behavior is inspectable and logged
- Empty constraint set produces no unbounded query
- Constraint family priority is fixed: tags -> chronology
- Shortlist hits are not confirmed evidence until the source file is read
- Missing or unreadable shortlisted files are reported as stale or inconsistent index evidence, not as confirmed facts
- LLM-side filtering over serialized frontmatter happens after SQLite shortlist generation and before full file detail reads
- Full file reads are deferred until after shortlist generation and any frontmatter-based narrowing
- Shortlist tolerance must be described as context-budget-aware; a single hardcoded global threshold is prohibited
- Provenance separation is mandatory: file-backed facts, index-only hits, network-derived information, and working hypotheses must remain distinct categories in reasoning and answers
- Non-debug sessions require explicit user permission before `websearch` or `webfetch`; debug-mode exceptions must still label network-derived results clearly
- Fallback broadening beyond the structured shortlist must be stated explicitly with lower confidence
- Early tag usage remains flexible; stricter normalization is deferred until tag growth justifies governance
