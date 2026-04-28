# 敏感信息管理指南

本系统用于安全存储和管理个人敏感信息（如身份证号、手机号等），采用两层存储架构确保安全性。

## 架构说明

- **元数据**：存储在 `.opencode/env-registry.json`（仅包含变量名和描述）
- **敏感值**：存储在系统 Keychain（macOS Keychain / Windows Credential Manager / Linux Secret Service）

### macOS Keychain 说明

macOS 有两种密码管理界面：

1. **Passwords 应用**（macOS Sequoia 2024+）
   - 仅管理网站密码和 passkeys
   - 数据存储在 iCloud Keychain
   - 无法访问应用密码（generic password）

2. **Keychain Access 应用**
   - 可以管理所有类型的密码，包括应用密码
   - 本系统存储的 `opencode-env-registry` 条目属于应用密码
   - 需要通过 Keychain Access 或 `security` 命令来管理

两者底层访问同一个 Keychain 数据库，但界面功能不同。

## 用户操作方法

### 方式一：通过 env-registry 脚本管理

#### 1. 列出已注册条目

```bash
bun run .opencode/scripts/env-registry.mjs list
```

输出示例：
```
Name                 Description
-------------------- ----------------------------------------
MY_ID_CARD           身份证号
MY_PHONE             手机号
```

#### 2. 添加新条目（仅注册名称，尚未设置值）

```bash
bun run .opencode/scripts/env-registry.mjs add VARIABLE_NAME "描述信息"
```

示例：
```bash
bun run .opencode/scripts/env-registry.mjs add MY_ID_CARD "身份证号"
```

#### 3. 设置敏感值

**交互式输入（推荐，不会回显）**：
```bash
bun run .opencode/scripts/env-registry.mjs set VARIABLE_NAME
```

**管道输入**：
```bash
echo "你的敏感值" | bun run .opencode/scripts/env-registry.mjs set VARIABLE_NAME
```

#### 4. 更新描述信息

```bash
bun run .opencode/scripts/env-registry.mjs describe VARIABLE_NAME "新的描述"
```

#### 5. 删除条目

```bash
bun run .opencode/scripts/env-registry.mjs remove VARIABLE_NAME
```

删除时会同时从元数据和系统 Keychain 中移除。

### 方式二：直接访问系统 Keychain

如果需要查看或管理原始值，可以直接访问系统 Keychain：

#### macOS

**重要说明**：
- macOS Sequoia (2024+) 引入了新的 **Passwords 应用**，但它只能管理网站密码和 passkeys
- 本系统存储的是 **应用密码（application password）**，在 Passwords 应用中看不到
- 需要使用 **Keychain Access** 或命令行工具来管理

**命令行方式**：
```bash
# 查找指定条目的值
security find-generic-password -s "opencode-env-registry" -a "VARIABLE_NAME" -w

# 列出所有相关条目
security dump-keychain | grep -A 5 "opencode-env-registry"
```

**图形界面（Keychain Access）**：
1. 打开 "钥匙串访问" 应用（Keychain Access.app）
   - 位于 `/System/Library/CoreServices/Applications/Keychain Access.app`
   - 或在 Spotlight 中搜索 "Keychain Access"
2. 搜索 "opencode-env-registry"
3. 双击条目可查看详细信息，勾选 "显示密码" 需要输入系统密码

**图形界面（Passwords 应用 - 不适用）**：
- macOS Sequoia 的 Passwords 应用无法访问应用密码
- 只能管理网站登录凭据和 passkeys

#### Windows

1. 打开 "凭据管理器"（Credential Manager）
2. 选择 "Windows 凭据"
3. 搜索以 `opencode-env-registry` 开头的条目

#### Linux

```bash
# 使用 secret-tool（需要安装 libsecret）
secret-tool search --all service opencode-env-registry
```

## 安全机制

### 模型访问控制

1. **禁止直接读取**：模型无法通过 `get` 命令获取原始值
2. **白名单限制**：只能在 allowlist 配置的 service/operation 下消费敏感值
3. **脱敏输出**：所有通过 `secure_action` 插件返回的结果都经过脱敏处理
4. **权限拦截**：OpenCode 配置文件阻止了绕过尝试（如 `node -e`、`bun eval` 等）

### 用户权限边界

- **用户在终端的执行不受 OpenCode 权限限制**
- 可以直接访问 Keychain 管理自己的敏感信息
- 可以手动编辑 `env-registry.json` 添加/删除元数据

## 配置文件

- **白名单配置**：`.opencode/env-registry.json`
- **插件权限配置**：`.opencode/plugin-allowlist.json`
- **安全规则**：`opencode.json` 中的 `permission` 字段

## 故障排除

### Keychain 不可用

如果 `set` 命令返回退出码 3，表示系统 Keychain 访问失败：

1. **macOS**：
   - 检查 "钥匙串访问"（Keychain Access.app）是否正常工作
   - 注意：不要使用 Passwords 应用，它无法管理应用密码
   - 确认登录 Keychain 未被锁定（Keychain Access 中检查）
2. **Windows**：检查凭据管理器服务是否运行
3. **Linux**：确保已安装并运行 `gnome-keyring` 或 `kwallet`

### 权限被拒绝

如果模型尝试访问敏感信息时提示权限不足：

1. 检查 `opencode.json` 中的权限配置
2. 确认 `plugin-allowlist.json` 中配置了对应的 service/operation
3. 验证条目是否已在 `env-registry.json` 中注册

### 值不存在

如果设置值时报错：

1. 确认条目已在 `env-registry.json` 中注册
2. 先执行 `add` 命令注册条目
3. 再执行 `set` 命令设置值

## 注意事项

- **不要将敏感值提交到 Git**
- **定期检查 Keychain 中的条目**
- **删除条目时注意备份**
- **描述信息应简洁准确，便于语义匹配**
- **macOS 用户**：不要使用 Passwords 应用管理本系统的敏感信息，应使用 Keychain Access 或命令行