// PreToolUse guard: protects secrets and keeps real-looking personal data out of the repo.
import { basename } from "node:path";
import { block, readInput, rel } from "./lib.mjs";

const input = readInput();
const tool = input.tool_name;
const ti = input.tool_input || {};

// 2. Real-looking personal data (used for file edits and Bash commands)
function scanForRealData(texts, where) {
  for (const text of texts) {
    for (const line of String(text).split("\n")) {
      if (line.includes("synthetic-ok")) continue;
      for (const m of line.matchAll(/\b(\d{3})-(\d{2})-(\d{4})\b/g)) {
        const [full, area] = m;
        const synthetic = area === "000" || area.startsWith("9") || full === "123-45-6789";
        if (!synthetic) block(`Blocked: "${full}" in ${where} looks like a real SSN. Use 000-xx-xxxx, 9xx-xx-xxxx or 123-45-6789 for test data.`);
      }
      for (const m of line.matchAll(/\b[A-HJ-NPR-Z0-9]{17}\b/g)) {
        const vin = m[0];
        if (/\d/.test(vin) && /[A-Z]/.test(vin) && !vin.includes("FAKE")) {
          block(`Blocked: "${vin}" in ${where} looks like a real VIN. Use fakeVin() (contains FAKE), or add "synthetic-ok" on the line if it is not a VIN.`);
        }
      }
    }
  }
}

// 1. Secret files
const SECRET_PATH = [
  /(^|\/)\.env(\.(?!example$)[^/]+)?$/, // .env, .env.local … but not .env.example
  /(^|\/)secrets\//,
  /private[^/]*\.pem$/,
  /\.key$/,
  /(^|\/)backups\//,
];
if (tool === "Bash") {
  const cmd = String(ti.command || "");
  const touchesEnv = /(^|[\s'"=<>/])\.env(\.(?!example\b)[\w.-]+)?(\s|$|['"])/.test(cmd);
  if (touchesEnv || /printenv\s+(MASTER_KEY|S3_SECRET_KEY)|echo\s+\$?(MASTER_KEY|S3_SECRET_KEY)/.test(cmd)) {
    block("Blocked: this command reads or prints secrets (.env / keys). Use .env.example or @dms/config instead.");
  }
  scanForRealData([cmd], "this command"); // heredocs and echo > file go through Bash too
  process.exit(0);
}

const path = rel(ti.file_path || "");
if (path && SECRET_PATH.some((re) => re.test(path))) {
  block(`Blocked: ${path} is a secret or backup location. Ask the owner to change it by hand.`);
}

const texts = [];
if (typeof ti.content === "string") texts.push(ti.content);
if (typeof ti.new_string === "string") texts.push(ti.new_string);
if (Array.isArray(ti.edits)) for (const e of ti.edits) if (typeof e.new_string === "string") texts.push(e.new_string);
const name = basename(path);
const skip = /\.(svg|png|jpe?g|pdf|lock)$/i.test(name) || name === "pnpm-lock.yaml";
if (!skip) scanForRealData(texts, path || "the new content");
process.exit(0);
