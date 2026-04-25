---
description: Rename the vault folder and update all references
model: bailian-coding-plan/glm-5
---
Rename the vault from `$1` to `$2`.

Run the migration script:
```bash
node .opencode/scripts/migrate-vault-path.mjs $1 $2
```

 `@` followed by the filename is the file ref standard. You should remove the  `@` for the script to run.
 