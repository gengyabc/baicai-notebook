---
description: Generate Jinja template from Word document (parse -> placeholders -> template)
argument-hint: "[docx-file]"
model: bailian-coding-plan/glm-5
---

Generate a Jinja template from the Word document.

**Argument:** `$1` (optional)
- If provided: Use the specified DOCX file path
- If not provided: Find newest `.docx` in `.temp/*/input/`

Follow the `@workflows/generate-template.md` workflow.