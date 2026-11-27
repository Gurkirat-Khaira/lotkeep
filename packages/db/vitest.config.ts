import { defineConfig } from "vitest/config";
import { dbTestConfig } from "./test/helpers/vitest";

export default defineConfig({ test: { ...dbTestConfig("db") } });
