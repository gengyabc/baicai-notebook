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
3. `.opencode/location-aliases.json`
4. `.opencode/tag-expansions.json` if it exists

## Retrieval Contract

This skill consumes the canonical retrieval workflow and must not redefine schema, wrapper shape, or provenance rules.

Read and follow:

1. `.opencode/docs/sqlite-retrieval-contract.md`
2. `.opencode/workflows/query-vault.md`
3. `.opencode/rules/retrieval-safety.md`

## What To Do

- Extract structured constraints first. Priority is `time -> location -> tags -> extraFields`.
- Normalize with the governed JSON artifacts before calling `vault_index_search`.
- Output a structured query summary in commentary before the tool call.
- Pass only normalized constraints to `vault_index_search`.
- Read `workbook/wiki/index.md` first, then `workbook/wiki/`, then supporting evidence from `workbook/resources/`.
- Use `workbook/brainstorm/` only for tentative synthesis.
- Keep file-backed facts, index-only hits, network-derived info, and hypotheses separate.

## Query Summary

Before `vault_index_search`, output:

```text
结构化查询：[summary of user query intent]
  时间：timeMode=[event|note], start=[ISO date], end=[ISO date]
  地点：country=[value], province=[value], city=[value]
  标签：tags=[canonical values from canonical-tags.json]
```

## Key Rules

- Use `event` time for activities, `note` time only for note chronology.
- Use canonical tag values only; aliases are input-only.
- Use canonical location values only; aliases are input-only.
- Do not inject `country = 中国` when the user omitted country.
- Use only allowlisted extra fields: `duration`, `num_participant`, `organizer`, `host`, `participants`.
- Treat structured retrieval as intersection-based.
- If the shortlist is empty or weak, relax in the fixed order from `query-vault.md` and lower confidence.
