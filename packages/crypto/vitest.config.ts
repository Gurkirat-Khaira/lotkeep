import { dbTestConfig } from "@dms/db/testing/vitest";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    ...dbTestConfig("crypto"),
    coverage: {
      provider: "v8",
      include: ["src/**"],
      reporter: ["text-summary"],
      thresholds: { lines: 95, functions: 95, branches: 95, statements: 95 },
    },
  },
});
