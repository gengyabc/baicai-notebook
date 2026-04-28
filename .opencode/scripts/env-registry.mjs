import { readFile, writeFile, rename, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { setPassword, deletePassword } from "cross-keychain";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REGISTRY_PATH = join(__dirname, "..", "env-registry.json");
const KEYRING_SERVICE = "opencode-env-registry";
const ENV_VAR_PATTERN = /^[A-Z][A-Z0-9_]*$/;

async function loadRegistry() {
  try {
    const text = await readFile(REGISTRY_PATH, "utf-8");
    const data = JSON.parse(text);
    if (data.version !== 1) {
      process.stderr.write(
        `Error: Unsupported registry version ${data.version}. Expected version 1.\n`
      );
      process.exit(1);
    }
    if (!Array.isArray(data.env_vars)) {
      process.stderr.write(
        "Error: Invalid registry schema. Missing 'env_vars' list.\n"
      );
      process.exit(1);
    }
    return data;
  } catch (err) {
    if (err.code === "ENOENT") {
      return { version: 1, env_vars: [] };
    }
    if (err instanceof SyntaxError) {
      process.stderr.write(
        "Error: env-registry.json is corrupt. Please manually fix or delete the file.\n"
      );
      process.exit(1);
    }
    throw err;
  }
}

async function saveRegistry(data) {
  await mkdir(dirname(REGISTRY_PATH), { recursive: true });
  const tmpPath = join(tmpdir(), `env-registry-${Date.now()}.json`);
  await writeFile(tmpPath, JSON.stringify(data, null, 2) + "\n", "utf-8");
  await rename(tmpPath, REGISTRY_PATH);
}

function validateName(name) {
  return ENV_VAR_PATTERN.test(name);
}

function findEntry(registry, name) {
  return registry.env_vars.findIndex((e) => e.name === name);
}

async function setValue(name, value) {
  try {
    await setPassword(KEYRING_SERVICE, name, value);
    return { ok: true, message: "Value stored in keychain" };
  } catch (e) {
    return {
      ok: false,
      message: `Keychain error: ${e.message || e}`,
    };
  }
}

async function readValueInteractive(name) {
  if (process.stdin.isTTY) {
    process.stderr.write(`Enter value for ${name}: `);
    return new Promise((resolve) => {
      process.stdin.setRawMode(true);
      let data = "";
      process.stdin.on("data", (chunk) => {
        for (const ch of chunk.toString()) {
          if (ch === "\n" || ch === "\r" || ch === "\u0004") {
            process.stdin.setRawMode(false);
            process.stdin.pause();
            process.stderr.write("\n");
            resolve(data);
            return;
          }
          if (ch === "\u007f" || ch === "\b") {
            if (data.length > 0) data = data.slice(0, -1);
          } else if (ch === "\u0003") {
            process.stdin.setRawMode(false);
            process.stdin.pause();
            process.stderr.write("\n");
            process.exit(1);
          } else {
            data += ch;
          }
        }
      });
      process.stdin.resume();
    });
  }
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf-8");
    process.stdin.on("data", (chunk) => {
      data += chunk;
    });
    process.stdin.on("end", () => {
      resolve(data.trim());
    });
    process.stdin.resume();
  });
}

async function cmdList(args) {
  const registry = await loadRegistry();
  const entries = registry.env_vars;
  if (args.format === "table") {
    if (entries.length === 0) {
      process.stdout.write("No registered environment variables.\n");
      return;
    }
    process.stdout.write("Name".padEnd(20) + " Description\n");
    process.stdout.write("-".repeat(20) + " " + "-".repeat(40) + "\n");
    for (const entry of entries) {
      process.stdout.write(entry.name.padEnd(20) + " " + entry.description + "\n");
    }
    return;
  }
  process.stdout.write(JSON.stringify(entries) + "\n");
}

async function cmdAdd(args) {
  if (!validateName(args.name)) {
    process.stderr.write(
      `Error: Invalid environment variable name '${args.name}'. Must start with uppercase letter and contain only uppercase letters, numbers, and underscores.\n`
    );
    process.exit(1);
  }
  const registry = await loadRegistry();
  if (findEntry(registry, args.name) !== -1) {
    process.stderr.write(`Error: '${args.name}' is already registered.\n`);
    process.exit(1);
  }
  registry.env_vars.push({ name: args.name, description: args.description });
  await saveRegistry(registry);
  process.stdout.write(`Added '${args.name}' to registry.\n`);
}

async function cmdRemove(args) {
  const registry = await loadRegistry();
  const idx = findEntry(registry, args.name);
  if (idx === -1) {
    process.stderr.write(`Error: '${args.name}' not found in registry.\n`);
    process.exit(2);
  }
  registry.env_vars.splice(idx, 1);
  await saveRegistry(registry);
  let keychainWarning = false;
  try {
    await deletePassword(KEYRING_SERVICE, args.name);
  } catch (e) {
    keychainWarning = true;
    process.stderr.write(
      `Warning: keychain deletion failed for '${args.name}': ${e.message || e}\n`
    );
  }
  process.stdout.write(`Removed '${args.name}' from registry.\n`);
  if (keychainWarning) {
    process.stderr.write(
      `Warning: Secret for '${args.name}' may still exist in keychain.\n`
    );
  }
}

async function cmdGet(args) {
  process.stderr.write(
    "Error: The 'get' command is deprecated. Raw secret retrieval is no longer available.\n" +
    "Use the secure plugin workflow (runSecureAction) for secret-backed operations.\n"
  );
  process.exit(1);
}

async function cmdSet(args) {
  const registry = await loadRegistry();
  if (findEntry(registry, args.name) === -1) {
    process.stderr.write(
      `Error: '${args.name}' is not registered in whitelist. Add it first.\n`
    );
    process.exit(2);
  }
  const value = await readValueInteractive(args.name);
  if (!value) {
    process.stderr.write("Error: Empty value is not allowed.\n");
    process.exit(1);
  }
  const result = await setValue(args.name, value);
  if (!result.ok) {
    process.stderr.write(result.message + "\n");
    process.exit(3);
  }
  process.stdout.write(`Value for '${args.name}' stored successfully.\n`);
}

async function cmdDescribe(args) {
  const registry = await loadRegistry();
  const idx = findEntry(registry, args.name);
  if (idx === -1) {
    process.stderr.write(`Error: '${args.name}' not found in registry.\n`);
    process.exit(2);
  }
  registry.env_vars[idx].description = args.description;
  await saveRegistry(registry);
  process.stdout.write(`Updated description for '${args.name}'.\n`);
}

function parseArgs(argv) {
  const args = argv.slice(2);
  if (args.length === 0) {
    process.stderr.write(
      "Error: No command specified. Use one of: list, add, remove, get, set, describe.\n"
    );
    process.exit(1);
  }
  const command = args[0];
  switch (command) {
    case "list": {
      const formatIdx = args.indexOf("--format");
      let format = "json";
      if (formatIdx !== -1 && args[formatIdx + 1]) {
        format = args[formatIdx + 1];
      }
      return { command, format };
    }
    case "add":
      if (!args[1]) {
        process.stderr.write("Error: Missing argument 'name'.\n");
        process.exit(1);
      }
      if (!args[2]) {
        process.stderr.write("Error: Missing argument 'description'.\n");
        process.exit(1);
      }
      return { command, name: args[1], description: args.slice(2).join(" ") };
    case "remove":
      if (!args[1]) {
        process.stderr.write("Error: Missing argument 'name'.\n");
        process.exit(1);
      }
      return { command, name: args[1] };
    case "get":
      if (!args[1]) {
        process.stderr.write("Error: Missing argument 'name'.\n");
        process.exit(1);
      }
      return { command, name: args[1] };
    case "set":
      if (!args[1]) {
        process.stderr.write("Error: Missing argument 'name'.\n");
        process.exit(1);
      }
      if (args[2]) {
        process.stderr.write(
          "Error: 'set' does not accept a value argument. Value must be provided via stdin or interactive prompt.\n"
        );
        process.exit(1);
      }
      return { command, name: args[1] };
    case "describe":
      if (!args[1]) {
        process.stderr.write("Error: Missing argument 'name'.\n");
        process.exit(1);
      }
      if (!args[2]) {
        process.stderr.write("Error: Missing argument 'description'.\n");
        process.exit(1);
      }
      return {
        command,
        name: args[1],
        description: args.slice(2).join(" "),
      };
    default:
      process.stderr.write(
        `Error: Unknown command '${command}'. Use one of: list, add, remove, get, set, describe.\n`
      );
      process.exit(1);
  }
}

async function main() {
  const args = parseArgs(process.argv);
  switch (args.command) {
    case "list":
      await cmdList(args);
      break;
    case "add":
      await cmdAdd(args);
      break;
    case "remove":
      await cmdRemove(args);
      break;
    case "get":
      await cmdGet(args);
      break;
    case "set":
      await cmdSet(args);
      break;
    case "describe":
      await cmdDescribe(args);
      break;
  }
}

main().catch((err) => {
  process.stderr.write(`Error: ${err.message}\n`);
  process.exit(1);
});
