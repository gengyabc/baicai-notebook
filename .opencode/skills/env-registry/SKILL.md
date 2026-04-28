---
name: env-registry
description: 管理个人信息环境变量，用于需要身份证号、手机号等敏感数据的场景
compatibility: opencode
---

## DO THIS FIRST
1. This skill is a consumer of shared sensitive-command approval policy and not the policy owner.
2. Explain risk and request explicit user consent for sensitive value access.
3. OpenCode permissions remain the enforcement boundary for execution.
4. If approval is denied, provide a local-only fallback path and stop model-side access.

## What I do

- 通过白名单发现可用的个人信息条目（环境变量名 + 语义描述）
- 管理白名单条目（增删查改）
- 通过安全插件执行需要密钥的操作（不暴露原始密钥值）

## When to use me

Use this when:
- 需要在笔记或文档中填写个人信息（身份证号、手机号、地址、银行账号等）
- 需要查找某个个人信息是否已在系统中注册
- 用户要求添加/删除/修改个人信息条目
- 需要执行密钥支持的安全操作

## How to use me

1. 发现可用条目:
   bun run .opencode/scripts/env-registry.mjs list
2. 添加新条目:
   bun run .opencode/scripts/env-registry.mjs add NAME DESCRIPTION
3. 设置值（交互式，值不暴露在命令行）:
   bun run .opencode/scripts/env-registry.mjs set NAME
   或管道输入:
   echo "value" | bun run .opencode/scripts/env-registry.mjs set NAME
4. 执行安全操作（通过插件，不暴露密钥）:
   使用 secure_action 工具，提供 service、operation 和 args

## Constraints

- 绝不将获取到的变量值写入任何 vault 文件或提交到 git
- 变量值仅在当前会话中使用，用完即弃
- raw `get` 命令已废弃，不再返回密钥值；请使用 secure_action 插件
- 如果 set 返回退出码 3（keychain 不可用），告知用户需要检查系统 keychain 或手动设置环境变量
- 白名单中的 description 用于语义匹配，应保持简洁准确
- 密钥消费操作必须通过 secure_action 插件执行，LLM 不得直接获取原始密钥值
