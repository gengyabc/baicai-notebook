---
description: Enhance descriptions for resource notes needing LLM processing
---
Scan for files with `llm_description_done: false` and enhance descriptions:

1. Use grep to find files with `llm_description_done: false` in frontmatter
2. For each file:
   - Read the content
   - Generate a brief description (1-2 sentences, concise summary)
   - Update frontmatter:
     - `description`: generated description
     - `llm_description_done: true`
     - `ingest_status: processed`
     - `updated`: today's date

Report results: number processed, any errors.