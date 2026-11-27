// Small file-system helpers for repo-level tests. No dependencies beyond Node.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const abs = (p: string) => join(ROOT, p);

export const exists = (p: string): boolean => existsSync(abs(p));
export const read = (p: string): string => readFileSync(abs(p), "utf8");
export const size = (p: string): number => statSync(abs(p)).size;
export const lines = (p: string): number => read(p).split("\n").length;

type ClaudeSettings = {
  permissions: { allow?: string[]; ask?: string[]; deny: string[] };
};
export const settings = (): ClaudeSettings => JSON.parse(read(".claude/settings.json"));

export const brandName = (): string => {
  const name = JSON.parse(read("brand/brand.json")).name;
  if (typeof name !== "string" || name.length < 3) throw new Error("brand.json has no usable name");
  return name;
};

/** Converts a glob (`*`, `**`, `?`) to an anchored RegExp over repo-relative paths. */
export function globToRegExp(pattern: string): RegExp {
  let re = "";
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i] as string;
    if (ch === "*") {
      if (pattern[i + 1] === "*") {
        const slash = pattern[i + 2] === "/";
        re += slash ? "(?:.*/)?" : ".*";
        i += slash ? 2 : 1;
      } else {
        re += "[^/]*";
      }
    } else if (ch === "?") {
      re += "[^/]";
    } else {
      re += ch.replace(/[.+^${}()|[\]\\]/g, "\\$&");
    }
  }
  return new RegExp(`^${re}$`);
}

/** Files git would track: committed, staged, or untracked but not ignored. */
export function repoFiles(): string[] {
  const out = execFileSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    {
      cwd: ROOT,
      encoding: "utf8",
    },
  );
  return out
    .split("\0")
    .filter(Boolean)
    .filter((f) => existsSync(abs(f)));
}

export const glob = (pattern: string): string[] => {
  const re = globToRegExp(pattern);
  return repoFiles().filter((f) => re.test(f));
};

/** Files already in the git index (staged or committed). */
export function gitTracked(pattern: string): string[] {
  const out = execFileSync("git", ["ls-files", "--cached", "-z"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  const re = globToRegExp(pattern);
  return out
    .split("\0")
    .filter(Boolean)
    .filter((f) => re.test(f.split("/").pop() ?? f) || re.test(f));
}

/** Every source file under packages/ee (src, test, scripts…), not just src/. */
export const eeSources = (): string[] =>
  glob("packages/ee/**").filter((f) => /\.(m?[jt]sx?|sql|css)$/.test(f));

const BINARY = /\.(png|jpe?g|gif|ico|webp|pdf|zip|gz|woff2?|ttf|otf)$/i;

export function filesContaining(
  needle: string,
  opts: { caseSensitive: boolean; exclude: string[] },
): string[] {
  const excluded = opts.exclude.map(globToRegExp);
  const hit = opts.caseSensitive
    ? (s: string) => s.includes(needle)
    : (s: string) => s.toLowerCase().includes(needle.toLowerCase());
  return repoFiles().filter(
    (f) => !BINARY.test(f) && !excluded.some((re) => re.test(f)) && (hit(f) || hit(read(f))),
  );
}

/** Reads simple `key: value` YAML frontmatter (enough for SKILL.md files). */
export function frontmatter(p: string): Record<string, string> {
  const m = read(p).match(/^---\n([\s\S]*?)\n---/);
  if (!m?.[1]) return {};
  const out: Record<string, string> = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^([\w-]+):\s*(.*)$/);
    if (kv?.[1]) out[kv[1]] = (kv[2] ?? "").replace(/^["']|["']$/g, "");
  }
  return out;
}
