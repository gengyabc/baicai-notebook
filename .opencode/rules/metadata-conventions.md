# Metadata Conventions

Use YAML frontmatter for durable notes unless the note is intentionally temporary.

For folder-level edit boundaries, see `.opencode/rules/edit-policy.md`. For promotion into `wiki/`, see `.opencode/rules/promotion-policy.md`.

## Global note requirements

- All vault Markdown notes, including `resources/`, `brainstorm/`, `wiki/`, `output/`, `index.md`, and `log.md`, must include `image_key`.
- Root `index.md` should use a table or directory-style layout to navigate vault layers with purpose and owner annotations.
- `wiki/index.md` and `output/index.md` should use readable directory-style entries with a one-line summary when practical.
- `wiki/log.md` entries should use a consistent date-prefixed format for later parsing and review.

## Resource note schema

```yaml
---
type: resource
resource_kind: web | pdf | zotero | local-file | note | transcript
title:
source_url:
local_path:
zotero_uri:
authors: []
created:
captured:
image_key:
tags: []
status: active
trust_level: raw
---
```

## Brainstorm note schema

```yaml
---
type: brainstorm
topic:
created:
updated:
image_key:
derived_from: []
related_projects: []
confidence: low | mixed | rising
status: open | incubating | parked | promoted | discarded
owner: user | llm | mixed
tags: []
---
```

## Wiki note schema

```yaml
---
type: wiki
kind: concept | entity | project | source | synthesis | method
title:
summary:
sources: []
related: []
confidence: medium | high
status: stable | evolving
last_reviewed:
image_key:
---
```

## Output note schema

```yaml
---
type: output
title:
summary:
created:
updated:
related: []
status: draft | active | archived
image_key:
---
```

## Minimum content rules

- Resource notes should include provenance and a short summary.
- Brainstorm notes should include uncertainty and derivation.
- Wiki notes should include explicit supporting sources.
- Output notes should be indexable and linked from `output/index.md`.
