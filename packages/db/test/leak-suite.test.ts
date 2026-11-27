// Automatic dealer leak suite: every registered tenant table is checked for cross-dealer reads,
// writes and moves, and the catalog checks make an unregistered or unprotected table fail CI.
import { newId } from "@dms/core";
import { sql } from "drizzle-orm";
import { getTableConfig, type PgTable } from "drizzle-orm/pg-core";
import { beforeAll, describe, expect, it } from "vitest";
import {
  checkCatalog,
  DbError,
  GLOBAL_TABLES,
  listTenantTables,
  ROOT_TABLE,
  type SampleContext,
  users,
  withDealer,
} from "../src";
import { appDb, asOwner, ownerDb } from "./helpers/db";
import { seedDealer, seedLocation } from "./helpers/seed";

const tables = listTenantTables();
const nameOf = (t: PgTable) => getTableConfig(t).name;
const qualified = (t: PgTable) => sql.raw(`"app"."${nameOf(t)}"`);

let A: string;
let B: string;
const seeded = new Map<string, { A: Record<string, unknown>; B: Record<string, unknown> }>();
const contexts = new Map<string, { locationId: string; ctx: SampleContext }>();

async function contextFor(dealerId: string): Promise<{ locationId: string; ctx: SampleContext }> {
  const locationId = await seedLocation(dealerId);
  const userId = newId();
  await ownerDb.insert(users).values({ id: userId, email: `leak-${userId}@example.test` });
  const ctx: SampleContext = {
    userId,
    ref: (t) => {
      const rows = seeded.get(nameOf(t));
      if (!rows) throw new Error(`${nameOf(t)} must be registered before the table that uses it`);
      return dealerId === A ? rows.A : rows.B;
    },
  };
  return { locationId, ctx };
}

/** Whether the app role holds a table privilege (append-only tables lack UPDATE/DELETE). */
async function granted(t: PgTable, privilege: "INSERT" | "UPDATE" | "DELETE"): Promise<boolean> {
  const r = await appDb.execute(
    sql`select has_table_privilege(${`app.${nameOf(t)}`}, ${privilege}) as ok`,
  );
  return (r.rows[0] as { ok: boolean }).ok;
}

async function rejection(p: Promise<unknown>): Promise<unknown> {
  try {
    await p;
  } catch (e) {
    return e;
  }
  return new Error("expected a rejection, but the statement succeeded");
}

beforeAll(async () => {
  A = await seedDealer();
  B = await seedDealer();
  contexts.set(A, await contextFor(A));
  contexts.set(B, await contextFor(B));
  for (const { table, sample } of tables) {
    const a = contexts.get(A);
    const b = contexts.get(B);
    if (!a || !b) throw new Error("contexts missing");
    const rowA = sample(A, a.locationId, a.ctx);
    const rowB = sample(B, b.locationId, b.ctx);
    await asOwner(A, (tx) => tx.insert(table).values(rowA as never));
    await asOwner(B, (tx) => tx.insert(table).values(rowB as never));
    seeded.set(nameOf(table), { A: rowA, B: rowB });
  }
});

describe("dealer leak suite", () => {
  it("has registered tables", () => {
    expect(tables.map((t) => t.name)).toEqual(
      expect.arrayContaining(["locations", "memberships", "membership_locations"]),
    );
  });

  for (const { name, table, sample } of tables) {
    describe(name, () => {
      it("select under A returns only A rows", async () => {
        const rows = await withDealer(A, (tx) =>
          tx.execute(sql`select dealer_id from ${qualified(table)}`),
        );
        expect(rows.rows.length).toBeGreaterThan(0);
        expect(new Set(rows.rows.map((r) => r.dealer_id))).toEqual(new Set([A]));
      });

      it("no rows without a dealer setting, or with an empty one", async () => {
        const unset = await appDb.execute(sql`select count(*)::int as n from ${qualified(table)}`);
        expect((unset.rows[0] as { n: number }).n).toBe(0);
        const empty = await appDb.transaction(async (tx) => {
          await tx.execute(sql`select set_config('app.dealer_id', '', true)`);
          return tx.execute(sql`select count(*)::int as n from ${qualified(table)}`);
        });
        expect((empty.rows[0] as { n: number }).n).toBe(0);
      });

      it("update and delete targeting B affect 0 rows (or are not granted at all)", async () => {
        // Lazy, so a denied statement is only run (and rejected) when the test awaits it.
        const upd = () =>
          withDealer(A, (tx) =>
            tx.execute(
              sql`update ${qualified(table)} set dealer_id = dealer_id where dealer_id = ${B}`,
            ),
          );
        const del = () =>
          withDealer(A, (tx) =>
            tx.execute(sql`delete from ${qualified(table)} where dealer_id = ${B}`),
          );
        for (const [op, run] of [
          ["UPDATE", upd],
          ["DELETE", del],
        ] as const) {
          if (await granted(table, op)) {
            expect((await run()).rowCount, op).toBe(0);
          } else {
            const e = await rejection(run()); // append-only tables: denied outright, not by RLS
            expect((e as DbError).sqlState, op).toBe("42501");
            expect((e as DbError).rlsViolation, op).toBe(false);
          }
        }
        const stillThere = await asOwner(B, (tx) =>
          tx.execute(sql`select count(*)::int as n from ${qualified(table)}`),
        );
        expect((stillThere.rows[0] as { n: number }).n).toBeGreaterThan(0);
      });

      it("insert of a B row under A is rejected by RLS", async () => {
        expect(await granted(table, "INSERT")).toBe(true); // every tenant table accepts inserts
        const b = contexts.get(B);
        if (!b) throw new Error("context missing");
        // B's real context, so RLS is the only thing wrong with this row.
        const e = await rejection(
          withDealer(A, (tx) => tx.insert(table).values(sample(B, b.locationId, b.ctx) as never)),
        );
        expect(e).toBeInstanceOf(DbError);
        expect((e as DbError).rlsViolation).toBe(true);
      });

      it("a row cannot be moved from A to B (RLS, not a missing grant)", async () => {
        if (!(await granted(table, "UPDATE"))) return; // append-only: nothing can be moved
        const e = await rejection(
          withDealer(A, (tx) =>
            tx.execute(sql`update ${qualified(table)} set dealer_id = ${B} where dealer_id = ${A}`),
          ),
        );
        expect(e).toBeInstanceOf(DbError);
        expect((e as DbError).rlsViolation).toBe(true);
      });
    });
  }

  describe(ROOT_TABLE, () => {
    it("A sees only itself and cannot change or delete B", async () => {
      const rows = await withDealer(A, (tx) => tx.execute(sql`select id from "app"."dealers"`));
      expect(rows.rows.map((r) => r.id)).toEqual([A]);
      const upd = await withDealer(A, (tx) =>
        tx.execute(sql`update "app"."dealers" set legal_name = 'x' where id = ${B}`),
      );
      expect(upd.rowCount).toBe(0);
      const del = await withDealer(A, (tx) =>
        tx.execute(sql`delete from "app"."dealers" where id = ${B}`),
      );
      expect(del.rowCount).toBe(0);
    });

    it("A cannot create another dealer or change its own id", async () => {
      const ins = await rejection(
        withDealer(A, (tx) =>
          tx.execute(sql`insert into "app"."dealers" (id, legal_name) values (${newId()}, 'X')`),
        ),
      );
      expect((ins as DbError).rlsViolation).toBe(true);
      const move = await rejection(
        withDealer(A, (tx) =>
          tx.execute(sql`update "app"."dealers" set id = ${newId()} where id = ${A}`),
        ),
      );
      expect((move as DbError).rlsViolation).toBe(true);
    });
  });
});

describe("catalog checks", () => {
  it("every table with dealer_id has RLS enabled and forced", async () => {
    expect((await checkCatalog(appDb)).unprotected).toEqual([]);
  });

  it("every tenant table has exactly the one canonical policy", async () => {
    expect((await checkCatalog(appDb)).badPolicies).toEqual([]);
  });

  it("dealer_id is NOT NULL everywhere", async () => {
    expect((await checkCatalog(appDb)).nullableDealerId).toEqual([]);
  });

  it("every table with location_id is registered as a location table", async () => {
    expect((await checkCatalog(appDb)).locationNotRegistered).toEqual([]);
  });

  it("every table in app is registered, the root, or listed in GLOBAL_TABLES", async () => {
    expect((await checkCatalog(appDb)).unregistered).toEqual([]);
  });

  it("schema app has no views, materialized views or foreign tables", async () => {
    expect((await checkCatalog(appDb)).forbiddenRelations).toEqual([]);
  });

  it("the app role has no privileges beyond its tables in schema app", async () => {
    expect((await checkCatalog(appDb)).roleProblems).toEqual([]);
  });

  it("global tables do not reference dealers or tenant tables", async () => {
    expect((await checkCatalog(appDb)).globalTableProblems).toEqual([]);
  });

  it("global tables have no dealer_id", async () => {
    const r = await appDb.execute(sql`
      select table_name from information_schema.columns
      where table_schema = 'app' and column_name = 'dealer_id'`);
    const tenant = r.rows.map((x) => (x as { table_name: string }).table_name);
    for (const g of GLOBAL_TABLES) expect(tenant).not.toContain(g);
  });

  it("the checks catch unprotected tables and extra policies (self-test)", async () => {
    await ownerDb.execute(sql`create table app.zz_leak_probe (dealer_id uuid, location_id uuid)`);
    try {
      let report = await checkCatalog(appDb);
      expect(report.unprotected).toContain("zz_leak_probe");
      expect(report.unregistered).toContain("zz_leak_probe");
      expect(report.locationNotRegistered).toContain("zz_leak_probe");
      expect(report.nullableDealerId).toContain("zz_leak_probe");
      expect(report.badPolicies).toContain("zz_leak_probe: expected 1 policy, found 0");

      // ENABLE without FORCE is still unprotected (the owner would bypass it).
      await ownerDb.execute(sql`alter table app.zz_leak_probe enable row level security`);
      expect((await checkCatalog(appDb)).unprotected).toContain("zz_leak_probe");

      // The canonical policy passes; a second, per-command policy is caught.
      await ownerDb.execute(sql`alter table app.zz_leak_probe force row level security`);
      await ownerDb.execute(
        sql.raw(`create policy zz_ok on app.zz_leak_probe
        using (dealer_id = NULLIF(current_setting('app.dealer_id', true), '')::uuid)
        with check (dealer_id = NULLIF(current_setting('app.dealer_id', true), '')::uuid)`),
      );
      report = await checkCatalog(appDb);
      expect(report.unprotected).not.toContain("zz_leak_probe");
      expect(report.badPolicies.filter((p) => p.startsWith("zz_leak_probe"))).toEqual([]);
      await ownerDb.execute(
        sql`create policy zz_hole on app.zz_leak_probe for delete using (true)`,
      );
      expect((await checkCatalog(appDb)).badPolicies).toContain(
        "zz_leak_probe: expected 1 policy, found 2",
      );
    } finally {
      await ownerDb.execute(sql`drop table if exists app.zz_leak_probe`);
    }
  });

  it("the checks catch a wrong predicate and a materialized view (self-test)", async () => {
    try {
      await ownerDb.execute(sql`create table app.zz_pred_probe (dealer_id uuid not null)`);
      await ownerDb.execute(sql`alter table app.zz_pred_probe enable row level security`);
      await ownerDb.execute(sql`alter table app.zz_pred_probe force row level security`);
      await ownerDb.execute(
        sql.raw(`create policy zz_loose on app.zz_pred_probe
          using (dealer_id = NULLIF(current_setting('app.dealer_id', true), '')::uuid OR true)`),
      );
      await ownerDb.execute(sql`create materialized view app.zz_mv as select 1 as x`);
      const report = await checkCatalog(appDb);
      expect(report.badPolicies.some((p) => p.startsWith("zz_pred_probe: "))).toBe(true);
      expect(report.forbiddenRelations).toContain("zz_mv (materialized view)");
    } finally {
      await ownerDb.execute(sql`drop materialized view if exists app.zz_mv`);
      await ownerDb.execute(sql`drop table if exists app.zz_pred_probe`);
    }
  });

  it("the checks catch dangerous table grants (self-test)", async () => {
    try {
      await ownerDb.execute(sql`grant truncate on app.locations to dms_app`);
      await ownerDb.execute(sql`grant update on app.users to dms_app`);
      const report = await checkCatalog(appDb);
      expect(report.roleProblems).toContain("TRUNCATE on app.locations");
      expect(report.roleProblems).toContain("UPDATE on global table app.users");
    } finally {
      await ownerDb.execute(sql`revoke truncate on app.locations from dms_app`);
      await ownerDb.execute(sql`revoke update on app.users from dms_app`);
    }
  });
});
