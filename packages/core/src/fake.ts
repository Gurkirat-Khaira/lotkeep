// Synthetic data only. These values are obviously fake and must never resemble real people.
import { randomInt } from "node:crypto";

const VIN_CHARS = "ABCDEFGHJKLMNPRSTUVWXYZ0123456789"; // no I, O, Q
const YEAR_CHARS = "ABCDEFGHJKLMNPRSTVWXY123456789"; // model-year codes: no U, Z, 0
const TRANSLIT: Record<string, number> = {
  A: 1,
  B: 2,
  C: 3,
  D: 4,
  E: 5,
  F: 6,
  G: 7,
  H: 8,
  J: 1,
  K: 2,
  L: 3,
  M: 4,
  N: 5,
  P: 7,
  R: 9,
  S: 2,
  T: 3,
  U: 4,
  V: 5,
  W: 6,
  X: 7,
  Y: 8,
  Z: 9,
};
const WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

/** The check digit (position 9) a 17-character VIN must carry: 0–9 or X. */
export function vinCheckDigit(vin: string): string {
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    const ch = vin[i] ?? "";
    const v = /\d/.test(ch) ? Number(ch) : TRANSLIT[ch];
    if (v === undefined) throw new RangeError(`invalid VIN character at position ${i + 1}`);
    sum += v * (WEIGHTS[i] ?? 0);
  }
  const r = sum % 11;
  return r === 10 ? "X" : String(r);
}

/** Small deterministic PRNG (mulberry32) so seeded fakes are reproducible. */
function seeded(seed: number): (n: number) => number {
  let a = seed >>> 0;
  return (n) => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return Math.floor((((t ^ (t >>> 14)) >>> 0) / 4294967296) * n);
  };
}
const pick = (seed?: number) => (seed === undefined ? (n: number) => randomInt(n) : seeded(seed));

/**
 * A fake VIN with a valid check digit and "FAKE" in positions 12–15.
 * WMI starts with "0", which no manufacturer region uses.
 */
export function fakeVin(seed?: number): string {
  const r = pick(seed);
  const any = () => VIN_CHARS[r(VIN_CHARS.length)] ?? "A";
  const digit = () => String(r(10));
  const year = () => YEAR_CHARS[r(YEAR_CHARS.length)] ?? "A";
  const chars = [
    "0",
    any(),
    any(),
    any(),
    any(),
    any(),
    any(),
    any(),
    "0", // check digit, computed below
    year(), // position 10: model year
    any(),
    "F",
    "A",
    "K",
    "E",
    digit(),
    digit(),
  ];
  chars[8] = vinCheckDigit(chars.join(""));
  return chars.join("");
}

const FIRST = ["Testy", "Sample", "Demo", "Placeholder", "Example", "Mock", "Dummy", "Fixture"];
const LAST = ["McTestface", "Person", "Customer", "Buyer", "Example", "Fakename", "Notreal"];

export type FakePerson = { firstName: string; lastName: string; email: string; phone: string };

/** A fictional person. Phones use 555-0100…0199 (reserved for fiction); emails use example.test. */
export function fakePerson(seed?: number): FakePerson {
  const r = pick(seed);
  const firstName = FIRST[r(FIRST.length)] ?? "Testy";
  const lastName = LAST[r(LAST.length)] ?? "McTestface";
  const n = r(10_000);
  return {
    firstName,
    lastName,
    email: `${firstName}.${lastName}.${n}@example.test`.toLowerCase(),
    phone: `+1213${"55501"}${String(r(100)).padStart(2, "0")}`,
  };
}
