import { NextResponse } from "next/server";
import { requireUser, isAdminEmail } from "@/lib/api/auth";
import { checkRateLimit, getClientIp } from "@/lib/api/rateLimit";

const ADMIN_RATE_MAX =
  Number(process.env.BRICLOG_ADMIN_RATE_LIMIT_PER_MIN) || 40;

/** Non-discovery response for forbidden admin API access. */
export function adminNotFound() {
  return NextResponse.json({ ok: false }, { status: 404 });
}

/**
 * Admin API gate: JWT email must be in BRICLOG_ADMIN_EMAILS.
 * Returns 404 (not 403) for missing/invalid/non-admin callers.
 */
export async function requireAdminApi(request) {
  const ip = getClientIp(request);
  const limit = checkRateLimit(`admin:${ip}`, {
    max: ADMIN_RATE_MAX,
    windowMs: 60_000,
  });
  if (!limit.ok) {
    return { rateLimited: adminNotFound() };
  }

  const auth = await requireUser(request);
  if (auth.error || !isAdminEmail(auth.user?.email)) {
    return { denied: adminNotFound() };
  }
  return { auth };
}
