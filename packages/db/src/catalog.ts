// Catalog checks used by the leak suite (and later by a startup self-check). They read Postgres'
// own catalog, so a table, policy or grant added by hand or by a migration cannot hide.
// Run as the app role: the role checks describe whoever is connected.
import { sql } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/pg-core";
import { GLOBAL_TABLES, listLocationTables, listTenantTables, ROOT_TABLE } from "./registry";

type Exec = { execute: (q: ReturnType<typeof sql>) => Promise<{ rows: unknown[] }> };

/** SECURITY DEFINER functions in schema app that are allowed (each one needs a review). */
export const SECURITY_DEFINER_ALLOWLIST: readonly string[] = [];

export type CatalogReport = {
  /** Tenant tables (dealer_id, plus the root) whose RLS is not both enabled and forced. */
  unprotected: string[];
  /** Tenant tables without exactly one canonical policy (permissive, ALL, PUBLIC, exact predicate). */
  badPolicies: string[];
  /** Tenant tables whose dealer_id allows NULL. */
  nullableDealerId: string[];
  /** Tables in schema app that are neither registered, the root, nor in GLOBAL_TABLES. */
  unregistered: string[];
  /** Tables with location_id that were not registered with registerLocationTable. */
  locationNotRegistered: string[];
  /** Views, materialized views and foreign tables in schema app (they bypass table RLS). */
  forbiddenRelations: string[];
  /** Privileges or ownership the connected (app) role should not have. */
  roleProblems: string[];
};

/** The predicate as Postgres stores it (pg_policies.qual / with_check). */
const canonical = (column: string) =>
  `(${column} = (NULLIF(current_setting('app.dealer_id'::text, true), ''::text))::uuid)`;

type Rel = {
  name: string;
  kind: string;
  rls: boolean;
  force: boolean;
  partition: boolean;
  dealer_notnull: boolean | null; // null: no dealer_id column
  has_location: boolean;
};
type Policy = {
  table: string;
  name: string;
  permissive: string;
  roles: string;
  cmd: string;
  qual: string | null;
  with_check: string | null;
};

export async function checkCatalog(db: Exec): Promise<CatalogReport> {
  const rels = (
    await db.execute(sql`
      select c.relname as name, c.relkind::text as kind, c.relrowsecurity as rls,
        c.relforcerowsecurity as force, c.relispartition as partition,
        (select a.attnotnull from pg_attribute a where a.attrelid = c.oid
          and a.attname = 'dealer_id' and not a.attisdropped) as dealer_notnull,
        exists (select 1 from pg_attribute a where a.attrelid = c.oid
          and a.attname = 'location_id' and not a.attisdropped) as has_location
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'app' and c.relkind in ('r', 'p', 'v', 'm', 'f')
      order by 1`)
  ).rows as Rel[];
  const policies = (
    await db.execute(sql`
      select tablename as "table", policyname as name, permissive, roles::text as roles, cmd,
        qual, with_check
      from pg_policies where schemaname = 'app'`)
  ).rows as Policy[];

  const tablesOnly = rels.filter((r) => r.kind === "r" || r.kind === "p");
  const tenant = tablesOnly.filter((r) => r.dealer_notnull !== null || r.name === ROOT_TABLE);
  const registered = new Set(listTenantTables().map((e) => e.name));
  const locationRegistered = new Set(listLocationTables().map((t) => getTableConfig(t).name));
  const global = new Set<string>(GLOBAL_TABLES);
  const KIND: Record<string, string> = { v: "view", m: "materialized view", f: "foreign table" };

  const badPolicies: string[] = [];
  for (const t of tenant) {
    const own = policies.filter((p) => p.table === t.name);
    if (own.length !== 1) {
      badPolicies.push(`${t.name}: expected 1 policy, found ${own.length}`);
      continue;
    }
    const p = own[0] as Policy;
    const want = canonical(t.name === ROOT_TABLE ? "id" : "dealer_id");
    const ok =
      p.permissive === "PERMISSIVE" &&
      p.cmd === "ALL" &&
      p.roles === "{public}" &&
      p.qual === want &&
      p.with_check === want;
    if (!ok) badPolicies.push(`${t.name}: policy ${p.name} is not the canonical tenant policy`);
  }

  return {
    unprotected: tenant.filter((r) => !(r.rls && r.force)).map((r) => r.name),
    badPolicies,
    nullableDealerId: tablesOnly.filter((r) => r.dealer_notnull === false).map((r) => r.name),
    unregistered: tablesOnly
      .filter((r) => !registered.has(r.name) && r.name !== ROOT_TABLE && !global.has(r.name))
      .map((r) => (r.partition ? `${r.name} (partition)` : r.name)),
    locationNotRegistered: tablesOnly
      .filter((r) => r.has_location && !locationRegistered.has(r.name))
      .map((r) => r.name),
    forbiddenRelations: rels.filter((r) => KIND[r.kind]).map((r) => `${r.name} (${KIND[r.kind]})`),
    roleProblems: await roleProblems(db),
  };
}

async function roleProblems(db: Exec): Promise<string[]> {
  const problems: string[] = [];
  const [role] = (
    await db.execute(sql`
      select rolsuper, rolbypassrls, rolcreatedb, rolcreaterole,
        has_database_privilege(current_database(), 'CREATE') as db_create,
        has_database_privilege(current_database(), 'TEMP') as db_temp
      from pg_roles where rolname = current_user`)
  ).rows as {
    rolsuper: boolean;
    rolbypassrls: boolean;
    rolcreatedb: boolean;
    rolcreaterole: boolean;
    db_create: boolean;
    db_temp: boolean;
  }[];
  if (!role) return ["current role not found"];
  for (const [flag, on] of Object.entries(role)) if (on) problems.push(`has ${flag}`);

  const schemas = (
    await db.execute(sql`
      select nspname as name, has_schema_privilege(oid, 'USAGE') as usage,
        has_schema_privilege(oid, 'CREATE') as can_create
      from pg_namespace
      where nspname not like 'pg\\_%' and nspname <> 'information_schema'`)
  ).rows as { name: string; usage: boolean; can_create: boolean }[];
  for (const s of schemas) {
    if (s.can_create) problems.push(`CREATE on schema ${s.name}`);
    if (s.usage && s.name !== "app") problems.push(`USAGE on schema ${s.name}`);
  }

  const [owned] = (
    await db.execute(sql`
      select
        (select count(*)::int from pg_class where relowner = (select oid from pg_roles where rolname = current_user))
        + (select count(*)::int from pg_namespace where nspowner = (select oid from pg_roles where rolname = current_user))
        + (select count(*)::int from pg_proc where proowner = (select oid from pg_roles where rolname = current_user))
        as n`)
  ).rows as { n: number }[];
  if ((owned?.n ?? 0) > 0) problems.push(`owns ${owned?.n} objects`);

  const definers = (
    await db.execute(sql`
      select p.proname as name from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'app' and p.prosecdef`)
  ).rows as { name: string }[];
  for (const d of definers) {
    if (!SECURITY_DEFINER_ALLOWLIST.includes(d.name))
      problems.push(`SECURITY DEFINER app.${d.name}`);
  }
  return problems;
}
