// Key hierarchy: master (KeyProvider) → dealer key → per-customer key and per-dealer blind-index
// key. Only wrapped keys are stored (app.data_keys). Every function runs inside withDealer(), so
// RLS limits it to that dealer's keys; it also checks the tx is scoped to the dealer it was given.
import { randomBytes } from "node:crypto";
import { loadConfig } from "@dms/config";
import { type Clock, isUuid, newId as randomUuidV7, SystemClock } from "@dms/core";
import { type AppTx, dataKeys, withDealer } from "@dms/db";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { columnIndexKey } from "./blind-index";
import { KEY_BYTES, openBlob, sealBlob, zero } from "./bytes";
import { CryptoError } from "./errors";
import { decryptField, type FieldAad } from "./field";

export interface KeyProvider {
  wrap(k: Uint8Array): Promise<Uint8Array>;
  unwrap(w: Uint8Array): Promise<Uint8Array>;
}

const MASTER_AAD = Buffer.from("dms:master-wrap:v1");

/** Development/self-host provider: the master key comes from MASTER_KEY (base64, 32 bytes). */
export class EnvKeyProvider implements KeyProvider {
  readonly #key: Uint8Array;

  constructor(masterKeyBase64: string) {
    const decoded = Buffer.from(masterKeyBase64, "base64");
    try {
      if (decoded.length !== KEY_BYTES) throw new CryptoError("invalid_key");
      this.#key = new Uint8Array(decoded);
    } finally {
      decoded.fill(0);
    }
  }

  async wrap(k: Uint8Array): Promise<Uint8Array> {
    return sealBlob(this.#key, k, MASTER_AAD);
  }

  async unwrap(w: Uint8Array): Promise<Uint8Array> {
    return openBlob(this.#key, w, MASTER_AAD);
  }
}

let provider: KeyProvider | undefined;

/**
 * Sets the master key provider. Call once at startup (or in tests); never per request.
 * Defaults to EnvKeyProvider(MASTER_KEY).
 */
export function setKeyProvider(p: KeyProvider): void {
  provider = p;
}

function keyProvider(): KeyProvider {
  provider ??= new EnvKeyProvider(loadConfig().MASTER_KEY);
  return provider;
}

/** Shredded customer data reads as this. */
export const Destroyed: unique symbol = Symbol("Destroyed");

type Scope = "dealer" | "customer" | "blind-index";

const wrapAad = (dealerId: string, scope: Scope, subjectId: string, version: number) =>
  Buffer.from(`dms:key:v1|${dealerId}|${scope}|${subjectId}|${version}`);

async function assertScopedTo(tx: AppTx, dealerId: string): Promise<void> {
  const r = await tx.execute(sql`select current_setting('app.dealer_id', true) as d`);
  if ((r.rows[0] as { d: string | null } | undefined)?.d !== dealerId) {
    throw new CryptoError("key_unavailable"); // keys are only ever handled inside withDealer(dealerId)
  }
}

/**
 * Serializes create / destroy for one subject, so shredding can't race with first use
 * (READ COMMITTED would otherwise let destroy miss an uncommitted insert).
 */
async function lockSubject(tx: AppTx, dealerId: string, scope: Scope, subjectId: string) {
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtextextended(${`dms:key|${dealerId}|${scope}|${subjectId}`}, 0))`,
  );
}

async function latest(tx: AppTx, dealerId: string, scope: Scope, subjectId: string) {
  const [row] = await tx
    .select()
    .from(dataKeys)
    .where(
      and(
        eq(dataKeys.dealerId, dealerId),
        eq(dataKeys.scope, scope),
        eq(dataKeys.subjectId, subjectId),
      ),
    )
    // A tombstone for any version wins, then the newest version.
    .orderBy(sql`${dataKeys.destroyedAt} is null`, desc(dataKeys.keyVersion))
    .limit(1)
    // A shred waits for transactions already using this key (and vice versa).
    .for("share");
  return row;
}

/** Inserts a new key row unless a concurrent call won the race; returns the stored row. */
async function insertKey(
  tx: AppTx,
  dealerId: string,
  scope: Scope,
  subjectId: string,
  wrappedKey: Uint8Array,
) {
  await tx
    .insert(dataKeys)
    .values({
      dealerId,
      id: randomUuidV7(),
      scope,
      subjectId,
      keyVersion: 1,
      wrappedKey: Buffer.from(wrappedKey),
    })
    .onConflictDoNothing();
  const row = await latest(tx, dealerId, scope, subjectId);
  if (!row) throw new CryptoError("key_unavailable");
  return row;
}

/** The dealer key (created on first use). The caller must zero it. */
async function dealerKey(tx: AppTx, dealerId: string): Promise<Uint8Array> {
  let row = await latest(tx, dealerId, "dealer", dealerId);
  if (!row) {
    const fresh = new Uint8Array(randomBytes(KEY_BYTES));
    try {
      row = await insertKey(tx, dealerId, "dealer", dealerId, await keyProvider().wrap(fresh));
    } finally {
      zero(fresh);
    }
  }
  return keyProvider().unwrap(row.wrappedKey);
}

/** A child key (customer or blind-index) wrapped by the dealer key. The caller must zero it. */
async function childKey(
  tx: AppTx,
  dealerId: string,
  scope: "customer" | "blind-index",
  subjectId: string,
  create: boolean,
): Promise<Uint8Array | typeof Destroyed | undefined> {
  await assertScopedTo(tx, dealerId);
  let row = await latest(tx, dealerId, scope, subjectId);
  if (row?.destroyedAt) return Destroyed;
  if (!row && create) {
    await lockSubject(tx, dealerId, scope, subjectId);
    row = await latest(tx, dealerId, scope, subjectId); // re-read under the lock
    if (row?.destroyedAt) return Destroyed;
  }
  if (!row && !create) return undefined;
  const dk = await dealerKey(tx, dealerId);
  try {
    if (!row) {
      const fresh = new Uint8Array(randomBytes(KEY_BYTES));
      try {
        const wrapped = sealBlob(dk, fresh, wrapAad(dealerId, scope, subjectId, 1));
        row = await insertKey(tx, dealerId, scope, subjectId, wrapped);
      } finally {
        zero(fresh);
      }
    }
    return openBlob(dk, row.wrappedKey, wrapAad(dealerId, scope, subjectId, row.keyVersion));
  } finally {
    zero(dk);
  }
}

/** A created-on-use key is either live or shredded; shredded keys can't be used to encrypt. */
function liveKey(k: Uint8Array | typeof Destroyed | undefined): Uint8Array {
  if (k === Destroyed || k === undefined) throw new CryptoError("key_destroyed");
  return k;
}

/** The customer's data key, created on first use. Throws if the customer was crypto-shredded. */
export async function getOrCreateCustomerKey(
  tx: AppTx,
  dealerId: string,
  customerId: string,
): Promise<Uint8Array> {
  return liveKey(await childKey(tx, dealerId, "customer", customerId, true));
}

/** Runs `fn` with the customer key and zeroes the key bytes afterwards. */
export async function withCustomerKey<T>(
  tx: AppTx,
  dealerId: string,
  customerId: string,
  fn: (key: Uint8Array) => Promise<T>,
): Promise<T> {
  const key = await getOrCreateCustomerKey(tx, dealerId, customerId);
  try {
    return await fn(key);
  } finally {
    zero(key);
  }
}

/**
 * Crypto-shredding: removes the customer's key material (a tombstone row stays), so every field
 * encrypted with it reads as Destroyed. Only the retention job calls this, after all retention
 * clocks for the customer have expired.
 */
export async function destroyCustomerKey(
  tx: AppTx,
  dealerId: string,
  customerId: string,
  clock: Clock = SystemClock,
): Promise<void> {
  await assertScopedTo(tx, dealerId);
  await lockSubject(tx, dealerId, "customer", customerId);
  if ((await latest(tx, dealerId, "customer", customerId))?.destroyedAt) return; // already shredded
  const at = clock.now();
  const destroyed = await tx
    .update(dataKeys)
    .set({ wrappedKey: Buffer.alloc(0), destroyedAt: at })
    .where(
      and(
        eq(dataKeys.dealerId, dealerId),
        eq(dataKeys.scope, "customer"),
        eq(dataKeys.subjectId, customerId),
        isNull(dataKeys.destroyedAt), // a re-run keeps the original time
      ),
    )
    .returning({ id: dataKeys.id });
  if (destroyed.length === 0) {
    // No live key: leave a tombstone (unless one exists) so no key is ever created later.
    await tx
      .insert(dataKeys)
      .values({
        dealerId,
        id: randomUuidV7(),
        scope: "customer",
        subjectId: customerId,
        keyVersion: 1,
        wrappedKey: Buffer.alloc(0),
        destroyedAt: at,
      })
      .onConflictDoNothing();
  }
}

/** Decrypts a customer field, or returns Destroyed if the customer was crypto-shredded. */
export async function readField(
  tx: AppTx,
  ctx: { dealerId: string; customerId: string },
  ciphertext: string,
  aad: FieldAad,
): Promise<string | typeof Destroyed> {
  if (aad.dealerId !== ctx.dealerId) throw new CryptoError("decrypt_failed");
  const key = await childKey(tx, ctx.dealerId, "customer", ctx.customerId, false);
  if (key === Destroyed) return Destroyed;
  if (key === undefined) throw new CryptoError("decrypt_failed");
  try {
    return decryptField(key, ciphertext, aad);
  } finally {
    zero(key);
  }
}

/** The blind-index key for one column of this dealer (derived per column). Zero it after use. */
export async function getBlindIndexKey(
  tx: AppTx,
  dealerId: string,
  column: string,
): Promise<Uint8Array> {
  const k = liveKey(await childKey(tx, dealerId, "blind-index", dealerId, true));
  try {
    return columnIndexKey(k, column);
  } finally {
    zero(k);
  }
}

/**
 * Re-wraps each dealer key from the old master key to the new one. Customer and blind-index keys
 * and all data are untouched. Safe to re-run: dealers already on the new key are skipped, and each
 * new wrap is verified before it is written. `dealerIds` comes from the operator: forced RLS means
 * no role can list every dealer (ADR 0006). Run it while the app is stopped.
 */
export async function rotateMasterKey(
  oldProvider: KeyProvider,
  newProvider: KeyProvider,
  dealerIds: readonly string[],
): Promise<{ rotated: number; skipped: number; failed: string[]; missing: string[] }> {
  const result = { rotated: 0, skipped: 0, failed: [] as string[], missing: [] as string[] };
  for (const dealerId of dealerIds) {
    if (!isUuid(dealerId)) {
      result.failed.push(dealerId);
      continue;
    }
    const outcome = await withDealer(dealerId, async (tx) => {
      const row = await latest(tx, dealerId, "dealer", dealerId);
      if (!row) return "none" as const;
      const dk = await oldProvider.unwrap(row.wrappedKey).catch(() => undefined);
      if (!dk) {
        const already = await newProvider.unwrap(row.wrappedKey).catch(() => undefined);
        zero(already);
        return already ? ("skipped" as const) : ("failed" as const);
      }
      try {
        const rewrapped = await newProvider.wrap(dk);
        const check = await newProvider.unwrap(rewrapped);
        const same = Buffer.from(check).equals(Buffer.from(dk));
        zero(check);
        if (!same) return "failed" as const;
        await tx
          .update(dataKeys)
          .set({ wrappedKey: Buffer.from(rewrapped) })
          .where(and(eq(dataKeys.dealerId, dealerId), eq(dataKeys.id, row.id)));
        return "rotated" as const;
      } finally {
        zero(dk);
      }
    }).catch(() => "failed" as const); // one bad dealer never stops the run
    if (outcome === "rotated") result.rotated++;
    else if (outcome === "skipped") result.skipped++;
    else if (outcome === "failed") result.failed.push(dealerId);
    else result.missing.push(dealerId); // no dealer key: unknown id, or nothing encrypted yet
  }
  return result;
}
