---
schema: implementation-result-v1
step-key: semantic-query-mapping-expansion
step-folder: 05-semantic-query-mapping-expansion
requirement-version: 1
step-version: 1
result-version: 3
implementation-status: complete
---

# Implementation Result: 05-semantic-query-mapping-expansion

## Plan Source

- @.planning/phase/05-semantic-query-mapping-expansion/step.md

## Based On

- @.planning/phase/05-semantic-query-mapping-expansion/quality-review.md (Q05-002, Q05-003)

## Summary

- Step: 05-semantic-query-mapping-expansion
- Status: complete
- Result Scope: quality fix pass (Q05-002, Q05-003) only

## Files Changed

- `.opencode/plugins/vault-query-router/index.ts` (removed duplicate `StructuredConstraintsInput` and `ExtractedConstraints` type declarations that conflicted with imports)
- `.opencode/plugins/vault-query-router/extraction.test.ts` (replaced hardcoded year/month dates with dynamic computation from `new Date()`)

## Behavior Implemented

### Q05-002 fix: Remove duplicate type declarations in index.ts
- Removed local `type StructuredConstraintsInput` (lines 58-67) and `type ExtractedConstraints` (lines 80-84) that conflicted with the imported types from `extraction-logic.ts`
- The imported types (`StructuredConstraintsInput`, `ExtractedConstraints`) from `./extraction-logic` are now the sole declarations used throughout `index.ts`
- The local `StructuredConstraints` type (with required fields) is kept because it is a distinct type, not a duplicate

### Q05-003 fix: Make time-phrase tests date-resilient
- Added dynamic date helper functions (`currentYear`, `lastYear`, `currentMonth`, `monthStart`, `monthEnd`, `daysInMonth`) computed from `new Date()` at test load time
- Replaced all hardcoded year/month expectations in time-phrase tests with dynamic regex patterns derived from these helpers
- Tests for "今年", "this year", "去年", "last year", "这个月", "this month", "上个月", "last month", "3月 (implicit year)", "从3月到5月", and "between March and May" now derive expected values dynamically
- Tests that reference explicit years in the query string (e.g., "2025年", "after 2025") remain hardcoded because those expectations are tied to the query content, not the current date

## Tests Added

- No new test cases added; existing tests updated to be date-resilient

## Canonical E2E Path

- none

## E2E Run Result

- not run

## Commands Run

- `bun test "./.opencode/plugins/vault-query-router/extraction.test.ts"` (passed - 56 tests, 141 assertions)
- `bunx tsc --noEmit ... extraction-logic.ts` (passed - no type errors)
- `bunx tsc --noEmit ... index.ts` (no TS2440 duplicate declaration errors; remaining errors are pre-existing `@types/node` missing issues unrelated to this change)

## Known Risks

- The project has no `tsconfig.json` and no `@types/node` installed, so full type-checking of `index.ts` requires environment setup. The TS2440 conflict is confirmed resolved by the absence of that error code in tsc output.

## Next Suggested Review Focus

- Verify the router plugin loads correctly in the live opencode environment (no runtime import errors from the type removal)
- Confirm no other files in the project re-declare types imported from extraction-logic.ts

## Fix Scope

- Q05-002: Removed duplicate `StructuredConstraintsInput` and `ExtractedConstraints` type declarations from `index.ts` that caused `TS2440: Import declaration conflicts with local declaration`
- Q05-003: Replaced hardcoded dates (2026, 2026-04, 2026-03, etc.) in time-phrase tests with dynamic computation from `new Date()`, making the test suite stable across months and years
