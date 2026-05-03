---
schema: requirements-review-v1
step-folder: 01-sqlite-shortlist-ranking-and-fallback
requirement-version: 1
step-version: 1
review-status: correct
---

## Review

### Requirement Alignment

| Criterion | Status | Evidence |
|-----------|--------|----------|
| SC1: Frontmatter-first SQLite retrieval | Met | query-vault.md Stage 1 documents structured SQLite shortlist as primary filter layer with tags, time, and location constraints |
| SC2: Description for candidate selection | Met | query-vault.md Stage 2.5 documents description-based reranking for 20-100 candidates, top N = 20 |
| SC3: Progressive relaxation strategy | Met | query-vault.md Stage 3 documents fixed order: tags -> time -> location -> unstructured |
| SC4: Location as structured fields | Met | query-vault.md Stage 1 Location matching detail: country/province/city with China default |
| SC5: Full-text as optional later support | Met | query-vault.md Stage 5 documented as optional fallback after 3 relaxation rounds |
| SC6: Planning-ready direction | Met | All thresholds, decision points, relaxation rules, and integration topology documented |

### Step Coverage

| In-Scope Item | Covered | Evidence |
|---------------|---------|----------|
| Define frontmatter-first retrieval decision chain | Yes | 5-stage chain documented in query-vault.md with integration topology |
| Treat structured constraints as primary shortlist inputs | Yes | Stage 1 documents tags, time, location as primary inputs |
| Use description as second-stage reranking input | Yes | Stage 2.5 documents description scoring and top N selection |
| Define progressive fallback behavior | Yes | Stage 3 documents 4-step relaxation with retry logic |
| Clarify structured filtering relaxation order | Yes | Stage 3 documents priority: tags -> time -> location -> unstructured |
| Include location-aware retrieval | Yes | Stage 1 Location matching detail, SKILL.md Constraint Rules |
| Keep body-text retrieval as later fallback | Yes | Stage 5 documented as optional fallback |
| Encode into query-vault.md and second-brain-query/SKILL.md | Yes | Both files updated with full decision chain |

### Threshold Verification

| Threshold | step.md | query-vault.md | SKILL.md | Match |
|-----------|---------|----------------|----------|-------|
| Direct read threshold | <= 19 | <= 19 | <= 19 | Yes |
| Description rerank threshold | 20-100 | 20-100 | 20-100 | Yes |
| Structural narrowing threshold | > 100 | > 100 | > 100 | Yes |
| Max relaxation rounds | 3 | 3 | 3 | Yes |
| Top N after reranking | 20 | 20 | 20 | Yes |
| Time broadening increment | 30, then 90 days | 30, then 90 days | 30, then 90 days | Yes |

### Invariants Verification

| Invariant | Preserved | Evidence |
|-----------|-----------|----------|
| SQLite first retrieval layer | Yes | Stage 1 is Structured SQLite Shortlist |
| Frontmatter source of truth | Yes | Invariants section in query-vault.md and SKILL.md |
| Fixed relaxation order | Yes | tags -> time -> location -> unstructured in Stage 3 |
| Inspectable fallback | Yes | Stage 3 logs relaxation step, candidate count, constraints |
| Location defaults to China | Yes | Stage 1 Location matching detail, SKILL.md Constraint Rules |
| No unbounded queries | Yes | Invariants section: empty constraint set produces no unbounded query |

### TDD Batch Coverage

| Batch | Items in step.md | Items in test-checklist | Coverage |
|-------|-----------------|------------------------|----------|
| Batch 1: Structured SQLite Shortlist | 7 | 7 | Full |
| Batch 2: Candidate Count Decision | 5 | 5 | Full |
| Batch 3: Progressive Relaxation | 6 | 6 | Full |
| Batch 4: Description Reranking | 3 | 3 | Full |
| Batch 5: Integration and Fallback | 4 | 4 | Full |
| Cross-document consistency | N/A | 2 | Full |
| Frozen thresholds | 6 | 6 | Full |

All 33 checklist items have corresponding documentation in the implementation files.

### Issues

**Minor:**

1. **SKILL.md stage numbering**: The Retrieval Decision Chain section numbers stages 1, 2, 2.5, 3, 5 - skipping Stage 4 (Full Note Read). This is a minor documentation inconsistency but does not affect behavior.

2. **Test checklist unchecked**: All checklist items are unchecked `[ ]`. This is expected since this is manual documentation verification, not automated tests. No action required.

**Acknowledged Risks (from implementation-result.md, not issues):**

- `country`, `province`, `city` fields do not yet exist in SQLite index (deferred to step 02-frontmatter-tag-governance)
- `vault-query-router/index.ts` does not yet implement structured filtering (code implementation out of scope)
- Description scoring logic not specified beyond "relevance to query" (future implementation detail)

## Verdict

**correct**

The implementation correctly encodes all required behavior from requirement.md and step.md:

- All 6 success criteria are addressed with documented evidence
- All 8 in-scope items are covered in both updated files
- All 6 frozen thresholds match exactly across step.md, query-vault.md, and SKILL.md
- All 6 invariants are preserved and documented
- All 5 TDD batches have full checklist coverage

The minor SKILL.md stage numbering inconsistency (skipping Stage 4) is cosmetic and does not affect the correctness of the documented behavior.