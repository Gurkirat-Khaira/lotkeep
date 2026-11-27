import { expect, it } from "vitest";
import { FixedClock, SystemClock } from "../src/clock";

it("FixedClock advances", () => {
  const clock = new FixedClock("2026-10-01T08:00:00Z");
  expect(clock.now().toISOString()).toBe("2026-10-01T08:00:00.000Z");
  clock.advance(90 * 60_000);
  expect(clock.now().toISOString()).toBe("2026-10-01T09:30:00.000Z");
});

it("FixedClock returns a copy that callers cannot mutate", () => {
  const clock = new FixedClock("2026-10-01T08:00:00Z");
  clock.now().setUTCFullYear(1999);
  expect(clock.now().getUTCFullYear()).toBe(2026);
});

it("FixedClock rejects an invalid timestamp", () => {
  expect(() => new FixedClock("not a date")).toThrow();
});

it("SystemClock returns the current time", () => {
  const before = Date.now();
  const t = SystemClock.now().getTime();
  expect(t).toBeGreaterThanOrEqual(before);
});
