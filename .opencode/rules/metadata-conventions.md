# Metadata Conventions

Use YAML frontmatter for durable notes unless the note is intentionally temporary.

For folder-level edit boundaries, see `.opencode/rules/edit-policy.md`. For promotion into `wiki/`, see `.opencode/rules/promotion-policy.md`.

## Design principles

- Use frontmatter for precise machine-readable judgments.
- Use tags for lightweight navigation and clustering only.
- Keep field values constrained to stable enums whenever possible.
- Keep `type` stable and broad; use `kind` and `content_role` for note-level specificity.

## Global note requirements

- All durable vault Markdown notes, including `resources/`, `brainstorm/`, `wiki/`, `output/`, `my-work/`, root `index.md`, `wiki/index.md`, `wiki/log.md`, and `output/index.md`, must include `image_key`.
- Root `index.md` should use a table or directory-style layout to navigate vault layers with purpose and owner annotations.
- `wiki/index.md` and `output/index.md` should use readable directory-style entries with a one-line summary when practical.
- `wiki/log.md` entries should use a consistent date-prefixed format for later parsing and review.
- Use `updated` for notes that may be revised over time.

## Core field model

Required core fields for durable notes:

```yaml
type:
kind:
source_type:
content_role:
created:
updated:
image_key:
status:
trust_level:
verification:
llm_stage:
tags: []
```

Optional supporting fields:

```yaml
canonical_topic:
source_ref:
description:
derived_from: []
entity_refs: []
topic_refs: []
llm_rename_done:
llm_description_done:
```

### LLM processing markers

```yaml
llm_rename_done: true | false
llm_description_done: true | false
```

These markers track whether expensive rename and description passes have already run so later automation can skip them.

## Enum sets

### `type`

```yaml
type: vault | resource | brainstorm | wiki | output | my-work
```

### `kind`

```yaml
kind: note | index | log | topic | entity | concept | project | deliverable
```

### `source_type`

```yaml
source_type: web | paper | local | chat | manual | generated
```

### `content_role`

```yaml
content_role: raw | summary | topic | entity | synthesis | draft | index | log
```

### `status`

```yaml
status: inbox | active | reviewed | archived | draft
```

### `trust_level`

```yaml
trust_level: raw | extracted | synthesized | verified | disputed
```

### `verification`

```yaml
verification: unverified | spot_checked | verified
```

### `llm_stage`

```yaml
llm_stage: unprocessed | parsed | linked | summarized | integrated
```

## Tag taxonomy

Tags are secondary metadata. Do not store precise judgment fields only in tags.

Allowed tag families:

- `state/*` for workflow state
- `source/*` for source class
- `role/*` for knowledge role
- `topic/*` for lightweight topical clustering

Tag rules:

- Every durable note should include exactly one `state/*` tag.
- Every durable note should include exactly one `source/*` tag.
- Every durable note should include exactly one `role/*` tag.
- Use at most two `topic/*` tags unless there is a concrete retrieval reason.
- Keep total tags at five or fewer whenever practical.
- Do not put `trust_level`, `verification`, timestamps, or kind-specific semantics into tags.

## Schema templates

### Root vault index schema

```yaml
---
type: vault
kind: index
source_type: manual
content_role: index
created:
updated:
image_key:
status: active
trust_level: verified
verification: verified
llm_stage: integrated
tags:
  - state/active
  - source/manual
  - role/index
---
```

### Resource note schema

```yaml
---
type: resource
kind: note
source_type: local
content_role: raw
created:
updated:
image_key:
status: inbox
trust_level: raw
verification: unverified
llm_stage: unprocessed
canonical_topic:
source_ref:
description:
derived_from: []
entity_refs: []
topic_refs: []
tags:
  - state/inbox
  - source/local
  - role/raw
---
```

### Brainstorm note schema

```yaml
---
type: brainstorm
kind: note
source_type: manual
content_role: draft
created:
updated:
image_key:
status: active
trust_level: synthesized
verification: unverified
llm_stage: unprocessed
canonical_topic:
source_ref:
derived_from: []
entity_refs: []
topic_refs: []
tags:
  - state/active
  - source/manual
  - role/draft
---
```

### Wiki note schema

```yaml
---
type: wiki
kind: note
source_type: generated
content_role: synthesis
created:
updated:
image_key:
status: active
trust_level: synthesized
verification: unverified
llm_stage: linked
canonical_topic:
source_ref:
derived_from: []
entity_refs: []
topic_refs: []
tags:
  - state/active
  - source/generated
  - role/synthesis
---
```

### Wiki index schema

```yaml
---
type: wiki
kind: index
source_type: generated
content_role: index
created:
updated:
image_key:
status: active
trust_level: verified
verification: verified
llm_stage: integrated
canonical_topic:
source_ref:
derived_from: []
entity_refs: []
topic_refs: []
tags:
  - state/active
  - source/generated
  - role/index
---
```

### Wiki log schema

```yaml
---
type: wiki
kind: log
source_type: generated
content_role: log
created:
updated:
image_key:
status: active
trust_level: verified
verification: verified
llm_stage: integrated
canonical_topic:
source_ref:
derived_from: []
entity_refs: []
topic_refs: []
tags:
  - state/active
  - source/generated
  - role/log
---
```

### Output note schema

```yaml
---
type: output
kind: deliverable
source_type: manual
content_role: draft
created:
updated:
image_key:
status: draft
trust_level: synthesized
verification: unverified
llm_stage: unprocessed
canonical_topic:
source_ref:
derived_from: []
entity_refs: []
topic_refs: []
tags:
  - state/draft
  - source/manual
  - role/draft
---
```

### My-work note schema

```yaml
---
type: my-work
kind: note
source_type: manual
content_role: draft
created:
updated:
image_key:
status: active
trust_level: raw
verification: unverified
llm_stage: unprocessed
canonical_topic:
source_ref:
derived_from: []
entity_refs: []
topic_refs: []
tags:
  - state/active
  - source/manual
  - role/draft
---
```

## Minimum content rules

- Resource notes should include provenance or source context and a short summary.
- Resource notes should include a short `description` when practical.
- Brainstorm notes should preserve uncertainty and derivation.
- Wiki notes should include explicit supporting sources or backlinks to grounded upstream notes.
- Output notes should be indexable and linked from `output/index.md`.
- Index and log pages should remain concise, discoverable, and consistent with folder structure.
