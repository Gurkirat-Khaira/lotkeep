import { newId } from "@dms/core";
import { sql } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import {
  dealers,
  locations,
  memberships,
  normalizeSuite,
  tenantRlsSql,
  users,
  withDealer,
} from "../src";
import { appDb } from "./helpers/db";
import { seedDealer, seedLocation, seedUser } from "./helpers/seed";

let A: string;
let B: string;

beforeAll(async () => {
  A = await seedDealer();
  B = await seedDealer();
  const la = await seedLocation(A);
  const lb = await seedLocation(B);
  await seedUser(A, "owner", [la]);
  await seedUser(B, "sales", [lb]);
});

describe("forced RLS on tenancy tables", () => {
  it("dealer A sees only A locations", async () => {
    const rows = await withDealer(A, (tx) => tx.select().from(locations));
    expect(rows.map((r) => r.dealerId)).toEqual([A]);
  });

  it("empty dealer setting returns no rows", async () => {
    // The test app pool has one connection, so this reuses the connection withDealer just used,
    // where app.dealer_id now reads back as ''.
    await withDealer(A, async () => {});
    // '' (not NULL) proves this is the reused connection, not a fresh one.
    const setting = await appDb.execute(sql`select current_setting('app.dealer_id', true) as v`);
    expect((setting.rows[0] as { v: string | null }).v).toBe("");
    expect(await appDb.select().from(locations)).toEqual([]);
    expect(await appDb.select().from(memberships)).toEqual([]);
    expect(await appDb.select().from(dealers)).toEqual([]);
  });

  it("cannot insert a row for another dealer", async () => {
    await expect(
      withDealer(A, (tx) =>
        tx.insert(locations).values({
          dealerId: B,
          id: newId(),
          name: "X",
          kind: "branch",
          addressLine1: "1 Test Way",
          city: "Testville",
          state: "CA",
          zip: "90000",
        }),
      ),
    ).rejects.toThrow(/row-level security/);
    // The same insert for its own dealer works, so the rejection above was RLS, not a grant.
    await withDealer(A, (tx) =>
      tx.insert(locations).values({
        dealerId: A,
        id: newId(),
        name: "Own branch",
        kind: "branch",
        addressLine1: "2 Test Way",
        city: "Testville",
        state: "CA",
        zip: "90000",
      }),
    );
  });

  it("withDealer rejects a non-uuid", async () => {
    await expect(withDealer("' or 1=1 --", async () => {})).rejects.toThrow();
  });

  it("suite variants normalize equal", () => {
    expect(new Set(["OFC 4", "#4", "Ste 4", "Suite 4", "Unit 4"].map(normalizeSuite))).toEqual(
      new Set(["4"]),
    );
  });

  it("dealer A sees only its own dealer row and memberships", async () => {
    const own = await withDealer(A, (tx) => tx.select().from(dealers));
    expect(own.map((d) => d.id)).toEqual([A]);
    const ms = await withDealer(A, (tx) => tx.select().from(memberships));
    expect(ms).toHaveLength(1);
    expect(ms.every((m) => m.dealerId === A)).toBe(true);
  });

  it("updates and deletes cannot reach another dealer", async () => {
    const updated = await withDealer(A, (tx) =>
      tx
        .update(locations)
        .set({ name: "hijacked" })
        .where(sql`${locations.dealerId} = ${B}`)
        .returning(),
    );
    expect(updated).toEqual([]);
    const deleted = await withDealer(A, (tx) =>
      tx.delete(locations).where(sql`${locations.dealerId} = ${B}`).returning(),
    );
    expect(deleted).toEqual([]);
  });

  it("tenantRlsSql enables, forces and adds the exact policy", () => {
    const s = tenantRlsSql("locations");
    expect(s).toContain('ALTER TABLE "app"."locations" ENABLE ROW LEVEL SECURITY');
    expect(s).toContain('ALTER TABLE "app"."locations" FORCE ROW LEVEL SECURITY');
    const predicate = `dealer_id = NULLIF(current_setting('app.dealer_id', true), '')::uuid`;
    expect(s).toContain(`USING (${predicate})`);
    expect(s).toContain(`WITH CHECK (${predicate})`);
    expect(() => tenantRlsSql('x"; drop table y; --')).toThrow();
  });

  it("every tenancy table has RLS enabled and forced in the database", async () => {
    const rows = (await appDb.execute(sql`
      select c.relname, c.relrowsecurity, c.relforcerowsecurity
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'app' and c.relname in ('dealers','locations','memberships','membership_locations')
      order by c.relname`)) as unknown as {
      rows: { relname: string; relrowsecurity: boolean; relforcerowsecurity: boolean }[];
    };
    expect(rows.rows).toHaveLength(4);
    for (const r of rows.rows)
      expect(r, r.relname).toMatchObject({ relrowsecurity: true, relforcerowsecurity: true });
  });

  it("app role cannot update or delete users (global table, no RLS)", async () => {
    await expect(
      withDealer(A, (tx) => tx.update(users).set({ email: "x@example.test" }).where(sql`false`)),
    ).rejects.toThrow(/insufficient privilege/);
    await expect(withDealer(A, (tx) => tx.delete(users).where(sql`false`))).rejects.toThrow(
      /insufficient privilege/,
    );
  });
});
