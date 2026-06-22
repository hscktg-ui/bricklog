"use client";

import { buildWeeklyOperatingReport } from "@/lib/product/weeklyOperatingReport";
import { VISION_GLASS_CARD, VISION_SUB } from "@/lib/landing/vision2030Styles";

export default function WeeklyOperatingStrip({ scheduleView, input = {}, className = "" }) {
  const report = buildWeeklyOperatingReport(scheduleView, input);
  return (
    <div className={`${VISION_GLASS_CARD} px-4 py-4 sm:px-5 ${className}`}>
      <p className="text-[13px] font-semibold text-[var(--vision-ink)]">{report.headline}</p>
      <p className={`mt-1.5 ${VISION_SUB} !text-[13px]`}>{report.growthLine}</p>
    </div>
  );
}
