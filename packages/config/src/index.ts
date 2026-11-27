// @dms/config: typed, validated settings from the environment. Fails fast at startup.
// Errors name the bad keys and a generic reason only. They never contain a value.
import { z } from "zod";

const postgresUrl = z.string().regex(/^postgres(ql)?:\/\/[^\s]+$/, "must be a postgres:// URL");
const httpUrl = z.url({ protocol: /^https?$/ });

const masterKey = z.string().refine((s) => {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(s)) return false;
  const bytes = Buffer.from(s, "base64");
  return bytes.length === 32 && bytes.some((b) => b !== 0); // an all-zero key is a placeholder
}, "must be base64 of exactly 32 random bytes");

export const configSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL_OWNER: postgresUrl,
    DATABASE_URL_APP: postgresUrl,
    S3_ENDPOINT: httpUrl,
    S3_BUCKET: z.string().regex(/^[a-z0-9][a-z0-9.-]{2,62}$/, "must be an S3 bucket name"),
    S3_ACCESS_KEY: z.string().min(3),
    S3_SECRET_KEY: z.string().min(8),
    MASTER_KEY: masterKey,
    LICENSE_PUBLIC_KEY_PATH: z.string().min(1).default("packages/entitlements/keys/public.pem"),
    DMS_WEB_ORIGIN: httpUrl.default("http://localhost:5173"),
    DMS_LOG_LEVEL: z
      .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
      .default("info"),
  })
  .refine((c) => c.DATABASE_URL_APP !== c.DATABASE_URL_OWNER, {
    // The app pool must use dms_app (NOBYPASSRLS); sharing the owner URL would bypass RLS.
    path: ["DATABASE_URL_APP"],
    message: "must differ from DATABASE_URL_OWNER",
  });

export type Config = z.infer<typeof configSchema>;

/** Thrown by loadConfig. `keys` lists the missing or invalid settings, sorted; no values. */
export class ConfigError extends Error {
  override readonly name = "ConfigError";
  readonly keys: string[];

  constructor(problems: { key: string; reason: string }[]) {
    super(
      `Invalid configuration:\n${problems.map((p) => `  - ${p.key}: ${p.reason}`).join("\n")}\n` +
        "See .env.example and run scripts/setup.sh.",
    );
    this.keys = problems.map((p) => p.key);
  }

  toJSON() {
    return { name: this.name, keys: this.keys };
  }
}

export function loadConfig(env: Record<string, string | undefined> = process.env): Config {
  // Treat empty strings as missing, so `KEY=` in an env file fails clearly.
  const input = Object.fromEntries(
    Object.keys(configSchema.shape).map((k) => [k, env[k] === "" ? undefined : env[k]]),
  );
  const result = configSchema.safeParse(input);
  if (result.success) return result.data;

  const byKey = new Map<string, string>();
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? "(root)");
    if (byKey.has(key)) continue;
    // Our own fixed wording, never Zod's message, so no input value can leak.
    byKey.set(key, input[key] === undefined ? "missing" : "invalid");
  }
  throw new ConfigError(
    [...byKey].sort(([a], [b]) => a.localeCompare(b)).map(([key, reason]) => ({ key, reason })),
  );
}
