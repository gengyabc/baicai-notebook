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
imageNameKey:
description:
status:
tags: []
```

Allowed and encouraged:

- domain-specific fields such as `start_date`, `end_date`, `participants`, `host`, `organizer`, and similar structured properties
- structured location fields `country`, `province`, and `city` for retrieval-sensitive notes (when `country` is omitted, retrieval defaults to `中国` at the metadata/index layer)
- `canonical_topic` when a retrieval workflow materially depends on it (optional, not universally required)
- folder-local or note-type-specific metadata when it improves retrieval or human maintenance

Not required for human-managed notes:

- `source_type`
- `content_role`
- `trust_level`
- `verification`
- `llm_stage`
- `canonical_topic`
- `source`
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
imageNameKey:
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
source:
```

### Resource notes (simplified profile)

`workbook/resources/` uses a simplified schema that removes fields redundant with tags, file path, or pipeline flags.

Required for resource notes:

```yaml
created:
updated:
imageNameKey:
description:
status:
tags: []
llm_description_done:
llm_tags:
ingest_status:
source_hash:
```

Optional when provenance is available:

```yaml
source:
```

Fields removed from resource notes (carried by tags or file path instead):

- `type` (redundant with folder location)
- `kind` (redundant with folder location)
- `source_type` (redundant with `source/*` tags)
- `content_role` (redundant with `role/*` tags; resource notes omit role tags)
- `trust_level` (not operationally valuable for resource notes)
- `verification` (not operationally valuable for resource notes)
- `llm_stage` (not operationally valuable for resource notes)
- `canonical_topic` (not operationally valuable for resource notes)
- `source_path` (redundant with actual file path)
- `source_ref` (redundant with `source` field)

## Brainstorm policy

- `workbook/brainstorm/` is mixed by subfolder.
- Human-minimal is the default for brainstorm notes.
- Only explicitly managed brainstorm areas should carry the richer LLM ingestion profile.
- Use `workbook/brainstorm/managed/` for brainstorm notes that should participate in the auto-frontmatter and description-enhancement pipeline.
- Keep `workbook/brainstorm/todo/` and `workbook/brainstorm/active/` lightweight unless a specific workflow opts them into richer metadata.

## Folder profile matrix

| Note family | Profile | Required | Optional | Avoid by default |
| --- | --- | --- | --- | --- |
| `workbook/my-work/` | human-managed | `type`, `kind`, `created`, `updated`, `imageNameKey`, `description`, `status`, `tags` | domain-specific fields, `source` when useful | LLM pipeline fields |
| `workbook/brainstorm/todo/`, `workbook/brainstorm/active/` | human-managed | `type`, `kind`, `created`, `updated`, `imageNameKey`, `description`, `status`, `tags` | `source`, domain fields | LLM pipeline fields unless explicitly opted in |
| `workbook/brainstorm/managed/` | LLM-managed | LLM base fields, plus ingestion fields when auto-managed | `canonical_topic` when useful | nothing beyond the profile |
| `workbook/resources/` | LLM-managed (simplified) | `created`, `updated`, `imageNameKey`, `description`, `status`, `tags`, `llm_description_done`, `llm_tags`, `ingest_status`, `source_hash` | `source`, `author`, `published` | `type`, `kind`, `source_type`, `content_role`, `trust_level`, `verification`, `llm_stage`, `canonical_topic`, `source_path`, `source_ref` |
| generated `workbook/wiki/` | LLM-managed | LLM base fields | `canonical_topic`, `source` or backlinks | ingestion fields unless the note is actually in that pipeline |
| human `workbook/output/` | human-managed | `type`, `kind`, `created`, `updated`, `imageNameKey`, `description`, `status`, `tags` | deliverable-specific fields, `source` | LLM pipeline fields |
| generated `workbook/output/` | LLM-managed | LLM base fields | provenance fields, `canonical_topic` | ingestion fields unless auto-managed |
| root and folder indexes/logs | whichever manages them | same as their owning profile; keep concise | provenance fields when useful | unnecessary pipeline state |

## Field matrix

Legend:

- `R`: required
- `O`: optional
- `D`: domain-specific
- `G`: governed by alias registry (see `.opencode/alias-registry.md`)
- `-`: not needed by default

| Field | Human-managed | LLM-managed base | Resource (simplified) | Ingestion notes |
| --- | --- | --- | --- | --- |
| `type` | R | R | - | R |
| `kind` | R | R | - | R |
| `created` | R | R | R | R |
| `updated` | R | R | R | R |
| `imageNameKey` | R | R | R | R |
| `description` | R | R | R | R |
| `status` | R | R | R | R |
| `tags` | R/G | R/G | R/G | R/G |
| `source_type` | - | R | - | R |
| `content_role` | - | R | - | R |
| `trust_level` | - | R | - | R |
| `verification` | - | R | - | R |
| `llm_stage` | - | R | - | R |
| `source` | O | O | O | O |
| `canonical_topic` | -/G | O/G | - | O/G |
| `country` | D/G | D/G | D/G | D/G |
| `province` | D/G | D/G | D/G | D/G |
| `city` | D/G | D/G | D/G | D/G |
| `llm_description_done` | - | - | R | R |
| `llm_tags` | - | - | R | - |
| `ingest_status` | - | - | R | R |
| `normalized_at` | - | - | - | R |
| `source_hash` | - | - | R | R |
| `source_path` | - | - | - | R |
| domain-specific fields | D | D | D | D |

## Enum guidance

Use stable enums where they clearly improve retrieval or automation, especially for LLM-managed notes.

### `status`

Recommended shared values:

```yaml
status: active | reviewed | archived | draft
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

## Structured fields versus tags

### Core principle

Time and location semantics belong in dedicated structured fields, not in tags.

- **Time**: use `created`, `updated`, `start_date`, and `end_date` as the primary carriers. Do not duplicate time semantics into tags (e.g., avoid `year/2026` or `month/april` as a substitute for date fields).
- **Location**: use `country`, `province`, and `city` as the primary carriers. Do not move location semantics into tags (e.g., avoid `location/shenzhen` as a substitute for structured location fields). When a note-level `country` field is absent, retrieval defaults to `中国` at the metadata/index layer; this default is not a reason to omit the field when location matters.
- **Domain-specific fields**: fields like `host`, `organizer`, `participants`, and similar structured properties remain first-class metadata. They are not replaced by tags.

### When tags are allowed as retrieval aids

Tags are a controlled retrieval aid, not the primary carrier for time, location, or other structured semantics. Tags are appropriate when:

1. They provide a lightweight categorization that complements structured fields (e.g., `topic/training` alongside `start_date` and structured location fields `country` / `province` / `city`).
2. They express Obsidian-style hierarchical forms such as `topic/*`, `state/*`, `source/*`, and `role/*` that are already consumed by the SQLite retrieval layer.
3. They encode a cross-cutting concern that does not have a dedicated frontmatter field and is genuinely useful for retrieval filtering.

Tags must not be used to:

- Carry time semantics (use `created`, `updated`, `start_date`, `end_date` instead).
- Carry location semantics (use `country`, `province`, `city` instead).
- Replace structured judgment fields like `trust_level` or `verification`.

### Hierarchical tags

Obsidian-style hierarchical tags remain supported and encouraged where they improve retrieval:

- `topic/*` forms for subject-area categorization.
- `state/*`, `source/*`, `role/*` for LLM-managed note classification.
- Other hierarchies that match retrieval patterns documented in `query-vault.md`.

### Tag governance

First-stage tag governance is advisory and alias-based:

- The alias registry at `.opencode/alias-registry.md` defines canonical tag values and accepted aliases.
- Lint reports non-canonical tags and uncontrolled tag growth as advisory findings, not hard-blocking errors.
- New canonical tags require human approval via the interactive proposal workflow defined in `.opencode/rules/tag-expansion.md`.
- New aliases and expansion relationships also require human approval via the same workflow.
- Stronger whitelist-style admission control may be introduced later when scale and drift justify it.

## Tag rules

- All durable human-managed and LLM-managed notes should include tags.
- For LLM-managed notes, include exactly one `state/*`, one `source/*`, and one `role/*` tag.
- For human-managed notes, tags are required but may remain simple and user-shaped.
- Use `topic/*` tags only when they improve retrieval.
- Keep total tags small whenever practical.
- Do not move precise judgment fields like `trust_level` or `verification` into tags.
- Do not use tags as the primary carrier for time or location semantics; use dedicated structured fields instead.

## Templates

### Human-managed note

```yaml
---
type: my-work
kind: note
created:
updated:
imageNameKey:
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
imageNameKey:
description:
status: active
tags:
  - state/active
  - topic/training
start_date:
end_date:
country:
province:
city:
host:
participants:
---
```

Use `country`, `province`, and `city` as the structured location fields for retrieval-sensitive notes. When `country` is omitted, retrieval defaults to `中国` at the metadata/index layer, but explicit values are preferred when location matters for the note. The freeform `location` field may still appear for backward compatibility or non-retrieval display purposes, but structured fields (`country`, `province`, `city`) are the retrieval-standard shape for location data.

### LLM-managed resource note

```yaml
---
created:
updated:
imageNameKey:
description:
llm_description_done: false
llm_tags: false
ingest_status: pending
source_hash:
source:
tags:
  - source/web
---
```

### Human-default brainstorm note

```yaml
---
type: brainstorm
kind: note
created:
updated:
imageNameKey:
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
imageNameKey:
description:
llm_description_done: false
status: active
trust_level: synthesized
verification: unverified
llm_stage: linked
canonical_topic:
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
