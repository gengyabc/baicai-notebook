# Test Checklist

## Plan Reference

- @.planning/phase/01-sqlite-shortlist-ranking-and-fallback/requirement.md
- @.planning/phase/01-sqlite-shortlist-ranking-and-fallback/step.md

## Chosen Mode

lower-level only

## Why

- No `feature.feature` exists in the step folder
- This step updates Markdown workflow and skill documents, not browser-visible UI
- Verification is document consistency, not runtime behavior

## Lower-Level Coverage

### Batch 1: Structured SQLite Shortlist

- [ ] `query-vault.md` documents tag-based filtering with exact and hierarchical matching (`topic/*` matches `topic/subtopic`)
- [ ] `query-vault.md` documents time-field range filters on `created`, `updated`, `start_date`, `end_date`
- [ ] `query-vault.md` documents location-field filtering on `country`, `province`, `city`
- [ ] `query-vault.md` documents location default: `country` defaults to China when absent
- [ ] `query-vault.md` documents mixed-constraint intersection behavior
- [ ] `query-vault.md` documents that empty constraint set returns empty shortlist (no unbounded query)
- [ ] `query-vault.md` references `notes` and `properties` tables in `.opencode/frontmatter-index.sqlite`

### Batch 2: Candidate Count Decision

- [ ] `query-vault.md` documents 0-candidate action: skip to Progressive Relaxation
- [ ] `query-vault.md` documents 1-19 candidate action: read all directly
- [ ] `query-vault.md` documents 20-100 candidate action: description-based reranking
- [ ] `query-vault.md` documents 101+ candidate action: stricter structural narrowing or relaxation
- [ ] All four threshold boundaries are present in the document

### Batch 3: Progressive Relaxation

- [ ] `query-vault.md` documents relaxation priority order: tags -> time -> location -> unstructured
- [ ] `query-vault.md` documents tag relaxation: remove low-value (least selective) tags first
- [ ] `query-vault.md` documents time broadening: extend by 30 days, then 90 days
- [ ] `query-vault.md` documents location broadening: remove city, then province, keep country last
- [ ] `query-vault.md` documents max 3 relaxation rounds before broader text fallback
- [ ] `query-vault.md` documents that after each relaxation step, Stage 1 is retried

### Batch 4: Description Reranking

- [ ] `query-vault.md` documents description scoring by relevance to query
- [ ] `query-vault.md` documents top N = 20 after reranking
- [ ] `query-vault.md` documents that if top N insufficient after read, triggers relaxation

### Batch 5: Integration and Fallback Visibility

- [ ] `query-vault.md` documents full 5-stage integration topology
- [ ] `query-vault.md` documents fallback logging: which relaxation step triggered
- [ ] `query-vault.md` documents fallback logging: candidate count after each pass
- [ ] `query-vault.md` documents fallback logging: confidence lowered when broader text used
- [ ] `second-brain-query/SKILL.md` references the retrieval decision chain
- [ ] `second-brain-query/SKILL.md` encodes frozen thresholds
- [ ] Both documents are internally consistent with each other and with `step.md`

### Frozen Thresholds

- [ ] Direct read threshold: <= 19
- [ ] Description rerank threshold: 20-100
- [ ] Structural narrowing threshold: > 100
- [ ] Max relaxation rounds: 3
- [ ] Top N after reranking: 20
- [ ] Time broadening: 30 days, then 90 days

## Browser E2E Coverage

- none required

## Refresh Triggers

- Step.md changes that add, remove, or reorder retrieval stages
- Threshold values change in step.md
- Relaxation priority order changes
- New constraint types added (e.g., full-text search integration)
- Reviewer findings showing missing or inconsistent documentation
