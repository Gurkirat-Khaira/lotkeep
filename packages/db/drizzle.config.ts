// drizzle-kit: generate/check work offline; migrate/studio connect as dms_owner (never dms_app).
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "drizzle-kit";

// drizzle-kit loads this file as CommonJS, where import.meta is empty.
const here = typeof __dirname === "string" ? __dirname : process.cwd();
const envFile = resolve(here, "../../.env");
if (!process.env.DATABASE_URL_OWNER && existsSync(envFile)) process.loadEnvFile(envFile);

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema/index.ts",
  out: "./migrations",
  schemaFilter: ["app"],
  dbCredentials: { url: process.env.DATABASE_URL_OWNER ?? "" },
  migrations: { table: "__drizzle_migrations", schema: "drizzle" },
  strict: true,
  verbose: false,
});
