---
description: Convert PDFs in raw/ to markdown in resources/
---
Convert all unprocessed PDF files from `raw/` to markdown in `resources/`.

Steps:
1. Find all `.pdf` files in `raw/` (excluding `raw/processed/`)
2. For each PDF, run: `uv run markitdown "raw/<filename>.pdf" -o "resources/<filename>.md"`
3. Move processed PDFs to `raw/processed/` folder
4. Report converted files

The markitdown package with [pdf] extra is already installed in the project.