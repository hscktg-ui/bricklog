import { getPlanDisplayTitle, getUsageWarningToast } from "./planUx";

/**
 * 사이드바·설정용 사용량 문구 (null 한도 → 무제한 등)
 */
/** @param {number} used @param {number|null|undefined} limit */
function formatMonthlyQuota(used, limit) {
  const n = Math.max(0, Number(used) || 0);
  if (limit == null) {
    return n > 0 ? `${n}회 사용` : "무제한";
  }
  const cap = Number(limit);
  if (!Number.isFinite(cap) || cap <= 0) return null;
  return `${n}/${cap}회`;
}

/** @param {number} used @param {number|null|undefined} limit */
function formatImageQuota(used, limit) {
  const n = Math.max(0, Number(used) || 0);
  if (limit == null) {
    return n > 0 ? `이미지 ${n}회` : null;
  }
  const cap = Number(limit);
  if (cap <= 0) {
    return n > 0 ? `이미지 ${n}회` : "이미지 · 플러스 이상";
  }
  return `이미지 ${n}/${cap}회`;
}

/**
 * @param {import('./usageLedger').getUsageSummary extends (...args: any) => Promise<infer R> ? R : never} usage
 */
export function buildSidebarUsageDisplay(usage) {
  if (!usage) {
    return { planTitle: "", usageLine: "", hint: "" };
  }

  const planTitle = usage.bypassQuotas
    ? "(베타)"
    : getPlanDisplayTitle(usage.planId);

  if (usage.bypassQuotas) {
    const used = usage.content?.used ?? 0;
    return {
      planTitle,
      usageLine:
        used > 0
          ? `이번 달 ${used}회 만들었어요`
          : "이번 달 생성 · 한도 없음",
      hint: "베타 기간 무료 이용",
    };
  }

  const contentPart = formatMonthlyQuota(
    usage.content?.used,
    usage.content?.limit
  );
  const imagePart = formatImageQuota(usage.image?.used, usage.image?.limit);

  const parts = [];
  if (contentPart) {
    parts.push(`글·채널 ${contentPart}`);
  }
  if (imagePart) {
    parts.push(imagePart);
  }

  const warnHint = usage.usageWarning
    ? getUsageWarningToast(usage.planId, usage) || ""
    : "";

  return {
    planTitle,
    usageLine: parts.length ? parts.join(" · ") : "이번 달 사용량",
    hint: usage.period
      ? `${usage.period.slice(0, 4)}년 ${usage.period.slice(5)}월 기준`
      : "",
    warnHint,
  };
}
