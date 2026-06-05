import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envText = readFileSync(resolve(root, ".env.local"), "utf8");
const line = envText.split(/\r?\n/).find((l) => l.startsWith("BRICLOG_CRON_SECRET="));
const secret = line ? line.slice("BRICLOG_CRON_SECRET=".length).trim() : "";

if (!secret) {
  console.error("BRICLOG_CRON_SECRET missing");
  process.exit(1);
}

const base =
  process.env.CRON_TEST_URL || "https://bricklog.vercel.app/api/cron/daily-develop";
const res = await fetch(base, {
  method: "POST",
  headers: { Authorization: `Bearer ${secret}` },
});
const body = await res.text();
console.log("status:", res.status);
try {
  console.log(JSON.stringify(JSON.parse(body), null, 2));
} catch {
  console.log(body.slice(0, 500));
}
