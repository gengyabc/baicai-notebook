---
step-key: env-registry
step-version: 1
requirement-version: 1
---


## Problem Statement

用户在 vault 笔记和模板填充中经常需要引用个人信息（身份证号、手机号、地址等），但这些敏感值不适合直接写入笔记文件或提交到 git。需要一个安全的、跨平台的机制，让 LLM 能按需获取这些值，同时：

1. 值本身不被持久化到 vault 或 git 中
2. LLM 能通过描述语义发现可用条目
3. 用户能方便地增删查改白名单
4. 跨平台可用（macOS / Linux / Windows）

## Decision Record

### DR-1: 值存储采用 keyring 优先 + 环境变量 fallback

**选择**: 混合方案

**备选**:
| 方案 | 优点 | 缺点 |
|------|------|------|
| 纯环境变量 | 零依赖、最简单 | 值暴露在进程环境中，ps/日志可能泄漏 |
| keyring 优先 + env fallback | 安全且灵活，macOS Keychain 原生支持 | Linux 需 libsecret（但 fallback 可用） |
| 纯 keyring | 最安全 | Linux 必须配置 libsecret，无降级路径 |

**理由**: macOS 原生支持 Keychain，零额外配置；Linux 未装 libsecret 时自动降级到环境变量，不会阻断工作流。keyring 是 Python 标准生态库，非冷门依赖。

**约束**: keyring 作为 pyproject.toml 中的 optional dependency group `secure`，不阻塞主功能。

### DR-2: 白名单 JSON 放在 .opencode/env-registry.json

**选择**: `.opencode/env-registry.json`

**备选**:
| 方案 | 优点 | 缺点 |
|------|------|------|
| .opencode/env-registry.json | 与 opencode 配置同目录，逻辑内聚 | 需加入 .gitignore |
| workbook/resources/ | vault 资源区 | 可能被 vault 流程意外处理 |
| ~/.config/env-registry.json | 全局共享 | 不在项目内，多项目难以隔离 |

**理由**: 此文件是 opencode agent system 的一部分，放在 .opencode/ 与项目架构一致。已有根 .gitignore 中的 `.opencode/*.sqlite` 等模式覆盖 .opencode/ 下文件，添加 `.opencode/env-registry.json` 忽略规则顺理成章。

### DR-3: LLM 集成采用 opencode skill

**选择**: opencode skill (`.opencode/skills/env-registry/SKILL.md`)

**理由**: skill 按需加载，不增加默认 token 消耗；符合 Command -> Workflow -> Skill -> Rules 架构。AGENTS.md 中添加路由条目即可引导模型在需要时加载。

### DR-4: 白名单同时作为访问控制列表

**选择**: `get` 命令只允许获取白名单中已注册的变量值

**理由**: 若不限制，攻击者可构造 prompt 诱导 LLM 执行 `get AWS_SECRET_ACCESS_KEY` 等命令，泄漏任意环境变量。白名单既是语义索引，也是访问控制边界——只有显式注册的变量才能被 `get`。

**约束**: `get` 在查找值之前必须先校验 name 存在于白名单中，不存在则退出码 2。`set` 同理，不允许为未注册的 name 设置值（需先 `add`）。

### DR-5: `set` 命令通过 stdin/prompt 读取值

**选择**: `set` 不接受值作为位置参数，改为从 stdin 读取或交互式 prompt

**备选**:
| 方案 | 优点 | 缺点 |
|------|------|------|
| 位置参数 set NAME value | 简单直观 | 值出现在 shell history、ps 输出中 |
| stdin 管道输入 | 不暴露在 ps 中 | 仍可能在 shell history |
| 交互式 prompt (用 getpass) | 最安全，不进入 history/ps | 不适合脚本化调用 |

**理由**: 敏感值不应出现在命令行参数中。默认使用交互式 `getpass.getpass()` 隐藏输入；同时支持 stdin 管道输入以便脚本化场景。

**语法**: `env-registry.py set <name>` — 无 value 参数，从 stdin/prompt 读取。

## Architecture

### Component Overview

```
+----------------------------------------------------------+
|  LLM (opencode session)                                  |
|  需要个人信息时 -> 读取 SKILL.md -> 调用 CLI 获取值       |
+------------------------------+---------------------------+
                               | uv run python .opencode/scripts/env-registry.py <cmd>
                               v
+----------------------------------------------------------+
|  env-registry.py (CLI)                                   |
|  - list / add / remove / get / set / describe            |
|  - keyring 优先，os.environ fallback                      |
|  - get/set 仅允许白名单中的变量（访问控制）               |
|  - set 通过 stdin/prompt 读取值，不暴露在命令行参数中     |
|  - 读写 .opencode/env-registry.json (白名单)              |
+----------+-----------------------------+-----------------+
           |                             |
           v                             v
+------------------+   +----------------------------------+
| env-registry.json|   | keyring / os.environ             |
| (白名单: name +  |   | (实际值存储)                     |
|  description)    |   | - keyring: macOS Keychain /      |
|                  |   |   Linux libsecret /              |
|                  |   |   Windows Credential Manager     |
|                  |   | - fallback: 环境变量              |
+------------------+   +----------------------------------+
```

### Data Flow

1. **白名单查询**: LLM -> `list` -> 读取 env-registry.json -> 返回 name + description
2. **值获取**: LLM -> `get <name>` -> 校验白名单 -> keyring.get_password() -> (空则) os.environ[name] -> (空则) 报错
3. **值设置**: 用户 -> `set <name>` -> 校验白名单 -> 从 stdin/prompt 读值 -> keyring.set_password() -> (无 keyring 则) 提示 export 并退出码 3
4. **白名单管理**: 用户 -> `add/remove/describe` -> 修改 env-registry.json
5. **删除条目**: 用户 -> `remove <name>` -> 从白名单删除 -> 尝试删除 keyring 中的值 -> 提示用户手动清理环境变量


## File Plan

### 1. `.opencode/env-registry.json` — 白名单数据

**Purpose**: 存储已注册的环境变量元数据（不存值）

**Schema**:
```json
{
  "version": 1,
  "env_vars": [
    {
      "name": "EXAMPLE_VAR",
      "description": "示例环境变量的用途描述，方便大模型按语义匹配"
    }
  ]
}
```

**Constraints**:
- `version` 字段用于未来 schema 迁移
- `name` 必须是合法的环境变量名（大写字母开头，仅含大写字母、数字、下划线，不以数字或下划线开头）
- `description` 是人类可读的自然语言描述，用于 LLM 语义匹配
- **永不存储变量值**
- 文件被 `.gitignore` 忽略

**空文件初始内容**:
```json
{
  "version": 1,
  "env_vars": []
}
```

### 2. `.opencode/scripts/env-registry.py` — CLI 工具

**Purpose**: 提供命令行接口管理白名单和获取值

**运行方式**: `uv run python .opencode/scripts/env-registry.py <command> [args]`

**Dependencies**:
- Python 标准库: json, os, sys, argparse, re, getpass, pathlib.Path
- 可选: keyring（通过 optional dependency group `secure` 安装）

**Commands**:

| 命令 | 语法 | 行为 | 退出码 |
|------|------|------|--------|
| list | list [--format json/table] | 读取白名单，输出所有条目（默认 json） | 0 |
| add | add NAME DESCRIPTION | 添加条目到白名单，name 去重；DESCRIPTION 为单个位置参数，多词需引号 | 0 / 1(重复/非法name) |
| remove | remove NAME | 从白名单删除，清理 keyring 值 | 0 / 2(未找到) |
| get | get NAME | 校验白名单 -> keyring -> env -> 报错 | 0 / 2(未注册/值未找到) |
| set | set NAME | 校验白名单 -> stdin/prompt 读值 -> 存 keyring | 0 / 2(未注册) / 3(无keyring) |
| describe | describe NAME DESCRIPTION | 更新条目描述 | 0 / 2(未找到) |

**退出码定义**:
- 0: 成功
- 1: 参数错误 / 校验失败（非法 name、重复 add）
- 2: 条目未找到 / 值未找到
- 3: keyring 不可用且值无法安全存储（仅 `set` 命令）

**输出约定**:
- 正常输出到 stdout，错误信息到 stderr
- `list --format json` 输出 env_vars 数组内容到 stdout（即 `[{"name": "...", "description": "..."}]`，不包含外层 version 字段），便于 LLM 直接解析
- `list --format table` 输出人类可读表格
- `list` 不带 `--format` 时默认使用 `json`（便于 LLM 场景，是最主要的使用者）
- `get` 仅输出值字符串到 stdout（无额外文本，便于管道使用）

**核心函数签名**:

```python
REGISTRY_PATH = Path(__file__).parent.parent / "env-registry.json"
KEYRING_SERVICE = "opencode-env-registry"
ENV_VAR_PATTERN = re.compile(r"^[A-Z][A-Z0-9_]*$")

def load_registry() -> dict          # 读白名单 JSON，文件不存在返回空结构，格式损坏则 exit(1)，version 不为 1 则 exit(1)
def save_registry(data: dict) -> None # 写白名单 JSON，自动创建目录
def validate_name(name: str) -> bool  # 校验环境变量名格式
def find_entry(registry: dict, name: str) -> int | None  # 返回在 env_vars 列表中的索引，用于 remove/describe 的列表变异操作
def get_value(name: str) -> str | None    # keyring -> os.environ，仅用于已注册变量
def set_value(name: str, value: str) -> tuple[bool, str]  # 存 keyring，返回 (成功, 消息)；返回 (False, ...) 时调用方应 exit(3)
def delete_value(name: str) -> None       # 删除 keyring 中的值
def read_value_interactive(name: str) -> str  # stdin/prompt 读取值
```

**keyring 降级逻辑**:
- import keyring 失败 -> `HAS_KEYRING = False`
- `get_value`: keyring 优先，KeyringError 时 catch 并 fallback 到 os.environ
- `set_value`: 有 keyring -> set_password；无 keyring -> 返回 (False, 提示手动 export)
- `delete_value`: 有 keyring -> delete_password (KeyringError catch)；无 keyring -> pass

**set 命令值读取**:
- stdin 是 tty -> `getpass.getpass()` 隐藏输入
- stdin 不是 tty (管道) -> `sys.stdin.read().strip()`
- 值为空 -> exit(1)

**各命令实现要点**:

- `list`: load_registry -> 按 format 格式化输出
- `add`: validate_name -> find_entry(去重) -> 追加到 env_vars -> save_registry
- `remove`: find_entry -> 删除条目 -> save_registry -> delete_value (清理 keyring)
- `get`: find_entry(校验白名单) -> get_value -> 值为空则 exit(2)
- `set`: find_entry(校验白名单) -> read_value_interactive -> set_value -> 失败则 exit(3)
- `describe`: find_entry -> 更新 description -> save_registry

**并发写入**: 本工具面向单用户单会话场景，不对 env-registry.json 做文件锁。如果两个 opencode session 同时执行写操作，后写者覆盖前者。低风险，不额外处理。


### 3. `.opencode/skills/env-registry/SKILL.md` — opencode 技能定义

**Purpose**: 定义 LLM 何时及如何使用 env-registry

完整文件内容如下（实现时直接创建此文件）:

**注意**: 现有 skill（second-brain-query 等）只使用 What I do / When to use me / Constraints 三个 section。本 skill 新增 `How to use me` section，因为 env-registry 的调用方式（CLI 命令语法）需要明确指引，否则模型可能猜错命令格式。这是对 skill 格式的有意扩展，适用于"需要精确调用指令"的场景。

```markdown
---
name: env-registry
description: 管理和获取个人信息环境变量，用于需要身份证号、手机号等敏感数据的场景
compatibility: opencode
---

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
```

### 4. `pyproject.toml` — 新增 optional dependency

**Changes**: 在 `[project.optional-dependencies]` 中新增 `secure` 组:

```toml
[project.optional-dependencies]
secure = [
    "keyring>=25.0.0",
]
dev = [
    "pytest>=8.0.0",
    "pytest-cov>=5.0.0",
]
```

**安装方式**: `uv add --optional secure keyring` 或手动编辑后 `uv sync`

### 5. `.gitignore` — 新增忽略规则

**Changes**: 在 `.gitignore` 中添加:

```
# Environment variable registry (contains personal info metadata)
.opencode/env-registry.json
```

### 6. `AGENTS.md` — 新增路由条目

**Changes**: 在 `## Default routing` 部分末尾添加:

```markdown
- For personal information needed in notes or forms, read `.opencode/skills/env-registry/SKILL.md`.
```

**架构说明**: 现有路由均指向 `.opencode/workflows/`，此处直接指向 skill 跳过了 workflow 层。这是有意为之：env-registry 功能足够简单（单 CLI 调用），不需要 workflow 编排。如果未来交互流程变复杂，可再抽取 workflow。


## Implementation Order

### Step 1: 创建白名单 JSON 初始文件

- 创建 `.opencode/env-registry.json`，内容为空结构: `{"version": 1, "env_vars": []}`
- 验证 JSON 格式正确

### Step 2: 实现 CLI 工具核心

- 创建 `.opencode/scripts/env-registry.py`
- 实现 load_registry / save_registry / validate_name / find_entry
- 实现所有 6 个子命令 (list, add, remove, get, set, describe)
- 实现 keyring 降级逻辑 (get_value / set_value / delete_value)
- 实现 set 命令的 stdin/prompt 值读取 (read_value_interactive)
- 所有错误信息输出到 stderr，正常输出到 stdout
- get 命令必须先校验白名单再查找值（访问控制）

**Verification**:
```bash
# 白名单管理
uv run python .opencode/scripts/env-registry.py list
uv run python .opencode/scripts/env-registry.py add MY_TEST_VAR "测试用变量"
uv run python .opencode/scripts/env-registry.py list
uv run python .opencode/scripts/env-registry.py list --format table
uv run python .opencode/scripts/env-registry.py describe MY_TEST_VAR "更新后的描述"

# 值设置与获取 (交互式 - 需要手动输入值)
uv run python .opencode/scripts/env-registry.py set MY_TEST_VAR
uv run python .opencode/scripts/env-registry.py get MY_TEST_VAR

# 管道输入方式
echo "test_value_123" | uv run python .opencode/scripts/env-registry.py set MY_TEST_VAR
uv run python .opencode/scripts/env-registry.py get MY_TEST_VAR

# 删除
uv run python .opencode/scripts/env-registry.py remove MY_TEST_VAR
uv run python .opencode/scripts/env-registry.py list

# 错误路径验证
uv run python .opencode/scripts/env-registry.py get NONEXISTENT_VAR  # 期望 exit 2
uv run python .opencode/scripts/env-registry.py add "123BAD" "bad name"  # 期望 exit 1
uv run python .opencode/scripts/env-registry.py remove NONEXISTENT_VAR  # 期望 exit 2
echo "value" | uv run python .opencode/scripts/env-registry.py set NONEXISTENT_VAR  # 期望 exit 2（未注册）
```

### Step 3: 更新 pyproject.toml

- 添加 `secure` optional dependency group
- 运行 `uv sync`

### Step 4: 更新 .gitignore

- 添加 `.opencode/env-registry.json`

### Step 5: 创建 opencode skill

- 创建 `.opencode/skills/env-registry/SKILL.md`

### Step 6: 更新 AGENTS.md

- 在 Default routing 添加路由条目

### Step 7: 端到端验证

- 模拟 LLM 场景: list -> 找到匹配条目 -> get 获取值
- 验证 keyring 路径: set -> get
- 验证环境变量 fallback 路径: export -> get
- 验证白名单操作: add -> describe -> list -> remove
- 验证错误路径: get 不存在的变量、add 非法 name、remove 不存在的变量
- 验证 set 不在白名单中的变量（期望被拒绝）

---

## Edge Cases and Error Handling

| 场景 | 预期行为 |
|------|----------|
| env-registry.json 不存在 | load_registry 返回空结构，save_registry 自动创建 |
| env-registry.json 格式损坏 | 报错退出码 1，提示手动修复 |
| get 变量在 keyring 和 env 中都不存在 | 退出码 2，输出错误信息到 stderr |
| get 变量名不在白名单中 | 退出码 2，输出"未注册"错误到 stderr |
| add 重复的 name | 退出码 1，输出重复提示 |
| add 非法 name (如 123BAD 或 my-var) | 退出码 1，输出校验错误 |
| remove 不存在的 name | 退出码 2，输出未找到提示 |
| describe 不存在的 name | 退出码 2，输出未找到提示 |
| set 但 name 不在白名单中 | 退出码 2，提示需先 add |
| set 但无 keyring 可用 | 退出码 3，输出 export 提示 |
| keyring 抛出异常 (如 backend 不可用) | 捕获 KeyringError，get fallback 到 env；set 返回失败消息 |
| set 时值为空 | 退出码 1，输出错误 |
| remove 删除条目后 keyring 中的值 | 尝试 delete_password 清理，失败则 pass（不阻断） |

---

## Security Considerations

1. **白名单不存值**: env-registry.json 只存 name + description，即使被误提交也不泄漏实际数据
2. **白名单作为 ACL**: get/set 必须校验白名单，防止通过 LLM 注入获取任意环境变量
3. **keyring 命名空间**: 使用 "opencode-env-registry" 作为 keyring service name，与其他应用隔离
4. **gitignore 保护**: env-registry.json 在 .gitignore 中，防止误提交
5. **LLM 约束**: SKILL.md 明确禁止将值写入 vault 文件或 git
6. **set 不暴露值在命令行**: 使用 getpass 或 stdin，不作为 argparse 参数
7. **不记录值到日志**: CLI get 命令直接输出值到 stdout，不经过任何中间日志
8. **会话日志风险**: get 输出可能被 opencode 会话日志记录，SKILL.md 中已明确警告

---

## Out of Scope

- 加密白名单 JSON 文件本身（name + description 非敏感）
- 多用户/多项目隔离（当前为项目级白名单）
- 变量值的版本管理或审计日志
- 自动从 vault 资料中提取个人信息并注册
- Web UI 或 GUI 管理
- 变量值的过期/轮换策略
- 阻止 opencode 会话日志记录 get 输出（这是 opencode 层面的行为）
