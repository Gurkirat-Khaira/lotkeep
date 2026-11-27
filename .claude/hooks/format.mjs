// PostToolUse: format and lint the edited file with Biome; report remaining problems to Claude.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { ROOT, block, hasRepo, readInput } from "./lib.mjs";

const input = readInput();
const file = input.tool_input?.file_path;
const biome = join(ROOT, "node_modules", ".bin", "biome");
if (!file || !hasRepo() || !existsSync(biome) || !/\.(m?[jt]sx?|json|jsonc|css)$/.test(file)) process.exit(0);

const r = spawnSync(biome, ["check", "--write", "--no-errors-on-unmatched", file], { cwd: ROOT, encoding: "utf8" });
if (r.status !== 0) {
  const out = `${r.stdout}\n${r.stderr}`.trim().split("\n").slice(-40).join("\n");
  block(`Biome found problems in ${file} that it could not fix automatically:\n${out}`);
}
process.exit(0);
