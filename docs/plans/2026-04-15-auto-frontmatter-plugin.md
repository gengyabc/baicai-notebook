# Implementation Plan: Auto Frontmatter Plugin

**Date:** 2026-04-15
**Status:** implemented
**Requirement:** [docs/requirements/2026-04-15-auto-frontmatter-plugin.md](../requirements/2026-04-15-auto-frontmatter-plugin.md)

---

## Summary

Refactor the OpenCode auto-frontmatter plugin so metadata conventions are defined by rules, safely merged via standard YAML parsing, and synchronized with a minimal tag taxonomy across vault content folders.

---

## Decisions

| Issue | Decision | Rationale |
|-------|----------|-----------|
| Metadata source of truth | `.opencode/rules/metadata-conventions.md` | Rules should define schemas; plugin should implement them mechanically |
| Frontmatter parser | `yaml` npm package | Prevents corruption of nested arrays and multiline fields |
| Folder mapping | `resources`, `brainstorm`, `wiki`, `output`, `my-work` each get their own template | Aligns metadata with vault layer semantics |
| `type` semantics | Stable vault-note family, not note-specific page type | Keeps queries simple while moving specificity to `kind` and `content_role` |
| Tag strategy | Sync required `state/*`, `source/*`, `role/*`; preserve `topic/*` | Keeps tags lightweight and deterministic |
| Unknown fields | Preserve during merge | Allows later schema growth without plugin data loss |
| `updated` behavior | Refresh on plugin write | Makes note freshness inspectable without complex diff tracking |
| Root/index alignment | Use `kind: index` or `kind: log` instead of special `type` values | Removes schema fragmentation |

---

## File Updates

### 1. `.opencode/rules/metadata-conventions.md`

**Change type:** rewrite

- Define the canonical field model and enum sets
- Add explicit tag taxonomy and limits
- Add templates for root index, resource, brainstorm, wiki, output, and my-work notes
- Clarify that `type` is broad and `kind` plus `content_role` carry note-specific meaning

### 2. `.opencode/plugins/auto-frontmatter/index.js`

**Change type:** rewrite

- Replace line-based frontmatter parsing with `yaml`
- Replace `resource_kind` defaults with unified `kind`
- Add folder template for `my-work`
- Merge safely while preserving unknown fields
- Refresh `updated`
- Synchronize required tags from deterministic fields

### 3. `.opencode/plugins/auto-frontmatter/README.md`

**Change type:** rewrite

- Document the new schema model
- Document tag synchronization behavior
- Document the plugin scope boundary: no content analysis or promotion

### 4. `.opencode/package.json`

**Change type:** update

- Add `yaml` dependency for safe frontmatter handling

### 5. `index.md`, `brainstorm/index.md`, `wiki/index.md`, `wiki/log.md`, `output/index.md`

**Change type:** update

- Replace special `type` variants with consistent `type` + `kind` + `content_role`
- Add lifecycle and tag fields aligned with the new schema

### 6. Sample resource notes

**Change type:** update

- Replace `resource_kind` with `kind`
- Add source and lifecycle fields plus required tags

---

## Validation

1. Install the new `.opencode` dependency set.
2. Validate `.opencode/rules`, plugin files, and `AGENTS.md` with the lightweight config validator.
3. Spot-check that the plugin can parse and rewrite notes that contain multiline arrays.

---

## Risks

- YAML serialization may normalize formatting on first write, though the data model remains stable.
- Future schema expansion still requires rule updates first, then plugin template updates.
