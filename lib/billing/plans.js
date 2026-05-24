/** @typedef {'free'|'brand'|'studio'|'pro'} PlanId */

export const PLAN_ORDER = ["free", "brand", "studio"];

const PLAN_RANK = { free: 0, brand: 1, studio: 2, pro: 2 };

/** @param {string} planId */
export function getPlanRank(planId) {
  return PLAN_RANK[normalizePlanId(planId)] ?? 0;
}

/** @param {string} fromPlan @param {string} toPlan */
export function comparePlans(fromPlan, toPlan) {
  return getPlanRank(toPlan) - getPlanRank(fromPlan);
}

/** @param {string} planId */
export function isPaidPlan(planId) {
  const id = normalizePlanId(planId);
  return id === "brand" || id === "studio";
}

export const PLANS = {
  free: {
    id: "free",
    label: "무료",
    labelEn: "Free",
    displayPrice: null,
    displayPriceShort: "무료",
    brands: 1,
    contentPerMonth: 5,
    imagesPerMonth: 0,
    historyDays: 7,
    brandMemory: false,
    imageGeneration: false,
    sensitiveAudit: false,
    advancedAudit: false,
    topicRecommendations: false,
    assistant: true,
    pipelineChannels: ["blog"],
    highlight: false,
  },
  brand: {
    id: "brand",
    label: "플러스",
    marketingAlias: "프리미엄",
    labelEn: "Plus",
    displayPrice: "19,900원/월",
    displayPriceShort: "19,900원",
    brands: 3,
    contentPerMonth: 15,
    imagesPerMonth: 10,
    historyDays: 30,
    brandMemory: true,
    imageGeneration: true,
    sensitiveAudit: true,
    advancedAudit: false,
    topicRecommendations: false,
    assistant: true,
    pipelineChannels: ["blog", "place", "instagram", "image"],
    highlight: false,
  },
  studio: {
    id: "studio",
    label: "스튜디오",
    marketingAlias: "하이엔드",
    labelEn: "Studio",
    displayPrice: "39,000원/월",
    displayPriceShort: "39,000원",
    brands: null,
    contentPerMonth: 30,
    imagesPerMonth: 30,
    historyDays: null,
    brandMemory: true,
    imageGeneration: true,
    sensitiveAudit: true,
    advancedAudit: true,
    topicRecommendations: true,
    assistant: true,
    pipelineChannels: ["blog", "place", "instagram", "image"],
    highlight: true,
  },
};

/** @deprecated DB may still store `pro`; treated as studio */
PLANS.pro = PLANS.studio;

export const PLAN_FEATURE_LINES = {
  free: [
    "브랜드 1개",
    "월 5회 · 이야기",
    "도움말",
    "초안 기록 7일",
  ],
  brand: [
    "브랜드 3개",
    "월 15회 · 이야기·플레이스·인스타",
    "브랜드 톤·자료 저장",
    "초안 기록 30일",
    "업종별 표현 가이드",
    "비주얼 프롬프트",
  ],
  studio: [
    "브랜드 무제한",
    "월 30회 · 3채널 + 프롬프트",
    "자료·톤 무제한",
    "초안 기록 무제한",
    "발행 전 꼼꼼 점검",
    "주제 추천",
  ],
};

export function getPlanDefinition(planId) {
  const id = normalizePlanId(planId);
  return PLANS[id] || PLANS.free;
}

export function normalizePlanId(storedPlan) {
  if (storedPlan === "pro") return "studio";
  if (storedPlan === "brand" || storedPlan === "studio") return storedPlan;
  return "free";
}

export function resolveEffectivePlan(storedPlan) {
  if (process.env.BRICLOG_DEV_PRO === "true") return "studio";
  return normalizePlanId(storedPlan);
}

export function getNextUpgradePlanId(planId) {
  const id = normalizePlanId(planId);
  if (id === "free") return "brand";
  if (id === "brand") return "studio";
  return null;
}

export function getUpgradeMessage(planId) {
  const next = getNextUpgradePlanId(planId);
  if (!next) return "";
  const plan = PLANS[next];
  const name =
    plan.marketingAlias && plan.marketingAlias !== plan.label
      ? `${plan.marketingAlias}(${plan.label})`
      : plan.label;
  return ` 사이드바 「플랜」에서 ${name} · ${plan.displayPriceShort}/월 업그레이드를 확인하세요.`;
}
