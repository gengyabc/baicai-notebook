---
description: Generate Jinja template from Word document (parse -> placeholders -> template)
argument-hint: "[docx-file]"
model: bailian-coding-plan/glm-5
---

Generate a Jinja template from the Word document.

**Argument:** `$1` (optional)
- If provided: Use the specified DOCX file path
- If not provided: Find the newest `.docx` file in `.temp/docx/`

**Output:** `.temp/docx_placeholders/<basename>_template.docx`

Follow the `generate-template` workflow to:
1. Parse document structure
2. Generate semantic placeholders
3. Create Jinja template
