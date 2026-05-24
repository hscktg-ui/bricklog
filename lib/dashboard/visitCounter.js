/**
 * 로그인 대시보드 당일 방문 횟수 (localStorage, 토큰 미저장)
 */

/** @param {Date} [date] */
export function getDailyVisitStorageKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `briclog-visits-${y}-${m}-${d}`;
}

/**
 * 오늘 방문 1회 증가 후 당일 누적 횟수 반환
 * @param {Date} [date]
 * @returns {number}
 */
export function recordDashboardVisit(date = new Date()) {
  if (typeof window === "undefined") return 1;
  try {
    const key = getDailyVisitStorageKey(date);
    const raw = localStorage.getItem(key);
    const prev = raw !== null ? parseInt(raw, 10) : 0;
    const next = Number.isNaN(prev) ? 1 : prev + 1;
    localStorage.setItem(key, String(next));
    return next;
  } catch {
    return 1;
  }
}
