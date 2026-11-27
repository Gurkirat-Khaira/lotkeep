import { randomBytes } from "node:crypto";
import { withDealer } from "@dms/db";
import { seedDealer } from "@dms/db/testing";
import { expect, it } from "vitest";
import { blindIndex, EnvKeyProvider, getBlindIndexKey, setKeyProvider } from "../src";

setKeyProvider(new EnvKeyProvider(randomBytes(32).toString("base64")));

it('blind index stable per dealer ("123-45-6789" == "123 45 6789") and differs across dealers', async () => {
  const A = await seedDealer();
  const B = await seedDealer();
  const kA = await withDealer(A, (tx) => getBlindIndexKey(tx, A, "ssn"));
  const kA2 = await withDealer(A, (tx) => getBlindIndexKey(tx, A, "ssn"));
  const kB = await withDealer(B, (tx) => getBlindIndexKey(tx, B, "ssn"));
  const a = blindIndex(kA, "123-45-6789");
  expect(a).toMatch(/^[0-9a-f]{64}$/);
  expect(blindIndex(kA, "123 45 6789")).toBe(a);
  expect(blindIndex(kA2, "123456789")).toBe(a); // the stored key is reused, not regenerated
  expect(blindIndex(kB, "123-45-6789")).not.toBe(a);
});

it("blind index normalizes case and whitespace for license numbers", () => {
  const k = new Uint8Array(randomBytes(32));
  expect(blindIndex(k, " d1234567 ")).toBe(blindIndex(k, "D1234567"));
  expect(blindIndex(k, "D1234567")).not.toBe(blindIndex(k, "D1234568"));
  expect(() => blindIndex(new Uint8Array(8), "x")).toThrow();
});

it("blind index keys differ per column, so equal values in different columns don't link", async () => {
  const A = await seedDealer();
  const ssnKey = await withDealer(A, (tx) => getBlindIndexKey(tx, A, "ssn"));
  const dlKey = await withDealer(A, (tx) => getBlindIndexKey(tx, A, "dl"));
  expect(blindIndex(ssnKey, "123456789")).not.toBe(blindIndex(dlKey, "123456789"));
  await expect(withDealer(A, (tx) => getBlindIndexKey(tx, A, "bad|col"))).rejects.toThrow();
});

it("blind index applies Unicode NFKC normalization", () => {
  const k = new Uint8Array(randomBytes(32));
  expect(blindIndex(k, "Ｄ１２３")).toBe(blindIndex(k, "D123")); // full-width forms
});

it("blind index strips Unicode dashes pasted from documents", () => {
  const k = new Uint8Array(randomBytes(32));
  const plain = blindIndex(k, "123-45-6789");
  for (const dash of ["\u2010", "\u2011", "\u2013", "\u2014", "\u2212"]) {
    expect(blindIndex(k, `123${dash}45${dash}6789`)).toBe(plain);
  }
});
