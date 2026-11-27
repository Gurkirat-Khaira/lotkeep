// Shared helpers for Claude Code hooks. No dependencies.
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export const ROOT = process.env.CLAUDE_PROJECT_DIR || process.cwd();

export function readInput() {
  try {
    return JSON.parse(readFileSync(0, "utf8") || "{}");
  } catch {
    return {};
  }
}

export const hasRepo = () => existsSync(join(ROOT, "package.json"));
export const rel = (p) => (p && p.startsWith(ROOT) ? p.slice(ROOT.length + 1) : p || "");

/** Block the tool call (PreToolUse) or send feedback to Claude (PostToolUse/Stop). */
export function block(message) {
  process.stderr.write(`${message}\n`);
  process.exit(2);
}
