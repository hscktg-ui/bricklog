"use client";

import {
  buildResearchStatusLabel,
  buildSearchSummary,
} from "@/lib/research/searchSummaryBuilder";

export default function BrandResearchPanel({ brandResearch, compact: compactMode }) {
  if (!brandResearch) return null;
  const summary = brandResearch.summary;
  const label = buildResearchStatusLabel(brandResearch);

  if (compactMode) {
    return (
      <div className="mt-3 rounded-lg border border-[#E8EBED] bg-[#FAFBFC] px-3 py-2">
        <p className="text-[10px] font-bold text-[#4E5968]">브랜드 조사</p>
        <p className="mt-0.5 text-[11px] text-[#03A94D]">{label}</p>
        {summary?.operationStyle && (
          <p className="mt-1 line-clamp-2 text-[10px] text-[#8B95A1]">
            {summary.operationStyle}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#E8EBED] bg-[#FAFBFC] p-3">
      <p className="text-[11px] font-bold text-[#191F28]">Brand Research</p>
      <p className="mt-0.5 text-[10px] text-[#03A94D]">{label}</p>
      <p className="mt-1 text-[10px] text-[#8B95A1]">
        원문 복사 없음 · 사용자 입력 우선
      </p>
      {summary?.coreStrengths?.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-[10px] text-[#4E5968]">
          {summary.coreStrengths.slice(0, 4).map((s) => (
            <li key={s}>· {s}</li>
          ))}
        </ul>
      )}
      <details className="mt-2">
        <summary className="cursor-pointer text-[10px] text-[#8B95A1]">
          내부 요약 보기
        </summary>
        <pre className="mt-1 max-h-[120px] overflow-auto whitespace-pre-wrap text-[9px] text-[#8B95A1]">
          {buildSearchSummary(brandResearch).slice(0, 600)}
        </pre>
      </details>
    </div>
  );
}
