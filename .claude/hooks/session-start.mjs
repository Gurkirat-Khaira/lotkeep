// SessionStart: give Claude the current position in the plan and the latest progress note.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "./lib.mjs";

const lines = [];
const git = (...a) => spawnSync("git", a, { cwd: ROOT, encoding: "utf8" }).stdout?.trim() || "";
const branch = git("branch", "--show-current");
if (branch) lines.push(`Git branch: ${branch}. Last commit: ${git("log", "-1", "--format=%h %s")}`);

const plansDir = join(ROOT, "docs/superpowers/plans");
if (existsSync(plansDir)) {
  const plans = readdirSync(plansDir).filter((f) => f.endsWith(".md")).sort();
  for (const f of plans) {
    const text = readFileSync(join(plansDir, f), "utf8");
    const open = (text.match(/- \[ \]/g) || []).length;
    if (!open) continue;
    const done = (text.match(/- \[x\]/gi) || []).length;
    let task = "";
    for (const block of text.split(/\n(?=### Task )/)) {
      if (block.startsWith("### Task ") && block.includes("- [ ]")) { task = block.split("\n")[0].replace("### ", ""); break; }
    }
    lines.push(`Active plan: docs/superpowers/plans/${f} (${done} steps done, ${open} open). Next: ${task || "see plan"}.`);
    break;
  }
}

const progDir = join(ROOT, "docs/progress");
if (existsSync(progDir)) {
  const notes = readdirSync(progDir).filter((f) => f.endsWith(".md") && f !== "README.md")
    .sort((a, b) => statSync(join(progDir, b)).mtimeMs - statSync(join(progDir, a)).mtimeMs);
  if (notes[0]) {
    const head = readFileSync(join(progDir, notes[0]), "utf8").split("\n").slice(0, 25).join("\n");
    lines.push(`Latest progress note (docs/progress/${notes[0]}):\n${head}`);
  }
}
if (!existsSync(join(ROOT, "package.json"))) lines.push("Repo not scaffolded yet: start with Plan 1 Task 1. Don't overwrite CLAUDE.md, .claude/, brand/ or docs/.");
process.stdout.write(lines.join("\n") + "\n");
