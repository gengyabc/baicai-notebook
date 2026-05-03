# Workflow: Enhance Resource Tags

## Goal

Process resource notes marked with `llm_description_done: true` and `llm_tags: false` by generating LLM topic tags.

## Inputs

- Files with `llm_description_done: true` AND `llm_tags: false` (or missing) in frontmatter
- Located in managed directories per vault-config.json
- Precondition: `/enhance-description` must run first

## Governance

Tag generation must honor the governed tag system:

- **canonical-tags.json**: Legal tag values - only use `topic/*` subset for generation
- **tag-aliases.json**: Alias recognition - LLM should recognize aliases when analyzing content
- **tag-expansions.json**: NOT used for generation (only for retrieval expansion)

## Steps

1. **Query pending files via SQLite**
   - Query frontmatter_json from notes table:
     ```sql
     SELECT path, 
            json_extract(frontmatter_json, '$.description') as description,
            json_extract(frontmatter_json, '$.tags') as tags
     FROM notes
     WHERE json_extract(frontmatter_json, '$.llm_description_done') = 1
     AND (json_extract(frontmatter_json, '$.llm_tags') IS NULL 
          OR json_extract(frontmatter_json, '$.llm_tags') = 0)
     ```
   - Returns: path, description (LLM-enhanced), existing tags array

2. **For each pending file**:
   a. Use description from SQLite query (already LLM-enhanced summary)
   b. Parse existing tags array from query result
   c. Analyze description for topic relevance
   d. Generate topic tags:
      - Select from `topic/*` subset in canonical-tags.json
      - Recognize aliases per tag-aliases.json
      - Validate generated tags exist in canonical set
   e. Merge into tags array:
      - Preserve system tags (state/*, source/*, role/*)
      - Keep existing topic/* tags if present
      - Append new topic/* tags
      - Deduplicate
   f. Update frontmatter (write only):
      ```yaml
      tags: merged array
      llm_tags: true
      updated: YYYY-MM-DD
      ```

3. **Report results**:
   - Files processed
   - Tags added per file
   - Any errors

## Merge Strategy

- Preserve all system tags (state/*, source/*, role/*)
- Keep existing topic/* tags
- Append LLM-generated topic/* tags
- Deduplicate final array

## Order

1. `/enhance-description` → sets `llm_description_done: true`
2. `/enhance-tags` → sets `llm_tags: true`