/** 내부 데모 계정 — 시드 브랜드는 이 ID·demoMode에서만 노출 */
export const INTERNAL_DEMO_USER_ID = "00000000-0000-0000-0000-000000000001";

export function isInternalDemoWorkspace(userId, demoMode = false) {
  return Boolean(demoMode) || userId === INTERNAL_DEMO_USER_ID;
}

export function normalizeUserId(userId) {
  return userId || "anonymous";
}
