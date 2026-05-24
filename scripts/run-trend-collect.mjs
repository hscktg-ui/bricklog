/** dev 서버 실행 중: npm run trends:collect */
const url = process.env.BRICLOG_URL || "http://127.0.0.1:3000";
const secret = process.env.CRON_SECRET || process.env.TREND_COLLECT_SECRET || "dev";

const res = await fetch(`${url}/api/trends/collect`, {
  method: "POST",
  headers: { Authorization: `Bearer ${secret}` },
});
const body = await res.json();
console.log(res.status, body);
if (!res.ok) process.exit(1);
