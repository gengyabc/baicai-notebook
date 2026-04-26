---
description: Export placeholder descriptions as CSV for manual editing
argument-hint: ""
model: bailian-coding-plan/glm-5
---

Export placeholder descriptions from the current task's placeholder JSON.

## Steps

### Step 1: Read Placeholder JSON

Read the placeholder JSON to understand the fields and their context.

### Step 2: Generate Descriptions

For each placeholder, generate a short Chinese description (1-2 sentences):
- Use Chinese for Chinese document templates
- Keep descriptions concise (under 50 characters)
- Describe the field purpose, not the format
- For loop variables, indicate the list structure

### Step 3: Update JSON with Descriptions

Add a `description` field to each placeholder.

### Step 4: Export to CSV

```bash
uv run python -m template_gen.export_placeholder_csv
```
