import argparse
import getpass
import json
import os
import re
import sys
from pathlib import Path

REGISTRY_PATH = Path(__file__).parent.parent / "env-registry.json"
KEYRING_SERVICE = "opencode-env-registry"
ENV_VAR_PATTERN = re.compile(r"^[A-Z][A-Z0-9_]*$")

try:
    import keyring
    from keyring.errors import KeyringError
    HAS_KEYRING = True
except ImportError:
    HAS_KEYRING = False
    KeyringError = Exception


def load_registry() -> dict:
    if not REGISTRY_PATH.exists():
        return {"version": 1, "env_vars": []}
    try:
        data = json.loads(REGISTRY_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        print("Error: env-registry.json is corrupt. Please manually fix or delete the file.", file=sys.stderr)
        sys.exit(1)
    if data.get("version") != 1:
        print(f"Error: Unsupported registry version {data.get('version')}. Expected version 1.", file=sys.stderr)
        sys.exit(1)
    if "env_vars" not in data or not isinstance(data["env_vars"], list):
        print("Error: Invalid registry schema. Missing 'env_vars' list.", file=sys.stderr)
        sys.exit(1)
    return data


def save_registry(data: dict) -> None:
    REGISTRY_PATH.parent.mkdir(parents=True, exist_ok=True)
    REGISTRY_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def validate_name(name: str) -> bool:
    return ENV_VAR_PATTERN.match(name) is not None


def find_entry(registry: dict, name: str) -> int | None:
    for i, entry in enumerate(registry["env_vars"]):
        if entry["name"] == name:
            return i
    return None


def get_value(name: str) -> str | None:
    if HAS_KEYRING:
        try:
            value = keyring.get_password(KEYRING_SERVICE, name)
            if value is not None:
                return value
        except KeyringError:
            pass
    return os.environ.get(name)


def set_value(name: str, value: str) -> tuple[bool, str]:
    if HAS_KEYRING:
        try:
            keyring.set_password(KEYRING_SERVICE, name, value)
            return True, "Value stored in keyring"
        except KeyringError as e:
            return False, f"Keyring error: {e}"
    return False, f"Keyring not available. Set the value manually: export {name}='<value>'"


def delete_value(name: str) -> None:
    if HAS_KEYRING:
        try:
            keyring.delete_password(KEYRING_SERVICE, name)
        except KeyringError:
            pass


def read_value_interactive(name: str) -> str:
    if sys.stdin.isatty():
        return getpass.getpass(f"Enter value for {name}: ")
    return sys.stdin.read().strip()


def cmd_list(args) -> None:
    registry = load_registry()
    entries = registry["env_vars"]
    if args.format == "json":
        print(json.dumps(entries))
    elif args.format == "table":
        if not entries:
            print("No registered environment variables.")
            return
        print("Name".ljust(20), "Description")
        print("-" * 20, "-" * 40)
        for entry in entries:
            print(entry["name"].ljust(20), entry["description"])


def cmd_add(args) -> None:
    if not validate_name(args.name):
        print(f"Error: Invalid environment variable name '{args.name}'. Must start with uppercase letter and contain only uppercase letters, numbers, and underscores.", file=sys.stderr)
        sys.exit(1)
    registry = load_registry()
    if find_entry(registry, args.name) is not None:
        print(f"Error: '{args.name}' is already registered.", file=sys.stderr)
        sys.exit(1)
    registry["env_vars"].append({"name": args.name, "description": args.description})
    save_registry(registry)
    print(f"Added '{args.name}' to registry.")


def cmd_remove(args) -> None:
    registry = load_registry()
    idx = find_entry(registry, args.name)
    if idx is None:
        print(f"Error: '{args.name}' not found in registry.", file=sys.stderr)
        sys.exit(2)
    registry["env_vars"].pop(idx)
    save_registry(registry)
    delete_value(args.name)
    print(f"Removed '{args.name}' from registry.")
    if not HAS_KEYRING:
        print(f"Note: You may need to manually unset the environment variable: unset {args.name}")


def cmd_get(args) -> None:
    registry = load_registry()
    if find_entry(registry, args.name) is None:
        print(f"Error: '{args.name}' is not registered in whitelist.", file=sys.stderr)
        sys.exit(2)
    value = get_value(args.name)
    if value is None:
        print(f"Error: Value for '{args.name}' not found in keyring or environment. Please set it first.", file=sys.stderr)
        sys.exit(2)
    print(value)


def cmd_set(args) -> None:
    registry = load_registry()
    if find_entry(registry, args.name) is None:
        print(f"Error: '{args.name}' is not registered in whitelist. Add it first.", file=sys.stderr)
        sys.exit(2)
    value = read_value_interactive(args.name)
    if not value:
        print("Error: Empty value is not allowed.", file=sys.stderr)
        sys.exit(1)
    success, message = set_value(args.name, value)
    if not success:
        print(message, file=sys.stderr)
        sys.exit(3)
    print(f"Value for '{args.name}' stored successfully.")


def cmd_describe(args) -> None:
    registry = load_registry()
    idx = find_entry(registry, args.name)
    if idx is None:
        print(f"Error: '{args.name}' not found in registry.", file=sys.stderr)
        sys.exit(2)
    registry["env_vars"][idx]["description"] = args.description
    save_registry(registry)
    print(f"Updated description for '{args.name}'.")


class CustomArgumentParser(argparse.ArgumentParser):
    def error(self, message):
        print(f"Error: {message}", file=sys.stderr)
        sys.exit(1)
    def exit(self, status=0, message=None):
        if message:
            print(message, file=sys.stderr)
        sys.exit(1 if status != 0 else 0)


def main() -> None:
    parser = CustomArgumentParser(description="Environment variable registry CLI")
    subparsers = parser.add_subparsers(dest="command", required=True)

    list_parser = subparsers.add_parser("list", help="List registered variables")
    list_parser.add_argument("--format", choices=["json", "table"], default="json", help="Output format")
    list_parser.set_defaults(func=cmd_list)

    add_parser = subparsers.add_parser("add", help="Add a new variable to registry")
    add_parser.add_argument("name", help="Variable name")
    add_parser.add_argument("description", help="Variable description")
    add_parser.set_defaults(func=cmd_add)

    remove_parser = subparsers.add_parser("remove", help="Remove a variable from registry")
    remove_parser.add_argument("name", help="Variable name")
    remove_parser.set_defaults(func=cmd_remove)

    get_parser = subparsers.add_parser("get", help="Get variable value")
    get_parser.add_argument("name", help="Variable name")
    get_parser.set_defaults(func=cmd_get)

    set_parser = subparsers.add_parser("set", help="Set variable value")
    set_parser.add_argument("name", help="Variable name")
    set_parser.set_defaults(func=cmd_set)

    describe_parser = subparsers.add_parser("describe", help="Update variable description")
    describe_parser.add_argument("name", help="Variable name")
    describe_parser.add_argument("description", help="New description")
    describe_parser.set_defaults(func=cmd_describe)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()