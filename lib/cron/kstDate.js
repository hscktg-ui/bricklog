export const KST_TZ = "Asia/Seoul";

/** @returns {string} YYYY-MM-DD in KST */
export function kstDateString(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: KST_TZ }).format(date);
}

/** Calendar yesterday in KST (for midnight cron processing prior day). */
export function kstYesterdayDateString(now = new Date()) {
  const today = kstDateString(now);
  const [y, m, d] = today.split("-").map(Number);
  const noonUtc = Date.UTC(y, m - 1, d, 12, 0, 0);
  const prev = new Date(noonUtc - 86400000);
  return kstDateString(prev);
}

/** Inclusive KST calendar day as UTC ISO bounds. */
export function kstDayRangeIso(dateStr) {
  const start = new Date(`${dateStr}T00:00:00+09:00`);
  const end = new Date(`${dateStr}T23:59:59.999+09:00`);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}
