# Metadata Conventions

Use YAML frontmatter for durable notes unless the note is intentionally temporary.

For folder-level edit boundaries, see `.opencode/rules/edit-policy.md`. For promotion into `workbook/wiki/`, see `.opencode/rules/promotion-policy.md`.

## Design principles

- Separate human-managed and LLM-managed note profiles.
- Keep human-managed notes small, readable, and easy to maintain by hand.
- Require richer metadata only where retrieval, provenance, or automation actually depends on it.
- Treat domain-specific fields as first-class metadata, not schema violations.
- Keep `type` stable and broad when practical, but do not force human-managed notes into a rigid global enum when local domain vocabularies are clearer.

## Ownership profiles

### Human-managed notes

Default folders:

- `workbook/my-work/`
- human-authored `workbook/output/`
- `workbook/brainstorm/` by default
- domain-specific records managed directly by the user

Required fields:

```yaml
type:
kind:
created:
updated:
image_key:
description:
status:
tags: []
```

Allowed and encouraged:

- domain-specific fields such as `start_date`, `end_date`, `participants`, `location`, `host`, `organizer`, and similar structured properties
- folder-local or note-type-specific metadata when it improves retrieval or human maintenance

Not required for human-managed notes:

- `source_type`
- `content_role`
- `trust_level`
- `verification`
- `llm_stage`
- `canonical_topic`
- `source_ref`
- `source`
- `derived_from`
- `entity_refs`
- `topic_refs`
- `llm_description_done`
- `ingest_status`
- `normalized_at`
- `source_hash`
- `source_path`

### LLM-managed notes

Default folders:

- `workbook/resources/`
- generated `workbook/wiki/`
- generated or automation-managed `workbook/output/`
- explicitly managed brainstorm subfolders such as `workbook/brainstorm/managed/`

Required LLM base fields:

```yaml
type:
kind:
created:
updated:
image_key:
description:
status:
tags: []
source_type:
content_role:
trust_level:
verification:
llm_stage:
```

Required only for ingestion-pipeline notes:

```yaml
ingest_status:
normalized_at:
source_hash:
source_path:
llm_description_done:
```

Required when provenance is external or operationally important:

```yaml
source_ref:
source:
```

Useful but optional linking fields:

```yaml
canonical_topic:
derived_from: []
entity_refs: []
topic_refs: []
```

These linking fields should only be required when a workflow or query pattern actually depends on them.

## Brainstorm policy

- `workbook/brainstorm/` is mixed by subfolder.
- Human-minimal is the default for brainstorm notes.
- Only explicitly managed brainstorm areas should carry the richer LLM ingestion profile.
- Use `workbook/brainstorm/managed/` for brainstorm notes that should participate in the auto-frontmatter and description-enhancement pipeline.
- Keep `workbook/brainstorm/todo/` and `workbook/brainstorm/active/` lightweight unless a specific workflow opts them into richer metadata.

## Folder profile matrix

| Note family | Profile | Required | Optional | Avoid by default |
| --- | --- | --- | --- | --- |
| `workbook/my-work/` | human-managed | `type`, `kind`, `created`, `updated`, `image_key`, `description`, `status`, `tags` | domain-specific fields, `source_ref` when useful | LLM pipeline fields |
| `workbook/brainstorm/todo/`, `workbook/brainstorm/active/` | human-managed | `type`, `kind`, `created`, `updated`, `image_key`, `description`, `status`, `tags` | `derived_from`, `source_ref`, domain fields | LLM pipeline fields unless explicitly opted in |
| `workbook/brainstorm/managed/` | LLM-managed | LLM base fields, plus ingestion fields when auto-managed | linking fields | nothing beyond the profile |
| `workbook/resources/` | LLM-managed | LLM base fields, ingestion fields, `source_ref` when externally sourced | `source`, linking fields, `author`, `published` | human-only domain fields unrelated to the source |
| generated `workbook/wiki/` | LLM-managed | LLM base fields | `canonical_topic`, linking fields, `source_ref` or backlinks | ingestion fields unless the note is actually in that pipeline |
| human `workbook/output/` | human-managed | `type`, `kind`, `created`, `updated`, `image_key`, `description`, `status`, `tags` | deliverable-specific fields, `source_ref` | LLM pipeline fields |
| generated `workbook/output/` | LLM-managed | LLM base fields | provenance and linking fields | ingestion fields unless auto-managed |
| root and folder indexes/logs | whichever manages them | same as their owning profile; keep concise | provenance fields when useful | unnecessary pipeline state |

## Field matrix

Legend:

- `R`: required
- `O`: optional
- `D`: domain-specific
- `-`: not needed by default

| Field | Human-managed | LLM-managed base | Ingestion notes |
| --- | --- | --- | --- |
| `type` | R | R | R |
| `kind` | R | R | R |
| `created` | R | R | R |
| `updated` | R | R | R |
| `image_key` | R | R | R |
| `description` | R | R | R |
| `status` | R | R | R |
| `tags` | R | R | R |
| `source_type` | - | R | R |
| `content_role` | - | R | R |
| `trust_level` | - | R | R |
| `verification` | - | R | R |
| `llm_stage` | - | R | R |
| `source_ref` | O | O | O |
| `source` | O | O | O |
| `canonical_topic` | - | O | O |
| `derived_from` | O | O | O |
| `entity_refs` | - | O | O |
| `topic_refs` | - | O | O |
| `llm_description_done` | - | - | R |
| `ingest_status` | - | - | R |
| `normalized_at` | - | - | R |
| `source_hash` | - | - | R |
| `source_path` | - | - | R |
| domain-specific fields | D | D | D |

## Enum guidance

Use stable enums where they clearly improve retrieval or automation, especially for LLM-managed notes.

### `status`

Recommended shared values:

```yaml
status: inbox | active | reviewed | archived | draft
```

Human-managed notes may use domain-local values when that is genuinely clearer, but keep them intentional and queryable.

### LLM-managed enums

```yaml
type: vault | resource | brainstorm | wiki | output | my-work
kind: note | index | log | topic | entity | concept | project | deliverable
source_type: web | paper | local | chat | manual | generated
content_role: raw | summary | topic | entity | synthesis | draft | index | log
trust_level: raw | extracted | synthesized | verified | disputed
verification: unverified | spot_checked | verified
llm_stage: unprocessed | parsed | linked | summarized | integrated
ingest_status: pending | processed | error
```

## Tag rules

- All durable human-managed and LLM-managed notes should include tags.
- For LLM-managed notes, include exactly one `state/*`, one `source/*`, and one `role/*` tag.
- For human-managed notes, tags are required but may remain simple and user-shaped.
- Use `topic/*` tags only when they improve retrieval.
- Keep total tags small whenever practical.
- Do not move precise judgment fields like `trust_level` or `verification` into tags.

## Templates

### Human-managed note

```yaml
---
type: my-work
kind: note
created:
updated:
image_key:
description:
status: active
tags:
  - state/active
---
```

### Human-managed domain note

```yaml
---
type: my-work
kind: training
created:
updated:
image_key:
description:
status: active
tags:
  - state/active
  - topic/training
start_date:
end_date:
location:
host:
participants:
---
```

### LLM-managed resource note

```yaml
---
type: resource
kind: note
source_type: web
content_role: raw
created:
updated:
image_key:
description:
llm_description_done: false
status: inbox
trust_level: raw
verification: unverified
llm_stage: unprocessed
canonical_topic:
source_ref:
derived_from: []
entity_refs: []
topic_refs: []
ingest_status: pending
normalized_at:
source_hash:
source_path:
tags:
  - state/inbox
  - source/web
  - role/raw
---
```

### Human-default brainstorm note

```yaml
---
type: brainstorm
kind: note
created:
updated:
image_key:
description:
status: active
tags:
  - state/active
  - topic/idea
---
```

### LLM-managed brainstorm note

```yaml
---
type: brainstorm
kind: note
source_type: generated
content_role: synthesis
created:
updated:
image_key:
description:
llm_description_done: false
status: active
trust_level: synthesized
verification: unverified
llm_stage: linked
canonical_topic:
derived_from: []
entity_refs: []
topic_refs: []
ingest_status: pending
normalized_at:
source_hash:
source_path: workbook/brainstorm/managed
tags:
  - state/active
  - source/generated
  - role/synthesis
---
```

## Minimum content rules

- Human-managed notes should stay hand-editable and should not accumulate automation-only fields without a concrete need.
- Domain-specific notes should preserve the structured fields that matter to that domain.
- Resource notes should include provenance or source context and a short summary.
- Wiki notes should include explicit supporting sources or backlinks to grounded upstream notes.
- Output notes should be indexable and linked from `workbook/output/index.md` when durable.
- Index and log pages should remain concise, discoverable, and consistent with folder structure.
