"use client";

/**
 * 심플 모드 — 조사 반영 요약 (전체 패널 대신)
 */
export default function ResearchSummaryStrip({
  result,
  researchFacts = [],
  query = "",
}) {
  if (!result?.summary) return null;
  const factCount = Array.isArray(researchFacts) ? researchFacts.length : 0;
  const summary =
    String(result.summary || "").length > 220
      ? `${String(result.summary).slice(0, 217)}…`
      : result.summary;

  return (
    <div
      className="mb-4 rounded-xl border border-[#03C75A]/25 bg-[#F6FDF9] px-4 py-3"
      role="status"
    >
      <p className="text-[12px] font-semibold text-[#03A94D]">
        조사 반영
        {factCount >= 2 ? ` · 팩트 ${factCount}건` : factCount === 1 ? " · 팩트 1건" : ""}
      </p>
      {query ? (
        <p className="mt-1 text-[11px] text-[#8B95A1]">
          주제 <span className="text-[#4E5968]">{query}</span>
        </p>
      ) : null}
      <p className="mt-2 whitespace-pre-wrap text-[12px] leading-relaxed text-[#4E5968]">
        {summary}
      </p>
    </div>
  );
}
