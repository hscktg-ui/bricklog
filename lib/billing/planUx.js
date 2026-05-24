import {
  getPlanDefinition,
  getUpgradeMessage,
  normalizePlanId,
  getNextUpgradePlanId,
} from "./plans";

/** 무료·플러스: 80% 경고 / 스튜디오: 90% (업그레이드 없음) */
const WARNING_RATIO_FREE = 0.8;
const WARNING_RATIO_BRAND = 0.85;
const WARNING_RATIO_STUDIO = 0.9;

const IMAGE_DAILY_CAP_DEFAULT =
  Number(process.env.BRICLOG_IMAGE_DAILY_CAP) || 15;

const IMAGE_DAILY_BY_PLAN = {
  free: 0,
  brand: IMAGE_DAILY_CAP_DEFAULT,
  studio: Math.max(
    IMAGE_DAILY_CAP_DEFAULT,
    Number(process.env.BRICLOG_STUDIO_IMAGE_DAILY_CAP) || 30
  ),
};

/** @param {string} planId */
export function getPlanMarketingAlias(planId) {
  const def = getPlanDefinition(planId);
  return def.marketingAlias || def.label;
}

/** 헤더·사이드바용 (예: 프리미엄 · 플러스) */
export function getPlanDisplayTitle(planId, opts = {}) {
  const id = normalizePlanId(planId);
  const def = getPlanDefinition(id);
  if (opts.beta) return "스튜디오 (베타)";
  if (def.marketingAlias && def.marketingAlias !== def.label) {
    return `${def.marketingAlias} · ${def.label}`;
  }
  return def.label;
}

/** @param {string} planId @param {number} currentCount */
export function getBrandLimitUserMessage(planId, currentCount) {
  const id = normalizePlanId(planId);
  const plan = getPlanDefinition(id);
  const cap = plan.brands;
  if (cap == null) return "";
  const title = getPlanDisplayTitle(id);
  if (id === "free") {
    return `무료 플랜은 브랜드 ${cap}개까지 등록할 수 있습니다.${getUpgradeMessage(id)}`;
  }
  return `${title} 플랜은 브랜드 ${cap}개까지 등록할 수 있습니다. 더 많은 브랜드가 필요하면 스튜디오(브랜드 무제한)로 업그레이드하세요.`;
}

/** @param {string} planId */
export function getImageDailyCap(planId) {
  const id = normalizePlanId(planId);
  return IMAGE_DAILY_BY_PLAN[id] ?? IMAGE_DAILY_CAP_DEFAULT;
}

function warningRatioForPlan(planId) {
  const id = normalizePlanId(planId);
  if (id === "studio") return WARNING_RATIO_STUDIO;
  if (id === "brand") return WARNING_RATIO_BRAND;
  return WARNING_RATIO_FREE;
}

/** @param {number} used @param {number|null} limit @param {string} planId */
function isNearLimit(used, limit, planId) {
  if (limit == null || limit <= 0) return false;
  return used / limit >= warningRatioForPlan(planId);
}

/**
 * @param {string} planId
 * @param {{ used: number, limit: number|null }} content
 * @param {{ used: number, limit: number|null }} image
 */
export function computeUsageWarning(planId, content, image) {
  const id = normalizePlanId(planId);
  const contentWarn = isNearLimit(content?.used ?? 0, content?.limit, id);
  const imageWarn =
    (image?.limit ?? 0) > 0 &&
    isNearLimit(image?.used ?? 0, image?.limit, id);
  return contentWarn || imageWarn;
}

/**
 * @param {string} planId
 * @param {'content'|'image'} kind
 * @param {number} used
 * @param {number|null} limit
 */
export function getUsageWarningCopy(planId, kind, used, limit) {
  const id = normalizePlanId(planId);
  const pct = Math.round(warningRatioForPlan(id) * 100);
  const remaining =
    limit != null ? Math.max(0, limit - (used ?? 0)) : null;
  const next = getNextUpgradePlanId(id);

  if (kind === "image") {
    if (id === "studio") {
      return `이번 달 이미지 한도의 ${pct}%를 사용했습니다. 남은 ${remaining ?? "—"}장입니다.`;
    }
    if (next) {
      const up = getPlanDefinition(next);
      return `이번 달 이미지 한도의 ${pct}%를 넘었습니다. 남은 ${remaining ?? "—"}장 · ${up.label}에서 한도가 늘어납니다.`;
    }
    return `이번 달 이미지 한도의 ${pct}%를 넘었습니다.`;
  }

  if (id === "studio") {
    return `이번 달 글·채널 생성 한도의 ${pct}%를 사용했습니다. 남은 ${remaining ?? "—"}회입니다.`;
  }
  if (next) {
    const up = getPlanDefinition(next);
    return `이번 달 생성 한도의 ${pct}%를 넘었습니다. 남은 ${remaining ?? "—"}회 · ${up.label}(${up.displayPriceShort}/월)로 늘릴 수 있습니다.`;
  }
  return `이번 달 생성 한도의 ${pct}%를 넘었습니다.`;
}

/** 토스트·사이드바 한 줄 요약 */
export function getUsageWarningToast(planId, usage) {
  if (!usage?.usageWarning) return null;
  const contentNear = isNearLimit(
    usage.content?.used ?? 0,
    usage.content?.limit,
    planId
  );
  if (contentNear) {
    return getUsageWarningCopy(
      planId,
      "content",
      usage.content?.used,
      usage.content?.limit
    );
  }
  return getUsageWarningCopy(
    planId,
    "image",
    usage.image?.used,
    usage.image?.limit
  );
}

/** @param {string} planId @param {number} used @param {number} limit */
export function getContentQuotaExceededMessage(planId, used, limit) {
  const id = normalizePlanId(planId);
  const title = getPlanDisplayTitle(id);
  if (id === "studio") {
    return `이번 달 ${title} 생성 한도(${limit}회)를 모두 사용했습니다. 다음 달 1일에 다시 이용할 수 있습니다.`;
  }
  return `이번 달 ${title} 생성 한도(${limit}회)를 모두 사용했습니다.${getUpgradeMessage(id)}`;
}

/** @param {string} planId */
export function getImageDailyCapMessage(planId, cap, todayCount) {
  const id = normalizePlanId(planId);
  if (id === "studio") {
    return `오늘 이미지 생성 한도(${cap}장)에 도달했습니다. 내일 다시 시도하거나 월 한도를 확인해 주세요.`;
  }
  return `오늘 이미지 생성 한도(${cap}장)에 도달했습니다. 내일 다시 시도해 주세요.`;
}

/** 생성 버튼 근처 잔여 표시 */
export function formatGenerationQuotaLine(usage) {
  if (!usage || usage.bypassQuotas) return null;
  const { used, limit, remaining } = usage.content || {};
  if (limit == null) return null;
  const left = remaining ?? Math.max(0, limit - (used ?? 0));
  if (left <= 0) return null;
  return `이번 달 남은 생성 ${left}/${limit}회`;
}

export function isContentQuotaExhausted(usage) {
  if (!usage || usage.bypassQuotas) return false;
  const { used, limit } = usage.content || {};
  return limit != null && used >= limit;
}

export function getQuotaExhaustedCallout(planId) {
  const id = normalizePlanId(planId);
  const next = getNextUpgradePlanId(id);
  if (next) {
    const up = getPlanDefinition(next);
    return {
      title: "이번 달 생성 한도를 모두 사용했습니다",
      body: `${up.label}(${up.displayPriceShort}/월)로 업그레이드하면 한도가 늘어납니다. 사이드바 「플랜」에서 확인하세요.`,
      showUpgrade: true,
    };
  }
  return {
    title: "이번 달 생성 한도를 모두 사용했습니다",
    body: "다음 달 1일에 한도가 초기화됩니다. 긴급히 더 필요하면 「도움말」에서 문의해 주세요.",
    showUpgrade: false,
  };
}
