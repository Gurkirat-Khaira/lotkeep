import { describe, expect, it } from "vitest";
import { cents, clampCents, dollarsToCents, formatUSD, percentOfCents } from "../src/money";

describe("money", () => {
  it("percentOfCents rounds half-up (150 bp of 1333333 → 20000)", () => {
    expect(percentOfCents(cents(1333333), 150)).toBe(20000);
    expect(percentOfCents(cents(100), 50)).toBe(1); // 0.5 cent → 1
    expect(percentOfCents(cents(100), 49)).toBe(0); // 0.49 cent → 0
    expect(percentOfCents(cents(-100), 50)).toBe(-1); // symmetric for refunds
  });

  it("percentOfCents is exact beyond float precision", () => {
    expect(percentOfCents(cents(900_719_925_474_099), 10_000)).toBe(900_719_925_474_099);
  });

  it("percentOfCents rejects fractional basis points", () => {
    expect(() => percentOfCents(cents(100), 1.5)).toThrow();
  });

  it("cents rejects 1.5", () => {
    expect(() => cents(1.5)).toThrow();
    expect(() => cents(Number.NaN)).toThrow();
    expect(() => cents(2 ** 53)).toThrow();
    expect(cents(150)).toBe(150);
  });

  it("dollarsToCents parses commas", () => {
    expect(dollarsToCents("1,234.56")).toBe(123456);
    expect(dollarsToCents("$85")).toBe(8500);
    expect(dollarsToCents("0.5")).toBe(50);
    expect(dollarsToCents("-12.30")).toBe(-1230);
    expect(dollarsToCents("1234")).toBe(123400);
  });

  it("dollarsToCents rejects malformed input", () => {
    for (const bad of ["", "1.234", "12,34", "abc", "1,2345.00", "1e3", " 5"]) {
      expect(() => dollarsToCents(bad), bad).toThrow();
    }
  });

  it("formatUSD es uses es-US format", () => {
    const es = formatUSD(cents(123456), "es");
    expect(es).toBe(
      new Intl.NumberFormat("es-US", { style: "currency", currency: "USD" }).format(1234.56),
    );
    expect(es).not.toBe(
      new Intl.NumberFormat("es-ES", { style: "currency", currency: "USD" }).format(1234.56),
    );
    expect(formatUSD(cents(123456), "en")).toBe("$1,234.56");
    expect(formatUSD(cents(-5), "en")).toBe("-$0.05");
  });

  it("clampCents keeps a value inside the range", () => {
    expect(clampCents(cents(150_00), cents(200_00), cents(600_00))).toBe(200_00);
    expect(clampCents(cents(700_00), cents(200_00), cents(600_00))).toBe(600_00);
    expect(clampCents(cents(300_00), cents(200_00), cents(600_00))).toBe(300_00);
    expect(() => clampCents(cents(1), cents(5), cents(2))).toThrow();
  });
});
