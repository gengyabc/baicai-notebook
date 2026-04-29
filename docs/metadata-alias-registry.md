# Metadata Alias Registry

This is the first-stage alias registry for vault metadata normalization. It defines canonical values and accepted aliases for retrieval-relevant frontmatter fields.

Governance policy and structured-field rules are defined in `.opencode/rules/metadata-conventions.md`. This registry is consumed by lint checks and retrieval workflows.

## Review flow

1. Lint finds a non-canonical or suspicious retrieval-relevant value.
2. Human review decides whether the value maps to an existing canonical entry, should become a new canonical entry, or should remain intentionally local and outside first-stage governance.
3. The registry is updated only when the value is accepted into governance.
4. Notes are not auto-rewritten by this step.

New aliases and suspicious new canonical candidates require human review rather than silent acceptance. First-stage governance is advisory: lint reports drift and normalization opportunities without hard-blocking note authoring.

## Tag aliases

| Governed surface | Canonical value | Accepted aliases | Review rationale |
| --- | --- | --- | --- |
| tag | `state/active` | `active`, `status/active` | Consolidate active-status variants |
| tag | `state/inbox` | `inbox`, `status/inbox` | Consolidate inbox-status variants |
| tag | `state/archived` | `archived`, `status/archived` | Consolidate archived-status variants |
| tag | `state/reviewed` | `reviewed`, `status/reviewed` | Consolidate reviewed-status variants; matches `status` enum value |
| tag | `state/draft` | `draft`, `status/draft` | Consolidate draft-status variants; matches `status` enum value |
| tag | `source/web` | `web`, `source/website` | Consolidate web-source variants; matches `source_type` enum value |
| tag | `source/paper` | `paper`, `source/academic` | Consolidate paper-source variants; matches `source_type` enum value |
| tag | `source/generated` | `generated` | Matches `source_type` enum value and LLM-managed brainstorm template |
| tag | `source/local` | `local` | Matches `source_type` enum value |
| tag | `source/chat` | `chat` | Matches `source_type` enum value |
| tag | `source/manual` | `manual` | Matches `source_type` enum value |
| tag | `role/raw` | `raw`, `role/source` | Consolidate raw-role variants; matches `content_role` enum value |
| tag | `role/summary` | `summary`, `role/summarized` | Consolidate summary-role variants; matches `content_role` enum value |
| tag | `role/synthesis` | `synthesis` | Matches `content_role` enum value and LLM-managed brainstorm template |
| tag | `role/topic` | `topic` | Matches `content_role` enum value |
| tag | `role/entity` | `entity` | Matches `content_role` enum value |
| tag | `role/draft` | `draft` | Matches `content_role` enum value |
| tag | `role/index` | `index` | Matches `content_role` enum value |
| tag | `role/log` | `log` | Matches `content_role` enum value |
| tag | `topic/idea` | `idea` | Consolidate idea-topic variants |
| tag | `topic/training` | `training` | Consolidate training-topic variants |

## Location aliases

Location aliases are kept distinct per governed field (`country`, `province`, `city`) to avoid conflating different administrative levels.

### Country aliases

| Governed surface | Canonical value | Accepted aliases | Review rationale |
| --- | --- | --- | --- |
| country | `China` | `CN`, `cn`, `PRC`, `People's Republic of China` | Standardize country display for primary vault context |
| country | `United States` | `US`, `us`, `USA`, `United States of America` | Common English short forms |

### Province aliases

| Governed surface | Canonical value | Accepted aliases | Review rationale |
| --- | --- | --- | --- |
| province | `Guangdong` | `guangdong`, `GD`, `gd` | Standardize province display |
| province | `Beijing` | `beijing`, `BJ`, `bj` | Standardize municipality display |
| province | `Shanghai` | `shanghai`, `SH`, `sh` | Standardize municipality display |
| province | `Shandong` | `shandong`, `SD`, `sd` | Standardize province display |

### City aliases

| Governed surface | Canonical value | Accepted aliases | Review rationale |
| --- | --- | --- | --- |
| city | `Shenzhen` | `shenzhen`, `SZ`, `sz` | Standardize city display for primary vault location |
| city | `Beijing` | `beijing` | Municipality also used as city name |
| city | `Shanghai` | `shanghai` | Municipality also used as city name |
| city | `Qingdao` | `qingdao`, `QD`, `qd` | Standardize city display |

## Canonical topic aliases

`canonical_topic` normalization is defined only where retrieval materially depends on it. It is not a universal required field.

| Governed surface | Canonical value | Accepted aliases | Review rationale |
| --- | --- | --- | --- |
| canonical_topic | `education-policy` | `edu-policy`, `education policy` | Consolidate education policy references |
| canonical_topic | `vocational-training` | `voc-training`, `vocational training` | Consolidate vocational training references |
| canonical_topic | `ai-governance` | `AI governance`, `ai-gov` | Consolidate AI governance references |

## Adding new entries

When lint or review identifies a non-canonical value that should be governed:

1. Check whether the value maps to an existing canonical entry in this registry.
2. If it does, note the alias and consider updating the note's frontmatter during a future review pass.
3. If it does not, propose a new entry with the governed surface, canonical value, initial accepted aliases, and a review rationale.
4. A human must approve the new entry before it is added to the registry.
5. Do not auto-rewrite note frontmatter to match the registry; governance is advisory at this stage.
