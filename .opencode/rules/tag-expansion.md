# Tag Expansion Rule

## Purpose

Define when and how LLM proposes new canonical tags when existing tags cannot cover note content, and how to handle similar tags via aliases or expansions.

## Governed artifacts

- `.opencode/canonical-tags.json` — legal runtime source for canonical tag values
- `.opencode/tag-aliases.json` — alias-to-canonical mappings (same concept, different names)
- `.opencode/tag-expansions.json` — neighboring-tag relationships (related concepts, retrieval expansion)
- `.opencode/vault-config.json` — tag cap threshold configuration

## Expandable namespaces

| Namespace | Expansion policy |
|-----------|------------------|
| `topic/*` | Fully expandable — primary subject-area categorization |
| `state/*` | **Fixed** — system-managed workflow states |
| `source/*` | **Fixed** — system-managed content origin |
| `role/*` | **Fixed** — system-managed content role |

## Similar tag handling (MANDATORY before proposal)

When a tag gap is detected, first determine if it's an alias or a new concept:

### Alias check (same concept)

Before proposing a new tag, check if the detected tag concept is just a synonym/variant of an existing canonical tag:

1. Query existing canonical tags in `canonical-tags.json`
2. Query existing aliases in `tag-aliases.json`
3. Compare semantic meaning:
   - If the concept matches an existing canonical tag's meaning → **add alias, not new tag**
   - Example: `job-hunting` detected → matches `topic/career` meaning → add `"job-hunting": "topic/career"` to `tag-aliases.json`

### Expansion relationship (related concept)

After a new tag is approved, optionally suggest expansion relationships for retrieval:

1. Identify tags that are semantically related (neighbors in retrieval)
2. Add to `tag-expansions.json` for retrieval broadening
3. Example: `topic/career` approved → related to `topic/cv` → add `"topic/career": ["topic/cv"]` and `"topic/cv": ["topic/career"]`

### Decision matrix

| Detected concept | Matches existing canonical? | Related to existing? | Action |
|-----------------|---------------------------|---------------------|--------|
| Synonym of existing canonical | Yes | — | Add alias to `tag-aliases.json` |
| Variant spelling/form | Yes | — | Add alias to `tag-aliases.json` |
| Related but distinct concept | No | Yes | Propose new tag → add expansion to `tag-expansions.json` |
| Completely new concept | No | No | Propose new tag only |

## Trigger conditions

Trigger tag expansion proposal when:

1. Single note's content clearly doesn't fit any canonical tag in expandable namespaces
2. Trigger check AFTER alias normalization via `tag-aliases.json`
3. NOT triggered when concept matches existing canonical via alias check
4. NOT triggered by state/source/role gaps (those namespaces are fixed)
5. NOT triggered when a close canonical match exists (use closest match instead)

## Distinctness check (MANDATORY before proposal)

Before proposing any new tag:

1. **Alias check completed** — confirmed concept does not match any existing canonical
2. **No overlap with existing canonical tags** — the proposed tag covers a distinct semantic space
3. **No overlap with alias mappings** — check `tag-aliases.json` to avoid proposing what's already aliased
4. **No narrower-than-necessary proposals** — prefer broader tags when they work (e.g., prefer `topic/education` over `topic/education/k12` unless genuinely distinct in retrieval practice)

## Batch workflow mode

When running in batch workflows (e.g., `/enhance-tags` processing multiple files):

1. **Collect all tag gaps** during processing
2. **Classify each gap**:
   - Alias candidate → collect for `tag-aliases.json` batch update
   - New tag candidate → collect for `canonical-tags.json` batch proposal
   - Expansion candidate → collect for `tag-expansions.json` suggestion
3. **De-duplicate gaps** by semantic similarity
4. **At workflow completion**, present batch proposal:
   ```
   ## Tag handling proposals
   
   ### Aliases to add (synonyms)
   | Alias | Canonical target | Candidate notes | Rationale |
   |-------|-----------------|-----------------|-----------|
   | `job` | `topic/career` | 2 notes | Same concept, common synonym |
   
   Approve aliases? [y/n]
   
   ### New tags to add
   | Proposed tag | Namespace | Candidate notes | Rationale |
   |-------------|-----------|-----------------|-----------|
   | `topic/career` | topic/* | 3 notes | Career planning, distinct from cv |
   
   Approve new tags? [all/none/selective]
   
   ### Expansion relationships (optional)
   | Tag | Related tags | Rationale |
   |-----|-------------|-----------|
   | `topic/career` | `topic/cv` | Retrieval broadening |
   
   Add expansions? [y/n]
   ```
5. **User approves/rejects interactively**:
   - Aliases: `y` — add to `tag-aliases.json`, apply to candidate notes
   - New tags: `all/none/selective` — add to `canonical-tags.json`, apply
   - Expansions: `y` — add to `tag-expansions.json`

## Approval actions

### Alias approval

If user approves alias addition:

1. Add to `tag-aliases.json` mappings
2. Apply canonical tag to candidate notes (no new canonical needed)
3. Log approval in conversation

### New tag approval

If user approves new tag proposal:

1. Append to `canonical-tags.json` under `topic/*` namespace
2. Optionally add aliases to `tag-aliases.json` if synonyms were detected
3. Apply tag to all candidate notes identified
4. Optionally suggest expansion relationships for `tag-expansions.json`
5. Log approval in conversation

### Expansion approval

If user approves expansion relationships:

1. Add bidirectional entries to `tag-expansions.json`
2. Log approval in conversation

### Rejection handling

If user rejects:

1. Apply closest existing canonical tag instead
2. If no close match, leave topic untagged (do not force bad fit)
3. Do not retry same proposal in this session

## Tag cap governance

Tag cap threshold is defined in `.opencode/vault-config.json`:

```json
{
  "tagCapThreshold": 100
}
```

Default: 100. Adjust based on vault scale.

### Lint behavior

When `canonical-tags.json` exceeds `tagCapThreshold`:

1. Lint flags as advisory warning
2. Suggest consolidation review:
   - Identify tags used by fewer than 3 notes
   - Identify semantically overlapping tags (alias candidates)
   - Identify aliases that could collapse into one canonical
   - Identify unused expansion relationships
3. Do NOT block new proposals, but warn user that cap is exceeded
4. User may adjust threshold in vault-config.json if growth is intentional

### Threshold scale guidance

| Vault note count | Recommended tag cap |
|-----------------|--------------------|
| < 200 notes | 50-80 |
| 200-500 notes | 80-120 |
| 500-1000 notes | 100-150 |
| > 1000 notes | 150-200 |

User may override recommendations via vault-config.json.

## Proposal format

### Single proposal

```
## Tag expansion proposal

- Proposed tag: `topic/<name>`
- Namespace: topic/* (expandable)
- Rationale: 1-2 sentences why this is distinct and necessary
- Candidate notes: list paths that would use this tag
- Distinctness check: confirmed no overlap with [existing tags/aliases]
- Expansion suggestion: related to `<existing-tag>` (optional)

Approve? [y/n]
```

### Batch proposal

```
## Tag handling proposals (batch)

### Aliases to add
| Alias | Target | Notes | Rationale |
|-------|--------|-------|-----------|
| `job` | `topic/career` | 2 | Synonym |

Approve aliases? [y/n]

### New tags to add
| # | Proposed tag | Notes | Rationale |
|---|-------------|-------|-----------|
| 1 | `topic/career` | 3 | Career planning |
| 2 | `topic/finance` | 2 | Financial topic |

Approve new tags? [all/none/1,2/skip]

### Expansion relationships
| Tag | Related | Rationale |
|-----|---------|-----------|
| `topic/career` | `topic/cv` | Retrieval neighbor |

Add expansions? [y/n]
```

## Interaction with other workflows

### enhance-tags-resources.md

Follow this rule when tag generation encounters gaps. Classify as alias/new-tag/expansion before proposing.

### lint-vault.md

Check tag cap threshold, suggest alias consolidation, and flag unused expansion relationships.

### second-brain-lint skill

Include tag cap check and alias consolidation suggestions in governance checks.

### query-vault.md

No changes — retrieval uses canonical tags + expansions, no tag creation.

## Constraints

- Never auto-add tags to canonical-tags.json without user approval
- Never auto-add aliases to tag-aliases.json without user approval
- Never auto-add expansions to tag-expansions.json without user approval
- Never expand state/*, source/*, role/* namespaces
- Always run alias check and distinctness check before proposal
- Prefer adding alias over proposing new tag when concept matches existing canonical
- Prefer updating existing tag over creating new one when semantically close
- Respect tag cap threshold as advisory, not blocking