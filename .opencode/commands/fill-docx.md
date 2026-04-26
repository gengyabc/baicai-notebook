---
description: Import edited placeholder CSV and fill a DOCX template
argument-hint: "[--free yes/no]"
model: bailian-coding-plan/glm-5
---

Process the edited placeholder descriptions and fill the template.

**Arguments:**
- `--free` or `-f` (optional): Source mode
  - `no` (default): only use vault content
  - `yes`: may fill with non-vault content and search the web

Follow the `@workflows/fill-docx.md` workflow.
