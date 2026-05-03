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

### Step 2.5: Bind Secrets To Placeholders (LLM Task)

**This step must be performed by the LLM.**

The LLM must assign `secret_name` to placeholders by matching descriptions:

1. List registered secrets (names and descriptions only, no values):
   ```bash
   bun run .opencode/scripts/env-registry.mjs list
   ```

2. For each placeholder in `descriptions.json`, match its description against registered secret descriptions:
   - If a placeholder's description clearly matches a registered secret's description (e.g., "联系人手机" matches "手机号码" for `PHONE`), assign that `secret_name`
   - Only assign when there's high-confidence semantic match
   - If no match or uncertain, leave `secret_name` empty

3. Write the assigned `secret_name` values into `descriptions.json`:
   - Add `"secret_name": "SECRET_NAME"` to matching placeholder entries
   - Example: `{"placeholder": "{{ contact_person_mobile }}", "description": "联系人手机", "secret_name": "PHONE"}`

Fields with `secret_name` will be filled by the opaque sensitive fill path
(not by the LLM). The LLM must leave these fields empty in `fill_data.json`.

### Step 3: Query Sources for Fill Data (LLM Task)

**This step must be performed by the LLM.**

Read `descriptions.json` to see the placeholder field names and descriptions.
**Do NOT read `fill_data.json` - it is denied by permission policy.**

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

Write the non-sensitive values directly to `fill_data.json` using the Write tool.
The LLM writes this file but must not read it back.

### Step 4: Opaque Sensitive Fill (Local Execution Only)

**The LLM must trigger this step but must NOT read fill_data.json after it completes.**

For any field with `secret_name` in `descriptions.json`, the LLM must not
fill that field. Instead, after the non-sensitive LLM fill is complete,
the LLM must trigger trusted local JS/TS execution to insert sensitive
values into `fill_data.json` before Python generates the final DOCX.

Invocation:

```bash
bun run .opencode/scripts/fill-sensitive-fill-data.mjs
```

The LLM may trigger this command, but:
- The script performs the actual secret lookup and file update locally
- **The LLM must NOT read `fill_data.json` after this step**
- Sensitive values must never appear in model-visible output, logs, or errors
- If no placeholders carry `secret_name`, this step fills `0` fields

- Trusted fill operates only on placeholders with explicit stored `secret_name`
- No semantic re-matching of secrets occurs at fill time

### Step 5: Fill the Template (Trigger Only)

**The LLM must trigger this step but must NOT read fill_data.json.**

Run Python only after Step 4 has completed and `fill_data.json` already contains
all non-sensitive values plus any locally injected secret-backed values.

```bash
uv run python -m template_gen.fill_runner
```

The LLM triggers this command. Python reads `fill_data.json` locally and generates the DOCX.
**The LLM never sees the filled secret values.**

## Outputs

- fill-data JSON populated from vault data
- final filled DOCX
