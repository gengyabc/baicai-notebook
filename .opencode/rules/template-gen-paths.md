# Rule: Template Gen Paths

## Directory Structure

```
.temp/
├── .current_task.json       # State file (task, version, updated_at)
├── {task}/
│   ├── input/
│   │   └── {task}.docx
│   ├── temp-v{N}/           # Machine-readable (JSON)
│   │   ├── parsed.json
│   │   ├── placeholders.json
│   │   ├── descriptions.json
│   │   └── fill_data.json
│   └── output-v{N}/         # Human-readable (CSV, DOCX)
│       ├── descriptions.csv
│       ├── template.docx
│       └── filled.docx
```

## File Purposes

| File | Purpose |
|------|---------|
| `parsed.json` | Document structure (paragraphs, tables, styles) |
| `placeholders.json` | Placeholder list with location/context |
| `descriptions.json` | Placeholder + description (CSV import result) |
| `fill_data.json` | Data structure for template filling |
| `descriptions.csv` | Human-editable placeholder descriptions |
| `template.docx` | Jinja template with placeholders |
| `filled.docx` | Final output with filled data |

## State File

`.temp/.current_task.json` tracks active task/version.

Use `TaskPaths.get_current()` to read, or check the file directly.

## Access Pattern

- **Read**: Use `TaskPaths.get_current()` to get current task paths
- **Write**: Files are auto-created by Python modules
- **LLM edit**: Read/write JSON files directly at paths shown above