# Metadata Conventions

Use YAML frontmatter for durable notes unless the note is intentionally temporary.

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
sources: []
related: []
confidence: medium | high
status: stable | evolving
last_reviewed:
---
```

## Minimum content rules

- Resource notes should include provenance and a short summary.
- Brainstorm notes should include uncertainty and derivation.
- Wiki notes should include explicit supporting sources.
