"use client";

import { computeQualityScore } from "@/lib/learning/qualityScore";
import { getFeedbackStats } from "@/lib/learning/feedbackStore";

export default function QualityScorePanel({
  qualityReport,
  userId,
  brandId,
}) {
  if (!qualityReport) return null;
  const stats = userId ? getFeedbackStats(userId, brandId) : {};
  const { total, breakdown } = computeQualityScore(qualityReport, stats);

  return (
    <div className="rounded-xl border border-[#E8EBED] bg-white px-3 py-2.5">
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-semibold text-[#4E5968]">작성 검수</p>
        <p className="text-[14px] font-bold text-[#03A94D]">
          {total >= 80 ? "발행 전 확인됨" : "다듬기 권장"}
        </p>
      </div>
      <ul className="mt-2 grid grid-cols-2 gap-1 text-[10px] text-[#8B95A1]">
        {breakdown
          .filter((b) => b.score >= 70)
          .map((b) => (
            <li key={b.label}>✓ {b.label}</li>
          ))}
      </ul>
    </div>
  );
}
