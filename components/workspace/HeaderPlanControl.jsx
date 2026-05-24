"use client";

import Icon from "@/components/Icon";
import { getWorkspacePlanBadge } from "@/lib/billing/planBadge";

const BADGE_CLASS = {
  free: "bg-[#F7F8FA] text-[#4E5968] ring-1 ring-[#E8EBED]",
  brand: "bg-[#E8F0FF] text-[#1B4DDB] ring-1 ring-[#C5D8FF]",
  studio: "bg-[#E8F9EF] text-[#03A94D] ring-1 ring-[#B8EBD0]",
  beta: "bg-[#F0FFF5] text-[#03A94D] ring-1 ring-[#03C75A]/35",
};

/**
 * 우측 상단 — 현재 플랜 + 결제(요금제) 모달
 */
export default function HeaderPlanControl({
  planId = "free",
  betaActive = false,
  onPlanChange,
  disabled = false,
}) {
  const badge = getWorkspacePlanBadge(planId, { beta: betaActive });
  const badgeClass =
    BADGE_CLASS[badge.variant] || BADGE_CLASS.free;
  const isBeta = badge.variant === "beta";

  return (
    <div className="flex items-center gap-1 sm:gap-2">
      <span
        className={`max-w-[4.5rem] truncate rounded-full px-1.5 py-0.5 text-[9px] font-semibold sm:hidden ${badgeClass}`}
        title={isBeta ? "베타 기간" : `현재 플랜: ${badge.label}`}
      >
        {isBeta ? "(베타)" : badge.label}
      </span>
      <span
        className={`hidden max-w-[7.5rem] truncate rounded-full px-2 py-0.5 text-[10px] font-semibold sm:inline-block md:max-w-none md:text-[11px] ${badgeClass}`}
        title={`현재 플랜: ${isBeta ? "스튜디오 (베타)" : badge.label}`}
      >
        {isBeta ? "스튜디오 (베타)" : badge.label}
      </span>
      <button
        type="button"
        onClick={onPlanChange}
        disabled={disabled}
        className="inline-flex min-h-[32px] items-center gap-1 rounded-xl border border-[#03C75A]/45 bg-[#F8FDF9] px-2 py-1 text-[11px] font-semibold text-[#03A94D] shadow-sm transition hover:border-[#03C75A] hover:bg-[#E8F9EF] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#03C75A] disabled:opacity-50 sm:min-h-[36px] sm:px-3 sm:text-[13px]"
        aria-label="플랜 변경 및 결제"
      >
        <Icon name="sparkles" className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
        <span>플랜</span>
      </button>
    </div>
  );
}
