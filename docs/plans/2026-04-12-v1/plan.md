

The two compatibility anchors are solid:

* **OpenCode** can use a project-root `AGENTS.md` for repo-level instructions, and it discovers skills from `.opencode/skills/<name>/SKILL.md`. It also supports a custom config directory via `OPENCODE_CONFIG_DIR`, which is useful if you later want to separate personal global agent behavior from this vault’s project-local behavior. ([OpenCode][1])
* For **Zotero**, the official Zotero plugins page explicitly lists tools for linking Zotero items to external Markdown files and notes that the Obsidian citation plugin relies on Better BibTeX. Zotero’s ecosystem also includes tools for exporting item metadata and notes as Markdown. ([Zotero][2])

## Core design

Your vault should have **six** working layers, not four:

```text
vault/
  my-work/
  resources/
  brainstorm/
  wiki/
  output/
  .opencode/
```

And Git should track the whole vault except bulky/generated/cache content.

The mental model is:

```text
my-work     = what I am doing / thinking now
resources   = what I collected from outside
brainstorm  = speculative ideas worth exploring
wiki        = stable, curated, reference-grade knowledge
output      = task-specific deliverables
.opencode   = agent behavior, skills, commands, workflows
```

## Final recommended folder structure

```text
vault/
  AGENTS.md

  my-work/
    inbox/
    projects/
    notes/
    meetings/
    drafts/
    decisions/
    journal/

  resources/
    inbox/
    web/
    papers/
    books/
    pdfs/
    zotero/
    local-files/
    media/
    source-index/

  brainstorm/
    inbox/
    themes/
    hypotheses/
    prompts/
    speculative-maps/
    incubation/

  wiki/
    index.md
    log.md
    sources/
    entities/
    concepts/
    methods/
    projects/
    synthesis/
    maps/

  output/
    writing/
    reports/
    presentations/
    exports/

  .opencode/
    skills/
      second-brain-ingest/
        SKILL.md
      second-brain-query/
        SKILL.md
      second-brain-lint/
        SKILL.md
      brainstorm-distill/
        SKILL.md
      web-to-resource/
        SKILL.md
    commands/
      ingest.md
      query.md
      brainstorm.md
      solidify.md
      lint-brain.md
    workflows/
      ingest-my-work.md
      ingest-resources.md
      distill-brainstorm.md
      solidify-to-wiki.md
```

## Why this design works

### `my-work/`

This is your live workspace. It should stay messy enough to be useful.

Use it for:

* draft thinking
* active project notes
* meeting notes
* decisions
* plans
* rough outlines

The agent should treat this folder as **high priority for intent**.

### `resources/`

This is the evidence layer.

Use it for:

* downloaded web pages as Markdown
* PDFs
* Zotero-derived notes
* bibliographic stubs
* local file references
* extracted highlights
* transcripts

The agent should treat this folder as **high priority for evidence**, but not automatically as truth.

### `brainstorm/`

This is your speculative layer, and it is the most important addition.

This folder is for:

* half-formed ideas
* “maybe true” hypotheses
* pattern guesses
* conceptual mashups
* research questions
* risky synthesis
* future directions
* LLM-generated explorations

This should be editable by both you and the LLM, and **Git history is essential** here because brainstorm quality often comes from iterative mutation rather than one clean final version.

### `wiki/`

This is the stable memory layer.

Everything here should aim to be:

* normalized
* linked
* less repetitive
* better evidenced
* more durable
* more precise than brainstorm

The wiki is not for raw excitement. It is for things you would want to retrieve later and trust.

### `output/`

This is where deliverables go:

* essays
* reports
* summaries
* slides text
* structured exports

## The key distinction: `brainstorm/` vs `wiki/`

This is the most important rule in the whole design.

### `brainstorm/` is allowed to be:

* wrong
* incomplete
* imaginative
* contradictory
* early
* associative
* provocative

### `wiki/` is expected to be:

* grounded
* traceable
* clearer
* normalized
* conflict-aware
* relatively stable

So the system needs a **promotion path**, not a merge.

Use this pipeline:

```text
my-work/resources -> brainstorm -> wiki -> output
```

Not everything should go to wiki.
A lot should stay in brainstorm permanently.

## Required metadata conventions

Use YAML frontmatter everywhere except maybe very temporary notes.

### For `resources/` notes

```yaml
---
type: resource
resource_kind: web | pdf | zotero | local-file | note | transcript
title:
source_url:
local_path:
zotero_uri:
authors:
created:
captured:
tags: []
status: active
trust_level: raw
---
```

### For `brainstorm/` notes

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

### For `wiki/` notes

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

## Rules for links

You asked for three kinds of support:

* local file links on your computer
* Zotero links
* downloaded web resources as Markdown

Here is the clean design.

### 1. Local computer files

Store a small Markdown resource note in `resources/local-files/` for each important local file.

That note should contain:

* human-readable title
* file path
* file type
* short description
* related topics
* backlinks into wiki/brainstorm/project notes

Example:

```md
---
type: resource
resource_kind: local-file
title: 2025 budget spreadsheet
local_path: /Users/you/Documents/finance/2025-budget.xlsx
captured: 2026-04-12
tags: [finance, planning]
---

# 2025 budget spreadsheet

Primary spreadsheet for household annual planning.

- Local file: [Open file](file:///Users/you/Documents/finance/2025-budget.xlsx)
- Related: [[Household Budget Model]]
```

The point is: **the file itself stays where it is**, but the vault contains a stable knowledge stub about it.

### 2. Zotero links

For Zotero, do the same: keep a Markdown stub note in `resources/zotero/` for each cited item.

That stub should contain:

* title
* author
* year
* Zotero URI
* citation key if you use Better BibTeX
* abstract or short note
* link to related wiki pages

Because Zotero officially supports an ecosystem of plugins for linking items to external Markdown files, exporting Markdown notes, and integrating with Obsidian via citation tooling, this design is aligned with the ecosystem rather than fighting it. ([Zotero][2])

Example:

```md
---
type: resource
resource_kind: zotero
title: Attention Is All You Need
authors: [Vaswani et al.]
year: 2017
zotero_uri: zotero://select/library/items/ABCDEFG
citation_key: vaswani2017attention
captured: 2026-04-12
tags: [transformers, llm, architecture]
---

# Attention Is All You Need

- Zotero item: [Open in Zotero](zotero://select/library/items/ABCDEFG)
- Citation key: @vaswani2017attention
- Related: [[Transformer Architecture]]
```

### 3. Web resources must be downloaded as Markdown

Good. That is the right rule.

Do **not** leave important web resources as bare URLs only.

For each captured webpage:

* save a Markdown copy in `resources/web/`
* preserve source URL in frontmatter
* preserve capture date
* optionally preserve page title, author, site
* add a brief human/LLM summary at top
* keep the raw body below

That gives you:

* offline durability
* git diffability
* future agent access
* less link rot

## Operational rules for capture

### Rule A: every external source becomes a Markdown resource note

That includes:

* webpages
* Zotero items
* local files worth referencing
* PDFs if extracted into notes
* transcripts

### Rule B: raw binaries are allowed, but every important binary needs a Markdown sidecar

For example:

```text
resources/pdfs/paper-a.pdf
resources/pdfs/paper-a.md
```

The `.md` file is what the agent reads first.

### Rule C: bare links are not knowledge

A link alone is not enough. Every retained source should have at least:

* a title
* what it is
* why it matters
* provenance

## Git strategy

Git is especially important for `brainstorm/`, as you said.

Track:

* `my-work/`
* `resources/` Markdown
* `brainstorm/`
* `wiki/`
* `output/`
* `AGENTS.md`
* `.opencode/`

Usually ignore:

* giant binaries if too large
* temporary exports
* cache folders
* plugin caches
* generated indexes if reproducible

Recommended principle:

* Git tracks **knowledge artifacts**
* Git may ignore **heavy source binaries** if they are reproducible elsewhere
* But if a binary is central to your work and not reproducible, commit it or store it via Git LFS

## OpenCode compatibility design

Because OpenCode uses `AGENTS.md` for repo instructions and discovers skills from `.opencode/skills/<name>/SKILL.md`, your vault should behave like an OpenCode project, not just an Obsidian vault. ([OpenCode][1])

### `AGENTS.md` should define the vault contract

Your project-root `AGENTS.md` should tell OpenCode:

* folder meanings
* confidence model
* what belongs in brainstorm vs wiki
* promotion rules
* link handling rules
* when to create resource stubs
* when to update existing wiki pages vs create new ones
* how to log changes

Suggested core rule set:

```md
# Personal Knowledge Vault

This repository is an Obsidian-first personal knowledge system.

## Folder roles
- `my-work/`: user-authored active notes, drafts, decisions, and project thinking
- `resources/`: external source material and source stubs; all important web resources must exist as markdown files here
- `brainstorm/`: speculative, partial, exploratory, or unverified ideas; both user and agent may edit
- `wiki/`: stable, curated, linked knowledge
- `output/`: task-specific deliverables

## Priority
When conflicts exist:
1. preserve user intent from `my-work/`
2. preserve evidence from `resources/`
3. keep speculation in `brainstorm/`
4. only promote to `wiki/` when sufficiently grounded

## Hard rules
- Never place speculative claims directly into `wiki/` without marking uncertainty and provenance
- Every important external source should have a markdown note in `resources/`
- Prefer updating existing wiki pages over creating duplicates
- Preserve links to local files and Zotero items in source notes
- Append meaningful structural changes to `wiki/log.md`
```

### OpenCode skills you should have

You do not need a huge system at first. Start with five skills.

#### `second-brain-ingest`

Reads `my-work/` and `resources/`, then:

* updates wiki where knowledge is solid
* updates brainstorm where ideas are promising but not yet solid
* updates `wiki/log.md`

#### `brainstorm-distill`

Reads mixed notes and creates:

* hypotheses
* open questions
* theme clusters
* promising next steps

This skill must default to `brainstorm/`, not wiki.

#### `solidify-to-wiki`

Reviews selected brainstorm notes and promotes only grounded content into wiki.

#### `second-brain-query`

Answers questions by preferring wiki first, then falling back to brainstorm and resources with explicit confidence labeling.

#### `second-brain-lint`

Checks for:

* dead links
* stale wiki pages
* orphan brainstorms
* duplicate concepts
* brainstorm ideas that have enough support to promote
* wiki claims missing supporting resources

## Concrete vault behavior

Here is the behavior I recommend.

### When you write in `my-work/`

The agent should ask:

* is this active work?
* is this a decision?
* is this a hypothesis?
* is this something to promote into wiki?
* is this something to combine with existing brainstorm themes?

### When you add something to `resources/`

The agent should ask:

* is there already a source note for this?
* what project/concept/entity does it connect to?
* does it strengthen an existing wiki page?
* does it inspire a brainstorm note rather than a wiki update?

### When something is exciting but uncertain

It goes to `brainstorm/`.

### When something has repeated support

It becomes candidate material for `wiki/`.

## My recommended special subfolders

These are worth adding.

### `resources/source-index/`

A manually or automatically maintained index of important source notes.

### `brainstorm/incubation/`

For ideas that are not active but should not be deleted.

### `wiki/projects/`

This is extremely useful in your setup, because your vault is not just a reference system; it is also an active work system.

A `wiki/projects/` page should summarize:

* project purpose
* active questions
* relevant resources
* key concepts
* current decisions
* open uncertainties

## One extra design rule that will save you pain

Do not let the LLM edit everything equally.

Use this edit policy:

* `my-work/`: agent may suggest heavily, edit lightly unless explicitly asked
* `resources/`: agent may create and normalize stubs/summaries
* `brainstorm/`: agent may edit freely
* `wiki/`: agent may edit carefully and must preserve stability
* `output/`: agent may generate freely for tasks

That keeps your authorship intact where it matters most.

## Final architecture in one line

```text
resources capture evidence, my-work captures intent, brainstorm captures possibility, wiki captures durable knowledge, output captures deliverables.
```

## My judgment

This is a **stronger real-world design** than the plain Karpathy layout.

It is better because it separates:

* intention
* evidence
* speculation
* durable knowledge
* deliverables

And it fits OpenCode naturally through `AGENTS.md` plus `.opencode/skills/.../SKILL.md` conventions. ([OpenCode][1])


* the frontmatter templates for each folder

[1]: https://opencode.ai/docs/rules/ "Rules | OpenCode"
[2]: https://www.zotero.org/support/plugins "
	Plugins [Zotero Documentation]
"
