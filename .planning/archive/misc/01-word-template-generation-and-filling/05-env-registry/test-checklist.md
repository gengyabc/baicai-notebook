# Test Checklist

## Plan Reference
- @.planning/phase/05-env-registry/requirement.md
- @.planning/phase/05-env-registry/step.md

## Chosen Mode
lower-level only

## Why
- No feature.feature present in step folder
- CLI tool is implementation-focused with well-defined contract boundaries
- All behavior can be verified through unit tests and CLI subprocess tests

## Lower-Level Coverage

### Registry JSON Operations
- load_registry: file not exists returns empty structure, format corrupt exits 1, version mismatch exits 1
- save_registry: creates parent directories, writes valid JSON
- validate_name: valid patterns accepted, invalid patterns rejected
- find_entry: returns index or None for search

### Whitelist Commands
- list: empty registry, populated registry, json format, table format
- add: valid name succeeds, duplicate name exits 1, invalid name exits 1
- remove: existing entry succeeds, non-existing exits 2
- describe: existing entry updates, non-existing exits 2

### Value Operations
- get: whitelist check before lookup, keyring value, env fallback, missing value exits 2, unregistered name exits 2
- set: whitelist check, stdin input, prompt input, empty value exits 1, keyring unavailable exits 3
- delete_value: keyring deletion, graceful fallback when no keyring

### Keyring Integration
- keyring import success/failure handling
- get_value fallback chain: keyring -> os.environ -> None
- set_value: keyring available stores, keyring unavailable returns failure
- KeyringError exception handling

### CLI Argument Parsing
- all 6 commands recognized
- --format option for list
- missing arguments exit 1
- invalid arguments exit 1

## Browser E2E Coverage
- none required

## Refresh Triggers
- Material changes to step.md command specifications
- Review findings showing missing test coverage
- Keyring integration behavior changes