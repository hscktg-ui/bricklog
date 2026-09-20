/**
 * Cross-platform BASE_URL default for :prod npm scripts.
 * Usage: node scripts/run-with-base-url.mjs https://briclog.ai scripts/channel-sla-smoke.mjs
 */
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const [defaultBase, ...rest] = process.argv.slice(2);
if (!defaultBase || !rest.length) {
  console.error("Usage: node scripts/run-with-base-url.mjs <defaultBase> <script> [args...]");
  process.exit(1);
}

const env = {
  ...process.env,
  BASE_URL: process.env.BASE_URL || defaultBase,
};
const script = rest[0];
const args = rest.slice(1);
const result = spawnSync(process.execPath, [script, ...args], {
  stdio: "inherit",
  env,
  cwd: root,
});
process.exit(result.status ?? 1);
