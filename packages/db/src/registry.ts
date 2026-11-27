// Registry of tenant tables for the leak suites. Every table with dealer_id must be registered
// (the catalog test fails otherwise); tables with location_id use registerLocationTable.
import { getTableConfig, type PgTable } from "drizzle-orm/pg-core";

/** Extra inputs for samples whose rows reference other rows (a user, or a row seeded earlier). */
export type SampleContext = {
  /** A user created for this dealer (users is global). */
  userId: string;
  /** The sample row already seeded for this dealer in an earlier-registered table. */
  ref: (table: PgTable) => Record<string, unknown>;
};

/** Builds one synthetic row for `dealerId`. Must use synthetic data only. */
export type Sample = (
  dealerId: string,
  locationId: string,
  ctx: SampleContext,
) => Record<string, unknown>;

export type TenantTableEntry = { name: string; table: PgTable; sample: Sample; location: boolean };

/** Tables without dealer_id, on purpose. Each needs a reason. */
export const GLOBAL_TABLES = [
  "users", // one login can belong to several dealers; UPDATE/DELETE revoked from dms_app (0002)
] as const;

/** What dms_app may do on each global table (checked by checkCatalog). */
export const GLOBAL_TABLE_PRIVILEGES: Record<(typeof GLOBAL_TABLES)[number], readonly string[]> = {
  users: ["SELECT", "INSERT"],
};

/** The tenant root: RLS on its own `id`, checked separately by the leak suite. */
export const ROOT_TABLE = "dealers";

const entries: TenantTableEntry[] = [];

function columns(table: PgTable): Set<string> {
  return new Set(getTableConfig(table).columns.map((c) => c.name));
}

function register(table: PgTable, sample: Sample, location: boolean): void {
  const { name, schema } = getTableConfig(table);
  if (schema !== "app") throw new Error(`${name}: tenant tables live in schema app`);
  if (entries.some((e) => e.name === name)) throw new Error(`${name} is already registered`);
  const cols = columns(table);
  if (!cols.has("dealer_id")) throw new Error(`${name}: tenant tables need dealer_id`);
  if (location && !cols.has("location_id"))
    throw new Error(`${name}: location tables need location_id`);
  if (!location && cols.has("location_id")) {
    throw new Error(`${name} has location_id: use registerLocationTable`);
  }
  entries.push({ name, table, sample, location });
}

export function registerTenantTable(table: PgTable, sample: Sample): void {
  register(table, sample, false);
}

/** A location-scoped table (also a tenant table). Task 9's API location suite iterates these. */
export function registerLocationTable(table: PgTable, sample: Sample): void {
  register(table, sample, true);
}

/** Registered tenant tables in registration order (parents before children). */
export function listTenantTables(): readonly TenantTableEntry[] {
  // An empty list would make every suite pass while checking nothing.
  if (entries.length === 0) {
    throw new Error("tenant table registry is empty: import from @dms/db, not its registry module");
  }
  return entries;
}

export const listLocationTables = (): PgTable[] =>
  listTenantTables()
    .filter((e) => e.location)
    .map((e) => e.table);
