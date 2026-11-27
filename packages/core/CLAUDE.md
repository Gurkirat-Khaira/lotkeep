# packages/core: shared kernel

- **Time:** read "now" only through an injected `Clock` (`SystemClock` in apps, `FixedClock` in tests).
- **Money:** `Cents` integers only. `percentOfCents` is the single rounding point (half-up). Never `* 0.015`.
- **Errors:** throw `AppError` via the helpers; `toErrorBody` builds `{ error, message?, details?, requestId }`. A 500 never exposes its message, and `details` is redacted.
- **Logging:** use `createLogger`. Redaction is by **key name** (`isSensitiveKey` in `redact.ts`), so:
  - put data in fields, never in the message: `log.info({ customerId }, "customer created")`, not `` log.info(`created ${ssn}`) ``;
  - no `%s`/`%o` format arguments, no PII in `msgPrefix` or error messages;
  - pino runs serializers after our redaction, so a new serializer must redact its own output.
- **Fakes:** `fakeVin()` / `fakePerson()` only; pass a seed for deterministic seeds and fixtures.
