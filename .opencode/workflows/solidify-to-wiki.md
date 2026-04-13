# Workflow: Solidify To Wiki

## Goal

Promote grounded knowledge into `wiki/` without leaking unresolved speculation into stable memory.

## Inputs

- target brainstorm notes, resource notes, or user-selected topics

## Steps

1. Collect the supporting material from `resources/`, `my-work/`, `brainstorm/`, and existing `wiki/` notes.
2. Test whether the target content passes the promotion policy.
3. Decide whether to update an existing wiki note or create a new one.
4. Promote only the grounded parts.
5. Add `sources`, `related`, `confidence`, and `last_reviewed` metadata.
6. Preserve backlinks to brainstorm or source notes when helpful.
7. If `wiki/log.md` exists and the change is structural, append a concise entry.

## Skills

- load `solidify-to-wiki`
- load `second-brain-query` when source triangulation is needed

## Subagents

- use `wiki-curator` for deduplication, naming, and normalization
- use `provenance-auditor` when support is mixed or needs explicit checking

## Outputs

- new or updated wiki note
- explicit provenance and confidence
- retained speculative material left in `brainstorm/` when not promotable
