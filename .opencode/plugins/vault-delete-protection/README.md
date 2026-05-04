# Vault Delete Protection Plugin

## Purpose

This plugin enforces the vault delete protection rule defined in `.opencode/rules/vault-delete-protection.md`.

It prevents accidental or intentional deletion of files within the vault root directory (default: `workbook/`).

## How it works

The plugin intercepts `bash` tool execution before commands run and checks if:

1. The command contains delete operations (`rm`, `rmdir`, `find -delete`, `shred`, `unlink`, etc.)
2. The target path is within the vault root directory

If both conditions are met, the command is blocked with an error message.

## Allowed operations

The following operations remain allowed within the vault:

- **Modify**: Edit file content
- **Move**: Relocate files within the vault
- **Rename**: Change filenames
- **Create**: Add new files and directories
- **Archive**: Move content to archive subfolders

## Configuration

The vault root is read from `.opencode/vault-config.json`. Default: `workbook/`.

## Testing

To verify the plugin is working, try to delete a file in the vault:

```bash
rm workbook/test.md
```

Expected behavior: The command should be blocked with an error message.

## Disabling

To disable protection temporarily:
1. Remove or rename the plugin directory
2. Or modify `.opencode/vault-config.json` to change the vault root

## Note

This plugin provides a safety net, but the best protection is regular backups of your vault directory.