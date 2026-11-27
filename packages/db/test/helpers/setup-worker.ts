// Vitest setupFiles: give this worker its own database cloned from the migrated template, and
// point withDealer()/getAppDb() at it through a ONE-connection app pool (so tests exercise
// connection reuse after a transaction: Review Focus #1).
import pg from "pg";
import { afterAll } from "vitest";
import { closeAppDb, initAppDb } from "../../src/tenant";
import { ident, TEMPLATE_DB, urlFor, workerDbName } from "./urls";

const name = workerDbName();
const admin = new pg.Client({ connectionString: urlFor("owner", "dms") });
await admin.connect();
try {
  await admin.query(`create database ${ident(name)} template ${ident(TEMPLATE_DB)}`);
  // Database ACLs are not copied from the template.
  await admin.query(`revoke all on database ${ident(name)} from public`);
  await admin.query(`grant connect on database ${ident(name)} to dms_app`);
} catch (e) {
  if ((e as { code?: string }).code !== "42P04") throw e; // already exists for this worker
} finally {
  await admin.end();
}

initAppDb(urlFor("app", name), { max: 1 });
afterAll(async () => {
  await closeAppDb();
  const { closeOwnerDb } = await import("./db");
  await closeOwnerDb();
});
