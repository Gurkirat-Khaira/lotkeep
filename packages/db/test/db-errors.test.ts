import { newId } from "@dms/core";
import { sql } from "drizzle-orm";
import { beforeAll, expect, it } from "vitest";
import { DbError, locations, users, withDealer } from "../src";
import { seedDealer } from "./helpers/seed";

let A: string;
beforeAll(async () => {
  A = await seedDealer();
});

const MARKER = "marker-000-55-6666";

async function caught(p: Promise<unknown>): Promise<unknown> {
  try {
    await p;
  } catch (e) {
    return e;
  }
  throw new Error("expected a rejection");
}

it("db errors carry no query parameters or values", async () => {
  const e = await caught(
    withDealer(A, (tx) =>
      tx.insert(locations).values({
        dealerId: A,
        id: newId(),
        name: MARKER,
        kind: "main",
        addressLine1: MARKER,
        city: MARKER,
        state: "CA",
        zip: "not-a-zip", // violates locations_zip_format
      }),
    ),
  );
  expect(e).toBeInstanceOf(DbError);
  const err = e as DbError;
  expect(err.sqlState).toBe("23514");
  expect(err.constraint).toBe("locations_zip_format");
  const everything = `${err.message} ${JSON.stringify(err)} ${String(err.stack)} ${JSON.stringify(Object.entries(err))}`;
  expect(everything).not.toContain(MARKER);
  expect(everything).not.toContain("not-a-zip");
});

it("db errors drop values from postgres messages and details", async () => {
  const e1 = await caught(withDealer(A, (tx) => tx.execute(sql`select ${MARKER}::uuid`)));
  expect(String((e1 as Error).message)).not.toContain(MARKER);
  expect((e1 as DbError).sqlState).toBe("22P02");

  const email = `dup-${newId()}@example.test`;
  await withDealer(A, (tx) => tx.insert(users).values({ id: newId(), email }));
  const e2 = await caught(withDealer(A, (tx) => tx.insert(users).values({ id: newId(), email })));
  expect((e2 as DbError).sqlState).toBe("23505");
  expect(JSON.stringify(e2) + String((e2 as Error).message)).not.toContain(email);
});
