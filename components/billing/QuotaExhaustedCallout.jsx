"use client";

import { getQuotaExhaustedCallout } from "@/lib/billing/planUx";

export default function QuotaExhaustedCallout({
  planId = "free",
  onUpgradeClick,
}) {
  const { title, body, showUpgrade } = getQuotaExhaustedCallout(planId);

  return (
    <div
      className="mt-4 rounded-xl border border-[#FFD699] bg-[#FFFBF0] px-4 py-3 text-[12px] leading-relaxed text-[#4E5968]"
      role="status"
    >
      <p className="font-semibold text-[#191F28]">{title}</p>
      <p className="mt-1">{body}</p>
      {showUpgrade && onUpgradeClick ? (
        <button
          type="button"
          onClick={onUpgradeClick}
          className="mt-2 text-[12px] font-semibold text-[#03A94D] hover:underline"
        >
          플랜 업그레이드 보기
        </button>
      ) : null}
    </div>
  );
}
