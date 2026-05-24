/** 클라이언트 — NEXT_PUBLIC_BETA_FULL_ACCESS_UNTIL 과 서버 베타 정책 동기 */

const DEFAULT_UNTIL = "2026-06-01";

export function getClientBetaUntil() {
  return (
    process.env.NEXT_PUBLIC_BETA_FULL_ACCESS_UNTIL?.trim() || DEFAULT_UNTIL
  );
}

export function isClientBetaActive(now = new Date()) {
  const untilRaw = getClientBetaUntil();
  if (!untilRaw) return false;
  const end = new Date(`${untilRaw}T00:00:00`);
  if (Number.isNaN(end.getTime())) return false;
  return now < end;
}
