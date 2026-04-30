# Retrieval Safety

Guardrails for vault retrieval, schema awareness, fallback behavior, provenance separation, and network access.

## Canonical Contract Reference

All schema knowledge, wrapper contract details, retrieval-relevant fields, and provenance separation categories are defined in `.opencode/docs/sqlite-retrieval-contract.md`. That document is the single canonical reference. This rule enforces compliance with the contract; it does not redefine schema, wrapper shapes, or provenance categories.

## Guard

If debug mode is active for this session, this rule may be relaxed for network search (see Network Search Policy below), but **schema discipline, provenance separation, and confidence labeling still apply**. Debug mode does not authorize schema guessing, wrapper bypass, or blurring provenance categories.

## Structured-First Constraint

1. Constraint extraction (Stage 0) must run before any SQLite shortlist execution. This is a safety requirement, not just a workflow preference.
2. All structured constraints must be passed through the current request shape defined in `.opencode/docs/sqlite-retrieval-contract.md`. Scalar extraction outputs must be wrapped as single-element arrays for location fields to match the live wrapper's array-valued input. Ad hoc raw SQL generation for retrieval is prohibited.
3. Usable structured clues (time, location, tags, allowlisted extra fields) must be applied through SQLite before any title-first or body-first search.
4. Empty or unusable structured extraction does not authorize an unbounded structured query. If no usable structured clues are found, the live wrapper falls back to text search (`mode: "text-fallback"`) rather than returning an empty structured shortlist. Proceed to progressive relaxation only if the text fallback is insufficient.
5. The constraint-extraction priority order is frozen: time/date -> location -> tags/topic -> allowlisted extra fields. Do not reorder or skip families.
6. Time mode must be chosen at extraction time, before query construction. Event-time requests must not be satisfied with `created` or `updated`.
7. Location defaults to `中国` at the metadata/index level when a note's `country` field is absent. Do not inject `country = 中国` at query time when the user omitted a country.

## Raw-SQL Prohibition

1. `vault_index_search` is the only supported first-pass retrieval entrypoint in non-debug sessions.
2. Ad hoc SQL is **not** a default retrieval path. Manual SQL is allowed **only** for retrieval-layer implementation, debugging, or verification of the retrieval layer itself. These are distinct from normal retrieval: they exist to build, test, and verify the wrapper, not to answer user queries directly.
3. When the wrapper cannot express a required diagnostic or verification step, manual SQL must still follow the `query-vault.md` contract.
4. Do not use improvised SQL patterns to bypass the structured constraint contract.
5. Do not substitute `LIKE '%term%'` text matching for canonical structured filters.

## Database Awareness

1. **Schema guessing is prohibited.** Do not guess SQLite table names, column names, or index shapes.
2. When schema knowledge is needed, read `.opencode/docs/sqlite-retrieval-contract.md` first. That document is the single canonical reference for schema, indexes, and wrapper contract.
3. If schema is still unclear after reading the contract, inspect the actual SQLite schema (e.g., `.schema` command) before querying data.
4. Treat `.opencode/frontmatter-index.sqlite` as the derived retrieval index, not as a freeform database for improvised search patterns.
5. Do not define or document schema details outside the canonical contract document. Other files must reference, not redefine, the schema and indexes.

## Required Retrieval Order

1. In non-debug sessions, start with constraint extraction (Stage 0), then `vault_index_search` (Stage 1).
2. Prefer structured constraints over title-first or body-first search whenever the query contains usable signals such as time, location, tags, or stable structured fields.
3. Read shortlisted files before reading outside the shortlist.
4. Use manual SQL only when the wrapper cannot express the required diagnostic or verification step.
5. Manual SQL must still follow the `query-vault.md` contract.

## Structured Query Discipline

1. Do not substitute guessed text search for canonical structured filters.
2. Do not use broad `LIKE '%term%'` matching where canonical tags or canonical location values are available.
3. Do not use note path heuristics such as `path LIKE '%2025%'` as a replacement for structured time filtering.
4. Mixed constraint families must be intersected in one SQLite pass.
5. Empty structured constraints must not trigger an unbounded SQLite query.
6. If part of the user's meaning cannot be mapped reliably into structured constraints, state that limitation explicitly instead of pretending the query is fully captured.
7. Do not use freeform title or body keyword search as a substitute for structured tag extraction.
8. Extra-field constraints are limited to the allowlisted set: `duration`, `num_participant`, `organizer`, `host`, `participants`. No other frontmatter keys may be used as structured constraints in the first version.
9. The first version forbids fuzzy person-name normalization for `organizer`, `host`, and `participants`.

## File Validation

1. A shortlist hit is not the same as a verified source. Shortlist hits are derived index evidence, not confirmed file facts.
2. Read the shortlisted file before claiming its contents as confirmed.
3. If the index points to a missing or unreadable file, report it as **stale or inconsistent index evidence**. Do not present such hits as confirmed facts or silently drop them.
4. Do not present index-only matches as confirmed evidence.
5. Stale-index indicators (missing files, unreadable paths) should be surfaced to the user so they know the index may need refreshing.

## Confidence Separation

Keep these four categories distinct in both reasoning and final answers:

1. **File-backed local facts** - information confirmed by reading the source Markdown file from the vault.
2. **Index-only hits** - information present in the SQLite index but not yet confirmed by reading the source file. These must not be presented as verified claims.
3. **Network-derived information** - information obtained from `websearch` or `webfetch`. Must be labeled as external regardless of session mode.
4. **Working hypotheses or inferred matches** - conclusions drawn by inference, pattern matching, or relaxation rather than by direct structured retrieval. Must be labeled as hypotheses.

These categories are defined in `.opencode/docs/sqlite-retrieval-contract.md` as the canonical provenance separation. Do not merge these categories into a single undifferentiated answer. This separation applies across the contract doc, `query-vault.md`, `second-brain-query/SKILL.md`, and this rule.

## Network Search Policy

1. In non-debug sessions, do not use `websearch` or `webfetch` without explicit user permission.
2. If local retrieval is insufficient and external search would help, ask the user first with an explicit and short permission request, for example: `Local retrieval was insufficient. Do you want me to search the web?`
3. In debug mode, network search is allowed without asking first.
4. Even in debug mode, clearly label external results as network-derived information. Debug mode does not weaken provenance labeling requirements.
5. Network-derived results must never be blurred into local-vault evidence. Maintain the provenance separation defined in `.opencode/docs/sqlite-retrieval-contract.md`.

## Failure Handling

1. If the retrieval wrapper fails, say that the structured SQLite shortlist was unavailable before broadening retrieval.
2. If structured extraction only partially matches the user request, explain which parts were applied and which parts were not.
3. If fallback was used, say so explicitly and lower confidence accordingly. Fallback broadening beyond the structured shortlist must be stated explicitly with lower confidence.
4. If the user request appears to mix local-vault lookup with real-world current information, separate those goals and clarify before searching externally in non-debug sessions.
5. Stale or inconsistent index hits (missing or unreadable shortlisted files) must be reported as index issues, not as retrieval successes.

## Anti-Patterns

- Guessing a schema such as `entries(file_path, content)` without checking the canonical contract document.
- Defining or documenting schema details outside `.opencode/docs/sqlite-retrieval-contract.md`.
- Jumping to network search because the user asked an information question.
- Treating shortlist hits as verified facts without opening the files.
- Presenting stale or inconsistent index evidence as confirmed facts.
- Mixing stale-index results, file-backed facts, and web results into one answer without labeling them with the correct provenance category.
- Claiming the user request was fully captured when only a subset of constraints was actually applied.
- Bypassing Stage 0 constraint extraction and going directly to ad hoc SQL.
- Writing raw SQL instead of passing normalized constraints through `vault_index_search`.
- Using title or body keyword search when structured tag extraction is applicable.
- Expanding extra-field constraints beyond the first-version allowlist.
- Blurring network-derived results into local-vault evidence.
- Allowing debug mode to weaken schema discipline or provenance labeling.
