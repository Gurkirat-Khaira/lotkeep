// pino JSON logger with PII redaction. Never log request bodies on PII routes, and never work
// around this redaction. pino's `redact` handles fixed paths; key rules (e.g. *_ct) need
// redactDeep, applied to every log object, child binding and setBindings call.
// Order matters: pino runs formatters.log BEFORE serializers, so serializers would see (and emit)
// un-redacted data. We therefore shape errors inside redactDeep and make `err` an identity
// serializer. Any serializer added later (e.g. req in Task 8/12) must redact its own output.
import pino, { type DestinationStream, type Logger } from "pino";
import { REDACTED, redactDeep } from "./redact";

export type LogLevel = "fatal" | "error" | "warn" | "info" | "debug" | "trace" | "silent";

export { isSensitiveKey, REDACTED, redactDeep } from "./redact";

export function createLogger(
  config: { DMS_LOG_LEVEL?: LogLevel },
  destination?: DestinationStream,
): Logger {
  const options: pino.LoggerOptions = {
    level: config.DMS_LOG_LEVEL ?? "info",
    redact: {
      paths: ["req.headers.authorization", "req.headers.cookie", 'res.headers["set-cookie"]'],
      censor: REDACTED,
    },
    formatters: {
      log: (obj) => redactDeep(obj) as Record<string, unknown>,
      bindings: (b) => redactDeep(b) as Record<string, unknown>,
    },
    serializers: { err: (e: unknown) => e }, // already shaped and redacted by redactDeep
    timestamp: pino.stdTimeFunctions.isoTime,
  };
  return guardChildren(destination ? pino(options, destination) : pino(options));
}

/**
 * pino's `formatters.bindings` only sees the root logger's base fields, not `.child({...})` or
 * `setBindings({...})`. Child loggers inherit from their parent's prototype, so overriding both
 * once on the root covers every descendant; `this` is the logger the call was made on.
 */
function guardChildren(root: Logger): Logger {
  type ChildFn = (this: Logger, bindings: pino.Bindings, opts?: pino.ChildLoggerOptions) => Logger;
  type SetBindingsFn = (this: Logger, bindings: pino.Bindings) => void;
  const realChild = root.child as unknown as ChildFn;
  const realSetBindings = root.setBindings as unknown as SetBindingsFn;
  const target = root as unknown as { child: ChildFn; setBindings: SetBindingsFn };
  target.child = function child(bindings, opts) {
    return realChild.call(this, redactDeep(bindings) as pino.Bindings, opts);
  };
  target.setBindings = function setBindings(bindings) {
    realSetBindings.call(this, redactDeep(bindings) as pino.Bindings);
  };
  return root;
}

export type { Logger };
