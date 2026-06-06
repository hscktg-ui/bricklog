/** KST 기준 오늘 00:00 ISO */
export function startOfTodayKstIso() {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(new Date());
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const d = parts.find((p) => p.type === "day")?.value;
  return new Date(`${y}-${m}-${d}T00:00:00+09:00`).toISOString();
}

export function minutesAgoIso(minutes = 5) {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}
