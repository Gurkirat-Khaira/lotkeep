// Shared Vitest settings for any package whose tests need Postgres:
//   export default defineConfig({ test: { ...dbTestConfig("crypto") } });
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export function dbTestConfig(prefix: string) {
  process.env.DMS_TEST_DB_PREFIX = prefix; // read by globalSetup (this process) and the workers
  const here = dirname(fileURLToPath(import.meta.url));
  return {
    globalSetup: [join(here, "global-setup.ts")],
    setupFiles: [join(here, "setup-worker.ts")],
    hookTimeout: 60_000,
    env: { DMS_TEST_DB_PREFIX: prefix },
  };
}
