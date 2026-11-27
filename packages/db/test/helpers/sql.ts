// Test-only SQL helper: a tagged template over a pg Pool. App code uses Drizzle (Task 4).
//   const rows = await appSql`select ${x}::int as n`;  →  pool.query("select $1::int as n", [x]).rows
import pg from "pg";
import { loadTestEnv } from "./env";

loadTestEnv();

type Row = Record<string, unknown>;
type Sql = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<Row[]>;

const pools: pg.Pool[] = [];

function requireUrl(name: "DATABASE_URL_APP" | "DATABASE_URL_OWNER"): string {
  const url = process.env[name];
  if (!url) throw new Error(`${name} is not set. Run scripts/setup.sh and pnpm dev:up.`);
  return url;
}

export function sqlFor(connectionString: string): Sql {
  const pool = new pg.Pool({ connectionString, max: 4 });
  pools.push(pool);
  return async (strings, ...values) => {
    const text = strings.reduce((acc, s, i) => (i === 0 ? s : `${acc}$${i}${s}`), "");
    return (await pool.query(text, values)).rows;
  };
}

export const appSql: Sql = sqlFor(requireUrl("DATABASE_URL_APP"));
export const ownerSql: Sql = sqlFor(requireUrl("DATABASE_URL_OWNER"));

export async function closePools(): Promise<void> {
  await Promise.all(pools.splice(0).map((p) => p.end()));
}
