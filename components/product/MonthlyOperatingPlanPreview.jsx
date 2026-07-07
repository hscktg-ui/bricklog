"use client";

import { useMemo } from "react";
import { buildContentOperatingPlan } from "@/lib/product/briclogBrandContentOS";
import { assessPreGenerationNorthStar } from "@/lib/product/northStarDeliveryKpi";
import { VISION_STATUS_NEUTRAL } from "@/lib/landing/vision2030Styles";

const CHANNEL_LABEL = { blog: "블로그", place: "플레이스", instagram: "인스타" };

/** 생성 전 — 이번 달 운영 계획·North Star KPI 미리보기 */
export default function MonthlyOperatingPlanPreview({ input = {}, compact = false }) {
  const { plan, kpi } = useMemo(() => {
    const plan = buildContentOperatingPlan(input);
    const kpi = assessPreGenerationNorthStar(input);
    return { plan, kpi };
  }, [
    input.brandName,
    input.topic,
    input.mainKeyword,
    input.region,
    input.industry,
    input.storeFeatures,
    input.purpose,
    input.purposeType,
  ]);

  if (!input.brandName?.trim() || !input.topic?.trim()) return null;

  const textSize = compact ? "text-[11px]" : "text-[12px]";

  return (
    <div
      className={`${VISION_STATUS_NEUTRAL} mt-2 px-3 py-2.5`}
      role="status"
      aria-live="polite"
    >
      <p className={`font-semibold text-[var(--vision-ink)] ${textSize}`}>
        {plan.month} 운영안
        {kpi.monthlyPlanReady ? (
          <span className="ml-1.5 font-medium text-[var(--vision-accent-deep,#03a94d)]">
            · 채널 계획 준비됨
          </span>
        ) : null}
      </p>
      <p className={`mt-1 leading-relaxed text-[var(--vision-muted)] ${textSize}`}>
        {plan.operatingHeadline}
      </p>
      <ul className={`mt-2 space-y-1 text-[var(--vision-muted)] ${textSize}`}>
        {(plan.whatToWrite || []).map((row) => (
          <li key={row.id}>
            <span className="font-medium text-[var(--vision-ink)]">
              {CHANNEL_LABEL[row.channel] || row.channel}
            </span>
            {" · "}
            {row.priority} — {row.topic}
          </li>
        ))}
      </ul>
      <p className={`mt-2 leading-relaxed text-[var(--vision-muted)] ${textSize}`}>
        North Star: 네이버·플레이스·인스타 붙여넣기 + 이번 달 운영 계획에 기여
        {kpi.pass ? (
          <span className="ml-1 text-[var(--vision-accent-deep,#03a94d)]">
            (입력·계획 준비 {kpi.score}점)
          </span>
        ) : (
          <span className="ml-1">(브랜드·주제를 더 채우면 계획이 완성됩니다)</span>
        )}
      </p>
    </div>
  );
}
