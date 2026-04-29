# Workflow: Fill Docx

See `@.opencode/rules/template-gen-paths.md` for directory structure and file purposes.

## Goal

Convert edited placeholder CSV into the final filled DOCX by importing the CSV, querying the vault for data, generating fill data, and running the template filler.
All for current task

Approval boundary for sensitive data:
- normal LLM fill path: query vault and populate non-sensitive fields with model assistance
- local-only sensitive fill path: when approval is denied, sensitive values are completed by local scripts
- sensitive values must never be sent to the model

## Steps

### Step 1: Import CSV to JSON

```bash
uv run python -m template_gen.import_placeholder_csv
```

### Step 2: Validate Freshness And Generate Empty Fill Data Schema

```bash
uv run python -m template_gen.generate_fill_data
```

Before generating `fill_data.json`, this step validates that imported `descriptions.json`
matches the current canonical placeholder sequence from `temp-v{N}/placeholders.json`.
If mismatch is detected, fail fast and require:

- rerun `/export-csv edit`
- update the regenerated `descriptions.csv`
- rerun `/fill-docx`

### Step 2.5: Bind Secrets To Placeholders

For each placeholder in `descriptions.json` that has a `secret_name` field,
the field is marked as secret-backed. The `secret_name` is preserved from
env-registry metadata when a high-confidence match exists between the
placeholder field name and a registered secret name.

Fields with `secret_name` will be filled by the opaque sensitive fill path
(not by the LLM). The LLM must leave these fields empty in `fill_data.json`.

### Step 3: Query Sources for Fill Data

**This step must be performed by the LLM.**

Read the fill_data JSON to see the field structure and descriptions.

Then follow `@.opencode/workflows/query-vault.md` to query the vault for relevant data.

**Fill data rules:**
- Use real data from vault when found
- Leave empty string `""` if no data found (do not invent data)
- For arrays: populate with actual items from vault, or keep single empty template item
- Preserve data provenance by noting source in comments
- **For fields with `secret_name` in descriptions.json: leave the value as empty string `""`; these fields will be filled by the opaque sensitive fill path**

If `--free yes` or `-f yes`:
- fill missing content with reasonable non-vault content
- fill as much as you can, search the web for content you don't know or not available in the vault
- prefer vault data first when both vault and web sources exist
- Never invent personal info

Update the fill_data JSON with the populated values.

### Step 4: Fill the Template

```bash
uv run python -m template_gen.fill_runner
```

### Step 5: Opaque Sensitive Fill

For any field with `secret_name` in `descriptions.json`, the LLM must not
fill that field. Instead, sensitive values are inserted by trusted local
execution through `secure_action` after the non-sensitive fill is complete.

**This step must NOT be performed by the LLM.** The LLM may trigger the
opaque fill path, but secret consumption and insertion happen inside trusted
local execution only.

- Sensitive values must never appear in model-visible output, logs, or errors
- `secure_action` is the preferred invocation path for sensitive document filling
- Trusted fill operates only on placeholders with explicit stored `secret_name`
- No semantic re-matching of secrets occurs at fill time

## Outputs

- fill-data JSON populated from vault data
- final filled DOCX
