/**
 * Launch publish-first flags — 의존성 없음 (순환 import 방지)
 */
export const LAUNCH_PUBLISH_TIME_BUDGET_MS = 45_000;
export const LAUNCH_PUBLISH_MAX_LLM_ATTEMPTS = 1;
export const LAUNCH_PUBLISH_CLIENT_FETCH_MS = 52_000;

export function isLaunchPublishFirstMode() {
  if (process.env.BRICLOG_LAUNCH_PUBLISH_FIRST === "false") return false;
  if (process.env.BRICLOG_LAUNCH_PUBLISH_FIRST === "true") return true;
  return true;
}

export function getLaunchPublishTimeBudgetMs() {
  const n = Number(process.env.BRICLOG_LAUNCH_PUBLISH_BUDGET_MS);
  return Number.isFinite(n) && n > 0 ? n : LAUNCH_PUBLISH_TIME_BUDGET_MS;
}

export function getLaunchPublishMaxAttempts() {
  const n = Number(process.env.BRICLOG_LAUNCH_PUBLISH_MAX_ATTEMPTS);
  return Number.isFinite(n) && n >= 1 ? Math.min(2, n) : LAUNCH_PUBLISH_MAX_LLM_ATTEMPTS;
}

export function shouldWithholdCustomerDelivery() {
  return !isLaunchPublishFirstMode();
}
