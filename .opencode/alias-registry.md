# Metadata Alias Registry

This is the first-stage alias registry for vault metadata normalization. It defines canonical values and accepted aliases for retrieval-relevant frontmatter fields.

Governance policy and structured-field rules are defined in `.opencode/rules/metadata-conventions.md`. This registry is consumed by lint checks and retrieval workflows.

## Retrieval integration

The constraint-extraction stage (Stage 0) defined in `.opencode/workflows/query-vault.md` and `.opencode/docs/sqlite-retrieval-contract.md` consumes this registry as the canonical source for:

- Tag canonical values and accepted aliases used during tag extraction
- Location canonical values and accepted aliases (`country`, `province`, `city`) used during location extraction

Time-phrase alias tables are defined separately in `.opencode/docs/sqlite-retrieval-contract.md` because they govern retrieval-contract normalization behavior rather than note-authoring governance.

This registry does not duplicate the time-phrase alias tables. Retrieval workflows and the constraint-extraction stage reference both this registry and the time-phrase tables in the retrieval contract as their respective single sources of truth.

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
| tag | `topic/education` | `edu/child`, `education`, `edu` | Consolidate education-topic variants |
| tag | `topic/ai-tools` | `agent-native-cli`, `excalidraw-cli`, `ai-tools`, `topic/agent-native-cli`, `topic/excalidraw-cli` | Consolidate AI-tool topic variants |
| tag | `topic/design` | `design-systems`, `topic/design-systems`, `design` | Consolidate design-topic variants |
| tag | `topic/cv` | `cv`, `myself`, `#myself` | Consolidate CV/personal-topic variants |

## Location aliases

Location aliases are kept distinct per governed field (`country`, `province`, `city`) to avoid conflating different administrative levels.

### Country aliases

| Governed surface | Canonical value | Accepted aliases | Review rationale |
| --- | --- | --- | --- |
| country | `中国` | `China`, `CN`, `cn`, `PRC`, `People's Republic of China` | 中国地名使用中文 |
| country | `美国` | `United States`, `US`, `us`, `USA`, `United States of America` | Common English short forms |

### Province aliases

| Governed surface | Canonical value | Accepted aliases | Review rationale |
| --- | --- | --- | --- |
| province | `广东省` | `Guangdong`, `guangdong`, `GD`, `gd`, `广东` | 中国地名使用中文 |
| province | `北京市` | `Beijing`, `beijing`, `BJ`, `bj`, `北京` | 中国地名使用中文 |
| province | `上海市` | `Shanghai`, `shanghai`, `SH`, `sh`, `上海` | 中国地名使用中文 |
| province | `山东省` | `Shandong`, `shandong`, `SD`, `sd`, `山东` | 中国地名使用中文 |
| province | `新疆维吾尔自治区` | `Xinjiang`, `新疆`, `新疆生产建设兵团` | 中国地名使用中文 |
| province | `江苏省` | `Jiangsu`, `jiangsu`, `JS`, `js`, `江苏` | 中国地名使用中文 |

### City aliases

| Governed surface | Canonical value | Accepted aliases | Review rationale |
| --- | --- | --- | --- |
| city | `深圳市` | `Shenzhen`, `shenzhen`, `SZ`, `sz`, `深圳` | 中国地名使用中文 |
| city | `北京市` | `Beijing`, `beijing`, `北京` | 直辖市 |
| city | `上海市` | `Shanghai`, `shanghai`, `上海` | 直辖市 |
| city | `青岛市` | `Qingdao`, `qingdao`, `QD`, `qd`, `青岛` | 中国地名使用中文 |
| city | `乌鲁木齐市` | `Urumqi`, `乌鲁木齐`, `乌鲁木齐市` | 中国地名使用中文 |
| city | `昆山市` | `Kunshan`, `昆山` | 中国地名使用中文 |
| city | `江门市` | `Jiangmen`, `江门`, `广东江门` | 中国地名使用中文 |

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
2. If it does, note the alias and follow `tag-expansion.md` for alias approval workflow.
3. If it does not, follow the tag expansion workflow in `tag-expansion.md`:
   - Check alias first — if concept matches existing canonical, add to `tag-aliases.json`
   - If truly distinct, add to `canonical-tags.json` and optionally `tag-expansions.json`
   - For fixed namespaces (state/*, source/*, role/*), reject proposal and use closest canonical
4. Do not auto-rewrite note frontmatter to match the registry; governance is advisory at this stage.
