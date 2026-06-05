/** 클라이언트 — NEXT_PUBLIC_BETA_FULL_ACCESS_UNTIL 과 서버 베타 정책 동기 */

import {
  DEFAULT_BETA_UNTIL,
  parseBetaEndExclusive,
} from "@/lib/billing/betaAccess";

export function getClientBetaUntil() {
  return (
    process.env.NEXT_PUBLIC_BETA_FULL_ACCESS_UNTIL?.trim() || DEFAULT_BETA_UNTIL
  );
}

export function isClientBetaActive(now = new Date()) {
  const untilRaw = getClientBetaUntil();
  const end = parseBetaEndExclusive(untilRaw);
  if (!end) return false;
  return now < end;
}
