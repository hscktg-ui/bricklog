/** dev 서버 실행 중: npm run daily:develop */
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
