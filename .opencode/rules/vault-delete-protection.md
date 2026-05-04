# Vault Delete Protection

## Absolute rule

**Never delete any file or directory within the vault root.**

The vault root is defined in `.opencode/vault-config.json` under the `vaultRoot` field.

This is a hard constraint enforced at the plugin level. The vault is a personal knowledge system where content should accumulate, not disappear.

## Allowed operations

Within the vault root, the following operations are permitted:

- **Modify**: Edit file content, update metadata, rewrite sections
- **Move**: Relocate files to different subdirectories within the vault
- **Rename**: Change filenames while preserving content
- **Create**: Add new files and directories
- **Archive**: Move outdated content to dedicated archive subfolders if needed

## Prohibited operations

Within the vault root, the following operations are **strictly forbidden**:

- Deleting files
- Deleting directories
- Using bash commands that would remove files (e.g., `rm`, `rmdir`, `find -delete`)
- Overwriting files with empty content as a deletion workaround

## Rationale

- Knowledge loss is irreversible
- Disk space is cheaper than knowledge reconstruction
- Moving or renaming preserves content while allowing reorganization
- If content seems obsolete, move it to an archive folder instead of deleting

## Exceptions

None. If cleanup is truly necessary, the user must perform it manually outside the agent system.

## Enforcement

This rule is enforced by the `vault-delete-protection` plugin (`.opencode/plugins/vault-delete-protection/`) which intercepts and blocks deletion operations targeting the vault root. The plugin reads the vault root dynamically from `.opencode/vault-config.json`.