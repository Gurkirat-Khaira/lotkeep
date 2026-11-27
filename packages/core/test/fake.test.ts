import { expect, it } from "vitest";
import { fakePerson, fakeVin, vinCheckDigit } from "../src/fake";
import { newId } from "../src/ids";

it("fakeVin passes check digit and contains FAKE", () => {
  for (let i = 0; i < 200; i++) {
    const vin = fakeVin();
    expect(vin).toMatch(/^[A-HJ-NPR-Z0-9]{17}$/);
    expect(vin.slice(11, 15)).toBe("FAKE"); // positions 12–15
    expect(vin[8]).toBe(vinCheckDigit(vin));
    expect("ABCDEFGHJKLMNPRSTVWXY123456789").toContain(vin[9]); // valid model-year code
  }
});

it("fakeVin is deterministic with a seed", () => {
  expect(fakeVin(42)).toBe(fakeVin(42));
  expect(fakeVin(42)).not.toBe(fakeVin(43));
});

it("fakePerson is obviously fictional", () => {
  const p = fakePerson(1);
  expect(p.email).toMatch(/@example\.test$/);
  expect(p.phone).toMatch(/^\+1\d{3}55501\d{2}$/); // 555-0100…0199 are reserved fictional numbers
  expect(fakePerson(1)).toEqual(p);
});

it("newId returns a time-ordered UUIDv7", () => {
  const a = newId();
  const b = newId();
  expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  expect(a < b).toBe(true);
});
