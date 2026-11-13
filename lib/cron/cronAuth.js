/**
 * Vercel Cron Jobs call GET with Authorization: Bearer $CRON_SECRET
 * when CRON_SECRET is set on the project. Manual ops may use
 * BRICLOG_CRON_SECRET / TREND_COLLECT_SECRET — accept any configured match.
 */

export function getCronSecretCandidates() {
  return [
    process.env.CRON_SECRET,
    process.env.BRICLOG_CRON_SECRET,
    process.env.TREND_COLLECT_SECRET,
  ]
    .map((s) => (typeof s === "string" ? s.trim() : ""))
    .filter(Boolean);
}

/**
 * @param {Request} request
 * @returns {{ ok: true } | { ok: false, status: number, error: string }}
 */
export function authorizeCronRequest(request) {
  const candidates = getCronSecretCandidates();
  if (!candidates.length) {
    return { ok: false, status: 503, error: "cron_secret_not_configured" };
  }

  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token || !candidates.includes(token)) {
    return { ok: false, status: 401, error: "unauthorized" };
  }

  return { ok: true };
}
