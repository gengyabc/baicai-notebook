# Test Checklist

## Plan Reference

- @.planning/phase/05-semantic-query-mapping-expansion/requirement.md
- @.planning/phase/05-semantic-query-mapping-expansion/step.md

## Chosen Mode

lower-level only

## Why

- No `feature.feature` exists in the step folder
- Step is implementation-focused: extraction logic, documentation alignment, text-mode diagnostics
- All behavior can be verified through unit tests on exported functions and documentation content checks

## Lower-Level Coverage

### Batch 1: Freeze semantic mapping ownership and first-version boundaries

- Contract doc separates canonical-value ownership (alias-registry.md) from retrieval-time semantic mapping behavior
- Contract doc states first-version semantic topic expansion resolves only to already-supported canonical tags values
- Contract doc states ambiguous phrases remain unresolved and must be reported instead of guessed
- Workflow doc and skill doc consume the same bounded semantic-mapping policy

### Batch 2: Expand deterministic time and location phrase normalization

- Router supports "this year"/今年 time normalization
- Router supports "last year"/去年 time normalization
- Router supports "this month"/这个月 time normalization
- Router supports "last month"/上个月 time normalization
- Router supports month-with-year normalization (YYYY年MM月)
- Router supports "since"/以来 date range normalization
- Router supports "before"/之前 date range normalization
- Router supports "after"/之后 date range normalization
- Router supports "between X and Y"/从X到Y date range normalization
- Time normalization still chooses event vs note mode before query construction
- Location phrase expansion normalizes only to country/province/city using governed canonical values
- Extraction does not broaden to fuzzy or multi-hop semantic guesses for time or location

### Batch 3: Bounded topic phrase expansion on governed canonical tags

- Router TAG_KEYWORDS covers topic/ai-tools with aliases from alias-registry.md
- A matched semantic topic phrase produces at most one canonical tag
- Phrases without one deterministic governed destination are not silently mapped
- Alias-registry.md and retrieval docs stay aligned on which canonical tag values are legal mapping targets

### Batch 4: Mapped and unmapped phrase diagnostics in current router output

- Structured-shortlist output explicitly reports the mapped phrases that produced active constraints
- Router output explicitly reports unresolved/rejected semantic hints
- Fallback output distinguishes "no usable structured constraints" from "structured shortlist was insufficient after applying mapped constraints"
- Docs do not claim diagnostics exist as structured response fields when only present in text output

## Browser E2E Coverage

- none required

## Refresh Triggers

- Material step changes to mapping policy or tag coverage
- Review findings showing missing time/location normalization patterns
- Review findings showing incorrect diagnostics output format
