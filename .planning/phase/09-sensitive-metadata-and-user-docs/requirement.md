---
step-key: sensitive-metadata-and-user-docs
step-number: 09
step-folder: 09-sensitive-metadata-and-user-docs
phase-topic: word-template-generation-and-filling
status: discovered
requirement-version: 1
updated-at: 2026-04-28
source: discover-requirements
supersedes: null
---

## Restated Request

Allow the LLM to see only sensitive entry names and descriptions, not values, and document for users how to add new sensitive entries themselves with real examples.

## Real Objective

Make sensitive-data workflows more usable by exposing only safe metadata for discovery while keeping secret values opaque, and make the self-service registration path obvious to users.

## Problem Statement

The current safety model is too restrictive for discovery and onboarding: the LLM should be able to discover which sensitive entries exist and what they mean, but must not read their values. Users also need clear documentation showing how to register and populate sensitive entries themselves, otherwise the capability remains hard to adopt and easy to misuse.

## In Scope

- Define the allowed metadata visibility boundary as sensitive entry name plus description only
- Restrict metadata discovery to the existing registry/list surface as the canonical source
- Clarify that other help or discovery surfaces may reference that canonical surface without becoming independent metadata sources
- Root `README.md` updates describing the capability, safety boundary, and a minimal real example
- `.opencode/env-registry-README.md` updates with operational instructions and concrete examples for adding and setting sensitive entries
- Documentation wording that clearly separates metadata visibility from secret-value access

## Out of Scope

- Exposing raw sensitive values to the LLM under any condition
- Designing or implementing new broad discovery channels beyond the registry/list surface
- Changing secret storage backend behavior
- Document-filling execution design beyond referencing that a separate opaque fill path exists
- General permission or plugin redesign

## Constraints

- The LLM may access only sensitive entry names and descriptions, never values
- The registry/list surface must remain the single source of truth for sensitive metadata discovery
- Documentation must include user-self-service instructions for both registering an entry and setting its value
- Documentation examples must use realistic sensitive-entry cases
- The requirement must stay compatible with the current phase topic `word-template-generation-and-filling`

## Assumptions

- Existing registry metadata already stores only non-secret fields needed for safe discovery
- Users need a short discoverable overview in root `README.md` and a fuller operational guide in `.opencode/env-registry-README.md`
- Mirroring a small amount of example content across those two documents is acceptable for onboarding clarity

## Open Questions

- Whether future command or skill help output should show the full metadata list inline or only direct the user to the registry/list command
- Whether the root README should include one example or a very small pair of examples

## Success Criteria

1. The allowed metadata boundary is explicitly defined as name plus description only
2. The requirement treats the existing registry/list surface as the canonical metadata discovery path
3. The requirement makes clear that no secret values become readable to the LLM
4. The root `README.md` is required to explain the feature at a high level with at least one real example
5. `.opencode/env-registry-README.md` is required to provide the detailed self-service workflow with concrete commands and examples
6. The documentation clearly explains how a user adds a new sensitive entry and then sets its value without exposing that value to the model

## Suggested Planning Focus

First define the precise metadata-visibility contract and documentation boundaries, then plan the minimal documentation updates needed to make the self-service path clear without widening secret exposure.
