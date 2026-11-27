// Reads docker/compose.dev.yml so tests can check how services are exposed.
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

const COMPOSE = join(
  resolve(dirname(fileURLToPath(import.meta.url)), "../../../.."),
  "docker/compose.dev.yml",
);

type Service = {
  ports?: (string | { host_ip?: string; published?: string; target?: number })[];
  network_mode?: string;
};

const services = (): Record<string, Service> =>
  (parse(readFileSync(COMPOSE, "utf8")) as { services: Record<string, Service> }).services;

/** Every service in the compose file, with its definition. */
export const composeServices = (): [string, Service][] => Object.entries(services());

/** Published ports of a service as "host_ip:published:target" strings (short syntax as written). */
export function composePorts(service: string): string[] {
  const svc = services()[service];
  if (!svc) throw new Error(`service ${service} not found in compose.dev.yml`);
  return (svc.ports ?? []).map((p) =>
    typeof p === "string" ? p : `${p.host_ip ?? ""}:${p.published ?? ""}:${p.target ?? ""}`,
  );
}
