---
description: Import edited placeholder CSV and fill a DOCX template
argument-hint: "[descriptions-csv] [template-docx] [output-docx]"
model: bailian-coding-plan/glm-5
---

Process the edited placeholder descriptions and fill the template.

**Arguments:**
- `$1` (optional): CSV file path
  - If not provided: Find the newest `*_descriptions.csv` in `.temp/docx_placeholders/`
- `$2` (optional): Template DOCX path
  - If not provided: Find the newest `*_template.docx` in `.temp/docx_placeholders/`
- `$3` (optional): Output DOCX path
  - If not provided: `.temp/output/<template_basename>_filled.docx`

Follow the `fill-docx` workflow.
