---
name: env-registry
description: 管理和获取个人信息环境变量，用于需要身份证号、手机号等敏感数据的场景
compatibility: opencode
---

## DO THIS FIRST
1. This skill is a consumer of shared sensitive-command approval policy and not the policy owner.
2. Explain risk and request explicit user consent for sensitive value access.
3. OpenCode permissions remain the enforcement boundary for execution.
4. If approval is denied, provide a local-only fallback path and stop model-side access.

## What I do

- 通过白名单发现可用的个人信息条目（环境变量名 + 语义描述）
- 按需获取变量值（keyring 优先，环境变量 fallback）
- 管理白名单条目（增删查改）

## When to use me

Use this when:
- 需要在笔记或文档中填写个人信息（身份证号、手机号、地址、银行账号等）
- 需要查找某个个人信息是否已在系统中注册
- 用户要求添加/删除/修改个人信息条目

## How to use me

1. 发现可用条目:
   uv run python .opencode/scripts/env-registry.py list
2. 获取某个值:
   uv run python .opencode/scripts/env-registry.py get NAME
3. 添加新条目:
   uv run python .opencode/scripts/env-registry.py add NAME DESCRIPTION
4. 设置值（交互式，值不暴露在命令行）:
   uv run python .opencode/scripts/env-registry.py set NAME
   或管道输入:
   echo "value" | uv run python .opencode/scripts/env-registry.py set NAME

## Constraints

- 绝不将获取到的变量值写入任何 vault 文件或提交到 git
- 变量值仅在当前会话中使用，用完即弃
- get 只能获取白名单中已注册的变量（安全边界）
- 如果 get 返回错误（值未找到），提示用户先 set 值或设置环境变量
- 如果 set 返回退出码 3（keyring 不可用），告知用户需要安装 keyring 或手动设置环境变量
- 白名单中的 description 用于语义匹配，应保持简洁准确
- 注意: get 的输出可能被 opencode 会话日志记录。对于极高安全要求的场景，建议用户手动填写而非通过 LLM 获取
