import {
  getPlanDefinition,
  getUpgradeMessage,
  normalizePlanId,
} from "./plans";
import {
  getBrandLimitUserMessage,
  getContentQuotaExceededMessage,
  getImageDailyCap,
  getImageDailyCapMessage,
} from "./planUx";
import { hasOwnerFullAccess } from "./adminEntitlement";
import { isBetaFullAccessActive } from "./betaAccess";
import {
  fetchUserPlan,
  getOrCreateMonthlyUsage,
  getUsageSummary,
  countImagesToday,
} from "./usageLedger";

export async function checkContentGeneration(supabase, userId, userEmail = null) {
  if (hasOwnerFullAccess(userEmail) || isBetaFullAccessActive()) {
    const usage = await getUsageSummary(supabase, userId, userEmail);
    return { ok: true, usageWarning: false, usage };
  }

  const summary = await getUsageSummary(supabase, userId, userEmail);
  const { used, limit } = summary.content;

  if (limit != null && used >= limit) {
    return {
      ok: false,
      userMessage: getContentQuotaExceededMessage(summary.planId, used, limit),
      usageWarning: summary.usageWarning,
      usage: summary,
    };
  }

  return {
    ok: true,
    usageWarning: summary.usageWarning,
    usage: summary,
  };
}

export async function checkImageGeneration(supabase, userId, userEmail = null) {
  if (hasOwnerFullAccess(userEmail) || isBetaFullAccessActive()) {
    return {
      ok: true,
      usage: await getUsageSummary(supabase, userId, userEmail),
    };
  }

  const { planId } = await fetchUserPlan(supabase, userId, userEmail);
  const plan = getPlanDefinition(planId);

  if (!plan.imageGeneration) {
    return {
      ok: false,
      userMessage:
        "이미지 생성은 플러스·스튜디오에서 이용할 수 있습니다. 사이드바 「플랜 업그레이드」에서 확인하세요.",
      usage: await getUsageSummary(supabase, userId, userEmail),
    };
  }

  const summary = await getUsageSummary(supabase, userId, userEmail);
  const { used, limit } = summary.image;

  if (limit != null && used >= limit) {
    return {
      ok: false,
      userMessage: `이번 달 이미지 생성 한도(${limit}장)를 모두 사용했습니다.${getUpgradeMessage(normalizePlanId(summary.planId))}`,
      usageWarning: summary.usageWarning,
      usage: summary,
    };
  }

  const dailyCap = getImageDailyCap(planId);
  const todayCount = await countImagesToday(supabase, userId);
  if (dailyCap > 0 && todayCount >= dailyCap) {
    return {
      ok: false,
      userMessage: getImageDailyCapMessage(planId, dailyCap, todayCount),
      usageWarning: summary.usageWarning,
      usage: summary,
    };
  }

  return {
    ok: true,
    usageWarning: summary.usageWarning,
    usage: summary,
  };
}

export async function checkBrandCreate(supabase, userId, currentCount, userEmail = null) {
  if (hasOwnerFullAccess(userEmail) || isBetaFullAccessActive()) return { ok: true };

  const { planId } = await fetchUserPlan(supabase, userId, userEmail);
  const plan = getPlanDefinition(planId);
  if (plan.brands == null) return { ok: true };
  if (currentCount >= plan.brands) {
    return {
      ok: false,
      userMessage: getBrandLimitUserMessage(planId, currentCount),
    };
  }
  return { ok: true };
}

export function canUseBrandMemory(planId) {
  const plan = getPlanDefinition(planId);
  return plan.brandAssetUploads ?? plan.brandMemory;
}

export function canUseSensitiveAudit(planId) {
  return getPlanDefinition(planId).sensitiveAudit;
}

/** @param {'blog'|'place'|'instagram'|'image'} channel */
export function canUsePipelineChannel(planId, channel) {
  const plan = getPlanDefinition(planId);
  const allowed = plan.pipelineChannels || ["blog"];
  if (channel === "blog") return true;
  if (channel === "place") return allowed.includes("place");
  if (channel === "instagram" || channel === "insta") {
    return allowed.includes("instagram");
  }
  if (channel === "image") return allowed.includes("image");
  return false;
}

export function getHistoryCutoffIso(planId) {
  const days = getPlanDefinition(planId).historyDays;
  if (days == null) return null;
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

export { getUsageSummary };
