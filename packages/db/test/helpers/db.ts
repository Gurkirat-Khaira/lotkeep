// Test handles for the worker database: appDb (dms_app, RLS applies) and ownerDb (dms_owner).
// FORCE RLS applies to the owner too, so owner writes also set app.dealer_id (asOwner).
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../../src/schema";
import { type AppTx, getAppDb, withDealer } from "../../src/tenant";
import { urlFor, workerDbName } from "./urls";

export const appDb = getAppDb();

const ownerPool = new pg.Pool({ connectionString: urlFor("owner", workerDbName()), max: 2 });
export const ownerDb = drizzle(ownerPool, { schema });
export const closeOwnerDb = () => ownerPool.end();

/** An owner-role transaction scoped to one dealer (used to seed data). */
export function asOwner<T>(dealerId: string, fn: (tx: AppTx) => Promise<T>): Promise<T> {
  return ownerDb.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.dealer_id', ${dealerId}, true)`);
    return fn(tx as unknown as AppTx);
  });
}

/** An app-role transaction scoped to one dealer (same as withDealer). */
export const asApp = withDealer;

/** A second, independent app-role pool on the worker database (for concurrency tests). */
export function openAppDb() {
  const pool = new pg.Pool({ connectionString: urlFor("app", workerDbName()), max: 2 });
  return { db: drizzle(pool, { schema }), close: () => pool.end() };
}

/** Like withDealer, but on a given app-role database handle. */
export function inDealer<T>(
  db: ReturnType<typeof openAppDb>["db"],
  dealerId: string,
  fn: (tx: AppTx) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.dealer_id', ${dealerId}, true)`);
    return fn(tx as unknown as AppTx);
  });
}
