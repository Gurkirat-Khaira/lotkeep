import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globalSetup: ["./test/helpers/global-setup.ts"],
    setupFiles: ["./test/helpers/setup-worker.ts"],
    hookTimeout: 60_000,
  },
});
