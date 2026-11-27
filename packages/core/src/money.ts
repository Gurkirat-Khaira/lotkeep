// Money is integer cents (never floats). Percentages are basis points (1 bp = 0.01%).
// Rounding happens in exactly one place: percentOfCents (half-up, symmetric for negatives).

export type Cents = number & { readonly __brand: "Cents" };

export function cents(n: number): Cents {
  if (!Number.isSafeInteger(n)) throw new RangeError(`cents: expected a safe integer, got ${n}`);
  return n as Cents;
}

/** Parses "1,234.56", "$85", "-12.30" into cents. Commas must be thousands separators. */
export function dollarsToCents(input: string): Cents {
  const m = /^(-)?\$?(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?$/.exec(input);
  if (!m) throw new RangeError("dollarsToCents: not a dollar amount");
  const [, sign, whole = "", frac = ""] = m;
  const value = BigInt(whole.replaceAll(",", "")) * 100n + BigInt(frac.padEnd(2, "0"));
  return toCents(sign ? -value : value);
}

/** Basis points of an amount, rounded half-up to the cent (half away from zero for negatives). */
export function percentOfCents(c: Cents, basisPoints: number): Cents {
  if (!Number.isSafeInteger(basisPoints)) {
    throw new RangeError("percentOfCents: basis points must be an integer");
  }
  const product = BigInt(c) * BigInt(basisPoints);
  const negative = product < 0n;
  const abs = negative ? -product : product;
  const rounded = (abs + 5_000n) / 10_000n; // BigInt division truncates
  return toCents(negative ? -rounded : rounded);
}

export function clampCents(c: Cents, min: Cents, max: Cents): Cents {
  if (min > max) throw new RangeError("clampCents: min is greater than max");
  return Math.min(Math.max(c, min), max) as Cents;
}

const LOCALES = { en: "en-US", es: "es-US" } as const;

/** Formats cents as US dollars for display. Exact: formats a decimal string, not a float. */
export function formatUSD(c: Cents, locale: "en" | "es"): string {
  const abs = BigInt(c) < 0n ? -BigInt(c) : BigInt(c);
  const decimal = `${c < 0 ? "-" : ""}${abs / 100n}.${String(abs % 100n).padStart(2, "0")}`;
  const fmt = new Intl.NumberFormat(LOCALES[locale], { style: "currency", currency: "USD" });
  return fmt.format(decimal as unknown as number); // Intl accepts decimal strings exactly
}

function toCents(v: bigint): Cents {
  if (v > BigInt(Number.MAX_SAFE_INTEGER) || v < BigInt(Number.MIN_SAFE_INTEGER)) {
    throw new RangeError("amount is outside the safe integer range");
  }
  return Number(v) as Cents;
}
