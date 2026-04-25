# Routing Flows

System-wide routing documentation for OpenCode commands, workflows, skills, and rules.

## Source Files Inventory

### Commands (7)

| File | Purpose |
|------|---------|
| `.opencode/commands/debug.md` | Enter sandbox mode, disable vault writes |
| `.opencode/commands/discover-requirements.md` | Discover project requirements |
| `.opencode/commands/ingest.md` | Route note/source to appropriate workflow |
| `.opencode/commands/lint-vault.md` | Run vault linting |
| `.opencode/commands/process-pending.md` | Process pending items |
| `.opencode/commands/solidify.md` | Promote brainstorm to wiki |
| `.opencode/commands/write_plan.md` | Write execution plan |

### Workflows (7)

| File | Purpose |
|------|---------|
| `.opencode/workflows/distill-brainstorm.md` | Distill brainstorm notes |
| `.opencode/workflows/ingest-my-work.md` | Ingest from my-work/ |
| `.opencode/workflows/ingest-resources.md` | Ingest external resources |
| `.opencode/workflows/lint-vault.md` | Lint vault for issues |
| `.opencode/workflows/process-pending-resources.md` | Process pending resources |
| `.opencode/workflows/query-vault.md` | Query vault knowledge |
| `.opencode/workflows/solidify-to-wiki.md` | Promote to wiki |

### Rules (11)

| File | Purpose |
|------|---------|
| `.opencode/rules/core-vault.md` | Vault structure and semantics |
| `.opencode/rules/debug-mode.md` | Debug mode behavior |
| `.opencode/rules/edit-policy.md` | Edit permission policy |
| `.opencode/rules/low-confidence-brainstorm.md` | Low confidence handling |
| `.opencode/rules/metadata-conventions.md` | Metadata schema |
| `.opencode/rules/periodic-lint.md` | Periodic linting |
| `.opencode/rules/promotion-policy.md` | Brainstorm → wiki promotion |
| `.opencode/rules/post-brainstorm-solidify.md` | Post-solidify actions |
| `.opencode/rules/post-ingest-solidify.md` | Post-ingest actions |
| `.opencode/rules/query-confidence.md` | Query confidence levels |
| `.opencode/rules/query-on-interaction.md` | Query on user interaction |

### Skills (6)

| File | Purpose |
|------|---------|
| `.opencode/skills/brainstorm-distill/SKILL.md` | Distill brainstorm notes |
| `.opencode/skills/second-brain-ingest/SKILL.md` | Route to vault layers |
| `.opencode/skills/second-brain-lint/SKILL.md` | Lint vault |
| `.opencode/skills/second-brain-query/SKILL.md` | Query vault |
| `.opencode/skills/solidify-to-wiki/SKILL.md` | Promote to wiki |
| `.opencode/skills/web-to-resource/SKILL.md` | Convert URLs to resources |

### Plugins (1)

| File | Purpose |
|------|---------|
| `.opencode/plugins/auto-frontmatter/README.md` | Auto frontmatter |

### Docs (1)

| File | Purpose |
|------|---------|
| `docs/sqlite-dataview-alignment.md` | SQLite mirror for Dataview-aligned retrieval |

---

## Command Routing Graphs

### Ingest Command

```mermaid
flowchart TD
    A[ingest $ARGUMENTS] --> B{Source type?}
    B -->|note| C[ingest-my-work]
    B -->|URL/file/zotero| D[ingest-resources]
    C --> E[Route to vault layer]
    D --> E
    E --> F[Output: vault update]
```

**Routing Standards:**
- `ingest-my-work` for active notes from `workbook/my-work/`
- `ingest-resources` for external sources (URLs, PDFs, Zotero)

### Debug Command

```mermaid
flowchart TD
    A[debug] --> B[Enable sandbox mode]
    B --> C{Session active?}
    C -->|yes| D[Suspend auto-write rules]
    C -->|no| E[Read-only mode]
    D --> F[Output: sandbox enabled]
    E --> F
```

**Routing Standards:**
- Debug mode is session-scoped
- Disables: query-on-interaction, low-confidence-brainstorm, post-*-solidify rules

### Solidify Command

```mermaid
flowchart TD
    A[solidify $TARGET] --> B[Load solidify-to-wiki skill]
    B --> C{Promotion criteria met?}
    C -->|yes| D[Update wiki/index.md]
    C -->|no| E[Reject promotion]
    D --> F[Output: wiki updated]
    E --> F
```

**Routing Standards:**
- Only `solidify` is the promotion gate into `workbook/wiki/`
- Requires grounded claims with provenance

---

## Workflow Routing Graphs

### Ingest Resources Workflow

```mermaid
flowchart TD
    A[URL/file/Zotero] --> B{Source type?}
    B -->|web| C[web-to-resource]
    B -->|pdf| C
    B -->|zotero| D[second-brain-ingest]
    B -->|local-file| C
    B -->|note| D
    C --> E[Check duplicate]
    D --> E
    E -->|exists| F[Update existing]
    E -->|new| G[Create resource note]
    F --> H[Normalize metadata]
    G --> H
    H --> I{Strong evidence?}
    I -->|yes| J[solidify-to-wiki]
    I -->|no| K[workbook/brainstorm/]
    J --> L[Update workbook/wiki/index.md]
    K --> M[Link to relevant notes]
    L --> N[Output: resource + links]
    M --> N
```

**Routing Standards:**
- Default derived material to `workbook/brainstorm/`
- Only promote to `workbook/wiki/` via explicit `solidify` gate

### Solidify to Wiki Workflow

```mermaid
flowchart TD
    A[brainstorm note] --> B[Load solidify-to-wiki skill]
    B --> C{Promotion test passed?}
    C -->|yes| D[Create wiki note]
    C -->|no| E[Keep in workbook/brainstorm/]
    D --> F[Add backlink]
    F --> G[Update workbook/wiki/index.md]
    E --> H[Record tension]
    G --> I[Output: wiki updated]
    H --> I
```

**Routing Standards:**
- Preserve backlink to brainstorm source
- Record tension if evidence is mixed

### Query Vault Workflow

```mermaid
flowchart TD
    A[User query] --> B{Query type?}
    B -->|confidence query| C[query-confidence rule]
    B -->|interaction query| D[query-on-interaction rule]
    B -->|standard| E[second-brain-query skill]
    C --> F[Apply confidence logic]
    D --> F
    E --> F
    F --> G[Return answer with provenance]
```

---

## Skill Routing Graphs

### Second Brain Ingest Skill

```mermaid
flowchart TD
    A[incoming material] --> B{Classify by role}
    B --> C{Confidence level?}
    C -->|high| D[workbook/wiki/]
    C -->|medium| E[workbook/brainstorm/]
    C -->|low| F[workbook/resources/]
    C -->|active| G[workbook/my-work/]
    D --> H[Extract durable points]
    E --> H
    F --> H
    G --> H
    H --> I[Default to workbook/brainstorm/]
    I --> J[Suggest backlinks]
    J --> K[Output: routed note]
```

**Skill Bounds:**
- Keep user-authored notes intact
- Do not promote speculative claims to `workbook/wiki/` by default

### Web to Resource Skill

```mermaid
flowchart TD
    A[URL input] --> B{Fetch content}
    B --> C{Valid response?}
    C -->|yes| D[Convert to Markdown]
    C -->|no| E[Error: fetch failed]
    D --> F[Add provenance]
    F --> G[Normalize metadata]
    G --> H[Output: resource note]
```

---

## Rule Routing Graphs

### Promotion Policy Rule

```mermaid
flowchart TD
    A[Content] --> B{Source folder?}
    B -->|my-work| C[Must pass through brainstorm]
    B -->|resources| C
    B -->|brainstorm| D{Promotion test?}
    C --> E[Route through solidify]
    D -->|passed| F[workbook/wiki/]
    D -->|failed| G[workbook/brainstorm/]
    E --> F
    F --> H[Update workbook/wiki/index.md]
```

**Must:**
- Entry into `workbook/wiki/` must go through `solidify` gate
- Prefer promoting selected grounded claims

**Must Not:**
- Do not promote directly from `workbook/my-work/` or `workbook/resources/` to `workbook/wiki/`

### Query Confidence Rule

```mermaid
flowchart TD
    A[Query] --> B{Confidence level?}
    B -->|high| C[Direct answer from workbook/wiki/]
    B -->|medium| D[Synthesize from workbook/brainstorm/]
    B -->|low| E[Search workbook/resources/]
    C --> F[Answer with full confidence]
    D --> F
    E --> F
```

### Debug Mode Rule

```mermaid
flowchart TD
    A[Debug command] --> B{Session active?}
    B -->|yes| C[Suspend auto-write rules]
    B -->|no| D[Read-only]
    C --> E[Disable: query-on-interaction]
    E --> F[Disable: low-confidence-brainstorm]
    F --> G[Disable: post-ingest-solidify]
    G --> H[Disable: post-brainstorm-solidify]
    D --> H
    H --> I[Output: sandbox mode]
```

---

## Routing Standards

### Layer Handoff Rules

1. **Commands → Workflows**: Commands select workflow based on input type
2. **Workflows → Skills**: Workflows delegate to skills for specialized tasks
3. **Workflows → Rules**: Workflows check rules for validation
4. **Skills → Rules**: Skills apply rules for routing decisions
5. **Rules**: Terminal layer - no further routing

### Default Paths

- Derived material: `workbook/brainstorm/` by default
- External sources: `workbook/resources/` for capture, `workbook/brainstorm/` for synthesis
- Promotion: Only through `solidify` gate
- Debug: Session-scoped, disables all auto-write rules

### Stop Conditions

- `debug` mode active: All writes suspended
- Promotion test failed: Content stays in `workbook/brainstorm/`
- Duplicate found: Update existing instead of creating new
- Invalid source: Error and exit
