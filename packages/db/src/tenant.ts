// The app-role connection and withDealer(). Every dealer query runs inside withDealer.
// Request handlers and jobs never use the owner role.
import { loadConfig } from "@dms/config";
import { invalid, isUuid } from "@dms/core";
import { sql } from "drizzle-orm";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import { toDbError } from "./errors";
import * as schema from "./schema";

export type AppDb = NodePgDatabase<typeof schema>;
export type AppTx = Parameters<Parameters<AppDb["transaction"]>[0]>[0];

let current: { db: AppDb; pool: pg.Pool } | undefined;

/** Connects the app pool (role dms_app). Called once at startup; tests point it at their database. */
export function initAppDb(connectionString: string, poolOptions: pg.PoolConfig = {}): AppDb {
  const pool = new pg.Pool({ connectionString, ...poolOptions });
  // An idle connection dropped by the server must not crash the process. No values in the message.
  pool.on("error", (e) => console.error(`app pool: ${String((toDbError(e) as Error).message)}`));
  current = { db: drizzle(pool, { schema }), pool };
  return current.db;
}

/** The app database, connecting from DATABASE_URL_APP on first use. */
export function getAppDb(): AppDb {
  return (current ?? { db: initAppDb(loadConfig().DATABASE_URL_APP) }).db;
}

export async function closeAppDb(): Promise<void> {
  const pool = current?.pool;
  current = undefined;
  await pool?.end();
}

/**
 * Runs `fn` in an app-role transaction scoped to one dealer. `set_config(..., true)` is
 * transaction-local, so the setting ends with the transaction and a pooled connection reused
 * afterwards reads it back as '' (which matches no rows). Rejects non-UUID ids before any SQL.
 * Database errors are rethrown as DbError (no SQL parameters or values).
 */
export async function withDealer<T>(dealerId: string, fn: (tx: AppTx) => Promise<T>): Promise<T> {
  if (!isUuid(dealerId)) throw invalid({ dealerId: "must be a uuid" });
  try {
    return await getAppDb().transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.dealer_id', ${dealerId}, true)`);
      return fn(tx);
    });
  } catch (e) {
    throw toDbError(e); // never let query parameters or values reach a log
  }
}
