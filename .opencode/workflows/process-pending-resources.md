# Workflow: Enhance Resource Descriptions

## Goal

Process resource notes marked with `llm_description_done: false` by generating LLM-enhanced descriptions.

## Inputs

- Files with `llm_description_done: false` in frontmatter (typically in `resources/`, `Resources/`, `brainstorm/managed/`, or `Brainstorm/managed/`)
- Exclude whitelist: `index.md`, `log.md`, files with `github.com` in `source_ref`

## Steps

1. **Scan for pending files**
   - Use grep to find `llm_description_done: false` in `.md` files
   - Filter by target directories: `resources/`, `Resources/`, `brainstorm/managed/`, `Brainstorm/managed/`
   - Skip index.md and log.md

2. **For each pending file**:
   a. Read the file content
   b. Extract content preview (first 1000 chars of body, cleaned)
   c. Generate description:
      - 1-2 sentences summarizing key point
      - Concise, informative
   d. Update frontmatter:
      ```yaml
      description: generated description
      llm_description_done: true
      ingest_status: processed
      updated: YYYY-MM-DD
      ```

3. **Report results**:
   - Files processed
   - Any errors or skipped files

## Constraints

- Only process files with `llm_description_done: false`
- Skip files in whitelist (index.md, log.md, GitHub URLs)
- Preserve all existing frontmatter fields including `image_key`
- Use atomic write (temp file → rename)
- Don't rename files - keep original filename

## Whitelist

Files automatically skipped (already have `llm_description_done: true`):
- `index.md` and `log.md`
- Files with `source_ref` containing `github.com`

## Example

Input file: `resources/some-long-filename.md`

Enhanced frontmatter:
```yaml
description: Concise summary of the resource content.
llm_description_done: true
ingest_status: processed
image_key: some-long-filename  # unchanged
```

## Skills

- Use `second-brain-ingest` for routing if needed after processing
