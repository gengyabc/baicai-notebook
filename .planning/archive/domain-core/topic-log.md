# Topic Log: domain-core

## Archived Phases

### 01-enhance-info-retrieval

Archived: 2026-05-03

Steps implemented:
- 01-sqlite-shortlist-ranking-and-fallback
- 02-frontmatter-tag-governance
- 03-structured-query-constraint-extraction
- 04-retrieval-contract-and-safety-guardrails
- 05-semantic-query-mapping-expansion
- 06-debug-permission-profile-and-plugin-gate
- 07-constrained-query-orchestration
- 08-minimal-retrieval-contract

## Current Direction

Vault retrieval enhancement with SQLite frontmatter-first filtering, structured query constraints, location-aware search, and progressive fallback behavior.

## Cross-Phase Decisions

- SQLite frontmatter filtering is the primary retrieval layer for vault search
- Frontmatter stays as source of truth; SQLite acts as derived retrieval index
- Time modeled through dedicated fields (created, updated, start_date, end_date)
- Location modeled through dedicated fields (country, province, city)
- Description used for candidate narrowing and reranking, not replacing full document reads
- Progressive relaxation happens before broadening to wider text retrieval
- Retrieval contract provides safety guardrails and query orchestration

## Superseded Directions

(none yet)

## Follow-ups

(none yet)