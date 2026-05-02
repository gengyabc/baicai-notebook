---
name: second-brain-query
description: Answer vault questions using folder-aware confidence and provenance
compatibility: opencode
---
## Purpose

Use this skill for vault Q&A that needs confidence-aware retrieval and provenance.

## Mandatory Pre-Reads

Before any vault query, read:

1. `.opencode/canonical-tags.json`
2. `.opencode/tag-aliases.json`
3. `.opencode/tag-expansions.json` if it exists

## Retrieval Contract

This skill consumes the canonical retrieval workflow and must not redefine schema, wrapper shape, or provenance rules.

Read and follow:

1. `.opencode/docs/sqlite-retrieval-contract.md`
2. `.opencode/workflows/query-vault.md`
3. `.opencode/rules/retrieval-safety.md`

## What To Do

- Extract structured constraints first. Priority is `tags -> chronology`.
- Normalize with the governed JSON artifacts before calling `vault_index_search`.
- Output a structured query summary in commentary before the tool call.
- Pass only normalized constraints to `vault_index_search`.
- The minimal retrieval contract uses only `tags`, `createdStart`/`createdEnd`, and `updatedStart`/`updatedEnd` for broad SQLite shortlist generation.
- Location and event-time metadata are not part of the broad structured retrieval contract; they are preserved in `frontmatter_json` for LLM-side filtering after shortlist generation.
- Read `workbook/wiki/index.md` first, then `workbook/wiki/`, then supporting evidence from `workbook/resources/`.
- Use `workbook/brainstorm/` only for tentative synthesis.
- Keep file-backed facts, index-only hits, network-derived info, and hypotheses separate.

## Query Summary

Before `vault_index_search`, output:

```text
结构化查询：[summary of user query intent]
  标签：tags=[canonical values from canonical-tags.json]
  时间：created=[start]..[end], updated=[start]..[end]
```

## Key Rules

- Use canonical tag values only; aliases are input-only.
- Use `createdStart`/`createdEnd` only for note-chronology questions; event-time queries rely on tags + text-fallback + frontmatter_json filtering.
- Note-type-specific metadata (location, event dates, etc.) is preserved in `frontmatter_json` for LLM-side filtering, not as broad SQLite shortlist inputs.
- Treat structured retrieval as intersection-based.
- If the shortlist is empty or weak, relax in the fixed order from `query-vault.md` and lower confidence.
- Early tag usage remains flexible; strict tag normalization is deferred until tag growth justifies governance.
