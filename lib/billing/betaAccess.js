/** Beta: all accounts receive studio entitlements until the cutoff (exclusive). */

const DEFAULT_BETA_UNTIL = "2026-06-01";

export function getBetaFullAccessUntil() {
  return (process.env.BETA_FULL_ACCESS_UNTIL || DEFAULT_BETA_UNTIL).trim();
}

export function isBetaFullAccessActive(now = new Date()) {
  const untilRaw = getBetaFullAccessUntil();
  if (!untilRaw) return false;
  const end = new Date(`${untilRaw}T00:00:00`);
  if (Number.isNaN(end.getTime())) return false;
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
