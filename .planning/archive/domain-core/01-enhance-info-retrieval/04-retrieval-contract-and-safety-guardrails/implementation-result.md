---
step-folder: 04-retrieval-contract-and-safety-guardrails
requirement-version: 1
step-version: 1
implementation-status: complete
---

## Summary

Froze the canonical SQLite retrieval contract and aligned all retrieval consumers to one consistent provenance, fallback, and safety policy. Updated the contract doc to declare itself the single canonical reference with freeze markers, added the "Vault Source of Truth" section, expanded the Required Indexes section to match the actual SQLite schema, and added canonical Provenance Separation and Network Permission Policy sections. Updated query-vault.md with shortlist-first reading order, stale-index handling, provenance separation, and network permission invariants. Updated retrieval-safety.md with canonical contract reference, explicit schema-guessing prohibition, normal-vs-debugging SQL distinction, stale-index labeling, four-category provenance separation, and consistent network permission policy. Updated second-brain-query/SKILL.md with Canonical Contract Consumption section, Provenance Separation section, and expanded Constraints. Updated debug-mode.md with "Still Required in Debug Mode" section preserving schema discipline, provenance labeling, stale-index handling, and fallback visibility even in debug sessions. All 47 TDD batch verification checks pass.

## Files Changed

- `.opencode/docs/sqlite-retrieval-contract.md` - frozen as single canonical reference; added Vault Source of Truth section, expanded Required Indexes, added Provenance Separation and Network Permission Policy sections, updated Verification Checklist
- `.opencode/workflows/query-vault.md` - added "single canonical reference" language, shortlist-first reading order, stale-index handling, provenance separation section, network permission policy, and expanded invariants
- `.opencode/skills/second-brain-query/SKILL.md` - added Canonical Contract Consumption section, Provenance Separation section, and expanded Constraints list
- `.opencode/rules/retrieval-safety.md` - added Canonical Contract Reference section, strengthened Guard section, updated Database Awareness with schema-guessing prohibition, updated Raw-SQL Prohibition with normal-vs-debugging distinction, expanded File Validation with stale-index labeling, updated Confidence Separation to four canonical categories, updated Network Search Policy, expanded Failure Handling, expanded Anti-Patterns
- `.opencode/rules/debug-mode.md` - added "Still Required in Debug Mode" section covering schema discipline, provenance labeling, stale-index handling, and fallback visibility

## Test Checklist

- B1.1a: contract declares single canonical reference - PASS
- B1.2: SQLite is derived index, not vault truth - PASS
- B1.3: vault_index_search is only supported entrypoint - PASS
- B1.4a: current vs planned request shape separation - PASS
- B1.4b: planned capabilities labeled as not yet live - PASS
- B1.5a-f: Required Indexes match actual schema - PASS (all 6)
- B2.1: Stage 0 before Stage 1 required - PASS
- B2.2a: ad hoc SQL prohibited - PASS
- B2.2b: constraints enforced inside SQLite - PASS
- B2.3: shortlist-first reading order - PASS
- B2.4: no unbounded query from empty extraction - PASS
- B2.5: vault_index_search as first retrieval wrapper - PASS
- B3.1a: schema guessing prohibited - PASS
- B3.1b: directs to canonical contract - PASS
- B3.2: distinguishes normal retrieval from debugging/verification - PASS
- B3.3: stale/inconsistent index labeling required - PASS
- B3.4: fallback explicit with lower confidence - PASS
- B4.1a-d: all 4 docs agree on 4 provenance categories - PASS (all 16)
- B4.2a-c: non-debug network permission and prompt shape - PASS (all 3)
- B4.3a-d: debug mode doesn't weaken schema/provenance - PASS (all 4)
- B4.4a-c: SKILL.md consumes contract without redefining - PASS (all 3)

## Quality Fix Pass 1 (QB-001)

### Fixes applied

**QR-enhance-info-retrieval-P2-001 (required)**: Fixed live-vs-planned boundary for matched phrases in consumer docs. Both `query-vault.md` and `second-brain-query/SKILL.md` previously stated that Stage 0 produces "normalized constraint values and matched phrases to be passed to the wrapper", implying matched phrases are live wrapper inputs. The canonical current request shape only accepts `query`, `limit`, `folders`, and `constraints`; `matchedPhrase` appears only in the planned `structuredTrace` input. Changed both docs to say that Stage 0 currently passes only the normalized constraint payload through the live request shape, and explicitly noted that matched phrases are caller-side extraction artifacts not currently carried through any live wrapper input field.

**QR-enhance-info-retrieval-P3-002 (optional)**: Trimmed duplicated schema details from consumer docs to reduce drift risk. In `query-vault.md`: replaced `value_text` column / `properties` table reference in Location matching detail with a reference to the canonical contract; replaced `value_date` from `properties` table reference in Time matching detail with a reference to the contract; removed SQL examples with concrete table/column names from SQL implementation patterns section, replacing with references to Schema and Anti-Patterns sections in the contract doc; trimmed tag matching detail from SQL syntax to behavior-only description. In `second-brain-query/SKILL.md`: replaced "Execute against `notes` and `properties` tables" in Stage 1 with "Execute with intersection semantics using the schema and table conventions defined in `.opencode/docs/sqlite-retrieval-contract.md`".

### Files changed in this pass

- `.opencode/workflows/query-vault.md` - Diagnostics section: changed "normalized constraint values and matched phrases to be passed to the wrapper" to "normalized constraint values to be passed to the live wrapper through the current request shape" and added explicit note about matched phrases being caller-side only; Location matching detail: replaced schema column reference with contract doc reference; Time matching detail: replaced `value_date`/`properties` reference with contract doc reference; Tag matching detail: removed SQL syntax, kept behavior-only; SQL implementation patterns: removed inline SQL examples, added references to contract doc Schema and Anti-Patterns sections
- `.opencode/skills/second-brain-query/SKILL.md` - Diagnostics section: same matched-phrase boundary fix as query-vault.md; Stage 1 description: replaced `notes` and `properties` table names with reference to contract doc

### Verification

No files outside the two consumer docs were modified. The canonical contract (`.opencode/docs/sqlite-retrieval-contract.md`), safety rule (`.opencode/rules/retrieval-safety.md`), and debug-mode rule (`.opencode/rules/debug-mode.md`) were not touched.

## Blocked Reason

(none)
