// Vitest globalSetup: drop stale test databases, then build and migrate dms_test_template once.
import { resolve } from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import { ident, TEMPLATE_DB, urlFor } from "./urls";

const MIGRATIONS = resolve(import.meta.dirname, "../../migrations");

export default async function setup(): Promise<void> {
  // This drops databases: only ever against a local or CI server.
  const host = new URL(urlFor("owner", "dms")).hostname;
  if (!["127.0.0.1", "localhost", "::1"].includes(host) && !process.env.CI) {
    throw new Error(`refusing to manage test databases on non-local host ${host}`);
  }
  const admin = new pg.Client({ connectionString: urlFor("owner", "dms") });
  await admin.connect();
  try {
    const stale = await admin.query<{ datname: string }>(
      `select datname from pg_database d join pg_roles r on r.oid = d.datdba
       where r.rolname = current_user and datname like 'dms\\_test\\_%'`,
    );
    for (const { datname } of stale.rows) {
      await admin.query(`drop database if exists ${ident(datname)} with (force)`);
    }
    await admin.query(`create database ${ident(TEMPLATE_DB)}`);
    await admin.query(`revoke all on database ${ident(TEMPLATE_DB)} from public`);
  } finally {
    await admin.end();
  }

  const tpl = new pg.Client({ connectionString: urlFor("owner", TEMPLATE_DB) });
  await tpl.connect();
  try {
    await tpl.query("revoke all on schema public from public");
    await migrate(drizzle(tpl), {
      migrationsFolder: MIGRATIONS,
      migrationsTable: "__drizzle_migrations",
      migrationsSchema: "drizzle",
    });
  } finally {
    await tpl.end(); // the template must have no connections when workers clone it
  }
}
