---
description: Generate Jinja template from Word document (parse -> placeholders -> template)
argument-hint: <docx-file>
model: bailian-coding-plan/glm-5
---

Generate a Jinja template from the Word document: `$ARGUMENTS`.

Follow the `generate-template` workflow to:
1. Parse document structure
2. Generate semantic placeholders
3. Create Jinja template