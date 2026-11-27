// Loads the repo-root env file into process.env for tests, without printing anything.
// Values already set in the environment (e.g. by CI) win.
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");

export function loadTestEnv(): void {
  const file = join(ROOT, ".env");
  if (existsSync(file)) process.loadEnvFile(file);
}
