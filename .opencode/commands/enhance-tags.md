---
description: Generate topic tags for resource notes with LLM processing
model: bailian-coding-plan/glm-5
---
Execute workflow @.opencode/workflows/enhance-tags-resources.md

Query SQLite for files with `llm_description_done: true` AND `llm_tags: false`, retrieve descriptions and tags from frontmatter_json, generate topic tags, and write updates. No full file reads needed.