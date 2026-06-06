/** dev 서버 실행 중: npm run daily:develop */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m || process.env[m[1]]) continue;
    process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}

const url = process.env.BRICLOG_URL || "http://127.0.0.1:3000";
const secret =
  process.env.BRICLOG_CRON_SECRET ||
  process.env.CRON_SECRET ||
  process.env.TREND_COLLECT_SECRET ||
  "dev";

const date = process.env.SNAPSHOT_DATE;
const force = process.env.FORCE === "1";
const qs = new URLSearchParams();
if (date) qs.set("date", date);
if (force) qs.set("force", "1");
const q = qs.toString() ? `?${qs}` : "";

const res = await fetch(`${url}/api/cron/daily-develop${q}`, {
  method: "POST",
  headers: { Authorization: `Bearer ${secret}` },
});
const body = await res.json();
console.log(res.status, body);
if (!res.ok) process.exit(1);
