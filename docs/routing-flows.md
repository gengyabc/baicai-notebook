# Routing Flows

Source inventory and routing diagrams for the `.opencode/` configuration layer.

## Source Files Inventory

### Commands (5)

| Command | Workflow | Description |
|---------|----------|-------------|
| `lint-vault.md` | `lint-vault.md` | Audit vault for metadata and knowledge quality |
| `brainstorm.md` | `distill-brainstorm.md` | Distill or expand brainstorm material |
| `solidify.md` | `solidify-to-wiki.md` | Promote grounded knowledge into wiki |
| `ingest.md` | `ingest-my-work.md` / `ingest-resources.md` | Ingest notes or sources into vault |
| `query.md` | `query-vault.md` | Query vault with confidence and provenance |

### Workflows (6)

| Workflow | Skills | Subagents | Description |
|----------|--------|-----------|-------------|
| `lint-vault.md` | `second-brain-lint` | `provenance-auditor`, `wiki-curator` | Audit vault for quality issues |
| `solidify-to-wiki.md` | `solidify-to-wiki`, `second-brain-query` | `wiki-curator`, `provenance-auditor` | Promote grounded knowledge to wiki |
| `distill-brainstorm.md` | `brainstorm-distill`, `second-brain-ingest` | `brainstorm-catalyst`, `vault-researcher` | Clarify brainstorm material |
| `query-vault.md` | `second-brain-query` | `vault-researcher`, `provenance-auditor` | Answer vault questions |
| `ingest-my-work.md` | `second-brain-ingest`, `solidify-to-wiki` | `brainstorm-catalyst`, `wiki-curator` | Ingest active notes |
| `ingest-resources.md` | `web-to-resource`, `second-brain-ingest` | `vault-researcher`, `wiki-curator` | Ingest external sources |

### Skills (6)

| Skill | Description |
|-------|-------------|
| `solidify-to-wiki` | Promote grounded knowledge into wiki with provenance |
| `web-to-resource` | Convert URLs/artifacts into Markdown resource notes |
| `brainstorm-distill` | Distill exploratory notes into clearer hypotheses |
| `second-brain-lint` | Audit vault for metadata, duplicates, promotion candidates |
| `second-brain-query` | Answer vault questions with folder-aware confidence |
| `second-brain-ingest` | Route notes/sources into correct vault layer |

### Agents (5)

| Agent | Mode | Role |
|-------|------|------|
| `vault-orchestrator` | hidden | Orchestrates commands via workflows |
| `provenance-auditor` | subagent | Audits claims and source support |
| `vault-researcher` | subagent | Gathers evidence across vault notes |
| `wiki-curator` | subagent | Curates wiki notes for structure |
| `brainstorm-catalyst` | subagent | Expands speculative ideas |

### Rules (5)

| Rule | Purpose |
|------|---------|
| `core-vault.md` | Folder semantics, knowledge standards, decision priority |
| `edit-policy.md` | Edit behavior by folder |
| `promotion-policy.md` | Brainstorm-to-wiki promotion criteria |
| `metadata-conventions.md` | YAML frontmatter schemas |
| `query-confidence.md` | Folder priority for answers |

---

## Command Routing Diagrams

### /lint-vault

```mermaid
flowchart TD
    A[Arguments: scope] --> B{Scope provided?}
    B -->|No| C[Use default scope]
    B -->|Yes| D[Use provided scope]
    C --> E[Load workflow: lint-vault.md]
    D --> E
    E --> F[Execute workflow]
    F --> G[Report findings by severity]
    G --> H[Suggest smallest fixes]
```

**Routing Standards:**
- One workflow: `lint-vault.md`
- Reports findings before suggesting fixes
- Stops at workflow handoff

---

### /brainstorm

```mermaid
flowchart TD
    A[Arguments: scope] --> B[Load workflow: distill-brainstorm.md]
    B --> C[Execute workflow]
    C --> D{Explicit solidification requested?}
    D -->|No| E[Keep material in brainstorm/]
    D -->|Yes| F[Route to solidify workflow]
    E --> G[Output: cleaner brainstorm notes]
```

**Routing Standards:**
- Default: keep speculative material in `brainstorm/`
- Only promote when explicitly requested
- Stops at workflow handoff

---

### /solidify

```mermaid
flowchart TD
    A[Arguments: topic or note] --> B[Load workflow: solidify-to-wiki.md]
    B --> C[Execute workflow]
    C --> D[Promote only grounded content]
    D --> E[Keep unresolved material in brainstorm/]
    E --> F[Output: new or updated wiki note]
```

**Routing Standards:**
- Promotes only grounded content
- Preserves speculative material location
- Stops at workflow handoff

---

### /ingest

```mermaid
flowchart TD
    A[Arguments: target scope] --> B{Target location?}
    B -->|my-work/ or My-work/| C[workflow: ingest-my-work.md]
    B -->|resources/ or Resources/| D[workflow: ingest-resources.md]
    B -->|URL / file / Zotero / PDF| D
    B -->|No scope| E[Inspect context for smallest scope]
    E --> B
    C --> F[Execute workflow]
    D --> F
    F --> G[Output: organized notes in correct layers]
```

**Routing Standards:**
- Branch on target type
- Default: inspect recent context
- Stops at workflow handoff

---

### /query

```mermaid
flowchart TD
    A[Arguments: question] --> B[Load workflow: query-vault.md]
    B --> C[Execute workflow]
    C --> D[Search wiki/ first]
    D --> E[Pull resources/ for evidence]
    E --> F[Use brainstorm/ for tentative synthesis]
    F --> G[Output: answer with confidence and provenance]
```

**Routing Standards:**
- Folder priority: `wiki/` → `resources/` → `brainstorm/`
- Explicit confidence labeling
- Stops at workflow handoff

---

## Workflow Routing Diagrams

### lint-vault

```mermaid
flowchart TD
    A[Input: vault scope] --> B[Load skill: second-brain-lint]
    B --> C[Check frontmatter and schemas]
    C --> D[Identify orphans and duplicates]
    D --> E[Flag wiki notes with weak sourcing]
    E --> F[Flag promotion candidates]
    F --> G{Evidence gaps found?}
    G -->|Yes| H[Delegate to provenance-auditor]
    G -->|No| I{Structure issues?}
    H --> I
    I -->|Yes| J[Delegate to wiki-curator]
    I -->|No| K[Compile findings]
    J --> K
    K --> L[Output: prioritized findings]
```

**Handoffs:**
- `provenance-auditor`: evidence gaps, wiki support issues
- `wiki-curator`: duplicates, structure findings

---

### solidify-to-wiki

```mermaid
flowchart TD
    A[Input: target notes/topics] --> B[Collect supporting material]
    B --> C{Passes promotion policy?}
    C -->|No| D[Keep in brainstorm/]
    C -->|Yes| E{Existing wiki note?}
    E -->|Yes| F[Update existing note]
    E -->|No| G[Create new wiki note]
    F --> H[Load skill: solidify-to-wiki]
    G --> H
    H --> I[Add metadata and provenance]
    I --> J{Structural change?}
    J -->|Yes| K[Append to wiki/log.md]
    J -->|No| L[Complete]
    K --> L
```

**Handoffs:**
- `wiki-curator`: deduplication, naming, normalization
- `provenance-auditor`: mixed or weak support checking

---

### distill-brainstorm

```mermaid
flowchart TD
    A[Input: brainstorm notes] --> B[Load skill: brainstorm-distill]
    B --> C[Identify topic clusters]
    C --> D[Separate observations/hypotheses/questions]
    D --> E[Rewrite/split for clarity]
    E --> F[Add derived_from, confidence, status]
    F --> G{Routing decisions needed?}
    G -->|Yes| H[Load skill: second-brain-ingest]
    G -->|No| I[Create links to resources/themes]
    H --> I
    I --> J{Mark promotion candidates?}
    J -->|Yes| K[Flag for later solidification]
    J -->|No| L[Output: cleaner brainstorm notes]
    K --> L
```

**Handoffs:**
- `brainstorm-catalyst`: larger thematic clustering, fresh synthesis
- `vault-researcher`: missing evidence gathering

---

### query-vault

```mermaid
flowchart TD
    A[Input: question, optional scope] --> B[Load skill: second-brain-query]
    B --> C[Search wiki/ first]
    C --> D{Found stable answer?}
    D -->|Yes| E[Pull supporting evidence from resources/]
    D -->|No| F[Use brainstorm/ for tentative synthesis]
    E --> G[Check my-work/ for context]
    F --> G
    G --> H{Evidence conflicts?}
    H -->|Yes| I[Delegate to provenance-auditor]
    H -->|No| J[Present answer with confidence]
    I --> J
```

**Handoffs:**
- `vault-researcher`: broad evidence gathering
- `provenance-auditor`: conflicting or weak support

---

### ingest-my-work

```mermaid
flowchart TD
    A[Input: target notes] --> B[Identify note role]
    B --> C{Note type?}
    C -->|Active work| D[Preserve in place]
    C -->|Decision/project| E[Extract durable ideas]
    C -->|Hypothesis| F[Route to brainstorm/]
    D --> G[Add links to derived notes]
    E --> H{Material ready?}
    H -->|Grounded| I[Route to wiki/]
    H -->|Speculative| F
    I --> J[Load skill: solidify-to-wiki]
    F --> K[Load skill: second-brain-ingest]
    J --> G
    K --> G
```

**Handoffs:**
- `brainstorm-catalyst`: exploratory clustering
- `wiki-curator`: careful deduplication

---

### ingest-resources

```mermaid
flowchart TD
    A[Input: URL/file/PDF/etc.] --> B{Source type?}
    B -->|web| C[Load skill: web-to-resource]
    B -->|pdf| D[Create resource note with provenance]
    B -->|zotero| D
    B -->|local-file| D
    B -->|transcript| D
    C --> E{Resource exists?}
    D --> E
    E -->|Yes| F[Update existing note]
    E -->|No| G[Create new resource note]
    F --> H[Normalize metadata]
    G --> H
    H --> I[Link to related notes]
    I --> J{Source suggests synthesis?}
    J -->|Yes, uncertain| K[Route to brainstorm/]
    J -->|Yes, grounded| L[Update wiki with provenance]
    J -->|No| M[Complete]
    K --> M
    L --> M
```

**Handoffs:**
- `vault-researcher`: multiple source comparison
- `wiki-curator`: durable wiki update

---

## Skill Routing Diagrams

### solidify-to-wiki

```mermaid
flowchart TD
    A[Input: selected material] --> B{Ready for wiki?}
    B -->|No| C[Return: not promotable]
    B -->|Yes| D{Existing wiki page?}
    D -->|Yes| E[Update existing]
    D -->|No| F[Create new note]
    E --> G[Extract grounded claims]
    F --> G
    G --> H[Add sources, confidence, related]
    H --> I[Preserve backlinks]
```

**Bounds:**
- Does not promote unresolved speculation
- Prefers updating existing pages over duplicates

---

### web-to-resource

```mermaid
flowchart TD
    A[Input: URL or artifact] --> B[Capture metadata and provenance]
    B --> C[Summarize why source matters]
    C --> D[Normalize to resource schema]
    D --> E[Preserve source links]
    E --> F{Bare link only?}
    F -->|Yes| G[Reject: add context required]
    F -->|No| H[Output: resource note]
```

**Bounds:**
- Bare links are insufficient
- Must keep original source identity and capture date

---

### brainstorm-distill

```mermaid
flowchart TD
    A[Input: messy brainstorm notes] --> B[Cluster idea fragments]
    B --> C[Separate: observations / guesses / questions]
    C --> D[Improve structure]
    D --> E[Mark follow-up directions]
    E --> F{Target folder?}
    F -->|Default| G[Stay in brainstorm/]
    F -->|Explicit request| H[Consider wiki/]
```

**Bounds:**
- Defaults to `brainstorm/`, not `wiki/`
- Preserves uncertainty and derivation

---

### second-brain-lint

```mermaid
flowchart TD
    A[Input: vault scope] --> B[Check metadata consistency]
    B --> C[Find orphan notes]
    C --> D[Find duplicate concepts]
    D --> E[Spot wiki notes with weak sourcing]
    E --> F[Spot promotion candidates in brainstorm/]
    F --> G[Report findings first]
    G --> H[Suggest smallest corrective action]
```

**Bounds:**
- Reports findings before recommendations
- Prefers smallest corrective action

---

### second-brain-query

```mermaid
flowchart TD
    A[Input: question] --> B[Answer from wiki/ first]
    B --> C{Sufficient?}
    C -->|No| D[Pull evidence from resources/]
    C -->|Yes| E[Return answer]
    D --> F{Still need synthesis?}
    F -->|Yes| G[Use brainstorm/ tentatively]
    F -->|No| E
    G --> H[Label uncertainty and conflict]
    H --> E
```

**Bounds:**
- Separates confirmed facts from hypotheses
- Prefers traceability over fluency

---

### second-brain-ingest

```mermaid
flowchart TD
    A[Input: material] --> B[Classify by role and confidence]
    B --> C{Destination?}
    C -->|Evidence source| D[resources/]
    C -->|Speculative synthesis| E[brainstorm/]
    C -->|Grounded and stable| F[wiki/]
    C -->|Active user work| G[my-work/]
    D --> H[Extract durable points]
    E --> H
    F --> H
    G --> I[Preserve intact unless edit requested]
    H --> J[Suggest backlinks and placement]
```

**Bounds:**
- Keeps user-authored active notes intact unless explicitly requested
- Does not promote speculative claims to `wiki/` by default

---

## Rule Routing Diagrams

### core-vault

```mermaid
flowchart TD
    A[Input: decision] --> B{What type?}
    B -->|Folder destination| C[Apply folder semantics]
    B -->|Knowledge action| D[Apply knowledge standard]
    B -->|Priority conflict| E[Apply decision priority]
    B -->|Overlapping content| F[Apply duplicate control]
    C --> G[Output: correct layer]
    D --> H[Output: durable note with provenance]
    E --> I[1. User intent → 2. Provenance → 3. Speculation → 4. Wiki]
    F --> J[Update existing or link explicitly]
```

**Must:**
- Route material to correct layer
- Preserve provenance with sources

**Must Not:**
- Flatten active user intent
- Lose source context

---

### edit-policy

```mermaid
flowchart TD
    A[Input: edit request] --> B{Target folder?}
    B -->|my-work/| C[Preserve voice, additive edits]
    B -->|resources/| D[Normalize metadata only]
    B -->|brainstorm/| E[Edit freely, preserve traceability]
    B -->|wiki/| F[Conservative clarity edits]
    B -->|output/| G[Shape for deliverable]
    C --> H{Distinguish fact/interpretation?}
    D --> H
    E --> H
    F --> H
    G --> H
    H -->|Yes| I[Apply change]
    H -->|No| J[Mark uncertainty instead]
    I --> K{Wiki restructured?}
    K -->|Yes| L[Append to wiki/log.md]
    K -->|No| M[Complete]
    L --> M
```

**Must:**
- Distinguish fact, interpretation, hypothesis
- Mark uncertainty when support is weak

**Must Not:**
- Rewrite source content misleadingly
- Lose useful backlinks

---

### promotion-policy

```mermaid
flowchart TD
    A[Input: candidate for wiki] --> B{Brainstorm or resource?}
    B -->|Brainstorm| C[Check promotion test]
    B -->|Resource| D[Check if grounded claim]
    C --> E{Passes most criteria?}
    D --> E
    E -->|No| F[Keep in source layer]
    E -->|Yes| G{Existing wiki page?}
    G -->|Yes| H[Update with grounded claims only]
    G -->|No| I[Create new with provenance]
    H --> J[Add backlink if helpful]
    I --> J
    F --> K{Evidence mixed?}
    K -->|Yes| L[Record tension explicitly]
    K -->|No| M[Keep as-is]
    L --> M
```

**Must:**
- Promote only grounded claims
- Attach provenance directly
- Record tensions when evidence is mixed

**Must Not:**
- Promote entire speculative notes
- Promote when evidence is mixed without noting tension

---

### metadata-conventions

```mermaid
flowchart TD
    A[Input: durable note] --> B{Note type?}
    B -->|Resource| C[Use resource schema]
    B -->|Brainstorm| D[Use brainstorm schema]
    B -->|Wiki| E[Use wiki schema]
    C --> F[Add provenance + summary]
    D --> G[Add uncertainty + derivation]
    E --> H[Add explicit sources]
    F --> I[Validate against schema]
    G --> I
    H --> I
    I --> J{Valid?}
    J -->|Yes| K[Accept]
    J -->|No| L[Fix missing fields]
    L --> I
```

**Must:**
- Use YAML frontmatter for durable notes
- Include type-appropriate metadata

**Must Not:**
- Skip provenance on resource notes
- Skip uncertainty on brainstorm notes

---

### query-confidence

```mermaid
flowchart TD
    A[Input: question] --> B[Search wiki/ first]
    B --> C{Found?}
    C -->|Yes| D[Return stable answer]
    C -->|No| E[Search resources/]
    E --> F{Found?}
    F -->|Yes| G[Return with evidence and provenance]
    F -->|No| H[Use brainstorm/ tentatively]
    H --> I[Label as tentative synthesis]
    I --> J{Evidence conflicts?}
    J -->|Yes| K[State conflict plainly]
    J -->|No| L[Return answer with confidence]
    K --> L
```

**Must:**
- State confidence level when not fully grounded
- Cite folder or note source
- State conflicts plainly

**Must Not:**
- Collapse conflicting evidence
- Present speculation as fact

---

## Routing Standards

### Layer Boundary Rules

1. **Command diagrams** show: arguments → validation → workflow selection → output
2. **Workflow diagrams** show: stage flow, decision points, handoffs to skills/rules
3. **Skill diagrams** show: when to use, bounds, the skill's own decisions
4. **Rule diagrams** show: must/must not logic, acceptance checks

### Stop Conditions

- Commands stop at workflow handoff
- Workflows stop at skill/rule handoff
- Skills stop at their own bounds
- Rules stop at acceptance criteria

### Decision Point Visibility

All routing diagrams must explicitly show:
- Input validation branches
- Target selection branches
- Scope defaulting
- Handoff decisions
- Error/stop conditions