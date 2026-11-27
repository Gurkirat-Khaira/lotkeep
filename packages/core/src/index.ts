// @dms/core: the shared kernel (clock, money, errors, ids, logging, synthetic fakes).

/** Neutral internal product id. The display name lives only in brand/ (read via @dms/brand). */
export const PRODUCT = { id: "dms" } as const;

export { type Clock, FixedClock, SystemClock } from "./clock";
export {
  AppError,
  conflict,
  type ErrorBody,
  type ErrorStatus,
  forbidden,
  invalid,
  notFound,
  toErrorBody,
} from "./errors";
export { type FakePerson, fakePerson, fakeVin, vinCheckDigit } from "./fake";
export { isUuid, newId } from "./ids";
export {
  createLogger,
  isSensitiveKey,
  type Logger,
  type LogLevel,
  REDACTED,
  redactDeep,
} from "./log";
export { type Cents, cents, clampCents, dollarsToCents, formatUSD, percentOfCents } from "./money";
