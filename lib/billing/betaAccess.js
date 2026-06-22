/** Beta: all accounts receive studio entitlements until the cutoff (inclusive calendar day). */

export const DEFAULT_BETA_UNTIL = "2026-06-30";

export function getBetaFullAccessUntil() {
  return (process.env.BETA_FULL_ACCESS_UNTIL || DEFAULT_BETA_UNTIL).trim();
}

/**
 * @param {string} untilRaw YYYY-MM-DD — 해당 날짜 당일 23:59까지 이용 (8/1까지 = 8월 1일 포함)
 * @returns {Date|null} exclusive upper bound (next day 00:00)
 */
export function parseBetaEndExclusive(untilRaw) {
  if (!untilRaw) return null;
  const end = new Date(`${untilRaw}T00:00:00`);
  if (Number.isNaN(end.getTime())) return null;
  end.setDate(end.getDate() + 1);
  return end;
}

export function isBetaFullAccessActive(now = new Date()) {
  if (process.env.BRICLOG_BETA_FULL_ACCESS === "false") return false;
  // Vercel production: 베타 무제한 해제(정식 과금·무료 한도). 명시 true일 때만 유지
  if (
    process.env.VERCEL_ENV === "production" &&
    process.env.BRICLOG_BETA_FULL_ACCESS !== "true"
  ) {
    return false;
  }
  const untilRaw = getBetaFullAccessUntil();
  const end = parseBetaEndExclusive(untilRaw);
  if (!end) return false;
  return now < end;
}

export function betaPlanOverride(now = new Date()) {
  if (!isBetaFullAccessActive(now)) return null;
  return {
    planId: "studio",
    source: "beta_period",
    bypassQuotas: true,
  };
}
