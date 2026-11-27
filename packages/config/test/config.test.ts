import { describe, expect, it } from "vitest";
import { ConfigError, loadConfig } from "../src/index";

// Throwaway values computed at runtime; never real secrets.
const key32 = Buffer.alloc(32, 7).toString("base64");
const valid = (): Record<string, string> => ({
  DATABASE_URL_OWNER: "postgres://dms_owner:test-owner-pw@127.0.0.1:5432/dms",
  DATABASE_URL_APP: "postgres://dms_app:test-app-pw@127.0.0.1:5432/dms",
  S3_ENDPOINT: "http://127.0.0.1:9000",
  S3_BUCKET: "dms-records",
  S3_ACCESS_KEY: "dms-app",
  S3_SECRET_KEY: "test-s3-secret-value",
  MASTER_KEY: key32,
});

describe("loadConfig", () => {
  it("accepts a valid environment and applies defaults", () => {
    const c = loadConfig(valid());
    expect(c.DMS_LOG_LEVEL).toBe("info");
    expect(c.DMS_WEB_ORIGIN).toBe("http://localhost:5173");
    expect(c.LICENSE_PUBLIC_KEY_PATH).toBe("packages/entitlements/keys/public.pem");
    expect(c.NODE_ENV).toBe("development");
  });

  it("config rejects MASTER_KEY of wrong length", () => {
    const short = Buffer.alloc(16, 7).toString("base64");
    expect(() => loadConfig({ ...valid(), MASTER_KEY: short })).toThrow(ConfigError);
    expect(() => loadConfig({ ...valid(), MASTER_KEY: "not base64 at all!" })).toThrow(
      /MASTER_KEY/,
    );
  });

  it("config error lists keys without values", () => {
    const env = valid();
    env.MASTER_KEY = "short-secret-value";
    env.S3_SECRET_KEY = "";
    delete env.DATABASE_URL_APP;
    let err: unknown;
    try {
      loadConfig(env);
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(ConfigError);
    const e = err as ConfigError;
    expect(e.keys).toEqual(["DATABASE_URL_APP", "MASTER_KEY", "S3_SECRET_KEY"]);
    const text = `${e.message} ${JSON.stringify(e)} ${String(e.stack)}`;
    expect(text).toContain("DATABASE_URL_APP");
    expect(text).not.toContain("short-secret-value");
    expect(text).not.toContain("test-owner-pw");
  });

  it("rejects a non-postgres database url and a bad log level", () => {
    expect(() => loadConfig({ ...valid(), DATABASE_URL_APP: "mysql://x@y/z" })).toThrow(
      /DATABASE_URL_APP/,
    );
    expect(() => loadConfig({ ...valid(), DMS_LOG_LEVEL: "loud" })).toThrow(/DMS_LOG_LEVEL/);
  });

  it("rejects the app and owner sharing one database url", () => {
    const env = valid();
    env.DATABASE_URL_APP = env.DATABASE_URL_OWNER ?? "";
    expect(() => loadConfig(env)).toThrow(/DATABASE_URL_APP/);
  });

  it("rejects an all-zero MASTER_KEY", () => {
    expect(() =>
      loadConfig({ ...valid(), MASTER_KEY: Buffer.alloc(32).toString("base64") }),
    ).toThrow(/MASTER_KEY/);
  });
});
