/** Paid plan amounts (KRW, VAT policy per checkout screen). */
export const TOSS_PLAN_AMOUNTS = {
  brand: 19900,
  studio: 39000,
};

export const TOSS_PAID_PLAN_IDS = ["brand", "studio"];

export function getTossPlanAmount(planId) {
  return TOSS_PLAN_AMOUNTS[planId] ?? null;
}

export function getTossOrderName(planId) {
  if (planId === "brand") return "BRICLOG 플러스 (월)";
  if (planId === "studio") return "BRICLOG 스튜디오 플랜 (월)";
  return "BRICLOG 구독";
}
