// Key-based redaction of PII and secrets, shared by the logger, error bodies and (Task 7) audit meta.
// It works on KEYS only: never put PII in log messages, msgPrefix or error messages (see CLAUDE.md).

const SENSITIVE_WORDS = new Set([
  // the plan's list
  "ssn",
  "dl",
  "dob",
  "password",
  "passwd",
  "token",
  "secret",
  "cookie",
  "authorization",
  // added after security review
  "otp",
  "totp",
  "credential",
  "passcode",
  "pin",
  "birthdate",
  "apikey",
]);
// Multi-word names, matched on the words joined with "_" (after singularizing).
const SENSITIVE_PHRASES =
  /(^|_)(driver_license|date_of_birth|birth_date|(api|private|master|access|secret|encryption|signing)_key|bank_account|(routing|account)_number|database_url)(_|$)/;
const SENSITIVE_SUFFIX = /(_ct|Ct|_bidx|Bidx)$/;
// Word boundaries: separators, lower→Upper ("dlNumber"), acronym→Word ("SSNLast4").
const WORD_SPLIT = /[_\-\s.]+|(?<=[a-z0-9])(?=[A-Z])|(?<=[A-Z])(?=[A-Z][a-z])/;

export const REDACTED = "[redacted]";

// "tokens" → "token", but "access" and "address" stay as they are.
const singular = (w: string) =>
  w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w;

/**
 * True if a key names PII or a secret. Matches whole words, so `deadline`, `middleName`,
 * `idempotencyKey` and `licensePlate` pass, while `dlNumber`, `accessToken` and `MASTER_KEY` don't.
 */
export function isSensitiveKey(key: string): boolean {
  if (SENSITIVE_SUFFIX.test(key)) return true;
  const words = key
    .split(WORD_SPLIT)
    .filter((w) => w.length > 0)
    .map((w) => singular(w.toLowerCase()));
  if (words.some((w) => SENSITIVE_WORDS.has(w))) return true;
  return SENSITIVE_PHRASES.test(words.join("_"));
}

/**
 * Returns a JSON-safe copy with values under sensitive keys replaced. Anything deeper than `depth`
 * becomes "[truncated]" (this also stops circular references). `toJSON()` is applied first,
 * because pino would call it after us otherwise.
 */
export function redactDeep(value: unknown, depth = 6): unknown {
  if (value === null || typeof value !== "object") return value;
  if (depth <= 0) return "[truncated]";
  if (value instanceof Date) return value;
  if (value instanceof Uint8Array) return `[binary ${value.byteLength} bytes]`;
  if (value instanceof Map) return "[Map]";
  if (value instanceof Set) return "[Set]";
  if (Array.isArray(value)) return value.map((v) => redactDeep(v, depth - 1));
  if (value instanceof Error) return redactError(value, depth);
  const toJSON = (value as { toJSON?: unknown }).toJSON;
  if (typeof toJSON === "function") return redactDeep(toJSON.call(value), depth - 1);
  return redactEntries(value, depth);
}

function redactEntries(value: object, depth: number): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) {
    out[k] = isSensitiveKey(k) ? REDACTED : redactDeep(v, depth - 1);
  }
  return out;
}

/** Errors keep type, message and stack (messages must not contain PII); extra fields are redacted. */
function redactError(e: Error, depth: number): Record<string, unknown> {
  const out: Record<string, unknown> = { type: e.name, message: e.message, stack: e.stack };
  Object.assign(out, redactEntries(e, depth));
  if (e.cause !== undefined) out.cause = redactDeep(e.cause, depth - 1);
  return out;
}
