import { Writable } from "node:stream";
import { describe, expect, it } from "vitest";
import { createLogger, isSensitiveKey, redactDeep } from "../src/log";

function capture() {
  const lines: string[] = [];
  const stream = new Writable({
    write(chunk, _enc, cb) {
      lines.push(String(chunk));
      cb();
    },
  });
  return { lines, stream };
}

describe("PII redaction", () => {
  it("logger redacts pii keys", () => {
    const { lines, stream } = capture();
    const log = createLogger({ DMS_LOG_LEVEL: "info" }, stream);
    log.info({ ssn: "123-45-6789", nested: { dl_ct: "x" } }, "customer created");
    const out = lines.join("");
    expect(out).not.toContain("123-45-6789");
    expect(out).not.toContain('"x"');
    expect(out).toContain('"ssn":"[redacted]"');
    expect(out).toContain("customer created");
  });

  it("logger redacts child bindings and request headers", () => {
    const { lines, stream } = capture();
    const log = createLogger({ DMS_LOG_LEVEL: "info" }, stream).child({ accessToken: "tok-1" });
    log.info({ req: { headers: { authorization: "Bearer abc", cookie: "sid=1", host: "h" } } });
    const out = lines.join("");
    for (const secret of ["tok-1", "Bearer abc", "sid=1"]) expect(out).not.toContain(secret);
    expect(out).toContain('"host":"h"');
  });

  it("logger redacts bindings of grandchild loggers", () => {
    const { lines, stream } = capture();
    createLogger({ DMS_LOG_LEVEL: "info" }, stream)
      .child({ requestId: "r1" })
      .child({ customer: { ssn: "000-11-2222" } })
      .info("nested");
    expect(lines.join("")).not.toContain("000-11-2222");
    expect(lines.join("")).toContain('"requestId":"r1"');
  });

  it("logger redacts values produced by toJSON", () => {
    const { lines, stream } = capture();
    createLogger({ DMS_LOG_LEVEL: "info" }, stream).info({
      tj: { toJSON: () => ({ ssn: "000-22-3333" }) },
    });
    expect(lines.join("")).not.toContain("000-22-3333");
  });

  it("logger redacts setBindings on root and child loggers", () => {
    const { lines, stream } = capture();
    const root = createLogger({ DMS_LOG_LEVEL: "info" }, stream);
    const child = root.child({ requestId: "r2" });
    child.setBindings({ token: "tok-2233" });
    child.info("after setBindings");
    root.setBindings({ secret: "sec-4455" });
    root.info("root");
    const out = lines.join("");
    expect(out).not.toContain("tok-2233");
    expect(out).not.toContain("sec-4455");
  });

  it("logger keeps error type, message and stack and redacts error fields", () => {
    const { lines, stream } = capture();
    const err = Object.assign(new TypeError("boom"), { ssn: "000-33-4444" });
    createLogger({ DMS_LOG_LEVEL: "info" }, stream).error({ err }, "failed");
    const line = JSON.parse(lines.join(""));
    expect(line.err.type).toBe("TypeError");
    expect(line.err.message).toBe("boom");
    expect(line.err.stack).toContain("TypeError: boom");
    expect(JSON.stringify(line)).not.toContain("000-33-4444");
  });

  it("logger summarizes binary data, maps and sets", () => {
    expect(
      redactDeep({ b: Buffer.from("abc"), m: new Map([["ssn", "x"]]), s: new Set([1]) }),
    ).toEqual({
      b: "[binary 3 bytes]",
      m: "[Map]",
      s: "[Set]",
    });
  });

  it("isSensitiveKey allows deadline and middleName", () => {
    for (const k of [
      "deadline",
      "middleName",
      "dealerId",
      "dollars",
      "adlib",
      "tokenizer_version",
      "idempotencyKey",
      "licensePlate",
      "dealerLicenseNumber",
      "keyVersion",
      "pinned",
      "address",
    ]) {
      expect(isSensitiveKey(k), k).toBe(false);
    }
  });

  it("isSensitiveKey blocks ssn, dlNumber, dob, ssn_ct, accessToken", () => {
    for (const k of [
      "ssn",
      "dlNumber",
      "dob",
      "ssn_ct",
      "accessToken",
      "SSN",
      "customerSSNLast4",
      "dl-state",
      "password",
      "passwd",
      "client_secret",
      "set-cookie",
      "Authorization",
      "bankAccountCt",
      "ssn_bidx",
      "driverLicense",
      "drivers_license_number",
      "dateOfBirth",
      "birthDate",
      "birthdate",
      "apiKey",
      "x-api-key",
      "privateKey",
      "masterKey",
      "MASTER_KEY",
      "S3_ACCESS_KEY",
      "DATABASE_URL_APP",
      "bankAccount",
      "routingNumber",
      "accountNumber",
      "credentials",
      "passcode",
      "pinCode",
      "tokens",
      "passwords",
      "ssns",
    ]) {
      expect(isSensitiveKey(k), k).toBe(true);
    }
  });

  it("redactDeep copies, recurses into arrays and truncates deep values", () => {
    const input = { list: [{ dob: "1990-01-01" }], keep: 1 };
    const out = redactDeep(input) as typeof input;
    expect(out).toEqual({ list: [{ dob: "[redacted]" }], keep: 1 });
    expect(input.list[0]?.dob).toBe("1990-01-01");
    const deep = { a: { b: { c: { ssn: "000-12-3456" } } } };
    expect(JSON.stringify(redactDeep(deep, 2))).not.toContain("000-12-3456");
  });
});
