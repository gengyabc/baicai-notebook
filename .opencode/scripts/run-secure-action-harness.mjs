import { runSecureAction, sanitizeValue, sanitizePayload } from "../plugins/secure-plugin-access.ts"
import { setPassword, deletePassword } from "cross-keychain"

const KEYRING_SERVICE = "opencode-env-registry"

async function seedSecret(name, value) {
  await setPassword(KEYRING_SERVICE, name, value)
}

async function removeSecret(name) {
  try {
    await deletePassword(KEYRING_SERVICE, name)
  } catch {}
}

const command = process.argv[2]

if (command === "run-secure-action") {
  const input = JSON.parse(process.argv[3])
  const result = await runSecureAction(input)
  process.stdout.write(JSON.stringify(result) + "\n")
} else if (command === "seed-secret") {
  const name = process.argv[3]
  const value = process.argv[4]
  await seedSecret(name, value)
  process.stdout.write(JSON.stringify({ ok: true }) + "\n")
} else if (command === "remove-secret") {
  const name = process.argv[3]
  await removeSecret(name)
  process.stdout.write(JSON.stringify({ ok: true }) + "\n")
} else if (command === "test-sanitize") {
  const payload = JSON.parse(process.argv[3])
  const secret = process.argv[4]
  const result = sanitizePayload(payload, secret)
  process.stdout.write(JSON.stringify(result) + "\n")
} else {
  process.stderr.write("Unknown command: " + command + "\n")
  process.exit(1)
}
