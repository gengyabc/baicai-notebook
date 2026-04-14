# Requirement: Vault System Re-architecture

**Key:** system-rearchitecture  
**Status:** ready  
**Created:** 2026-04-14  
**Decomposition:** multi-step

---

## Focus

Restructure the OpenCode vault system to minimize manual commands and enable automatic skill execution based on interaction context and confidence levels.

---

## In Scope

1. **Command consolidation**
   - Remove `/query` as a command (become auto-executing rule)
   - Remove `/brainstorm` as a command (become skill invoked by rule)
   - Keep: `/ingest`, `/discover-requirements`, `/write_plan`, `/solidify`, `/lint-vault`
   - Ensure `/ingest` accepts OpenCode links (tauri://localhost/..., https://opncd.ai/share/...)

2. **Auto-execution logic**
   - Query rule: Run on every user interaction to check vault context
   - Low confidence detection: Auto-invoke brainstorm skill when query returns confidence < 0.7
   - Solidify: Auto-execute after successful ingest or after brainstorm distillation
   - Lint-vault: Daily cron-style execution
   - Index update: After successful ingest output, update `wiki/index.md` with Obsidian bidirectional links

3. **Architecture refactoring**
   - Skills become primary execution unit
   - Rules define auto-execution triggers
   - Workflows orchestrate multi-step processes
   - Remove subagent concept entirely from AGENTS.md and all workflows

4. **Workflow updates**
   - Remove subagent references from `query-vault.md`, `distill-brainstorm.md`, `solidify-to-wiki.md`, `lint-vault.md`
   - Skills handle all operations previously delegated to subagents
   - Add auto-invocation rules to relevant workflows

5. **AGENTS.md updates**
   - Remove subagent line from operating model
   - Clarify auto-execution behavior
   - Document the new command/skill/rule interaction pattern

---

## Out of Scope

- Changing vault folder semantics (my-work, resources, brainstorm, wiki, output)
- Modifying promotion policy or confidence levels
- Changing schema or metadata conventions
- Modifying the discover-requirements or write_plan commands
- Creating new vault operations beyond what already exists
- Changing how skills are defined or loaded

---

## Constraints

1. **Preserve vault semantics**
   - my-work/ and My-work/ remain active intent layer
   - resources/ and Resources/ remain captured sources and evidence
   - brainstorm/ remains speculative layer (todo/ and active/)
   - wiki/ remains durable knowledge layer (index-first)
   - output/ remains deliverable layer (index-first)

2. **Preserve knowledge standards**
   - External material becomes Markdown in resources/
   - Durable notes preferred over ephemeral references
   - Attachments live in local attachments/ directories
   - Promotion policy and confidence levels unchanged

3. **Preserve existing skills**
   - `second-brain-query`, `second-brain-lint`, `second-brain-ingest`
   - `solidify-to-wiki`, `brainstorm-distill`, `web-to-resource`
   - Skill definitions remain; only invocation patterns change

4. **Backward compatibility**
   - All current workflows must continue to function
   - Removed commands should not break existing user habits (provide guidance)

---

## Assumptions

1. OpenCode supports rule-based auto-execution at interaction start
2. Confidence scoring is available from the query skill/workflow
3. **Low confidence threshold: 0.7** (brainstorm auto-invokes when confidence < 0.7)
4. **Periodic lint: Daily cron-style execution**
5. Auto-solidify will have guardrails to prevent premature promotion
6. Obsidian bidirectional links follow standard `[[filename]]` or `[[filename|display]]` syntax

---

## Success Criteria

1. **Command reduction verified**
   - `/query` removed from commands directory
   - `/brainstorm` removed from commands directory
   - `/ingest`, `/discover-requirements`, `/write_plan`, `/solidify`, `/lint-vault` remain

2. **Auto-execution functional**
   - Query rule executes on every user interaction
   - Brainstorm skill auto-invokes when query returns low confidence
   - Solidify auto-executes after ingest success
   - Solidify auto-executes after brainstorm distillation
   - `wiki/index.md` updated with bidirectional links after ingest

3. **Subagent removal complete**
   - No subagent references in AGENTS.md
   - No subagent references in any workflow files
   - Skills handle all operations previously delegated to subagents

4. **No regression**
   - Existing vault operations function correctly
   - Promotion policy respected
   - Knowledge confidence levels maintained
   - Schema and metadata conventions unchanged

---

## Decomposition

This requirement decomposes into **4 ordered units**:

### Unit 1: Remove Subagent Concept
- **Key:** remove-subagents
- **Focus:** Remove all subagent references from AGENTS.md and workflow files
- **In Scope:**
  - Remove "Subagents handle deep reasoning..." line from AGENTS.md operating model
  - Remove `## Subagents` sections from all workflow files
  - Remove subagent references (vault-researcher, provenance-auditor, brainstorm-catalyst, wiki-curator)
- **Out of Scope:**
  - Modifying skill files
  - Changing command files
  - Adding new auto-execution logic
- **Constraints:** Skills must be able to handle all operations without subagent delegation
- **Assumptions:** Current skill definitions are sufficient for all needed operations
- **Open Questions:** None
- **Success Criteria:**
  - No subagent references remain in AGENTS.md or workflows
  - System documentation consistent

### Unit 2: Consolidate Commands
- **Key:** consolidate-commands
- **Focus:** Remove `/query` and `/brainstorm` commands, keep specified commands
- **In Scope:**
  - Delete `.opencode/commands/query.md`
  - Delete `.opencode/commands/brainstorm.md`
  - Verify `/ingest` accepts OpenCode links (already implemented)
  - Keep `/ingest`, `/discover-requirements`, `/write_plan`, `/solidify`, `/lint-vault`
- **Out of Scope:**
  - Creating new rules or auto-execution logic (Unit 3)
  - Modifying skill files
- **Constraints:**
  - Workflows referenced by removed commands may need updates (handled in Unit 3)
  - User guidance needed for behavior change
- **Assumptions:** Users can adapt to implicit invocation
- **Open Questions:** ~~Should removed commands have deprecation messages?~~ **Resolved: Silent removal**
- **Success Criteria:**
  - Query and brainstorm command files removed (silently)
  - Specified commands remain functional

### Unit 3: Implement Auto-Execution Rules
- **Key:** auto-execution-rules
- **Focus:** Create rules for automatic skill invocation based on context and confidence
- **In Scope:**
  - Create rule for query-on-interaction (runs on every user input)
  - Create rule for low-confidence → brainstorm auto-invocation
  - Create rule for post-ingest solidify trigger
  - Create rule for post-brainstorm solidify trigger
  - Create rule for periodic lint execution
  - Update `ingest-resources.md` and `ingest-my-work.md` workflows to update `wiki/index.md` with bidirectional links
- **Out of Scope:**
  - Modifying skill definitions
  - Changing promotion policy
- **Constraints:**
  - Confidence threshold must be definable
  - Auto-solidify must respect promotion policy guardrails
  - Lint periodicity must be configurable
- **Assumptions:**
  - OpenCode supports rule-based auto-execution
  - Confidence scoring exists in query workflow
- **Open Questions:**
  - ~~What is the confidence threshold for "low"?~~ **Resolved: Below 0.7**
  - ~~How is "periodic" defined for lint?~~ **Resolved: Daily cron-style**
- **Success Criteria:**
  - Query executes on interaction
  - Brainstorm invokes when query confidence < 0.7
  - Solidify runs after ingest and brainstorm
  - Index updated with bidirectional links after ingest
  - Lint executes daily (cron-style trigger)

### Unit 4: Update AGENTS.md and Documentation
- **Key:** update-documentation
- **Focus:** Update system documentation to reflect new architecture
- **In Scope:**
  - Update AGENTS.md operating model (remove subagents, clarify auto-execution)
  - Document command → skill/rule interaction pattern
  - Add guidance for removed commands (implicit invocation)
  - Document confidence thresholds and auto-execution triggers
- **Out of Scope:**
  - Changing actual behavior (previous units handle that)
- **Constraints:** Documentation must match implemented behavior
- **Assumptions:** All previous units complete successfully
- **Open Questions:** None
- **Success Criteria:**
  - AGENTS.md accurately describes new architecture
  - Users understand how to interact with the system
  - Auto-execution behavior is documented

---

## Open Questions (Resolved)

1. ~~What confidence level threshold defines "low confidence" for brainstorm auto-invocation?~~ **Resolved: Below 0.7**
2. ~~How should "periodic" lint execution be triggered?~~ **Resolved: Daily cron-style**
3. ~~Should removed commands (`/query`, `/brainstorm`) have deprecation notices or be silently removed?~~ **Resolved: Silent removal**

---

## Planning Risks

1. **Rule implementation risk:** OpenCode rule system may not support the desired auto-execution patterns (resolve during implementation)
2. **Over-automation risk:** Auto-execution may run when inappropriate (mitigate with guardrails and thresholds)
3. **Confidence scoring risk:** Query workflow may not provide standardized confidence scores (may need workflow update)