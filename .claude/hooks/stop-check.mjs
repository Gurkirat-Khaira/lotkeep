// Stop: before Claude finishes, typecheck and test the packages changed since HEAD. Failures go back to Claude.
// Quietly does nothing until the repo can run checks (no commit yet, no install yet, nothing changed).
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { connect } from "node:net";
import { join } from "node:path";
import { ROOT, block, hasRepo, readInput } from "./lib.mjs";

const input = readInput();
if (input.stop_hook_active || !hasRepo()) process.exit(0); // nothing to check before Task 1

// Loop guard that doesn't depend on stop_hook_active: block at most twice per session, then let Claude stop and report.
const MAX_BLOCKS = 2;
const counterFile = join(tmpdir(), `dms-stop-check-${String(input.session_id || "nosession").replace(/[^\w-]/g, "")}.json`);
const readCount = () => { try { return JSON.parse(readFileSync(counterFile, "utf8")).count || 0; } catch { return 0; } };
const setCount = (n) => { try { writeFileSync(counterFile, JSON.stringify({ count: n })); } catch {} };
const git = (...a) => spawnSync("git", a, { cwd: ROOT, encoding: "utf8" });
if (git("rev-parse", "--verify", "HEAD").status !== 0) process.exit(0); // no first commit yet
if (!existsSync(join(ROOT, "node_modules", ".bin", "turbo"))) process.exit(0); // pnpm install not run yet

const changed = git("status", "--porcelain").stdout.trim();
if (!changed) process.exit(0);
if (!changed.split("\n").some((l) => /\.(m?[jt]sx?|json|sql|ya?ml|css)$/.test(l.trim()))) process.exit(0);

// Database tests need Postgres (Docker). If it isn't reachable, typecheck only and say so.
const dbUp = await new Promise((resolve) => {
  const s = connect({ host: "127.0.0.1", port: 5432, timeout: 800 });
  s.on("connect", () => { s.destroy(); resolve(true); });
  s.on("timeout", () => { s.destroy(); resolve(false); });
  s.on("error", () => resolve(false));
});
const tasks = dbUp ? ["typecheck", "test"] : ["typecheck"];
const r = spawnSync("pnpm", ["turbo", "run", ...tasks, "--filter=...[HEAD]", "--output-logs=errors-only"], {
  cwd: ROOT,
  encoding: "utf8",
  env: { ...process.env, CI: "1" },
});
if (r.status !== 0) {
  const n = readCount();
  if (n >= MAX_BLOCKS) {
    setCount(0);
    process.stdout.write(JSON.stringify({ systemMessage: `Stop check still failing after ${MAX_BLOCKS} attempts: ${tasks.join(" + ")} has errors. Claude should report them to the owner.` }));
    process.exit(0);
  }
  setCount(n + 1);
  const out = `${r.stdout}\n${r.stderr}`.trim().split("\n").slice(-60).join("\n");
  block(`${tasks.join(" + ")} failed for changed packages (attempt ${n + 1} of ${MAX_BLOCKS}). Fix before finishing, or explain to the owner why you can't:\n${out}`);
}
setCount(0);
if (!dbUp) {
  process.stdout.write(JSON.stringify({ systemMessage: "Stop check: typecheck passed; tests skipped because Postgres isn't reachable on 127.0.0.1:5432 (is Docker running? `pnpm dev:up`)." }));
}
process.exit(0);
