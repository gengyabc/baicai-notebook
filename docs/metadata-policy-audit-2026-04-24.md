# Metadata Policy Audit 2026-04-24

Audit target: current vault notes under `my-work/`, `brainstorm/`, `resources/`, `wiki/`, and `output/` against `.opencode/rules/metadata-conventions.md` and `docs/metadata-field-matrix.md`.

SQLite status: rebuilt with `bun run --cwd .opencode frontmatter:index:rebuild` before recording these results.

## Current status

- The hard-failure notes listed below were fixed in the same session.
- The SQLite index was rebuilt again after the fixes.
- The frontmatter index keeps uppercase and lowercase folder aliases during the normalization period.

## Hard failures found during audit

These notes are missing fields that are required by the new policy for their note family.

Current state: resolved.

### Human-managed notes missing required fields

| Path | Missing fields | Notes |
| --- | --- | --- |
| `my-work/myself/对外培训/2025/index.md` | `kind`, `updated`, `image_key`, `description`, `status`, `tags` | Frontmatter only contains `type` and `created`. |
| `my-work/myself/对外培训/2025/raw/index.md` | `type`, `kind`, `created`, `updated`, `image_key`, `description`, `status`, `tags` | File is empty. |
| `output/index.md` | `description` | Manual index note now falls short of the human-managed minimum. |

### LLM-managed notes missing required fields

| Path | Missing fields | Notes |
| --- | --- | --- |
| `resources/web/提示词工程，上下文工程，驾驭工程.md` | `image_key` | `image_key` is present but empty string, so it fails the required-field check. |
| `wiki/index.md` | `description` | Generated wiki index lacks the now-required summary field. |
| `wiki/log.md` | `description` | Generated wiki log lacks the now-required summary field. |

## Legacy cleanup candidates

These notes still carry old LLM-oriented metadata even though the new policy classifies them as human-managed by default. They are not broken, but they no longer match the intended minimal profile.

Current state: resolved for the previously listed human-managed notes.

- `brainstorm/index.md`
- `brainstorm/todo/sqlite-query-enhancements.md`
- `my-work/myself/cv.md`
- `my-work/myself/done_work/works.md`
- `my-work/myself/对外培训/2025/华强集团.md`
- `my-work/myself/对外培训/2025/新疆生产建设兵团第十一师.md`
- `my-work/myself/对外培训/2025/福伊特造纸(中国)有限公司.md`
- `my-work/myself/对外培训/2025/龙岗职业技术学校.md`
- `output/index.md`

Legacy fields commonly present on those notes:

- `source_type`
- `content_role`
- `trust_level`
- `verification`
- `llm_stage`
- `ingest_status`
- `normalized_at`
- `source_hash`
- `source_path`
- `llm_description_done`

## Notes

- The new policy intentionally allows domain-specific human metadata such as `start_date`, `end_date`, `participants`, `location`, `host`, and `organizer`. Those fields were not treated as violations.
- Optional provenance fields such as `source_ref`, `source`, `canonical_topic`, `derived_from`, `entity_refs`, and `topic_refs` were not flagged when absent unless the note failed a required-field check.
- This audit is a policy-fit pass, not a content-quality review. Descriptions may still be low quality even when present.
