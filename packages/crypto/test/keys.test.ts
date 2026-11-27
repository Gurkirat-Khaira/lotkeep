import { randomBytes } from "node:crypto";
import { FixedClock, newId } from "@dms/core";
import { DbError, dataKeys, withDealer } from "@dms/db";
import { inDealer, openAppDb, seedDealer } from "@dms/db/testing";
import { and, eq, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import {
  CryptoError,
  Destroyed,
  destroyCustomerKey,
  EnvKeyProvider,
  encryptField,
  getOrCreateCustomerKey,
  readField,
  rotateMasterKey,
  setKeyProvider,
  withCustomerKey,
} from "../src";

const master = () => new EnvKeyProvider(randomBytes(32).toString("base64"));
let provider: EnvKeyProvider;
beforeEach(() => {
  provider = master();
  setKeyProvider(provider);
});

const aadFor = (dealerId: string, rowId: string) => ({
  dealerId,
  table: "customers",
  column: "ssn_ct",
  rowId,
});

describe("key hierarchy", () => {
  it("getOrCreateCustomerKey is stable and per customer", async () => {
    const A = await seedDealer();
    const c1 = newId();
    const k1 = await withDealer(A, (tx) => getOrCreateCustomerKey(tx, A, c1));
    const k1again = await withDealer(A, (tx) => getOrCreateCustomerKey(tx, A, c1));
    const k2 = await withDealer(A, (tx) => getOrCreateCustomerKey(tx, A, newId()));
    expect(k1).toHaveLength(32);
    expect(Buffer.from(k1again).equals(Buffer.from(k1))).toBe(true);
    expect(Buffer.from(k2).equals(Buffer.from(k1))).toBe(false);
  });

  it("only wrapped keys are stored", async () => {
    const A = await seedDealer();
    const c = newId();
    const k = await withDealer(A, (tx) => getOrCreateCustomerKey(tx, A, c));
    const rows = await withDealer(A, (tx) => tx.select().from(dataKeys));
    expect(rows.map((r) => r.scope).sort()).toEqual(["customer", "dealer"]);
    for (const r of rows) expect(r.wrappedKey.includes(Buffer.from(k))).toBe(false);
  });

  it("shredded key decrypts to Destroyed", async () => {
    const A = await seedDealer();
    const c = newId();
    const ct = await withDealer(A, async (tx) =>
      encryptField(await getOrCreateCustomerKey(tx, A, c), "123-45-6789", aadFor(A, c)),
    );
    expect(
      await withDealer(A, (tx) => readField(tx, { dealerId: A, customerId: c }, ct, aadFor(A, c))),
    ).toBe("123-45-6789");
    await withDealer(A, (tx) => destroyCustomerKey(tx, A, c));
    expect(
      await withDealer(A, (tx) => readField(tx, { dealerId: A, customerId: c }, ct, aadFor(A, c))),
    ).toBe(Destroyed);
    const [row] = await withDealer(A, (tx) =>
      tx.select().from(dataKeys).where(eq(dataKeys.subjectId, c)),
    );
    expect(row?.wrappedKey.length).toBe(0); // no key material left
    await expect(withDealer(A, (tx) => getOrCreateCustomerKey(tx, A, c))).rejects.toThrow(
      CryptoError,
    );
  });

  it("shredding a customer without a key leaves a tombstone", async () => {
    const A = await seedDealer();
    const c = newId();
    await withDealer(A, (tx) => destroyCustomerKey(tx, A, c));
    await expect(withDealer(A, (tx) => getOrCreateCustomerKey(tx, A, c))).rejects.toThrow(
      CryptoError,
    );
    expect(
      await withDealer(A, (tx) =>
        readField(tx, { dealerId: A, customerId: c }, "v1.x.y.z", aadFor(A, c)),
      ),
    ).toBe(Destroyed);
  });

  it("readField fails for an unknown customer or a mismatched dealer", async () => {
    const A = await seedDealer();
    const c = newId();
    const ct = await withDealer(A, async (tx) =>
      encryptField(await getOrCreateCustomerKey(tx, A, c), "x", aadFor(A, c)),
    );
    await expect(
      withDealer(A, (tx) => readField(tx, { dealerId: A, customerId: newId() }, ct, aadFor(A, c))),
    ).rejects.toThrow(CryptoError);
    await expect(
      withDealer(A, (tx) => readField(tx, { dealerId: A, customerId: c }, ct, aadFor(newId(), c))),
    ).rejects.toThrow(CryptoError);
  });

  it("dealer B cannot use dealer A's keys", async () => {
    const A = await seedDealer();
    const B = await seedDealer();
    const c = newId();
    const ct = await withDealer(A, async (tx) =>
      encryptField(await getOrCreateCustomerKey(tx, A, c), "x", aadFor(A, c)),
    );
    // Under B, A's rows are invisible; the AAD names A, so this must fail, never decrypt.
    await expect(
      withDealer(B, (tx) => readField(tx, { dealerId: B, customerId: c }, ct, aadFor(B, c))),
    ).rejects.toThrow(CryptoError);
    await expect(withDealer(B, (tx) => getOrCreateCustomerKey(tx, A, c))).rejects.toThrow(
      CryptoError,
    );
  });

  it("master key rotation keeps data readable", async () => {
    const A = await seedDealer();
    const B = await seedDealer();
    const c = newId();
    const ct = await withDealer(A, async (tx) =>
      encryptField(await getOrCreateCustomerKey(tx, A, c), "123-45-6789", aadFor(A, c)),
    );
    const next = master();
    const result = await rotateMasterKey(provider, next, [A, B]);
    expect(result).toEqual({ rotated: 1, skipped: 0, failed: [], missing: [B] }); // B has no keys yet
    // Re-running after a partial or complete rotation is safe: already-rotated dealers are skipped.
    expect(await rotateMasterKey(provider, next, [A, B])).toEqual({
      rotated: 0,
      skipped: 1,
      failed: [],
      missing: [B],
    });
    // A dealer whose key opens with neither master key is reported, not silently skipped.
    expect((await rotateMasterKey(master(), next, [A])).failed).toEqual([]); // opens with `next`
    expect((await rotateMasterKey(master(), master(), [A])).failed).toEqual([A]);
    // Unknown and malformed ids are reported, and don't stop the run.
    const ghost = newId();
    const r = await rotateMasterKey(next, next, ["not-a-uuid", ghost, A]); // A stays on `next`
    expect(r.missing).toEqual([ghost]);
    expect(r.failed).toEqual(["not-a-uuid"]);
    expect(r.rotated).toBe(1);
    setKeyProvider(next);
    expect(
      await withDealer(A, (tx) => readField(tx, { dealerId: A, customerId: c }, ct, aadFor(A, c))),
    ).toBe("123-45-6789");
    setKeyProvider(provider); // the old master key no longer opens the dealer key
    await expect(
      withDealer(A, (tx) => readField(tx, { dealerId: A, customerId: c }, ct, aadFor(A, c))),
    ).rejects.toThrow(CryptoError);
  });

  it("key bytes are zeroed after use where possible", async () => {
    const A = await seedDealer();
    let seen: Uint8Array | undefined;
    const out = await withDealer(A, (tx) =>
      withCustomerKey(tx, A, newId(), async (k) => {
        seen = k;
        expect(k.some((b) => b !== 0)).toBe(true);
        return "done";
      }),
    );
    expect(out).toBe("done");
    expect(seen?.every((b) => b === 0)).toBe(true);
  });
});

describe("data_keys protections", () => {
  it("the app role cannot delete keys or revive a destroyed key", async () => {
    const A = await seedDealer();
    const c = newId();
    await withDealer(A, (tx) => getOrCreateCustomerKey(tx, A, c));
    await expect(
      withDealer(A, (tx) => tx.delete(dataKeys).where(eq(dataKeys.subjectId, c))),
    ).rejects.toThrow(/insufficient privilege/);
    await withDealer(A, (tx) => destroyCustomerKey(tx, A, c));
    await expect(
      withDealer(A, (tx) =>
        tx.update(dataKeys).set({ destroyedAt: null }).where(eq(dataKeys.subjectId, c)),
      ),
    ).rejects.toThrow();
    await expect(
      withDealer(A, (tx) =>
        tx
          .update(dataKeys)
          .set({ subjectId: newId() })
          .where(and(eq(dataKeys.dealerId, A), eq(dataKeys.scope, "dealer"))),
      ),
    ).rejects.toThrow();
  });

  it("a live dealer or blind-index key cannot be emptied or destroyed", async () => {
    const A = await seedDealer();
    await withDealer(A, (tx) => getOrCreateCustomerKey(tx, A, newId()));
    const guarded = async (q: ReturnType<typeof sql>) => {
      const e = await withDealer(A, (tx) => tx.execute(q)).catch((x: unknown) => x);
      expect(e).toBeInstanceOf(DbError);
      return e as DbError;
    };
    expect(
      (await guarded(sql`update app.data_keys set wrapped_key = '' where scope = 'dealer'`))
        .sqlState,
    ).toBe("23514"); // CHECK: a live key always has key material
    expect(
      (
        await guarded(
          sql`update app.data_keys set wrapped_key = '', destroyed_at = now() where scope = 'dealer'`,
        )
      ).sqlState,
    ).toBe("DMS01");
  });

  it("a shredded customer cannot be revived with a higher key version", async () => {
    const A = await seedDealer();
    const c = newId();
    await withDealer(A, (tx) => getOrCreateCustomerKey(tx, A, c));
    await withDealer(A, (tx) => destroyCustomerKey(tx, A, c));
    const e = await withDealer(A, (tx) =>
      tx.insert(dataKeys).values({
        dealerId: A,
        id: newId(),
        scope: "customer",
        subjectId: c,
        keyVersion: 2,
        wrappedKey: Buffer.from("anything"),
      }),
    ).catch((x: unknown) => x);
    expect((e as DbError).sqlState).toBe("DMS01");
    await expect(withDealer(A, (tx) => getOrCreateCustomerKey(tx, A, c))).rejects.toThrow(
      CryptoError,
    );
  });

  it("shredding records the injected clock's time once, and a re-run keeps it", async () => {
    const A = await seedDealer();
    const c = newId();
    await withDealer(A, (tx) => getOrCreateCustomerKey(tx, A, c));
    const clock = new FixedClock("2033-01-15T10:00:00Z");
    await withDealer(A, (tx) => destroyCustomerKey(tx, A, c, clock));
    clock.advance(30 * 86_400_000);
    await withDealer(A, (tx) => destroyCustomerKey(tx, A, c, clock)); // retention job re-run
    const [row] = await withDealer(A, (tx) =>
      tx.select().from(dataKeys).where(eq(dataKeys.subjectId, c)),
    );
    expect(row?.destroyedAt?.toISOString()).toBe("2033-01-15T10:00:00.000Z");
  });

  it("a shred waits for a transaction that is already using the customer key", async () => {
    const A = await seedDealer();
    const c = newId();
    await withDealer(A, (tx) => getOrCreateCustomerKey(tx, A, c)); // key exists
    const second = openAppDb();
    let release: () => void = () => {};
    try {
      const gate = new Promise<void>((r) => {
        release = r;
      });
      let using!: () => void;
      const usingSignal = new Promise<void>((r) => {
        using = r;
      });
      const reader = withDealer(A, async (tx) => {
        await getOrCreateCustomerKey(tx, A, c); // existing-key path
        using();
        await gate;
      });
      await usingSignal;
      let shredDone = false;
      const shred = inDealer(second.db, A, (tx) => destroyCustomerKey(tx, A, c)).then(() => {
        shredDone = true;
      });
      await new Promise((r) => setTimeout(r, 200));
      expect(shredDone).toBe(false); // blocked by the reader's row lock
      release();
      await Promise.all([reader, shred]);
      expect(shredDone).toBe(true);
    } finally {
      release(); // never leave the reader's transaction (and the 1-connection pool) open
      await second.close();
    }
  });

  it("first use waits for a concurrent shred and then refuses the key", async () => {
    const A = await seedDealer();
    const c = newId();
    const second = openAppDb();
    try {
      let release!: () => void;
      const gate = new Promise<void>((r) => {
        release = r;
      });
      let locked!: () => void;
      const lockedSignal = new Promise<void>((r) => {
        locked = r;
      });
      const shred = withDealer(A, async (tx) => {
        await destroyCustomerKey(tx, A, c); // takes the subject lock, writes a tombstone
        locked();
        await gate;
      });
      await lockedSignal;
      const use = inDealer(second.db, A, (tx) => getOrCreateCustomerKey(tx, A, c));
      await new Promise((r) => setTimeout(r, 200));
      release();
      await shred;
      await expect(use).rejects.toThrow(CryptoError);
    } finally {
      await second.close();
    }
  });

  it("destroy and first use cannot race into a live key", async () => {
    const A = await seedDealer();
    const c = newId();
    const second = openAppDb(); // a second, independent app-role connection
    try {
      let release!: () => void;
      const gate = new Promise<void>((r) => {
        release = r;
      });
      let created!: () => void;
      const createdSignal = new Promise<void>((r) => {
        created = r;
      });
      // tx1 creates the key and holds its transaction open.
      const tx1 = withDealer(A, async (tx) => {
        await getOrCreateCustomerKey(tx, A, c);
        created();
        await gate;
      });
      await createdSignal;
      // tx2 shreds while tx1 is still uncommitted; it must wait, then destroy the committed key.
      const tx2 = inDealer(second.db, A, (tx) => destroyCustomerKey(tx, A, c));
      await new Promise((r) => setTimeout(r, 200));
      release();
      await Promise.all([tx1, tx2]);
      await expect(withDealer(A, (tx) => getOrCreateCustomerKey(tx, A, c))).rejects.toThrow(
        CryptoError,
      );
    } finally {
      await second.close();
    }
  });
});

describe("rotation verification", () => {
  it("a new wrap that does not round-trip is reported as failed and not written", async () => {
    const A = await seedDealer();
    await withDealer(A, (tx) => getOrCreateCustomerKey(tx, A, newId()));
    const broken = {
      wrap: async (k: Uint8Array) => new Uint8Array(k),
      unwrap: async () => new Uint8Array(32), // returns the wrong key
    };
    expect(await rotateMasterKey(provider, broken, [A])).toEqual({
      rotated: 0,
      skipped: 0,
      failed: [A],
      missing: [],
    });
    // Nothing was written: the old master key still opens the dealer key.
    await expect(
      withDealer(A, (tx) => getOrCreateCustomerKey(tx, A, newId())),
    ).resolves.toHaveLength(32);
  });
});

describe("EnvKeyProvider", () => {
  it("wraps and unwraps, and rejects a bad master key or tampered blob", async () => {
    const p = master();
    const k = new Uint8Array(randomBytes(32));
    const w = await p.wrap(k);
    expect(Buffer.from(await p.unwrap(w)).equals(Buffer.from(k))).toBe(true);
    await expect(master().unwrap(w)).rejects.toThrow(CryptoError);
    const t = new Uint8Array(w);
    t[t.length - 1] = (t[t.length - 1] ?? 0) ^ 1;
    await expect(p.unwrap(t)).rejects.toThrow(CryptoError);
    expect(() => new EnvKeyProvider(Buffer.alloc(16, 1).toString("base64"))).toThrow(CryptoError);
    await expect(p.unwrap(new Uint8Array(5))).rejects.toThrow(CryptoError); // too short
    const wrongVersion = new Uint8Array(w);
    wrongVersion[0] = 2;
    await expect(p.unwrap(wrongVersion)).rejects.toThrow(CryptoError);
  });
});
