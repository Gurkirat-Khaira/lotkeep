// Test database names and connection URLs (derived from the local DATABASE_URL_* settings).
import { loadTestEnv } from "./env";

loadTestEnv();

export const TEMPLATE_DB = "dms_test_template";
export const workerDbName = (): string => `dms_test_${process.env.VITEST_POOL_ID ?? "1"}`;

function required(name: "DATABASE_URL_APP" | "DATABASE_URL_OWNER"): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set. Run scripts/setup.sh and pnpm dev:up.`);
  return v;
}

/** The same server and credentials, pointed at another database. */
export function urlFor(kind: "app" | "owner", database: string): string {
  const u = new URL(required(kind === "app" ? "DATABASE_URL_APP" : "DATABASE_URL_OWNER"));
  u.pathname = `/${database}`;
  return u.toString();
}

/** Database names are generated here, never user input; still, only allow plain identifiers. */
export function ident(name: string): string {
  if (!/^[a-z_][a-z0-9_]*$/.test(name)) throw new Error(`bad database name ${name}`);
  return `"${name}"`;
}
