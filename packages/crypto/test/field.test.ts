import { randomBytes } from "node:crypto";
import { newId } from "@dms/core";
import { describe, expect, it } from "vitest";
import { CryptoError, decryptField, encryptField, type FieldAad } from "../src";

const key = () => new Uint8Array(randomBytes(32));
const aad = (): FieldAad => ({
  dealerId: newId(),
  table: "customers",
  column: "ssn_ct",
  rowId: newId(),
});

describe("field encryption", () => {
  it("round-trips", () => {
    const k = key();
    const a = aad();
    const ct = encryptField(k, "123-45-6789", a);
    expect(ct).toMatch(/^v1\.[A-Za-z0-9_-]{16}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{22}$/);
    expect(decryptField(k, ct, a)).toBe("123-45-6789");
    expect(decryptField(k, encryptField(k, "", a), a)).toBe("");
    expect(decryptField(k, encryptField(k, "Ñandú 漢字", a), a)).toBe("Ñandú 漢字");
  });

  it("AAD mismatch throws", () => {
    const k = key();
    const a = aad();
    const ct = encryptField(k, "123-45-6789", a);
    for (const other of [
      { ...a, rowId: newId() },
      { ...a, dealerId: newId() },
      { ...a, column: "dl_ct" },
      { ...a, table: "other" },
    ]) {
      expect(() => decryptField(k, ct, other)).toThrow(CryptoError);
    }
  });

  it("same plaintext encrypts differently", () => {
    const k = key();
    const a = aad();
    expect(encryptField(k, "123-45-6789", a)).not.toBe(encryptField(k, "123-45-6789", a));
  });

  it("tampered tag throws", () => {
    const k = key();
    const a = aad();
    const [v, iv, ct, tag] = encryptField(k, "123-45-6789", a).split(".");
    const flipped = `${tag?.[0] === "A" ? "B" : "A"}${tag?.slice(1)}`;
    expect(() => decryptField(k, [v, iv, ct, flipped].join("."), a)).toThrow(CryptoError);
    const ctFlipped = `${ct?.[0] === "A" ? "B" : "A"}${ct?.slice(1)}`;
    expect(() => decryptField(k, [v, iv, ctFlipped, tag].join("."), a)).toThrow(CryptoError);
  });

  it("wrong key, malformed input and unknown versions throw a generic error", () => {
    const k = key();
    const a = aad();
    const ct = encryptField(k, "123-45-6789", a);
    for (const bad of ["", "v1.x", "v2" + ct.slice(2), `${ct}.extra`, "v1.!!!.!!!.!!!"]) {
      expect(() => decryptField(k, bad, a), bad).toThrow(CryptoError);
    }
    expect(() => decryptField(key(), ct, a)).toThrow(CryptoError);
    const [, , body, tag] = ct.split(".");
    const shortIv = Buffer.alloc(4).toString("base64url");
    expect(() => decryptField(k, `v1.${shortIv}.${body}.${tag}`, a)).toThrow(CryptoError);
    expect(() => decryptField(k, 42 as unknown as string, a)).toThrow(CryptoError);
    // "AAB" decodes like "AAA" but is not the canonical encoding.
    expect(() => decryptField(k, `v1.AAB.${body}.${tag}`, a)).toThrow(CryptoError);
    try {
      decryptField(key(), ct, a);
    } catch (e) {
      expect((e as CryptoError).code).toBe("decrypt_failed");
      expect(String((e as Error).message)).not.toContain("123-45-6789");
    }
  });

  it("rejects bad keys and AAD parts that could be ambiguous", () => {
    expect(() => encryptField(new Uint8Array(16), "x", aad())).toThrow(CryptoError);
    expect(() => encryptField(key(), "x", { ...aad(), table: "a|b" })).toThrow(CryptoError);
    expect(() => encryptField(key(), "x", { ...aad(), rowId: "" })).toThrow(CryptoError);
  });
});
